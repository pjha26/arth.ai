import IORedis from 'ioredis';
import { accessFor, guard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { limitRequest } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guard(request, id); if (denied) return denied;
  const access = (await accessFor(id))!;
  const report = await prisma.report.findUnique({ where: { id }, select: { leadId: true, status: true } });
  if (!report || !access.staff && report.leadId !== access.leadId) return new Response('Not found', { status: 404 });
  const limited = await limitRequest(request, 'streams', 30, 600, 5000, `${id}:${access.leadId || 'staff'}`); if (limited) return limited;
  if (['done','failed'].includes(report.status)) return new Response(`data: [System] Report ${report.status}.\n\n`, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } });
  let cleanup = () => {};
  const body = new ReadableStream({
    async start(controller) {
      let closed = false;
      const subscriber = new IORedis(process.env.UPSTASH_REDIS_URL!, { maxRetriesPerRequest: 1, connectTimeout: 5000, commandTimeout: 5000, retryStrategy: () => null });
      const send = (message: string) => { if (!closed) controller.enqueue(new TextEncoder().encode(message.split('\n').map(line => `data: ${line}`).join('\n') + '\n\n')); };
      const timer = setTimeout(() => cleanup(), 30000);
      cleanup = () => {
        if (closed) return; closed = true;
        clearTimeout(timer); subscriber.disconnect(); request.signal.removeEventListener('abort', cleanup);
        try { controller.close(); } catch { /* Already cancelled by the reader. */ }
      };
      request.signal.addEventListener('abort', cleanup, { once: true });
      subscriber.on('error', () => { send('[System] Live updates unavailable; status polling continues.'); cleanup(); });
      subscriber.on('message', (_channel, message) => send(message));
      try {
        if (request.signal.aborted) return cleanup();
        await subscriber.subscribe(`stream:thoughts:${id}`);
        send('[System] Connected to report progress.');
      } catch { cleanup(); }
    },
    cancel() { cleanup(); },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' } });
}
