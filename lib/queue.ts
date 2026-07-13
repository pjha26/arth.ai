import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null, // required by BullMQ
  retryStrategy(times) {
    return Math.min(times * 1000, 10000); // 1s to 10s backoff for Redis reconnections
  },
  tls: process.env.UPSTASH_REDIS_URL?.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const leadsQueue = new Queue("leads", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
