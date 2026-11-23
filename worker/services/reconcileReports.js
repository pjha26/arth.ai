import { makeReportJob } from '../../shared/jobs.js';

export async function runRecoveryTasks(tasks, onError) {
  for (const task of tasks) {
    try { await task.run(); }
    catch (error) { onError(task.name, error); }
  }
}

export async function reconcilePendingReports({ prisma, leadsQueue }) {
  const pending = await prisma.report.findMany({
    where: { status: 'pending', leadId: { not: null } },
    include: { lead: true, company: true },
    take: 50,
    orderBy: [{ dispatchedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }, { id: 'asc' }],
  });
  await runRecoveryTasks(pending.map(report => ({
    name: report.id,
    run: async () => {
      await leadsQueue.add('process-report', makeReportJob(report, report.lead, report.company), { jobId: `${report.id}-${report.generationAttempt}` });
      await prisma.report.updateMany({
        where: { id: report.id, status: 'pending', generationAttempt: report.generationAttempt },
        data: { dispatchedAt: new Date() },
      });
    },
  })), (id, error) => console.error('Report dispatch recovery failed', id, error.message));
}
