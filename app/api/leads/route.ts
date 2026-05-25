import { NextResponse } from "next/server";
import { LeadSchema } from "@/lib/validation";
import { leadsQueue } from "@/lib/queue";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs";
import axios from "axios";

// Helper function to quickly fetch company logo and description (timeout optimized for fast API response)
async function fetchCompanyPreview(companyName: string) {
  let logo = null;
  let description = null;
  
  try {
    const { data } = await axios.get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`, { timeout: 2000 });
    if (data && data[0]) logo = data[0].logo;
  } catch (err) {
    console.warn("[arth.ai] Clearbit preview fetch failed");
  }
  
  try {
    const { data } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName.replace(/\s+/g, "_"))}`, { timeout: 2000 });
    if (data?.extract) description = data.extract.slice(0, 300);
  } catch (err) {
    console.warn("[arth.ai] Wiki preview fetch failed");
  }
  
  return { logo, description };
}

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

    const leadInput = result.data;

    // 1. Extract domain to use as unique company identifier
    let domain = "";
    try {
      domain = new URL(leadInput.website).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      // Fallback if URL parsing fails despite zod validation
      domain = leadInput.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    }

    // 2. Upsert Company
    const derivedCompanyName = leadInput.companyName || (domain.charAt(0).toUpperCase() + domain.slice(1).split('.')[0]);

    const company = await prisma.company.upsert({
      where: { domain },
      update: {
        name: derivedCompanyName,
        industry: leadInput.industry || "Technology",
        size: leadInput.companySize || "Unknown",
      },
      create: {
        domain,
        name: derivedCompanyName,
        industry: leadInput.industry || "Technology",
        size: leadInput.companySize || "Unknown",
      }
    });

    // 3. Deduplication check: Has this company been audited in the last 30 days?
    const existingReport = await prisma.report.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' }
    });

    if (existingReport) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (existingReport.createdAt > thirtyDaysAgo && existingReport.personaType === leadInput.personaType) {
        // Save the new lead contact info so sales knows they requested it
        await prisma.lead.create({
          data: {
            companyId: company.id,
            fullName: leadInput.fullName,
            email: leadInput.email,
            painPoints: `Challenges: ${leadInput.challengeTags.join(", ")}` + (leadInput.painPoints ? `\n\nContext: ${leadInput.painPoints}` : ""),
          }
        });

        console.log(`[arth.ai] Returning CACHED or IN-PROGRESS report: ${company.name} (${existingReport.id})`);

        return NextResponse.json(
          { 
            success: true, 
            message: existingReport.status === 'done' 
              ? `Found a fresh AI report for ${company.name}. Loading instantly...`
              : `A report for ${company.name} is already generating. Joining stream...`,
            jobId: existingReport.id,
            fromCache: existingReport.status === 'done'
          },
          { status: 200 }
        );
      }
    }

    // Fetch instant mirror preview data
    const preview = await fetchCompanyPreview(derivedCompanyName);

    // 4. Create Lead
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        fullName: leadInput.fullName,
        email: leadInput.email,
        painPoints: `Challenges: ${leadInput.challengeTags.join(", ")}` + (leadInput.painPoints ? `\n\nContext: ${leadInput.painPoints}` : ""),
      }
    });

    // 5. Create Report Shell
    const report = await prisma.report.create({
      data: {
        companyId: company.id,
        personaType: leadInput.personaType,
        status: "pending",
        logo: preview.logo,
        description: preview.description,
      }
    });

    const jobId = report.id;

    // 6. Enqueue the background job
    await leadsQueue.add(
      "process-report",
      {
        leadId: lead.id,
        companyId: company.id,
        reportId: report.id,
        leadInput: {
          fullName: leadInput.fullName,
          email: leadInput.email,
          website: leadInput.website,
          companyName: derivedCompanyName,
          industry: leadInput.industry || "Technology",
          companySize: leadInput.companySize || "Unknown",
          painPoints: `Challenges: ${leadInput.challengeTags.join(", ")}` + (leadInput.painPoints ? `\n\nContext: ${leadInput.painPoints}` : ""),
        },
        jobId,
        submittedAt: new Date().toISOString(),
      },
      { jobId }
    );

    console.log(`[arth.ai] Report enqueued: ${company.name} (${jobId})`);

    return NextResponse.json(
      {
        success: true,
        message: `Your AI report for ${company.name} is being generated.`,
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
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          include: {
            signals: { orderBy: { detectedAt: "desc" }, take: 1 }
          }
        },
        stages: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    const reportsDir = path.join(process.cwd(), "public", "reports");
    // Ensure the directory exists before checking
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportsWithPdf = reports.map((report) => {
      const pdfPath = path.join(reportsDir, `${report.id}.pdf`);
      const hasPdf = fs.existsSync(pdfPath);
      // Map company data to the root for backwards compatibility in the admin UI
      return { 
        ...report, 
        hasPdf,
        companyName: report.company.name,
        industry: report.company.industry,
        email: "N/A (See Lead table)" 
      };
    });

    // Return under "leads" key temporarily to avoid breaking frontend dashboard
    return NextResponse.json({ success: true, leads: reportsWithPdf });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
