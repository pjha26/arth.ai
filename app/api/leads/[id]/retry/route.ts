import { prisma } from '@/lib/prisma';
import { guard } from '@/lib/auth';
import { dispatchReport } from '@/lib/dispatch';
import { limitRequest } from '@/lib/rateLimit';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(request); if (denied) return denied;
  const limited = await limitRequest(request, 'retries', 5, 3600, 100); if (limited) return limited;
  const { id } = await params;
  // Only failed generations can restart. Completed reports retain their original delivery and history.
  const changed = await prisma.report.updateMany({ where: { id, status: 'failed', leadId: { not: null } },
    data: { status: 'pending', errorMessage: null, dispatchedAt: null, generationAttempt: { increment: 1 } } });
  if (!changed.count) return Response.json({ message: 'Only a failed report linked to its original lead can be retried' }, { status: 409 });
  await dispatchReport(id).catch(() => console.warn('Retry deferred to reconciliation', id));
  return Response.json({ success: true, message: 'Retry saved.' });
}
