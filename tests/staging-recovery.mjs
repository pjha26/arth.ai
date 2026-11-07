import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { assertStaging } from './fixtures/staging-safety.mjs';
import { reconcilePendingReports } from '../worker/services/reconcileReports.js';

assertStaging();
const prisma = new PrismaClient();
const redis = new Redis(process.env.UPSTASH_REDIS_URL, { maxRetriesPerRequest: 1 });
const queue = new Queue('leads', { connection: redis });
const checks = [];
let child, log;
process.once('SIGTERM', () => { void stop('SIGKILL').finally(() => process.exit(1)); });
async function stop(signal = 'SIGTERM') {
  if (child && child.exitCode === null && child.signalCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill(signal);
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000); timer.unref();
    await exited; clearTimeout(timer);
  }
  if (log) { log.end(); log = null; }
}
function start(id, boundary) {
  log = createWriteStream(`.data/staging/recovery-${id}-${boundary || 'resume'}.log`);
  child = spawn(process.execPath, ['--import', pathToFileURL(path.resolve('tests/fixtures/provider-hook.mjs')).href, 'tests/fixtures/crash-worker.mjs'],
    { env: { ...process.env, NODE_OPTIONS: '', ARTHAI_CRASH_REPORT_ID: id, ARTHAI_CRASH_BOUNDARY: boundary }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  child.on('error', error => console.error('Cannot start recovery worker', error.message));
}
async function until(check, message) {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    if (child?.exitCode != null || child?.signalCode != null) throw new Error('Recovery worker exited unexpectedly');
    const result = await check(); if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(message);
}
try {
  const company = await prisma.company.upsert({ where: { domain: 'iana.org' }, update: {}, create: { domain: 'iana.org', website: 'https://www.iana.org', name: 'Controlled recovery fixture' } });
  for (const boundary of ['queued', 'research', 'pdf', 'email', 'provider']) {
    const lead = await prisma.lead.create({ data: { companyId: company.id, fullName: 'Recovery Test', email: `recovery-${randomUUID()}@example.invalid`, painPoints: 'Controlled recovery test', outreachConsent: boundary === 'email' } });
    const report = await prisma.report.create({ data: { companyId: company.id, leadId: lead.id, freshResearch: true } });
    if (boundary === 'queued') {
      await assert.rejects(reconcilePendingReports({ prisma, leadsQueue: { add: async () => { throw new Error('Injected producer outage'); } } }), /producer outage/);
      assert.equal((await prisma.report.findUnique({ where: { id: report.id } })).dispatchedAt, null);
      start(report.id, '');
    } else {
      start(report.id, boundary);
      await until(async () => {
        const state = await prisma.report.findUnique({ where: { id: report.id } });
        if (state.status === 'failed') throw new Error(state.errorMessage);
        try { return JSON.parse(await readFile(`.data/staging/crash-${report.id}.json`, 'utf8')); } catch { return null; }
      }, `Worker did not reach ${boundary} boundary`);
      await stop('SIGKILL');
      const saved = await prisma.report.findUnique({ where: { id: report.id } });
      if (boundary === 'research') assert.equal(saved.verificationStatus, 'reviewed');
      if (boundary === 'pdf') assert.equal(saved.artifactStatus, 'ready');
      if (boundary === 'email') assert.equal(saved.deliveryStatus, 'accepted');
      if (boundary === 'provider') {
        assert.equal(saved.deliveryStatus, 'sending');
        await prisma.report.update({ where: { id: report.id }, data: { deliveryStartedAt: new Date(Date.now() - 11 * 60000) } });
      }
      start(report.id, '');
    }
    await until(async () => {
      const saved = await prisma.report.findUnique({ where: { id: report.id } });
      if (saved.status === 'failed') throw new Error(saved.errorMessage);
      const job = await queue.getJob(`${report.id}-1`);
      return saved.status === 'done' && saved.deliveryStatus === (boundary === 'provider' ? 'uncertain' : 'accepted') && job && await job.getState() === 'completed';
    }, `Report did not recover after ${boundary}`);
    await stop();
    const events = (await readFile('.data/staging/provider-events.jsonl', 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(events.filter(event => event.provider === 'resend-attempt' && event.key === `report-${report.id}`).length, 1);
    assert.equal(await prisma.modelCall.count({ where: { reportId: report.id, operation: { in: ['research', 'writer', 'review'] }, status: 'success' } }), 5);
    assert.equal(await prisma.pipelineStage.count({ where: { reportId: report.id, status: 'running' } }), 0);
    if (boundary === 'email') assert.equal(await prisma.followUp.count({ where: { reportId: report.id } }), 3);
    checks.push(boundary); console.log('PASS worker recovery', boundary);
  }
  await writeFile('.data/staging/recovery-check.json', JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), checks, providers: 'simulated', processTermination: 'SIGKILL', note: 'Producer failure is injected; provider case simulates elapsed ten-minute review timeout. These are controlled service-backed checks.' }, null, 2));
} finally { await stop(); await queue.close(); redis.disconnect(); await prisma.$disconnect(); }
