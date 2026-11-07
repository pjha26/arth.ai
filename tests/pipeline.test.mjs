import test from 'node:test';
import assert from 'node:assert/strict';
import { processReport } from '../worker/services/pipeline.js';

const id = '00000000-0000-4000-8000-000000000001';
function fixture() {
  const state = { id, leadId: id, companyId: id, generationAttempt: 1, status: 'pending', verificationStatus: 'unverified', artifactStatus: 'pending', insights: null };
  const stages = []; let generationCalls = 0;
  const prisma = {
    report: { findUnique: async () => ({ ...state }), update: async ({ data }) => Object.assign(state, data) },
    reportSource: { deleteMany: async () => {}, createMany: async () => {} },
    pipelineStage: { create: async ({ data }) => { const stage = { id: String(stages.length), ...data }; stages.push(stage); return stage; }, update: async ({ where, data }) => Object.assign(stages[Number(where.id)], data) },
    $transaction: async fn => fn(prisma),
  };
  const job = { id: `${id}-1`, attemptsMade: 0, opts: { attempts: 3 }, data: { leadId: id, reportId: id, companyId: id, jobId: id, submittedAt: new Date().toISOString(), leadInput: { id, fullName: null, email: null, website: 'https://example.com', companyName: 'Example', industry: 'SaaS', companySize: 'Unknown', personaType: 'cto', challengeTags: [], painPoints: 'Manual work' } } };
  const services = { prisma, enrich: async () => ({ sources: [{ id: 's1', url: 'https://example.com', title: 'Example', excerpt: 'Evidence', retrievedAt: new Date().toISOString(), publishedAt: null }] }), generateAiReport: async () => { generationCalls++; return { executiveSummary: 'Reviewed report', auditScores: { digitalReadiness: 6, automationPotential: 7, growthIndex: 8 } }; }, generatePDF: async () => Buffer.from('pdf'), saveReportPdf: async () => 'drive:private-file', storeReportIntelligence: async () => {} };
  return { state, stages, services, job, generationCalls: () => generationCalls };
}

test('a failed PDF step resumes the reviewed checkpoint without generating or emailing again', async () => {
  const f = fixture();
  const save = f.services.saveReportPdf; f.services.saveReportPdf = async () => { throw new Error('storage offline'); };
  await assert.rejects(processReport(f.job, f.services), /storage offline/);
  assert.equal(f.state.status, 'pending'); assert.equal(f.state.verificationStatus, 'reviewed'); assert.equal(f.generationCalls(), 1);
  f.services.saveReportPdf = save; f.job.attemptsMade = 1;
  await processReport(f.job, f.services);
  assert.equal(f.state.status, 'done'); assert.equal(f.state.artifactStatus, 'ready'); assert.equal(f.state.score, 70); assert.equal(f.generationCalls(), 1);
  await processReport(f.job, f.services); assert.equal(f.generationCalls(), 1);
});

test('insufficient evidence fails explicitly on the final attempt without creating a generic report', async () => {
  const f = fixture(); f.job.attemptsMade = 2; f.services.enrich = async () => { throw new Error('Insufficient evidence'); };
  await assert.rejects(processReport(f.job, f.services), /Insufficient evidence/);
  assert.equal(f.state.status, 'failed'); assert.equal(f.state.insights, null); assert.equal(f.generationCalls(), 0);
  assert.equal(f.stages[0].status, 'failed');
});

test('old attempt jobs cannot mutate a new report attempt', async () => {
  const f = fixture(); f.state.generationAttempt = 2;
  await processReport(f.job, f.services); assert.equal(f.stages.length, 0); assert.equal(f.state.status, 'pending');
});

test('jobs cannot write research into a different stored lead or company', async () => {
  for (const field of ['leadId', 'companyId']) {
    const f = fixture(); f.state[field] = '00000000-0000-4000-8000-000000000002';
    await assert.rejects(processReport(f.job, f.services), /stored report owner/);
    assert.equal(f.state.status, 'pending');
    assert.equal(f.stages.length, 0);
    assert.equal(f.generationCalls(), 0);
  }
});

test('a job ID for another report is ignored even when its attempt number matches', async () => {
  const f = fixture(); f.job.id = '00000000-0000-4000-8000-000000000002-1';
  await processReport(f.job, f.services);
  assert.equal(f.state.status, 'pending'); assert.equal(f.stages.length, 0);
});

test('restart after a saved PDF reuses both analysis and artifact checkpoints', async () => {
  const f = fixture();
  Object.assign(f.state, { status: 'processing', verificationStatus: 'reviewed', artifactStatus: 'ready', pdfUrl: 'drive:existing', insights: { executiveSummary: 'Saved analysis' } });
  f.services.enrich = f.services.generateAiReport = f.services.generatePDF = f.services.saveReportPdf = async () => { throw new Error('Checkpoint repeated'); };
  await processReport(f.job, f.services);
  assert.equal(f.state.status, 'done'); assert.equal(f.state.pdfUrl, 'drive:existing');
  assert.equal(f.stages.length, 0); assert.equal(f.generationCalls(), 0);
});
