import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { configurationChecks } from '../shared/readiness.js';
import { reportDrive } from '../shared/storage.js';

let files = {};
for (const name of ['.env', '.env.local']) {
  try { files = { ...files, ...parseEnv(await readFile(name, 'utf8')) }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const env = { ...files, ...process.env };
Object.assign(process.env, env);
const live = process.argv.includes('--live');
const checks = configurationChecks(env);
const configurationReady = checks.every(check => check.status === 'pass');
const note = (name, status, message) => checks.push({ name, status, note: message });
if (live) {
  let prisma;
  try {
    const url = new URL(env.DATABASE_URL);
    url.searchParams.set('connect_timeout', '5'); url.searchParams.set('pool_timeout', '5');
    prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
    const rows = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`;
      return tx.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    }, { maxWait: 5000, timeout: 10000 });
    const expected = (await readdir('prisma/migrations')).filter(name => /^\d{14}_/.test(name));
    const applied = new Set(rows.map(row => row.migration_name));
    note('database-migrations', expected.every(name => applied.has(name)) ? 'pass' : 'fail', 'Read-only migration-history comparison; no schema changes applied.');
  } catch { note('database-migrations', 'unverified', 'Cannot verify database connectivity or migration history. Back up and compare an actual database copy before deployment.'); }
  finally { await prisma?.$disconnect(); }
  let redis;
  try {
    if (new URL(env.UPSTASH_REDIS_URL).protocol !== 'rediss:') throw new Error('TLS required');
    redis = new Redis(env.UPSTASH_REDIS_URL, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 1, retryStrategy: () => null });
    redis.on('error', () => {});
    await redis.connect(); await redis.ping(); note('worker-redis-ping', 'pass', 'PING only; no queue data changed.');
  } catch { note('worker-redis-ping', 'unverified', 'Worker Redis connectivity could not be verified.'); }
  finally { redis?.disconnect(); }
  try {
    if (new URL(env.UPSTASH_REDIS_REST_URL).protocol !== 'https:') throw new Error('HTTPS required');
    const response = await fetch(env.UPSTASH_REDIS_REST_URL, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: '["PING"]' });
    const body = await response.json();
    note('limiter-redis-ping', response.ok && body.result === 'PONG' ? 'pass' : 'fail', 'REST PING only; no limiter counters changed.');
  } catch { note('limiter-redis-ping', 'unverified', 'Limiter Redis connectivity could not be verified.'); }
  try {
    const client = reportDrive();
    const folder = await client.files.get({ fileId: env.GOOGLE_DRIVE_FOLDER_ID, fields: 'mimeType,driveId,capabilities(canAddChildren)', supportsAllDrives: true }, { timeout: 10000 });
    const permissions = await client.permissions.list({ fileId: env.GOOGLE_DRIVE_FOLDER_ID, supportsAllDrives: true, fields: 'permissions(type)' }, { timeout: 10000 });
    const safe = folder.data.mimeType === 'application/vnd.google-apps.folder' && !!folder.data.driveId && folder.data.capabilities?.canAddChildren && !permissions.data.permissions?.some(item => ['anyone', 'domain'].includes(item.type));
    note('private-shared-drive', safe ? 'pass' : 'fail', 'Folder metadata/permissions only. Upload and cross-process download still require a designated live test.');
  } catch { note('private-shared-drive', 'unverified', 'Folder metadata or service-account access could not be verified.'); }
  try {
    const model = env.REPORT_MODEL || 'gemini-2.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'x-goog-api-key': env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || '' } });
    note('research-model-metadata', response.ok ? 'pass' : 'unverified', 'Model metadata only; no generation or recommendation-quality test performed.');
  } catch { note('research-model-metadata', 'unverified', 'Configured model metadata could not be verified.'); }
  try {
    const response = await fetch('https://api.resend.com/domains', { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${env.RESEND_API_KEY || ''}` } });
    const body = await response.json();
    const domain = env.EMAIL_FROM?.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
    const verified = response.ok && Array.isArray(body.data) && body.data.some(item => item.name?.toLowerCase() === domain && item.status === 'verified');
    note('sender-domain', verified ? 'pass' : 'unverified', 'Domain metadata only; scoped keys may require manual verification. No email was sent.');
  } catch { note('sender-domain', 'unverified', 'Sender metadata could not be verified. No email was sent.'); }
}
const result = { checkedAt: new Date().toISOString(), mode: live ? 'read-only-service-checks' : 'configuration-only', checks,
  configurationReady, checksPassed: checks.every(check => check.status === 'pass'), productionReleaseApproved: false,
  manualReleaseGates: ['Back up and validate a copy of the actual database', 'Designated-recipient live report, private storage, and delivery test', 'Independent labelled model/report-quality evaluation', 'Agreed real-provider workload and cost measurement'] };
await mkdir('.data', { recursive: true }); await writeFile('.data/release-check.json', JSON.stringify(result, null, 2));
for (const check of checks) console.log(`${check.status.toUpperCase()} ${check.name}`);
console.log('Saved private .data/release-check.json. No production approval, migrations, email, or model generation performed.');
if (!result.checksPassed) process.exitCode = 1;
