import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { processReport } from '../worker/services/pipeline.js';
import { deliverReport } from '../worker/services/delivery.js';
import { generatePDF } from '../worker/services/pdfGenerator.js';
import { buildEmailHtml } from '../worker/services/emailService.js';

process.env.NODE_ENV = 'test';
process.env.REPORT_STORAGE = 'local';
process.env.REPORTS_DIR = path.resolve('.data/artifact-check');
process.env.AUTH_SECRET = 'artifact-test-only-secret-with-32-characters';
process.env.NEXT_PUBLIC_APP_URL = 'https://example.invalid';
const { saveReportPdf, readReportPdf } = await import('../shared/storage.js');

test('real PDF and private storage survive worker retry before captured delivery', { timeout: 60000 }, async () => {
  const id = randomUUID(), leadId = randomUUID(), companyId = randomUUID();
  const lead = { id: leadId, fullName: 'Artifact Test', email: 'qa@example.invalid', website: 'https://example.invalid', companyName: 'Artifact Fixture', industry: 'Software', companySize: 'Unknown', personaType: 'cto', challengeTags: [], painPoints: 'Manual invoice review', outreachConsent: false };
  const source = { id: 's1', title: 'Controlled product evidence', url: lead.website, excerpt: 'This synthetic company provides invoice tracking software. No measured savings are stated.', retrievedAt: new Date().toISOString(), publishedAt: null };
  const analysis = {
    executiveSummary: 'Controlled fixture: invoice tracking software [s1]. Benefits remain hypotheses.',
    marketPosition: { content: 'Competitive position is not established.' }, digitalPresence: 'Not independently measured.',
    painPoints: [{ text: 'The prospect reports manual invoice review.' }],
    aiOpportunities: [{ title: 'Invoice-review pilot', description: 'Test a small sample before rollout; savings are not established.', impact: 'Medium' }],
    recommendedNextSteps: [{ content: 'Record a baseline and measure the pilot.' }],
    auditScores: { digitalReadiness: 5, automationPotential: 6, growthIndex: 5 }, sources: [source],
    verificationNote: 'Synthetic test evidence. Scores and recommendations are assessments.',
  };
  const row = { id, leadId, companyId, generationAttempt: 1, status: 'pending', verificationStatus: 'unverified', artifactStatus: 'pending', deliveryStatus: 'pending', lead, company: { name: lead.companyName } };
  let interrupted = false, researchCalls = 0, pdfCalls = 0, captured = 0;
  const prisma = {
    report: {
      findUnique: async () => ({ ...row }),
      update: async ({ data }) => {
        if (data.status === 'done' && !interrupted) { interrupted = true; throw new Error('Simulated interruption after PDF checkpoint'); }
        return Object.assign(row, data);
      },
      updateMany: async ({ where, data }) => {
        if (row.deliveryStatus !== where.deliveryStatus) return { count: 0 };
        Object.assign(row, data); return { count: 1 };
      },
    },
    pipelineStage: { create: async () => ({ id: randomUUID() }), update: async () => {} },
    reportSource: { deleteMany: async () => {}, createMany: async () => {} },
    $transaction: async fn => fn(prisma),
  };
  const job = { id: `${id}-1`, attemptsMade: 0, opts: { attempts: 3 }, data: { reportId: id, jobId: id, companyId, leadId, submittedAt: new Date().toISOString(), leadInput: lead } };
  const services = { prisma, enrich: async () => ({ sources: [source], logo: null }),
    generateAiReport: async () => { researchCalls++; return analysis; },
    generatePDF: async (...args) => { pdfCalls++; return generatePDF(...args); },
    saveReportPdf, storeReportIntelligence: async () => {} };
  await assert.rejects(processReport(job, services), /Simulated interruption/);
  assert.equal(row.artifactStatus, 'ready');
  job.attemptsMade++;
  await processReport(job, services);
  assert.equal(row.status, 'done'); assert.equal(researchCalls, 1); assert.equal(pdfCalls, 1);
  assert.equal(row.pdfUrl, `local:${id}`);
  const pdf = await readReportPdf(row.pdfUrl);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-'); assert.ok(pdf.length > 1000);
  const delivery = { prisma, readReportPdf,
    sendEmail: async (recipient, attachment, report, reportId) => {
      captured++; assert.deepEqual(attachment, pdf);
      const html = buildEmailHtml(recipient, report, reportId);
      assert.ok(html.includes(`/api/reports/${id}/access?token=`));
      return { id: 'locally-captured-only' };
    },
    sendSlackNotification: async () => {}, appUrl: () => 'https://example.invalid' };
  await deliverReport(id, delivery); await deliverReport(id, delivery);
  assert.equal(captured, 1); assert.equal(row.deliveryStatus, 'accepted');
  await mkdir(process.env.REPORTS_DIR, { recursive: true });
  await writeFile(path.join(process.env.REPORTS_DIR, 'result.json'), JSON.stringify({ checkedAt: new Date().toISOString(), reportId: id, pdfBytes: pdf.length, researchCalls, pdfCalls, capturedEmails: captured, database: 'in-memory test double', providers: 'simulated; no real outreach', passed: true }, null, 2));
});
