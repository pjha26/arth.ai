import { createHash } from 'node:crypto';
import { validProbability } from './chat.js';

const alertThreshold = 0.75;

export async function storeIntentScore(prisma, leadId, reportId, message, result) {
  const messageAt = message.createdAt;
  if (!validProbability(result.intent_probability) || typeof result.model_version !== 'string' || !result.model_version || result.model_version.length > 100) throw new Error('Invalid scoring response');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${leadId}))`;
    const current = await tx.lead.findUnique({ where: { id: leadId } });
    if (!current || current.intentScoredAt && current.intentScoredAt >= messageAt) return false;
    const now = new Date();
    const crossing = result.intent_probability > alertThreshold && (current.intentProbability == null || current.intentProbability <= alertThreshold);
    const alert = crossing && (!current.intentAlertedAt || now - current.intentAlertedAt >= 86400000);
    const sample = result.intent_probability <= alertThreshold && current.source === 'manual'
      && !current.intentAlertedAt && !current.intentSampledAt
      && createHash('sha256').update(leadId).digest().readUInt32BE(0) % 10 === 0;
    const updated = await tx.lead.updateMany({
      where: { id: leadId, OR: [{ intentScoredAt: null }, { intentScoredAt: { lt: messageAt } }] },
      data: {
        intentProbability: result.intent_probability, intentModel: result.model_version, intentScoredAt: messageAt, intentStatus: 'scored',
        ...(alert ? { intentAlertedAt: now } : {}), ...(sample ? { intentSampledAt: now } : {}),
      },
    });
    if (!updated.count) return false;
    if (alert || sample) await tx.reportEvent.create({ data: {
      reportId, actor: leadId, type: alert ? 'intent-alert' : 'intent-sample',
      intentScore: result.intent_probability, intentModel: result.model_version, intentMessageId: message.id,
      ...(alert ? { slackStatus: 'pending', slackDueAt: now } : {}),
    } });
    return alert;
  });
}

export async function markIntentUnavailable(prisma, leadId, messageAt) {
  await prisma.lead.updateMany({ where: { id: leadId, OR: [{ intentScoredAt: null }, { intentScoredAt: { lt: messageAt } }] },
    data: { intentProbability: null, intentModel: null, intentScoredAt: messageAt, intentStatus: 'unavailable' } });
}
