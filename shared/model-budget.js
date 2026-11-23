import { Redis } from '@upstash/redis';
import { admissionScript } from './rate-limit.js';

/** @param {'google' | 'groq'} provider @returns {typeof fetch} */
export function budgetedModelFetch(provider) {
  return async (input, init) => {
    if (process.env.FREE_PILOT_MODE !== 'true') return fetch(input, init);
    init?.signal?.throwIfAborted();

    const prefix = provider === 'google' ? 'GEMINI' : 'GROQ';
    const minute = Number(process.env[`${prefix}_PILOT_REQUESTS_PER_MINUTE`] ?? 6);
    const day = Number(process.env[`${prefix}_PILOT_REQUESTS_PER_DAY`] ?? 40);
    if (!Number.isSafeInteger(minute) || !Number.isSafeInteger(day) || minute < 0 || day < 0) {
      return budgetError(503, 'Model request budget is misconfigured.');
    }
    if (!minute || !day) return budgetError(429, 'Model requests are disabled for this provider.');
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return budgetError(503, 'Model request budget is unavailable.');
    }

    const now = Math.floor(Date.now() / 1000);
    const keys = [`model-budget:${provider}:minute:${Math.floor(now / 60)}`, `model-budget:${provider}:day:${Math.floor(now / 86400)}`];
    try {
      const redis = Redis.fromEnv({ signal: AbortSignal.timeout(3000), retry: false });
      const allowed = await redis.eval(admissionScript, keys, [60, minute, day, '', 'model-budget']);
      if (allowed === 0 || allowed === -2) {
        const windowSeconds = allowed === -2 ? 86400 : 60;
        return budgetError(429, 'The pilot model request budget is exhausted.', windowSeconds - now % windowSeconds);
      }
      if (allowed !== 1) return budgetError(503, 'Model request budget is unavailable.');
    } catch {
      return budgetError(503, 'Model request budget is unavailable.');
    }
    return fetch(input, init);
  };
}

function budgetError(status, message, retryAfter = 0) {
  return Response.json({ error: { code: status, message } }, {
    status, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : {},
  });
}
