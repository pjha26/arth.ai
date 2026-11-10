import { prisma } from '../shared/db.js';
import { storeReportIntelligence } from '../worker/services/vectorStore.js';
import { makeReportJob } from '../shared/jobs.js';

const ids = process.argv.slice(2);
if (!ids.length || ids.length > 10 || ids.some(id => !/^[a-f0-9-]{36}$/i.test(id))) {
  throw new Error('Supply 1–10 explicit report UUIDs. No unscoped reindex is allowed.');
}
try {
  for (const id of ids) {
    const report = await prisma.report.findUnique({ where: { id }, include: { lead: true, company: true } });
    if (!report?.lead || report.status !== 'done' || !report.insights) throw new Error(`Report ${id} needs a completed report and a confirmed original lead`);
    const job = makeReportJob(report, report.lead, report.company);
    await storeReportIntelligence(job.leadInput, report.insights, report.companyId, id);
    console.log('Reindexed', id);
  }
} finally { await prisma.$disconnect(); }
