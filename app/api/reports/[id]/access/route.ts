import { NextResponse } from 'next/server';
import { cookieOptions, reportCookie, verifyAccess } from '@/shared/access.js';
import { prisma } from '@/lib/prisma';
import { guard } from '@/lib/auth';
import { reportLink } from '@/shared/access.js';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('token');
  const access = verifyAccess(token, 'report', id);
  if (!access) return new Response('This report link is invalid or expired. Request a new link from the team.', { status: 403 });
  const report = await prisma.report.findUnique({ where: { id }, select: { leadId: true } });
  if (!report || report.leadId !== access.leadId) return new Response('Report not found', { status: 404 });
  const response = NextResponse.redirect(new URL(`/report/${id}`, request.url), 303);
  response.cookies.set(reportCookie(id), token!, { ...cookieOptions, maxAge: Math.max(0, Math.floor(access.exp - Date.now() / 1000)) });
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(request); if (denied) return denied;
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id }, select: { leadId: true } });
  if (!report?.leadId) return Response.json({ error: 'Link the original lead before sharing this report' }, { status: 409 });
  return Response.json({ url: reportLink(id, report.leadId) }, { headers: { 'Cache-Control': 'no-store' } });
}
