import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../shared/db.js';
import { reconcilePendingReports } from './services/reconcileReports.js';
import { appUrl } from '../shared/access.js';
import { assertWorkerConfiguration } from '../shared/readiness.js';
import { enrich } from './services/enrichment.js';
import { enrichCompany } from './services/researchCache.js';
import { generateAiReport } from './services/aiReport.js';
import { generatePDF } from './services/pdfGenerator.js';
import { saveReportPdf, readReportPdf } from '../shared/storage.js';
import { storeReportIntelligence } from './services/vectorStore.js';
import { processReport } from './services/pipeline.js';
import { deliverReport, queuePendingDelivery, recoverInterruptedDeliveries } from './services/delivery.js';
import { sendEmail, sendFollowUpEmail } from './services/emailService.js';
import { sendSlackNotification } from './services/slack.js';
import { processFollowUp, reconcileFollowUps } from './services/followupWorker.js';
import { processDiscoverySearch } from './services/discovery.js';
import { checkCompanySignals } from './services/signals.js';

assertWorkerConfiguration(process.env);
const connection = new IORedis(process.env.UPSTASH_REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 5000 });
const defaults = { attempts: 3, backoff: { type: 'exponential', delay: 10000 }, removeOnComplete: 500, removeOnFail: 500 };
const leadsQueue = new Queue('leads', { connection, defaultJobOptions: defaults });
const followupsQueue = new Queue('followups', { connection, defaultJobOptions: defaults });
const monitoringQueue = new Queue('monitoring', { connection, defaultJobOptions: defaults });
await leadsQueue.setGlobalConcurrency(2);
await monitoringQueue.setGlobalConcurrency(1);

const deliveryServices = { prisma, readReportPdf, sendEmail, sendSlackNotification, appUrl };
const deliver = reportId => deliverReport(reportId, deliveryServices);

const worker = new Worker('leads', async job => {
  if (job.name === 'discover-companies') return processDiscoverySearch(job.data.searchId, job.data);
  if (job.name === 'deliver-report') return deliver(job.data.reportId);
  await processReport(job, { prisma, enrich: (lead, companyId, freshResearch) => enrichCompany(lead, companyId, freshResearch, { prisma, enrich }), generateAiReport, generatePDF, saveReportPdf, storeReportIntelligence });
  await deliver(job.data.reportId);
}, { connection, concurrency: 2 });

let reconciling = false;
async function reconcile() {
  if (reconciling) return; reconciling = true;
  try {
    await reconcileFollowUps({ prisma, followupsQueue });
    await reconcilePendingReports({ prisma, leadsQueue });
    const searches = await prisma.discoverySearch.findMany({ where: { status: 'pending' }, take: 10 });
    for (const search of searches) await leadsQueue.add('discover-companies', { ...search, searchId: search.id }, { jobId: `discovery-${search.id}` });
    const ready = await prisma.report.findMany({ where: { status: 'done', deliveryStatus: 'pending', leadId: { not: null } }, take: 50 });
    for (const report of ready) await queuePendingDelivery(report.id, leadsQueue);
    await recoverInterruptedDeliveries(prisma);
  } finally { reconciling = false; }
}
const timer = setInterval(() => void reconcile().catch(error => console.error('Reconciliation failed', error.message)), 60000);
await reconcile();

const monitorWorker = new Worker('monitoring', async job => {
  const company = await prisma.company.findUnique({ where: { id: job.data.companyId }, include: { reports: { where: { status: 'done' }, orderBy: { generatedAt: 'desc' }, take: 1, include: { lead: true } } } });
  const previous = company?.reports[0];
  if (!company || !previous?.lead) return;
  const signal = await checkCompanySignals(company, previous);
  if (!signal.detectedSignal || signal.severity !== 'high') return;
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${company.id}))`;
    const exists = await tx.signal.findUnique({ where: { id: signal.id } });
    if (exists) return;
    await tx.signal.create({ data: { id: signal.id, companyId: company.id, type: signal.type, severity: signal.severity, data: { message: signal.message, sourceUrl: signal.url } } });
    const active = await tx.report.findFirst({ where: { companyId: company.id, status: { in: ['pending', 'processing'] } } });
    if (!active) await tx.report.create({ data: { companyId: company.id, leadId: previous.leadId, personaType: previous.personaType, freshResearch: true, deliveryStatus: previous.lead.outreachConsent ? 'pending' : 'skipped' } });
  });
}, { connection, concurrency: 1, limiter: { max: 10, duration: 3600000 } });
const followupsWorker = new Worker('followups', job => processFollowUp(job, { prisma, sendFollowUpEmail }), { connection, concurrency: 1 });

// Monitoring is opt-in and bounded. Only companies explicitly registered by staff are scheduled.
for (const runner of [worker, monitorWorker, followupsWorker]) runner.on('error', error => console.error('Worker error', error.message)).on('failed', (job, error) => console.error('Job failed', job?.id, error.message));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => {
  clearInterval(timer);
  await Promise.all([worker.close(), monitorWorker.close(), followupsWorker.close()]);
  await Promise.all([leadsQueue.close(), monitoringQueue.close(), followupsQueue.close()]);
  await connection.quit(); await prisma.$disconnect(); process.exit(0);
});
