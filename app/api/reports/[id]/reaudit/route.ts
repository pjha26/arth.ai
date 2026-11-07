import { guard } from '@/lib/auth';
import { limitRequest } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { dispatchReport } from '@/lib/dispatch';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(request); if (denied) return denied;
  const limited = await limitRequest(request, 'reaudit', 3, 3600, 100); if (limited) return limited;
  const { id } = await params;
  const original = await prisma.report.findUnique({ where: { id } });
  if (!original?.leadId) return Response.json({ message: 'The original lead must be linked before a new audit' }, { status: 409 });
  const report = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${original.leadId!}))`;
    const existing = await tx.report.findFirst({ where: { leadId: original.leadId, status: { in: ['pending','processing'] } } });
    return existing || tx.report.create({ data: { companyId: original.companyId, leadId: original.leadId, personaType: original.personaType.toLowerCase(), deliveryStatus: 'skipped' } });
  });
  await dispatchReport(report.id).catch(() => console.warn('Re-audit saved for dispatch reconciliation', report.id));
  return Response.json({ success: true, jobId: report.id }, { status: 202 });
}
