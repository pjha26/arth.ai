import { requireStaff } from "@/lib/auth";
import type { ReportView } from "@/lib/ui-types";
import { prisma } from "@/lib/prisma";
import { canQualifyLead } from "@/lib/lead-qualification";
import { notFound } from "next/navigation";
import ReportLayoutClient from "./ReportLayoutClient";
import LeadQualificationForm from "./LeadQualificationForm";

export default async function ReportPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ alert?: string | string[] }> }) {
  await requireStaff();
  const [{ id }, { alert }] = await Promise.all([props.params, props.searchParams]);

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true, events: {
      where: { type: { in: ['intent-alert', 'intent-sample'] }, ...(typeof alert === 'string' ? { id: alert } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
      select: { id: true, type: true, intentScore: true, intentModel: true, intentMessageId: true, qualificationDecision: true, qualificationReason: true },
    } },
  });

  if (!report) return notFound();

  const { events, ...view } = report;
  const review = report.leadId ? events[0] : undefined;
  const message = review?.type === 'intent-sample' && review.intentMessageId && report.leadId ? await prisma.chatMessage.findFirst({
    where: { id: review.intentMessageId, reportId: report.id, actor: report.leadId, role: 'user' },
    select: { content: true },
  }) : null;
  let qualification;
  if (process.env.ENABLE_LEAD_QUALIFICATION === 'true' && canQualifyLead(report)) {
    const [sources, saved] = await Promise.all([
      prisma.reportSource.findMany({ where: { reportId: id }, orderBy: { id: 'asc' },
        select: { id: true, title: true, url: true, excerpt: true } }),
      prisma.leadQualification.findUnique({ where: { reportId_generationAttempt: { reportId: id, generationAttempt: report.generationAttempt } },
        select: { decision: true, reason: true, sourceIds: true, reviewedAt: true } }),
    ]);
    qualification = <LeadQualificationForm reportId={id} generationAttempt={report.generationAttempt} sources={sources}
      saved={saved && { ...saved, reviewedAt: saved.reviewedAt.toISOString() }} />;
  }
  return <ReportLayoutClient report={view as unknown as ReportView} alert={review && { ...review, message: message?.content ?? null }}
    qualification={qualification} />;
}
