import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import * as cheerio from "cheerio";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface CompanyProfile {
  name: string;
  domain: string;
  logo: string | null;
  description: string;
  industry: string;
  headline: string;
  painPoints: string[];
  aiOpportunities: string[];
  ctaLine: string;
}

export async function buildCompanyProfile(slug: string): Promise<CompanyProfile> {
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);

  // 1. Clearbit autocomplete (free, no key)
  let logo: string | null = null;
  let domain = `${slug}.com`;
  try {
    const { data } = await axios.get(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(slug)}`,
      { timeout: 4000 }
    );
    if (data?.[0]) {
      logo = data[0].logo;
      domain = data[0].domain || domain;
    }
  } catch {}

  // 2. Wikipedia summary
  let description = "";
  try {
    const encoded = encodeURIComponent(name.replace(/\s+/g, "_"));
    const { data } = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { timeout: 4000 }
    );
    if (data?.extract) description = data.extract.slice(0, 600);
  } catch {}

  // 3. DuckDuckGo fallback
  if (!description) {
    try {
      const { data } = await axios.get(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(slug + " company")}&format=json&no_html=1&skip_disambig=1`,
        { timeout: 4000 }
      );
      if (data?.AbstractText) description = data.AbstractText.slice(0, 500);
    } catch {}
  }

  // 4. Gemini — generate personalized page copy
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
You are writing copy for arth.ai, an AI-powered inbound personalization platform, creating a personalized landing page for ${name} (${domain}).

Context about ${name}: ${description || `${name} is a well-known technology company.`}

Generate a JSON object with these fields:
{
  "industry": "One short phrase e.g. 'FinTech & Payments' or 'SaaS Productivity'",
  "headline": "A 6-12 word headline showing how arth.ai helps ${name} specifically. Should mention their industry. No quotes.",
  "painPoints": ["Pain point 1 specific to ${name}'s industry and scale", "Pain point 2", "Pain point 3"],
  "aiOpportunities": ["AI opportunity 1 specific to ${name}'s business", "AI opportunity 2", "AI opportunity 3"],
  "ctaLine": "One sentence about why a company like ${name} should try arth.ai. Max 20 words."
}

Be specific to ${name}'s actual business. No generic filler. Respond with raw JSON only.`;

  let industry = "Technology";
  let headline = `How ${name} can turn every inbound lead into a personalized experience.`;
  let painPoints = ["Manual lead qualification slows response time", "Generic follow-ups fail to convert warm leads", "Sales team spends hours on company research"];
  let aiOpportunities = ["Automated prospect research on every form submit", "AI-generated personalized audit reports", "Instant email delivery before competitors respond"];
  let ctaLine = `See how arth.ai can transform ${name}'s inbound experience.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(text);
    if (parsed.industry) industry = parsed.industry;
    if (parsed.headline) headline = parsed.headline;
    if (parsed.painPoints?.length) painPoints = parsed.painPoints;
    if (parsed.aiOpportunities?.length) aiOpportunities = parsed.aiOpportunities;
    if (parsed.ctaLine) ctaLine = parsed.ctaLine;
  } catch {}

  return { name, domain, logo, description, industry, headline, painPoints, aiOpportunities, ctaLine };
}
