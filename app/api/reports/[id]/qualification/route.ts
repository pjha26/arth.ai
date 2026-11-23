import { guard } from '@/lib/auth';
import { canQualifyLead, leadQualificationInput } from '@/lib/lead-qualification';
import { prisma } from '@/lib/prisma';
import { readBoundedJson } from '@/shared/request-json.js';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(request);
  if (denied) return denied;
  if (process.env.ENABLE_LEAD_QUALIFICATION !== 'true') {
    return Response.json({ message: 'Lead qualification is disabled.' }, { status: 404 });
  }
  const { id } = await params;
  const body = await readBoundedJson(request, 8192);
  if (body.response) return body.response;
  const input = leadQualificationInput.safeParse(body.value);
  if (!input.success) return Response.json({ message: 'Enter a reason and select report evidence when qualifying a lead.' }, { status: 400 });
  const { decision, reason, generationAttempt, sourceIds } = input.data;
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Report" WHERE id = ${id} FOR UPDATE`;
      const report = await tx.report.findUnique({ where: { id }, select: {
        leadId: true, status: true, errorMessage: true, generationAttempt: true,
      } });
      if (!report) return Response.json({ message: 'Report not found.' }, { status: 404 });
      if (!canQualifyLead(report) || report.generationAttempt !== generationAttempt) {
        return Response.json({ message: 'Wait for the report to finish or reload to review the current report.' }, { status: 409 });
      }
      const sources = sourceIds.length ? await tx.reportSource.findMany({
        where: { reportId: id, id: { in: sourceIds } },
        orderBy: { id: 'asc' },
        select: { id: true, url: true, title: true, excerpt: true, retrievedAt: true },
      }) : [];
      if (sources.length !== sourceIds.length) {
        return Response.json({ message: 'Select evidence from this report.' }, { status: 400 });
      }
      const evidence = sources.map(source => ({ ...source, retrievedAt: source.retrievedAt.toISOString() }));
      const key = { reportId: id, generationAttempt };
      const review = { decision, reason, sourceIds, evidence, actor: 'staff', reviewedAt: new Date() };
      const saved = await tx.leadQualification.upsert({
        where: { reportId_generationAttempt: key }, create: { ...key, ...review }, update: review,
        select: { decision: true, reviewedAt: true },
      });
      return Response.json(saved);
    });
  } catch {
    console.error('Could not save lead qualification for report', id);
    return Response.json({ message: 'Could not save qualification. Try again.' }, { status: 503 });
  }
}
