const tokens = value => Number.isSafeInteger(value) && value >= 0 && value <= 2147483647 ? value : null;

export function usageValues(usage, provider, model) {
  const inputTokens = tokens(usage?.inputTokens ?? usage?.tokens);
  const outputTokens = tokens(usage?.outputTokens ?? (usage?.tokens != null ? 0 : undefined));
  let estimatedCostUSD = null;
  try {
    const rate = JSON.parse(process.env.AI_MODEL_PRICES || '{}')[`${provider}:${model}`];
    if (inputTokens !== null && outputTokens !== null && rate && [rate.inputPerMillionUSD, rate.outputPerMillionUSD].every(n => Number.isFinite(n) && n >= 0)) {
      const estimate = (inputTokens * rate.inputPerMillionUSD + outputTokens * rate.outputPerMillionUSD) / 1000000;
      if (Number.isFinite(estimate)) estimatedCostUSD = estimate;
    }
  } catch { /* Missing or invalid account rates leave cost unknown. */ }
  return { inputTokens, outputTokens, estimatedCostUSD };
}

export async function recordModelUsage(prisma, metadata, status, startedAt, usage) {
  try {
    await prisma.modelCall.create({ data: { reportId: metadata.reportId || null, operation: metadata.operation, provider: metadata.provider, model: metadata.model,
      status, durationMs: Math.min(2147483647, Math.max(0, Date.now() - startedAt)), ...usageValues(usage, metadata.provider, metadata.model) } });
  } catch { console.warn('Model usage could not be recorded; do not treat missing telemetry as zero cost.'); }
}

/** @template T @param {() => Promise<T>} call @returns {Promise<T>} */
export async function measureModelCall(prisma, metadata, call) {
  const startedAt = Date.now();
  let result;
  try { result = await call(); }
  catch (error) { await recordModelUsage(prisma, metadata, 'failed', startedAt); throw error; }
  await recordModelUsage(prisma, metadata, 'success', startedAt, result.usage);
  return result;
}
