export async function applyEmailEvent(prisma, event) {
  const statuses = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.failed': 'failed', 'email.complained': 'complained' };
  const status = typeof event?.type === 'string' && Object.hasOwn(statuses, event.type) ? statuses[event.type] : null;
  const messageId = event?.data?.email_id;
  if (!status || typeof messageId !== 'string' || !messageId || messageId.length > 200) return 'ignored';
  return prisma.$transaction(async tx => {
    const report = await tx.report.findFirst({ where: { providerMessageId: messageId }, select: { id: true, leadId: true } });
    const task = report ? null : await tx.followUp.findFirst({ where: { providerMessageId: messageId }, select: { id: true, report: { select: { leadId: true } } } });
    if (!report && !task) return 'retry';
    const allowed = status === 'delivered' ? ['accepted', 'sending', 'uncertain'] : ['accepted', 'sending', 'uncertain', 'delivered'];
    if (status === 'complained') allowed.push('bounced', 'failed', 'complained');
    if (report) await tx.report.updateMany({ where: { id: report.id, deliveryStatus: { in: allowed } }, data: { deliveryStatus: status } });
    else await tx.followUp.updateMany({ where: { id: task.id, status: { in: allowed } }, data: { status } });
    const leadId = report?.leadId || task?.report.leadId;
    if (status === 'complained' && leadId) await tx.lead.update({ where: { id: leadId }, data: { unsubscribed: true } });
    return 'updated';
  });
}
