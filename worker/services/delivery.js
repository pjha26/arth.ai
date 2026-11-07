export async function queuePendingDelivery(reportId, queue) {
  const jobId = `delivery-${reportId}`;
  const existing = await queue.getJob(jobId);
  if (existing && await existing.getState() === 'failed') return existing.retry();
  return queue.add('deliver-report', { reportId }, { jobId, removeOnFail: true });
}

export async function recoverInterruptedDeliveries(prisma) {
  await prisma.report.updateMany({ where: { deliveryStatus: 'sending', deliveryStartedAt: { lt: new Date(Date.now() - 10 * 60000) } }, data: { deliveryStatus: 'uncertain', deliveryError: 'Worker interrupted during email dispatch; inspect provider before retrying.' } });
}

export async function deliverReport(reportId, services) {
  const { prisma, readReportPdf, sendEmail, sendSlackNotification, appUrl } = services;
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { lead: true, company: true } });
  if (!report || report.status !== 'done' || !report.lead || report.deliveryStatus !== 'pending') return;
  const lead = report.lead;
  if (!lead.email || lead.unsubscribed) {
    await prisma.report.updateMany({ where: { id: reportId, deliveryStatus: 'pending' }, data: { deliveryStatus: 'skipped' } });
    return;
  }
  let pdf;
  try {
    pdf = await readReportPdf(report.pdfUrl);
  } catch (error) {
    await prisma.report.updateMany({ where: { id: reportId, deliveryStatus: 'pending' }, data: { deliveryError: error.message.slice(0, 500) } });
    throw error;
  }
  const claimed = await prisma.report.updateMany({ where: { id: reportId, deliveryStatus: 'pending' }, data: { deliveryStatus: 'sending', deliveryStartedAt: new Date() } });
  if (!claimed.count) return;
  try {
    const sent = await sendEmail({ ...lead, companyName: report.company.name }, pdf, report.insights, reportId);
    const acceptedAt = new Date();
    await prisma.$transaction(async tx => {
      await tx.report.update({ where: { id: reportId }, data: { deliveryStatus: 'accepted', providerMessageId: sent.id, deliveryError: null } });
      if (lead.outreachConsent) await tx.followUp.createMany({ data: [[1, 2], [2, 5], [3, 10]].map(([stage, days]) => ({ reportId, stage, dueAt: new Date(acceptedAt.getTime() + days * 86400000) })), skipDuplicates: true });
    });
    await prisma.pipelineStage.create({ data: { reportId, stage: 'email', status: 'done', message: 'Accepted by email provider; delivery confirmation is separate.' } });
    await sendSlackNotification(`Report for *${report.company.name}* is ready; email accepted. ${appUrl()}/dashboard/reports/${reportId}`).catch(error => console.warn("Slack notification failed", error.message));
  } catch (error) {
    // Provider acceptance may have happened before the response was lost. Never resend blindly.
    await prisma.report.updateMany({ where: { id: reportId, deliveryStatus: 'sending' }, data: { deliveryStatus: 'uncertain', deliveryError: error.message.slice(0, 500) } });
    const latest = await prisma.report.findUnique({ where: { id: reportId }, select: { deliveryStatus: true } });
    if (["accepted", "delivered"].includes(latest.deliveryStatus)) { console.warn("Post-delivery hook failed", error.message); return; }
    await prisma.pipelineStage.create({ data: { reportId, stage: 'email', status: 'failed', message: 'Delivery requires review; report and PDF remain available.' } });
  }
}

