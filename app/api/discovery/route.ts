import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { leadsQueue } from "@/lib/queue";
import { z } from "zod";

const DiscoverySchema = z.object({
  industry: z.string().min(2, "Industry is required"),
  region: z.string().min(2, "Region is required"),
  sizeMin: z.number().optional().nullable(),
  sizeMax: z.number().optional().nullable(),
  signal: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = DiscoverySchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const input = result.data;

    const search = await prisma.discoverySearch.create({
      data: {
        industry: input.industry,
        region: input.region,
        sizeMin: input.sizeMin,
        sizeMax: input.sizeMax,
        signal: input.signal,
        status: "pending",
      }
    });

    await leadsQueue.add(
      "discover-companies",
      {
        searchId: search.id,
        industry: input.industry,
        region: input.region,
        sizeMin: input.sizeMin,
        sizeMax: input.sizeMax,
        signal: input.signal,
      },
      { jobId: `discovery-${search.id}` }
    );

    return NextResponse.json(
      { success: true, message: "Discovery search started.", searchId: search.id },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("[arth.ai] Discovery API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error.", error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchId = url.searchParams.get("searchId");

    if (searchId) {
      const search = await prisma.discoverySearch.findUnique({
        where: { id: searchId },
        include: {
          companies: {
            orderBy: { rank: 'asc' }
          }
        }
      });
      if (!search) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: search });
    }

    const searches = await prisma.discoverySearch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ success: true, data: searches });
  } catch (error: any) {
    console.error("[arth.ai] Discovery API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
