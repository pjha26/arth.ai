import { prisma } from '@/lib/prisma';
import { getLeadsQueue } from '@/lib/queue';
import { makeReportJob } from '@/shared/jobs.js';

export async function dispatchReport(id: string) {
  const report = await prisma.report.findUnique({ where: { id }, include: { lead: true, company: true } });
  if (!report?.lead || report.status !== 'pending') return;
  const job = makeReportJob(report, report.lead, report.company);
  await getLeadsQueue().add('process-report', job, { jobId: `${id}-${report.generationAttempt}` });
  await prisma.report.update({ where: { id }, data: { dispatchedAt: new Date() } });
}
