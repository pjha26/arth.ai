import { writeFile } from 'node:fs/promises';
import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { assertStaging } from './staging-safety.mjs';
import { prisma } from '../../shared/db.js';
import { appUrl } from '../../shared/access.js';
import { enrich } from '../../worker/services/enrichment.js';
import { enrichCompany } from '../../worker/services/researchCache.js';
import { generateAiReport } from '../../worker/services/aiReport.js';
import { generatePDF } from '../../worker/services/pdfGenerator.js';
import { saveReportPdf, readReportPdf } from '../../shared/storage.js';
import { storeReportIntelligence } from '../../worker/services/vectorStore.js';
import { processReport } from '../../worker/services/pipeline.js';
import { deliverReport, recoverInterruptedDeliveries } from '../../worker/services/delivery.js';
import { reconcilePendingReports } from '../../worker/services/reconcileReports.js';
import { sendEmail } from '../../worker/services/emailService.js';

assertStaging();
const reportId = process.env.ARTHAI_CRASH_REPORT_ID;
const boundary = process.env.ARTHAI_CRASH_BOUNDARY;
prisma.$use(async (params, next) => {
  const result = await next(params);
  const data = params.args?.data;
  const hit = params.model === 'PipelineStage' && params.action === 'create' && data?.reportId === reportId &&
    (boundary === 'research' && data.stage === 'pdf' && data.status === 'running' || boundary === 'email' && data.stage === 'email' && data.status === 'done') ||
    boundary === 'pdf' && params.model === 'Report' && params.action === 'update' && params.args.where.id === reportId && data?.artifactStatus === 'ready';
  if (hit) {
    await writeFile(`.data/staging/crash-${reportId}.json`, JSON.stringify({ boundary }));
    await new Promise(() => {});
  }
  return result;
});
const connection = new Redis(process.env.UPSTASH_REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue('leads', { connection, defaultJobOptions: { attempts: 3, backoff: { type: 'fixed', delay: 100 } } });
await recoverInterruptedDeliveries(prisma);
await reconcilePendingReports({ prisma, leadsQueue: queue });
const worker = new Worker('leads', async job => {
  await processReport(job, { prisma, enrich: (lead, companyId, fresh) => enrichCompany(lead, companyId, fresh, { prisma, enrich }), generateAiReport, generatePDF, saveReportPdf, storeReportIntelligence });
  await deliverReport(job.data.reportId, { prisma, readReportPdf, sendEmail, appUrl, sendSlackNotification: async () => {} });
}, { connection, concurrency: 2, lockDuration: 2000, stalledInterval: 1000 });
worker.on('error', error => console.error(error.message));
worker.on('failed', (job, error) => console.error('Recovery job failed', job?.id, error.message));
process.on('SIGTERM', async () => { await worker.close(); await queue.close(); await connection.quit(); await prisma.$disconnect(); process.exit(0); });
