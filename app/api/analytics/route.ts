import { guard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { summarizeAnalytics } from '@/shared/analytics.js';

function summarizeReviews(groups: { qualificationDecision: string | null; _count: { _all: number } }[]) {
  const qualified = groups.find(group => group.qualificationDecision === 'qualified')?._count._all ?? 0;
  const rejected = groups.find(group => group.qualificationDecision === 'rejected')?._count._all ?? 0;
  return { total: groups.reduce((total, group) => total + group._count._all, 0), qualified, rejected };
}

export async function GET(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const since = new Date(Date.now() - 30 * 86400000);
  const [leads, reports, events, alertGroups] = await Promise.all([
    prisma.lead.findMany({ where: { source: 'manual', createdAt: { gte: since } }, select: { id: true, salesStatus: true, personaType: true, createdAt: true, company: { select: { industry: true } } } }),
    prisma.report.findMany({ where: { createdAt: { gte: since }, lead: { source: 'manual' } }, select: { id: true, leadId: true, score: true, status: true, createdAt: true } }),
    prisma.reportEvent.findMany({ where: { createdAt: { gte: since }, type: 'download', actor: { not: 'staff' } }, select: { reportId: true, actor: true, type: true } }),
    prisma.reportEvent.groupBy({ by: ['type', 'qualificationDecision'],
      where: { createdAt: { gte: since }, type: { in: ['intent-alert', 'intent-sample'] }, report: { lead: { source: 'manual' } } }, _count: { _all: true },
    }),
  ]);
  const { total: alerts, qualified, rejected } = summarizeReviews(alertGroups.filter(group => group.type === 'intent-alert'));
  const sampleQualification = summarizeReviews(alertGroups.filter(group => group.type === 'intent-sample'));
  return Response.json({ success: true, data: { ...summarizeAnalytics(leads, reports, events), qualification: { alerts, qualified, rejected }, sampleQualification } }, { headers: { 'Cache-Control': 'no-store' } });
}
