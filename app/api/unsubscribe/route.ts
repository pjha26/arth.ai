import { prisma } from '@/lib/prisma';
import { verifyAccess } from '@/shared/access.js';
import { escapeHtml } from '@/shared/html.js';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get('leadId') || '', token = params.get('token') || '';
  if (!verifyAccess(token, 'unsubscribe', id)) return new Response('Invalid or expired unsubscribe link', { status: 403 });
  // Email scanners may follow links automatically. Only the user's confirmation changes state.
  return new Response(`<html><head><title>Unsubscribe</title></head><body><h1>Unsubscribe from ArthAI outreach</h1><form method="post"><input type="hidden" name="leadId" value="${escapeHtml(id)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">Confirm unsubscribe</button></form></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get('leadId') || ''), token = String(form.get('token') || '');
  if (!verifyAccess(token, 'unsubscribe', id)) return new Response('Invalid or expired unsubscribe link', { status: 403 });
  await prisma.lead.updateMany({ where: { id }, data: { unsubscribed: true, outreachConsent: false } });
  return new Response('You have been unsubscribed from future ArthAI outreach.', { headers: { 'Cache-Control': 'no-store' } });
}
