export async function reconcileFollowUps({ prisma, followupsQueue }) {
  const now = new Date();
  await prisma.followUp.updateMany({ where: { status: 'sending', startedAt: { lt: new Date(now.getTime() - 10 * 60000) } },
    data: { status: 'uncertain', errorMessage: 'Worker interrupted during follow-up dispatch; inspect provider before retrying.' } });
  const due = await prisma.followUp.findMany({ where: { status: 'pending', dueAt: { lte: now } }, orderBy: { dueAt: 'asc' }, take: 50 });
  for (const task of due) await followupsQueue.add('followup', { taskId: task.id }, { jobId: `followup-${task.id}`, removeOnComplete: true, removeOnFail: true });
}

export async function processFollowUp(job, { prisma, sendFollowUpEmail }) {
  // Legacy queue payloads have no durable task and must not trigger untracked outreach.
  if (!job.data.taskId) return;
  const task = await prisma.followUp.findUnique({ where: { id: job.data.taskId }, include: { report: { include: { lead: true, company: true, followUps: { where: { status: { in: ['bounced', 'failed', 'complained'] } }, select: { id: true }, take: 1 } } } } });
  if (!task || task.status !== 'pending' || task.dueAt > new Date()) return;
  const report = task.report, lead = report?.lead;
  if (![1, 2, 3].includes(task.stage)) throw new Error('Invalid follow-up stage');
  const expired = task.dueAt.getTime() < Date.now() - 86400000;
  if (expired || !lead?.email || lead.unsubscribed || !lead.outreachConsent || report.followUps?.length || report.status !== 'done' || !['accepted', 'delivered'].includes(report.deliveryStatus)) {
    await prisma.followUp.updateMany({ where: { id: task.id, status: 'pending' }, data: { status: 'skipped', errorMessage: expired ? 'Follow-up expired; do not send overdue messages in a burst.' : 'Recipient or report is no longer eligible for follow-up.' } });
    return;
  }
  const claimed = await prisma.followUp.updateMany({ where: { id: task.id, status: 'pending' }, data: { status: 'sending', startedAt: new Date() } });
  if (!claimed.count) return;
  try {
    const sent = await sendFollowUpEmail(report, task.stage);
    await prisma.followUp.update({ where: { id: task.id }, data: { status: 'accepted', providerMessageId: sent.id, errorMessage: null } });
  } catch (error) {
    // The provider may have accepted the message; automatic retries could duplicate outreach.
    await prisma.followUp.updateMany({ where: { id: task.id, status: 'sending' }, data: { status: 'uncertain', errorMessage: error.message.slice(0, 500) } });
  }
}
