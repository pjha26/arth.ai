import { Queue } from "bullmq";
import IORedis from "ioredis";

let queue: Queue | undefined;
export function getLeadsQueue() {
if (queue) return queue;
const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 5000,
  commandTimeout: 5000,
});

queue = new Queue("leads", {
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

return queue;
}
