import { validProbability } from './chat.js';

export async function storeIntentScore(prisma, leadId, reportId, messageAt, result) {
  if (!validProbability(result.intent_probability) || typeof result.model_version !== 'string' || !result.model_version || result.model_version.length > 100) throw new Error('Invalid scoring response');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${leadId}))`;
    const current = await tx.lead.findUnique({ where: { id: leadId } });
    if (!current || current.intentScoredAt && current.intentScoredAt >= messageAt) return false;
    const now = new Date();
    const crossing = result.intent_probability > 0.75 && (current.intentProbability == null || current.intentProbability <= 0.75);
    const alert = crossing && (!current.intentAlertedAt || now - current.intentAlertedAt >= 86400000);
    await tx.lead.update({ where: { id: leadId }, data: { intentProbability: result.intent_probability, intentModel: result.model_version, intentScoredAt: messageAt, intentStatus: 'scored', ...(alert ? { intentAlertedAt: now } : {}) } });
    if (alert) await tx.reportEvent.create({ data: { reportId, actor: leadId, type: 'intent-alert' } });
    return alert;
  });
}

export async function markIntentUnavailable(prisma, leadId, messageAt) {
  await prisma.lead.updateMany({ where: { id: leadId, OR: [{ intentScoredAt: null }, { intentScoredAt: { lt: messageAt } }] },
    data: { intentProbability: null, intentModel: null, intentScoredAt: messageAt, intentStatus: 'unavailable' } });
}
