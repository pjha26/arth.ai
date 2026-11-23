import test from 'node:test';
import assert from 'node:assert/strict';
import { processReport } from '../worker/services/pipeline.js';
import { UnrecoverableError } from 'bullmq';
import { INSUFFICIENT_RESEARCH_EVIDENCE } from '../shared/report.js';
import { reconcilePendingReports, runRecoveryTasks } from '../worker/services/reconcileReports.js';
import { embeddingRetryBackoff, reconcileFailedEmbeddings, retryReportEmbedding } from '../worker/services/embeddingRecovery.js';

test('embedding recovery queues a delayed job, retries only indexing, and records terminal outcomes', async () => {
  const f = fixture();
  const id = f.state.id;
  const report = { ...f.state, status: 'done', insights: { executiveSummary: 'Saved report' }, createdAt: new Date(),
    personaType: 'cto', lead: { id, companyId: id, fullName: null, email: null, painPoints: '' },
    company: { id, website: 'https://example.com', name: 'Example' } };
  const history = [];
  let indexCalls = 0, indexFailed = true;
  const prisma = {
    report: { findMany: async ({ where }) => {
      assert.equal(where.stages.some.stage, 'embedding');
      assert.equal(where.status, 'done');
      assert.equal(where.id.gt, 'cursor');
      return [report];
    }, findFirst: async ({ where }) => where.generationAttempt === report.generationAttempt ? report : null },
    embedding: { count: async () => indexCalls && !indexFailed ? 1 : 0 },
    pipelineStage: { create: async ({ data }) => history.push(data) },
  };
  const leadsQueue = { add: async (name, data, opts) => {
    assert.equal(name, 'retry-report-embedding');
    assert.deepEqual(data, { reportId: id, attempt: 1 });
    assert.equal(opts.jobId, `embedding-${id}-1`);
    assert.equal(opts.delay, 300000);
  } };
  assert.equal(await reconcileFailedEmbeddings({ prisma, leadsQueue }, 'cursor'), undefined);
  const services = { prisma, storeReportIntelligence: async () => {
    indexCalls++;
    if (indexFailed) throw new Error('Provider busy');
  } };
  const job = { data: { reportId: id, attempt: 1 }, attemptsMade: 0, opts: { attempts: 3 } };
  await retryReportEmbedding({ ...job, data: { reportId: id, attempt: 0 } }, services);
  assert.equal(indexCalls, 0);
  await assert.rejects(retryReportEmbedding(job, services), /Provider busy/);
  assert.equal(history.length, 0);
  await assert.rejects(retryReportEmbedding({ ...job, attemptsMade: 2 }, services), /Provider busy/);
  assert.equal(history[0].status, 'failed');
  indexCalls = 0;
  indexFailed = false;
  await retryReportEmbedding(job, services);
  await retryReportEmbedding(job, services); // A replay after the vectors were written uses the existing index.
  assert.equal(indexCalls, 1);
  assert.equal(history.at(-1).status, 'done');
  assert.equal(embeddingRetryBackoff(1, 'retry-report-embedding', {}), 300000);
  assert.equal(embeddingRetryBackoff(1, 'retry-report-embedding', { lastError: { responseHeaders: { 'retry-after': '3600' } } }), 3601000);
});

test('indexing batches report chunks, keeps their order, and preserves existing vectors on an incomplete response', async t => {
  const settings = { GEMINI_API_KEY: 'fixture-key', FREE_PILOT_MODE: 'false', EMBEDDING_MODEL: 'gemini-embedding-001' };
  const previous = Object.keys(settings).map(key => [key, process.env[key]]);
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const { storeReportIntelligence } = await import('../worker/services/vectorStore.js');
  const written = [];
  let incomplete = false;
  const provider = t.mock.method(globalThis, 'fetch', async (input, init) => {
    assert.match(String(input), /:batchEmbedContents$/);
    const { requests } = JSON.parse(init.body);
    assert.equal(requests.length, 2);
    assert.ok(requests.every(request => request.outputDimensionality === 768));
    return Response.json({ embeddings: requests.slice(0, incomplete ? 1 : 2)
      .map((_, index) => ({ values: Array.from({ length: 768 }, (_value, dimension) => dimension === 0 ? index + 1 : 0) })) });
  });
  const transaction = t.mock.fn(async run => run({
    $queryRaw: async () => [{ id: 'report-id' }],
    embedding: { deleteMany: async () => {} },
    $executeRaw: async (_sql, _company, _report, chunk, vector) => written.push([chunk, JSON.parse(vector)[0]]),
  }));
  const db = { modelCall: { create: async () => {} }, $transaction: transaction };
  const index = () => storeReportIntelligence({ companyName: 'Example' },
    { executiveSummary: 'Summary', painPoints: ['Verify invoices'] }, 'company-id', 'report-id', db);
  await index();
  assert.equal(provider.mock.callCount(), 1);
  assert.match(written[0][0], /Summary/);
  assert.deepEqual(written[1], ['Pain point: Verify invoices', 2]);
  assert.equal(written[0][1], 1);
  incomplete = true;
  await assert.rejects(index());
  assert.equal(transaction.mock.callCount(), 1);
});

test('recovery prioritizes undispatched reports and continues after an individual enqueue fails', async t => {
  const firstId = '00000000-0000-4000-8000-000000000011';
  const secondId = '00000000-0000-4000-8000-000000000012';
  const leadId = '00000000-0000-4000-8000-000000000013';
  const companyId = '00000000-0000-4000-8000-000000000014';
  const first = { id: firstId, generationAttempt: 2, leadId, companyId, personaType: 'cto', createdAt: new Date(),
    lead: { id: leadId, companyId, fullName: null, email: null, painPoints: '' },
    company: { id: companyId, website: 'https://example.com', name: 'Example' } };
  const second = { ...first, id: secondId, generationAttempt: 3 };
  const updates = [];
  const errors = t.mock.method(console, 'error', () => {});
  await reconcilePendingReports({
    prisma: { report: {
      findMany: async ({ orderBy, take }) => {
        assert.deepEqual(orderBy[0], { dispatchedAt: { sort: 'asc', nulls: 'first' } });
        assert.equal(take, 50);
        return [first, second];
      },
      updateMany: async ({ where }) => { updates.push(where); },
    } },
    leadsQueue: { add: async (_name, _data, { jobId }) => {
      if (jobId === `${firstId}-2`) throw new Error('Temporary queue error');
      assert.equal(jobId, `${secondId}-3`);
    } },
  });
  assert.equal(errors.mock.callCount(), 1);
  assert.deepEqual(updates, [{ id: secondId, status: 'pending', generationAttempt: 3 }]);
});

test('startup and scheduled recovery continue after synchronous or asynchronous task failure', async () => {
  const ran = [], failures = [];
  await runRecoveryTasks([
    { name: 'follow-ups', run: () => { throw new Error('Unavailable queue'); } },
    { name: 'reports', run: async () => { ran.push('reports'); } },
    { name: 'delivery', run: async () => { throw new Error('Unavailable job'); } },
    { name: 'alerts', run: async () => { ran.push('alerts'); } },
  ], (name, error) => failures.push([name, error.message]));
  assert.deepEqual(ran, ['reports', 'alerts']);
  assert.deepEqual(failures, [['follow-ups', 'Unavailable queue'], ['delivery', 'Unavailable job']]);
});

const id = '00000000-0000-4000-8000-000000000001';
function fixture() {
  const state = { id, leadId: id, companyId: id, generationAttempt: 1, status: 'pending', verificationStatus: 'unverified', artifactStatus: 'pending', insights: null };
  const stages = []; let generationCalls = 0;
  const prisma = {
    report: { findUnique: async () => ({ ...state }), update: async ({ data }) => Object.assign(state, data) },
    reportSource: { deleteMany: async () => {}, createMany: async () => {} },
    pipelineStage: { create: async ({ data }) => { const stage = { id: String(stages.length), ...data }; stages.push(stage); return stage; }, update: async ({ where, data }) => Object.assign(stages[Number(where.id)], data), updateMany: async ({ data }) => { for (const stage of stages.filter(s => s.status === 'running')) Object.assign(stage, data); } },
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

test('insufficient evidence stops automatic retries on the first attempt without creating a generic report', async () => {
  const f = fixture();
  f.services.enrich = async () => { throw new Error(INSUFFICIENT_RESEARCH_EVIDENCE); };
  await assert.rejects(processReport(f.job, f.services), UnrecoverableError);
  assert.equal(f.state.status, 'failed'); assert.equal(f.state.insights, null); assert.equal(f.generationCalls(), 0);
  assert.equal(f.stages[0].status, 'failed');
});

test('failed embeddings are recorded separately without blocking the PDF or fallback chat', async t => {
  const f = fixture();
  t.mock.method(console, 'warn', () => {});
  f.services.storeReportIntelligence = async () => { throw new Error('Embedding quota exhausted'); };
  await processReport(f.job, f.services);
  assert.equal(f.state.status, 'done');
  assert.equal(f.state.artifactStatus, 'ready');
  assert.equal(f.state.chatEnabled, true);
  const indexing = f.stages.find(entry => entry.stage === 'embedding');
  assert.equal(indexing?.status, 'failed');
  assert.equal(indexing.message, 'Embedding quota exhausted');
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
  f.stages.push({ id: '0', stage: 'pdf', status: 'running' });
  Object.assign(f.state, { status: 'processing', verificationStatus: 'reviewed', artifactStatus: 'ready', pdfUrl: 'drive:existing', insights: { executiveSummary: 'Saved analysis' } });
  f.services.enrich = f.services.generateAiReport = f.services.generatePDF = f.services.saveReportPdf = async () => { throw new Error('Checkpoint repeated'); };
  await processReport(f.job, f.services);
  assert.equal(f.state.status, 'done'); assert.equal(f.state.pdfUrl, 'drive:existing');
  assert.deepEqual(f.stages.map(stage => [stage.stage, stage.status]), [['pdf', 'failed'], ['embedding', 'done']]);
  assert.match(f.stages[0].message, /interrupted/);
  assert.equal(f.generationCalls(), 0);
});
