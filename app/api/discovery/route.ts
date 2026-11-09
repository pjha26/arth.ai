import { limitRequest } from "@/lib/rateLimit";
import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLeadsQueue } from "@/lib/queue";
import { z } from "zod";

const DiscoverySchema = z.object({
  industry: z.string().trim().min(2, "Industry is required").max(100),
  region: z.string().trim().min(2, "Region is required").max(100),
  sizeMin: z.number().int().min(0).max(10000000).optional().nullable(),
  sizeMax: z.number().int().min(0).max(10000000).optional().nullable(),
  signal: z.string().max(100).optional().nullable(),
});

const ShortlistSchema = z.discriminatedUnion('shortlisted', [
  z.object({ companyId: z.string().uuid(), candidateId: z.string().cuid(), shortlisted: z.literal(true) }),
  z.object({ companyId: z.string().uuid(), shortlisted: z.literal(false) }),
]);

export async function PATCH(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const input = ShortlistSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ success: false, message: 'Invalid shortlist update' }, { status: 400 });

  const { companyId, shortlisted } = input.data;
  if (input.data.shortlisted) {
    const candidate = await prisma.discoveredCompany.findFirst({
      where: { id: input.data.candidateId, companyId, status: { in: ['queued', 'researched'] }, search: { status: 'completed' } },
      select: { id: true },
    });
    if (!candidate) return NextResponse.json({ success: false, message: 'Select an eligible discovery result' }, { status: 404 });
  }

  await prisma.company.updateMany({
    where: { id: companyId, shortlistedAt: shortlisted ? null : { not: null } },
    data: { shortlistedAt: shortlisted ? new Date() : null },
  });
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  try {
    const limited = await limitRequest(request, "discovery", 3, 3600, 20); if (limited) return limited;
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

    await getLeadsQueue().add(
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
    ).catch(() => console.warn("Discovery dispatch deferred", search.id));

    return NextResponse.json(
      { success: true, message: "Discovery search started.", searchId: search.id },
      { status: 202 }
    );
  } catch (error) {
    console.error("[arth.ai] Discovery API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  try {
    const url = new URL(request.url);
    const searchId = url.searchParams.get("searchId");

    if (url.searchParams.get('shortlist') === '1') {
      const companies = await prisma.company.findMany({
        where: { shortlistedAt: { not: null } }, orderBy: [{ shortlistedAt: 'desc' }, { id: 'asc' }],
        select: { id: true, name: true, domain: true },
      });
      return NextResponse.json({ success: true, data: companies }, { headers: { 'Cache-Control': 'no-store' } });
    }

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
  } catch (error) {
    console.error("[arth.ai] Discovery API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
