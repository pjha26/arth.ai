import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import prisma from "@/lib/prisma";
import IORedis from "ioredis";

export async function POST() {
  try {
    const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
      maxRetriesPerRequest: null,
      tls: process.env.UPSTASH_REDIS_URL?.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    });
    
    const monitoringQueue = new Queue("monitoring", { connection });
    
    const companies = await prisma.company.findMany();
    
    for (const company of companies) {
      await monitoringQueue.add("check-company", { companyId: company.id });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Dispatched ${companies.length} companies to the monitoring queue.` 
    });
  } catch (error) {
    console.error("Trigger monitor error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
