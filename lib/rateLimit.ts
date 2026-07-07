import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a new redis client using the REST URL and Token
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Sliding window: 5 requests per 10 minutes
export const livePreviewRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "ratelimit:live-preview",
  analytics: true,
});

// Fixed window: 200 requests per day
export const livePreviewGlobalRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(200, "1 d"),
  prefix: "ratelimit:live-preview:global",
  analytics: true,
});
