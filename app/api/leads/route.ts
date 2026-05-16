import { NextResponse } from "next/server";
import { LeadSchema } from "@/lib/validation";
import { leadsQueue } from "@/lib/queue";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

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
