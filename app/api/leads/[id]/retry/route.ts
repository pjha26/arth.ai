import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadsQueue } from "@/lib/queue";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // Reset status to pending and delete old stages
    await prisma.$transaction([
      prisma.pipelineStage.deleteMany({
        where: { leadId: id },
      }),
      prisma.lead.update({
        where: { id },
        data: { status: "pending" },
      }),
    ]);

    // Re-enqueue the job
    await leadsQueue.add(
      "process-lead",
      {
        lead,
        jobId: id,
        submittedAt: new Date().toISOString(),
      },
      { jobId: id } // Using the same job ID is fine, BullMQ allows it if the previous one is completed/failed, or we can just let it run. Wait, BullMQ might deduplicate based on jobId if it's still in the queue. Since it's failed, it might be in the failed set.
    );
    
    // Note: To be safe with BullMQ, maybe we need to remove the job first, or just generate a new job ID but keep the same lead ID?
    // Actually, BullMQ replace/add with same job ID works if we remove it, or if it's failed it might just update it. Let's just use `removeOnComplete` and `removeOnFail` in the worker to ensure it's not lingering, or we don't care about the BullMQ jobId being strictly unique, we can pass `jobId: id + '-' + Date.now()` to BullMQ but keep the Lead ID the same in our DB.
    // Yes, making the BullMQ jobId unique is safer:
    const bullJobId = `${id}-${Date.now()}`;
    await leadsQueue.add(
      "process-lead",
      {
        lead,
        jobId: id, // We pass the original lead ID as jobId to the worker payload
        submittedAt: new Date().toISOString(),
      },
      { jobId: bullJobId }
    );

    console.log(`[arth.ai] Lead re-enqueued: ${lead.companyName} (${id})`);

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
