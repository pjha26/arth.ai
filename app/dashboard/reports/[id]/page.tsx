import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportLayoutClient from "./ReportLayoutClient";

export default async function ReportPage(props: any) {
  const params = await props.params;
  const { id } = params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true }
  });

  if (!report) return notFound();

  return <ReportLayoutClient report={report} />;
}
