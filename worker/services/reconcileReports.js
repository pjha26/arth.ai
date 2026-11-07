import { makeReportJob } from '../../shared/jobs.js';

export async function reconcilePendingReports({ prisma, leadsQueue }) {
  const pending = await prisma.report.findMany({ where: { status: 'pending', leadId: { not: null } }, include: { lead: true, company: true }, take: 50, orderBy: { createdAt: 'asc' } });
  for (const report of pending) {
    await leadsQueue.add('process-report', makeReportJob(report, report.lead, report.company), { jobId: `${report.id}-${report.generationAttempt}` });
    await prisma.report.update({ where: { id: report.id }, data: { dispatchedAt: new Date() } });
  }
}
