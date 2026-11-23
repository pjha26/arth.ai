import { guard } from '@/lib/auth';
import { limitRequest } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { createCatalogueReport } from '@/lib/catalogue-research';
import { dispatchReport } from '@/lib/dispatch';
import { assertPublicUrl } from '@/shared/network.js';
import { readBoundedJson } from '@/shared/request-json.js';
import { z } from 'zod';

type Context = { params: Promise<{ id: string }> };
const entryId = z.string().uuid();
const noStore = { 'Cache-Control': 'no-store' };
const unavailable = () => Response.json({ message: 'Catalogue actions are temporarily unavailable.' }, { status: 503, headers: noStore });

export async function PATCH(request: Request, { params }: Context) {
  const denied = await guard(request);
  if (denied) return denied;
  if (process.env.ENABLE_CSV_CATALOGUE !== 'true') return unavailable();
  const { id } = await params;
  const body = await readBoundedJson(request, 1024);
  if (body.response) return body.response;
  const input = z.object({ shortlisted: z.boolean() }).strict().safeParse(body.value);
  if (!entryId.safeParse(id).success || !input.success) {
    return Response.json({ message: 'Invalid shortlist request.' }, { status: 400, headers: noStore });
  }
  try {
    const result = await prisma.catalogueCompany.updateMany({
      where: { id, shortlistedAt: input.data.shortlisted ? null : { not: null } },
      data: { shortlistedAt: input.data.shortlisted ? new Date() : null },
    });
    if (!result.count && !await prisma.catalogueCompany.findUnique({ where: { id }, select: { id: true } })) {
      return Response.json({ message: 'Catalogue entry not found.' }, { status: 404, headers: noStore });
    }
    return Response.json({ shortlisted: input.data.shortlisted }, { headers: noStore });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request, { params }: Context) {
  const denied = await guard(request);
  if (denied) return denied;
  if (process.env.ENABLE_CSV_CATALOGUE !== 'true') return unavailable();
  const { id } = await params;
  if (!entryId.safeParse(id).success) return Response.json({ message: 'Invalid catalogue entry.' }, { status: 400, headers: noStore });
  try {
    const entry = await prisma.catalogueCompany.findUnique({
      where: { id }, select: { website: true, shortlistedAt: true, researchReportId: true, researchSequence: true },
    });
    if (!entry) return Response.json({ message: 'Catalogue entry not found.' }, { status: 404, headers: noStore });
    if (entry.researchReportId) return Response.json({ jobId: entry.researchReportId, created: false }, { headers: noStore });
    if (!entry.shortlistedAt) return Response.json({ message: 'Shortlist this company before requesting research.' }, { status: 409, headers: noStore });
    const limited = await limitRequest(request, 'report-ingress', 30, 60, 10000);
    if (limited) return limited;
    try { await assertPublicUrl(entry.website); }
    catch { return Response.json({ message: 'This entry needs a publicly accessible business website before research.' }, { status: 400, headers: noStore }); }

    const admission = await limitRequest(request, 'reports', 3, 3600, process.env.FREE_PILOT_MODE === 'true' ? 3 : 100,
      undefined, { key: `catalogue-${id}-${entry.researchSequence}`, fingerprint: id });
    if (admission) return admission;
    const report = await createCatalogueReport(prisma, id, entry.researchSequence);
    if (report.reason) {
      const messages = {
        missing: 'Catalogue entry not found.',
        shortlist: 'Shortlist this company before requesting research.',
        changed: 'The linked report changed. Refresh the catalogue and try again.',
      };
      return Response.json({ message: messages[report.reason] },
        { status: report.reason === 'missing' ? 404 : 409, headers: noStore });
    }
    if (report.created) await dispatchReport(report.jobId).catch(() => console.warn('Catalogue report saved for dispatch reconciliation', report.jobId));
    return Response.json(report, { status: report.created ? 202 : 200, headers: noStore });
  } catch {
    return unavailable();
  }
}
