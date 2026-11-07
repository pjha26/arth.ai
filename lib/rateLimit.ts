import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

// Vercel overwrites this header. Other hosts share a conservative fallback bucket.
export async function limitRequest(request: Request, action: string, count: number, seconds: number, daily: number, subject?: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return Response.json({ error: 'Request limits are not configured' }, { status: 503 });
  try {
    const redis = Redis.fromEnv();
    const identity = subject || (process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') : null) || 'shared';
    const hash = createHash('sha256').update(identity).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    const result = await redis.eval(`
      local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
      if n > tonumber(ARGV[2]) then return 0 end
      local g = redis.call('INCR', KEYS[2]); if g == 1 then redis.call('EXPIRE', KEYS[2], 86400) end
      if g > tonumber(ARGV[3]) then return 0 end
      return 1`,
      [`limit:${action}:${hash}:${Math.floor(now / seconds)}`, `budget:${action}:${Math.floor(now / 86400)}`], [seconds, count, daily]);
    return result === 1 ? null : Response.json({ error: 'Request limit reached. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(seconds) } });
  } catch { return Response.json({ error: 'Request limits are temporarily unavailable' }, { status: 503 }); }
}
