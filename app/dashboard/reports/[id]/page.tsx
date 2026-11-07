import { requireStaff } from "@/lib/auth";
import type { ReportView } from "@/lib/ui-types";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportLayoutClient from "./ReportLayoutClient";

export default async function ReportPage(props: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const params = await props.params;
  const { id } = params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true }
  });

  if (!report) return notFound();

  return <ReportLayoutClient report={report as unknown as ReportView} />;
}
