import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { applyEmailEvent } from '@/shared/delivery-events.js';

export async function POST(request: Request) {
  if (!process.env.RESEND_WEBHOOK_SECRET) return new Response('Webhook not configured', { status: 503 });
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({ payload: await request.text(), webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      headers: { id: request.headers.get('svix-id') || '', timestamp: request.headers.get('svix-timestamp') || '', signature: request.headers.get('svix-signature') || '' } });
  } catch { return new Response('Invalid webhook signature', { status: 400 }); }
  if (await applyEmailEvent(prisma, event) === 'retry') return new Response('Email acceptance is still being recorded; retry this event', { status: 503 });
  return new Response('OK');
}
