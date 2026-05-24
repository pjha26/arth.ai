import { NextRequest } from "next/server";
import IORedis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Create a fresh subscriber connection per request
      const subscriber = new IORedis(process.env.UPSTASH_REDIS_URL as string, {
        maxRetriesPerRequest: null
      });

      const channel = `stream:thoughts:${jobId}`;

      await subscriber.subscribe(channel);

      // Initial connection ping
      controller.enqueue(new TextEncoder().encode(`data: [System] Connected to Agent Terminal...\n\n`));

      subscriber.on("message", (ch, message) => {
        if (ch === channel) {
          // SSE format requires "data: <message>\n\n"
          controller.enqueue(new TextEncoder().encode(`data: ${message}\n\n`));
        }
      });

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        subscriber.quit();
        try {
          controller.close();
        } catch (e) {
          // Ignore if already closed
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}
