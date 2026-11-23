import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

export const admissionScript = `
  if #KEYS == 3 then
    local existing = redis.call('GET', KEYS[3])
    if existing then
      if existing == ARGV[4] then return 1 else return -1 end
    end
  end
  local n = tonumber(redis.call('GET', KEYS[1]) or '0')
  local g = tonumber(redis.call('GET', KEYS[2]) or '0')
  if ARGV[5] == 'model-budget' and g >= tonumber(ARGV[3]) then return -2 end
  if n >= tonumber(ARGV[2]) or g >= tonumber(ARGV[3]) then return 0 end
  n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  g = redis.call('INCR', KEYS[2]); if g == 1 then redis.call('EXPIRE', KEYS[2], 86400) end
  if #KEYS == 3 then redis.call('SET', KEYS[3], ARGV[4], 'EX', 86400) end
  return 1`;

/**
 * @param {Request} request
 * @param {string} action
 * @param {number} count
 * @param {number} seconds
 * @param {number} daily
 * @param {string | undefined} subject
 * @param {{key: string, fingerprint: string} | undefined} admission
 */
export async function limitRequest(request, action, count, seconds, daily, subject = undefined, admission = undefined) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return Response.json({ error: 'Request limits are not configured' }, { status: 503 });
  try {
    const redis = Redis.fromEnv();
    // Vercel supplies this header. Other hosts share the fallback bucket.
    const identity = subject || (process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') : null) || 'shared';
    const hash = createHash('sha256').update(identity).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    const keys = [`limit:${action}:${hash}:${Math.floor(now / seconds)}`, `budget:${action}:${Math.floor(now / 86400)}`];
    if (admission) keys.push(`admission:${action}:${admission.key}`);
    const result = await redis.eval(admissionScript, keys, [seconds, count, daily, admission?.fingerprint || '']);
    if (result === -1) return Response.json({ error: 'Submission ID was already used for different details' }, { status: 409 });
    return result === 1 ? null : Response.json({ error: 'Request limit reached. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(seconds) } });
  } catch { return Response.json({ error: 'Request limits are temporarily unavailable' }, { status: 503 }); }
}
