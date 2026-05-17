import { NextResponse } from "next/server";
import { LeadSchema } from "@/lib/validation";
import { leadsQueue } from "@/lib/queue";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Zod validation
    const result = LeadSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const lead = result.data;
    const jobId = randomUUID();

    // Save to Prisma SQLite DB
    await prisma.lead.create({
      data: {
        id: jobId,
        ...lead,
        status: "pending",
      },
    });

    // Enqueue the background job
    await leadsQueue.add(
      "process-lead",
      {
        lead,
        jobId,
        submittedAt: new Date().toISOString(),
      },
      { jobId }
    );

    console.log(`[arth.ai] Lead enqueued: ${lead.companyName} (${jobId})`);

    return NextResponse.json(
      {
        success: true,
        message: `Your AI report for ${lead.companyName} is being generated.`,
        jobId,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[arth.ai] API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}

// CORS pre-flight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        companyName: true,
        industry: true,
        status: true,
        createdAt: true,
      },
    });

    const reportsDir = path.join(process.cwd(), "public", "reports");
    // Ensure the directory exists before checking
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const leadsWithPdf = leads.map((lead) => {
      const pdfPath = path.join(reportsDir, `${lead.id}.pdf`);
      const hasPdf = fs.existsSync(pdfPath);
      return { ...lead, hasPdf };
    });

    return NextResponse.json({ success: true, leads: leadsWithPdf });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
