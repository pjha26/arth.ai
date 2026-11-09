import { requireStaff } from "@/lib/auth";
import type { ReportView } from "@/lib/ui-types";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportLayoutClient from "./ReportLayoutClient";

export default async function ReportPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ alert?: string | string[] }> }) {
  await requireStaff();
  const [{ id }, { alert }] = await Promise.all([props.params, props.searchParams]);

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true, events: {
      where: { type: 'intent-alert', ...(typeof alert === 'string' ? { id: alert } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
      select: { id: true, slackScore: true, qualificationDecision: true, qualificationReason: true },
    } },
  });

  if (!report) return notFound();

  const { events, ...view } = report;
  return <ReportLayoutClient report={view as unknown as ReportView} alert={report.leadId ? events[0] : undefined} />;
}
