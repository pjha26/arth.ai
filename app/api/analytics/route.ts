import { guard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { summarizeAnalytics } from '@/shared/analytics.js';

function summarizeReviews(groups: { qualificationDecision: string | null; _count: { _all: number } }[]) {
  const summary = { total: 0, qualified: 0, rejected: 0 };
  for (const group of groups) {
    const count = group._count._all;
    summary.total += count;
    if (group.qualificationDecision === 'qualified') summary.qualified += count;
    if (group.qualificationDecision === 'rejected') summary.rejected += count;
  }
  return summary;
}

export async function GET(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const since = new Date(Date.now() - 30 * 86400000);
  const [leads, reports, events, alertGroups] = await Promise.all([
    prisma.lead.findMany({ where: { source: 'manual', createdAt: { gte: since } }, select: { id: true, salesStatus: true, personaType: true, createdAt: true, company: { select: { industry: true } } } }),
    prisma.report.findMany({ where: { createdAt: { gte: since }, lead: { source: 'manual' } }, select: { id: true, leadId: true, score: true, status: true, createdAt: true } }),
    prisma.reportEvent.findMany({ where: { createdAt: { gte: since }, type: 'download', actor: { not: 'staff' } }, select: { reportId: true, actor: true, type: true } }),
    prisma.reportEvent.groupBy({ by: ['type', 'qualificationDecision', 'intentModel'], orderBy: { intentModel: 'asc' },
      where: { createdAt: { gte: since }, type: { in: ['intent-alert', 'intent-sample'] }, report: { lead: { source: 'manual' } } }, _count: { _all: true },
    }),
  ]);
  const { total: alerts, qualified, rejected } = summarizeReviews(alertGroups.filter(group => group.type === 'intent-alert'));
  const sampleQualification = summarizeReviews(alertGroups.filter(group => group.type === 'intent-sample'));
  const byModel = new Map<string | null, typeof alertGroups>();
  for (const group of alertGroups) {
    const groups = byModel.get(group.intentModel) ?? [];
    groups.push(group);
    byModel.set(group.intentModel, groups);
  }
  const qualificationByModel = [...byModel].map(([model, groups]) => ({
    model, alerts: summarizeReviews(groups.filter(group => group.type === 'intent-alert')),
    samples: summarizeReviews(groups.filter(group => group.type === 'intent-sample')),
  }));
  return Response.json({ success: true, data: {
    ...summarizeAnalytics(leads, reports, events), qualification: { alerts, qualified, rejected }, sampleQualification, qualificationByModel,
  } }, { headers: { 'Cache-Control': 'no-store' } });
}
