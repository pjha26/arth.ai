import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { LeadSchema } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { sameOrigin, guard } from '@/lib/auth';
import { limitRequest } from '@/lib/rateLimit';
import { dispatchReport } from '@/lib/dispatch';
import { assertPublicUrl } from '@/shared/network.js';
import { cookieOptions, reportCookie, signAccess } from '@/shared/access.js';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Invalid origin', { status: 403 });
  const limited = await limitRequest(request, 'reports', 3, 3600, 100);
  if (limited) return limited;
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return Response.json({ message: 'Report access is not configured' }, { status: 503 });
  const input = LeadSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ message: 'Validation failed', errors: input.error.flatten().fieldErrors }, { status: 400 });
  let website: URL;
  try { website = await assertPublicUrl(input.data.website); }
  catch { return Response.json({ message: 'Enter a publicly accessible HTTP or HTTPS website' }, { status: 400 }); }
  const domain = website.hostname.replace(/^www\./, '').toLowerCase();
  const data = input.data;
  const requestKey = request.headers.get('Idempotency-Key');
  if (!requestKey || !/^[a-f0-9-]{36}$/i.test(requestKey)) return Response.json({ message: 'A valid submission ID is required' }, { status: 400 });
  const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  try {
    // Each requester gets a private report. Research reuse must never share another lead's context.
    let report = await prisma.report.findUnique({ where: { requestKey } });
    if (report && report.requestFingerprint !== fingerprint) return Response.json({ message: 'Submission ID was already used for different details' }, { status: 409 });
    if (!report) try { report = await prisma.$transaction(async tx => {
      const company = await tx.company.upsert({
        where: { domain }, update: {},
        create: { domain, website: website.origin, name: data.companyName || domain.split('.')[0], industry: data.industry, size: data.companySize },
      });
      const lead = await tx.lead.create({ data: {
        companyId: company.id, fullName: data.fullName, email: data.email.toLowerCase(),
        personaType: data.personaType.toLowerCase(), challengeTags: data.challengeTags,
        painPoints: data.painPoints || '', outreachConsent: data.outreachConsent,
      } });
      return tx.report.create({ data: { companyId: company.id, leadId: lead.id, personaType: lead.personaType, requestKey, requestFingerprint: fingerprint } });
    }); } catch (error) {
      report = await prisma.report.findUnique({ where: { requestKey } });
      if (!report || report.requestFingerprint !== fingerprint) throw error;
    }
    // Pending records are a durable dispatch intent. The worker reconciles failed enqueue attempts.
    await dispatchReport(report.id).catch(() => console.warn('Dispatch deferred to reconciliation:', report.id));
    const response = NextResponse.json({ success: true, jobId: report.id, message: 'Your report request has been saved.' }, { status: 202 });
    response.cookies.set(reportCookie(report.id), signAccess('report', report.id, report.leadId!), { ...cookieOptions, maxAge: 7 * 86400 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Lead submission failed', error);
    return Response.json({ message: 'Unable to save your request. Please try again.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const query = new URL(request.url).searchParams;
  const page = Math.max(1, Number(query.get('page')) || 1);
  const take = 50;
  const [reports, total] = await Promise.all([
    prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take, skip: (page - 1) * take,
      include: { lead: true, company: { include: { signals: { orderBy: { detectedAt: 'desc' }, take: 1 } } } } }),
    prisma.report.count(),
  ]);
  const leads = reports.map(({ lead, ...report }) => ({
    ...report, companyName: report.company.name, website: report.company.domain,
    industry: report.company.industry, companySize: report.company.size,
    salesStatus: lead?.salesStatus || "new",
    leadSource: lead?.source ?? null,
    email: lead?.email || '', fullName: lead?.fullName || '', painPoints: lead?.painPoints || '',
    intentProbability: process.env.ENABLE_INTENT_SCORING === 'true' && lead?.intentStatus === 'scored' ? lead.intentProbability : null,
    intentStatus: process.env.ENABLE_INTENT_SCORING === 'true' ? lead?.intentStatus || 'unknown' : 'disabled',
    intentModel: lead?.intentModel, intentScoredAt: lead?.intentScoredAt, hasPdf: report.artifactStatus === 'ready',
  }));
  return Response.json({ success: true, leads, page, total, pages: Math.ceil(total / take) }, { headers: { 'Cache-Control': 'no-store' } });
}
