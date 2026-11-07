import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET) return new Response('Webhook not configured', { status: 503 });
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({ payload: await request.text(), webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      headers: { id: request.headers.get('svix-id') || '', timestamp: request.headers.get('svix-timestamp') || '', signature: request.headers.get('svix-signature') || '' } });
  } catch { return new Response('Invalid webhook signature', { status: 400 }); }
  const statuses: Record<string, string> = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.failed': 'failed', 'email.complained': 'complained' };
  const status = statuses[event.type];
  if (status && 'email_id' in event.data) {
    const found = await prisma.report.findFirst({ where: { providerMessageId: event.data.email_id }, select: { id: true } });
    if (!found) return new Response('Email acceptance is still being recorded; retry this event', { status: 503 });
    await prisma.report.updateMany({ where: { providerMessageId: event.data.email_id, deliveryStatus: { in: status === 'delivered' ? ['accepted', 'sending', 'uncertain'] : ['accepted', 'sending', 'uncertain', 'delivered'] } }, data: { deliveryStatus: status } });
  }
  return new Response('OK');
}
