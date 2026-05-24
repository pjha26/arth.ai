import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadsQueue } from "@/lib/queue";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if report exists
    const report = await prisma.report.findUnique({
      where: { id },
      include: { company: true, stages: true }
    });

    if (!report) {
      return NextResponse.json(
        { success: false, message: "Report not found" },
        { status: 404 }
      );
    }

    // Reset status to pending and delete old stages
    await prisma.$transaction([
      prisma.pipelineStage.deleteMany({
        where: { reportId: id },
      }),
      prisma.report.update({
        where: { id },
        data: { status: "pending" },
      }),
    ]);

    const lead = await prisma.lead.findFirst({
      where: { companyId: report.companyId },
      orderBy: { createdAt: 'desc' }
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: "Associated lead not found" }, { status: 404 });
    }

    const bullJobId = `${id}-${Date.now()}`;
    await leadsQueue.add(
      "process-report",
      {
        leadId: lead.id,
        companyId: report.companyId,
        reportId: report.id,
        leadInput: {
          fullName: lead.fullName,
          email: lead.email,
          website: report.company.domain,
          companyName: report.company.name,
          industry: report.company.industry || "Technology",
          companySize: report.company.size || "Unknown",
          painPoints: lead.painPoints
        },
        jobId: id, 
        submittedAt: new Date().toISOString(),
      },
      { jobId: bullJobId }
    );

    console.log(`[arth.ai] Report re-enqueued: ${report.company.name} (${id})`);

    return NextResponse.json({
      success: true,
      message: "Lead pipeline restarted successfully.",
    });
  } catch (error) {
    console.error("[arth.ai] Retry API error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to restart pipeline." },
      { status: 500 }
    );
  }
}
