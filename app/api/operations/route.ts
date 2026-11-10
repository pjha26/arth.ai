import { guard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { summarizeOperations } from '@/shared/operations.js';

export async function GET(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const since = new Date(Date.now() - 30 * 86400000);
  const [reports, calls] = await Promise.all([
    prisma.report.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 1001, select: { status: true, createdAt: true, generatedAt: true } }),
    prisma.modelCall.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 5001 }),
  ]);
  return Response.json({ since: since.toISOString(), truncated: reports.length > 1000 || calls.length > 5000, ...summarizeOperations(reports.slice(0, 1000), calls.slice(0, 5000)) }, { headers: { 'Cache-Control': 'no-store' } });
}
