import { NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
import { generateObject } from "ai";
import { z } from "zod";

import { livePreviewRateLimit, livePreviewGlobalRateLimit } from "@/lib/rateLimit";

const cacheMap = new Map<string, any>();

function resolveDomain(input: string): string {
  const cleanInput = input.trim().toLowerCase();
  
  // If it's already a URL or looks like a domain
  if (cleanInput.includes(".")) {
    try {
      const url = new URL(cleanInput.startsWith("http") ? cleanInput : `https://${cleanInput}`);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return cleanInput;
    }
  }

  // Very basic fallback guesses
  const domains: Record<string, string> = {
    "notion": "notion.so",
    "stripe": "stripe.com",
    "flipkart": "flipkart.com",
    "vercel": "vercel.com",
    "github": "github.com",
  };
  
  return domains[cleanInput] || `${cleanInput.replace(/\s+/g, "")}.com`;
}

const previewSchema = z.object({
  companyName: z.string().describe("The company name, properly capitalized."),
  domain: z.string().describe("The company's primary domain (e.g. stripe.com)."),
  industry: z.string().describe("The industry, max 1-3 words (e.g. 'Financial Technology')."),
  insights: z.array(z.string()).length(3).describe("3 specific, evidence-based insights about this company referencing real facts, market position, or industry dynamics. Never be generic. Max 2 sentences each."),
});

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    if (!query || query.length > 100) {
      return NextResponse.json({ success: false, message: "Invalid query." }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    
    // Check Cache
    const cacheKey = query.trim().toLowerCase();
    if (cacheMap.has(cacheKey)) {
      return NextResponse.json({ success: true, data: cacheMap.get(cacheKey) });
    }

    // Rate Limit
    const globalLimit = await livePreviewGlobalRateLimit.limit("global");
    if (!globalLimit.success) {
      return NextResponse.json(
        { success: false, rateLimited: true, message: "Our service is currently at capacity. Please try again later." },
        { status: 429, headers: { "X-RateLimit-Limit": globalLimit.limit.toString(), "X-RateLimit-Remaining": globalLimit.remaining.toString() } }
      );
    }

    const ipLimit = await livePreviewRateLimit.limit(ip);
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, rateLimited: true, message: "You've used your free previews. Submit the form for your full report →" },
        { status: 429, headers: { "X-RateLimit-Limit": ipLimit.limit.toString(), "X-RateLimit-Remaining": ipLimit.remaining.toString() } }
      );
    }

    const domain = resolveDomain(query);

    const { object } = await generateObject({
      model: google("gemini-flash-latest"),
      schema: previewSchema,
      system: "You are an AI business intelligence analyst. Generate 3 highly specific, factual insights about the provided company. Reference real known facts, their competitive position, or industry dynamics. Return only valid JSON. No generic advice.",
      prompt: `Company Name / URL: ${query}\nGuessed Domain: ${domain}`,
    });

    // Cache the result
    cacheMap.set(cacheKey, object);

    return NextResponse.json({ success: true, data: object });
  } catch (error) {
    console.error("[arth.ai] Preview API Error:", error);
    return NextResponse.json(
      { success: false, message: "We couldn't find enough data for that company. Try a well-known company name or paste their website URL." },
      { status: 500 }
    );
  }
}
