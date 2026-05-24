import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        company: true,
        stages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, message: "Report not found" },
        { status: 404 }
      );
    }

    // Map to old lead format for frontend compatibility
    const mappedLead = {
      ...report,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if exists
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 });
    }

    // Delete report (cascades to stages)
    await prisma.report.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("[arth.ai] Error deleting report:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
