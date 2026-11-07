import { guard, accessFor } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from 'zod';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const denied = await guard(request, id); if (denied) return denied;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        company: true,
        stages: {
          orderBy: { createdAt: "desc" }, take: 100,
        },
      },
    });

    const access = await accessFor(id);
    if (!report || !access?.staff && report.leadId !== access?.leadId) {
      return NextResponse.json(
        { success: false, message: "Report not found" },
        { status: 404 }
      );
    }

    // Map to old lead format for frontend compatibility
    const mappedLead = {
      ...report,
      errorMessage: access?.staff ? report.errorMessage : report.errorMessage ? "Report needs review or a retry by the team." : null,
      stages: report.stages.reverse().map(stage => ({ ...stage, message: access?.staff ? stage.message : null })),
      companyName: report.company.name,
      industry: report.company.industry,
      companySize: report.company.size,
    };

    return NextResponse.json({ success: true, lead: mappedLead });
  } catch (error) {
    console.error("[arth.ai] Error fetching report:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard(request); if (denied) return denied;
  const { id } = await params;
  const input = z.object({ salesStatus: z.enum(['new', 'contacted', 'engaged', 'converted', 'rejected']) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ message: 'Invalid sales status' }, { status: 400 });
  const report = await prisma.report.findUnique({ where: { id }, select: { leadId: true } });
  if (!report?.leadId) return Response.json({ message: 'Original lead is not linked' }, { status: 409 });
  await prisma.$transaction([
    prisma.lead.update({ where: { id: report.leadId }, data: { salesStatus: input.data.salesStatus } }),
    prisma.reportEvent.create({ data: { reportId: id, actor: 'staff', type: `outcome:${input.data.salesStatus}` } }),
  ]);
  return Response.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const denied = await guard(request); if (denied) return denied;
    // Check if exists
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
    }

    if (["pending", "processing"].includes(report.status)) return NextResponse.json({ message: "Wait for active work to finish" }, { status: 409 });
    // Delete report (cascades to stages)
    await prisma.$transaction([prisma.embedding.deleteMany({ where: { reportId: id } }), prisma.report.delete({ where: { id } })]);

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("[arth.ai] Error deleting report:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
