import { makeReportJob } from '../../shared/jobs.js';
import { runRecoveryTasks } from './reconcileReports.js';

const jobName = 'retry-report-embedding';
const retryStage = 'embedding_retry';
const recoveryWhere = {
  status: 'done',
  leadId: { not: null },
  stages: { some: { stage: 'embedding', status: 'failed' }, none: { stage: retryStage } },
};

export async function reconcileFailedEmbeddings({ prisma, leadsQueue }, afterId) {
  const reports = await prisma.report.findMany({
    where: { ...recoveryWhere, ...(afterId ? { id: { gt: afterId } } : {}) },
    orderBy: { id: 'asc' }, take: 10, select: { id: true, generationAttempt: true },
  });
  await runRecoveryTasks(reports.map(report => ({
    name: report.id,
    run: () => leadsQueue.add(jobName, { reportId: report.id, attempt: report.generationAttempt }, {
      jobId: `embedding-${report.id}-${report.generationAttempt}`,
      delay: 5 * 60000, attempts: 3, backoff: { type: jobName },
    }),
  })), (id, error) => console.error('Embedding retry dispatch failed', id, error.message));
  return reports.length === 10 ? reports.at(-1).id : undefined;
}

export async function retryReportEmbedding(job, { prisma, storeReportIntelligence }) {
  const { reportId, attempt } = job.data;
  const report = await prisma.report.findFirst({
    where: { ...recoveryWhere, id: reportId, generationAttempt: attempt },
    include: { lead: true, company: true },
  });
  if (!report?.lead || !report.insights) return;
  const record = (status, message) => prisma.pipelineStage.create({ data: { reportId, stage: retryStage, status, message } });
  try {
    const model = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
    const indexed = await prisma.embedding.count({ where: { reportId, metadata: { path: ['model'], equals: model } } });
    if (!indexed) {
      const payload = makeReportJob(report, report.lead, report.company);
      await storeReportIntelligence(payload.leadInput, report.insights, report.companyId, reportId);
    }
  } catch (error) {
    if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
      await record('failed', String(error.message || error).slice(0, 500));
    }
    throw error;
  }
  await record('done', null);
}

export function embeddingRetryBackoff(attemptsMade, type, error) {
  if (type !== jobName) return -1;
  const retryAfter = (error?.lastError ?? error)?.responseHeaders?.['retry-after'];
  const delay = retryAfter && /^\d+$/.test(retryAfter)
    ? Number(retryAfter) * 1000
    : retryAfter ? Date.parse(retryAfter) - Date.now() : 0;
  const base = attemptsMade * 5 * 60000;
  return Math.max(base, Number.isFinite(delay) ? Math.min(delay + 1000, 86401 * 1000) : 0);
}
