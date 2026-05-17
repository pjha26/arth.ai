import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify the lead exists
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // Locate the PDF file
    const pdfPath = path.join(process.cwd(), "public", "reports", `${id}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDF not yet generated. Please wait for the pipeline to complete.",
        },
        { status: 404 }
      );
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const fileName = `arth_ai_report_${lead.companyName.replace(/\s+/g, "_").toLowerCase()}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("[arth.ai] PDF download error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
