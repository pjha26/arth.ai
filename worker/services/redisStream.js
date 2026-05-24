import IORedis from "ioredis";

// Create a publisher instance specifically for streaming
// We use a separate instance from BullMQ to avoid connection blockages
const publisher = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * Publishes a thought string to a specific job's Redis channel.
 * 
 * @param {string} jobId The ID of the lead/job
 * @param {string} message The thought to stream to the UI
 */
export function streamThought(jobId, message) {
  if (!jobId) return;
  
  // Also log to terminal for local debugging
  console.log(`[Stream -> ${jobId}] ${message}`);

  // Publish to a specific channel: stream:thoughts:jobId
  publisher.publish(`stream:thoughts:${jobId}`, message).catch(err => {
    console.error(`[RedisStream] Failed to publish thought for ${jobId}:`, err.message);
  });
}
