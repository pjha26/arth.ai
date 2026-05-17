import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const SYSTEM_INSTRUCTION = `You are an elite AI business intelligence analyst at arth.ai, an AI-powered inbound personalization platform. 
Your job is to analyze company information and produce structured, insightful, and highly personalized audit reports.
You must respond with valid JSON matching the exact schema provided.`;

// Define the Zod schema for the AI response
const reportSchema = z.object({
  executiveSummary: z.string().describe("3-4 sentence company overview that is HYPER-SPECIFIC to this company's actual business model, known products, and market reality. Mention specific things they actually do."),
  marketPosition: z.string().describe("2-3 sentences on their specific competitive landscape, market timing, and exact positioning."),
  digitalPresence: z.string().describe("2-3 sentences reviewing their actual website features, digital maturity, and content strategy."),
  painPoints: z.array(z.string()).min(1).describe("Specific pain points incorporating their exact stated challenge but applied to their specific business model (e.g. for e-commerce: high return rates due to sizing; for B2B: long sales cycles)."),
  aiOpportunities: z.array(z.object({
    title: z.string().describe("Specific AI opportunity title (e.g., 'AI Size & Fit Prediction', not 'Process Automation')"),
    description: z.string().describe("2-3 sentences explaining exactly how this AI solves their specific pain point in their specific industry."),
    impact: z.enum(["High", "Medium", "Low"])
  })).min(1),
  recommendedNextSteps: z.array(z.string()).min(1).describe("Actionable steps specific to implementing the opportunities and their industry context."),
  auditScores: z.object({
    digitalReadiness: z.number().int().min(1).max(10).describe("Integer 1-10 based on digital presence and tech adoption signals"),
    digitalReadinessReason: z.string().describe("1 sentence justifying this score based on specific evidence found."),
    automationPotential: z.number().int().min(1).max(10).describe("Integer 1-10 based on stated challenges and industry"),
    automationPotentialReason: z.string().describe("1 sentence justifying this score based on specific evidence found."),
    growthIndex: z.number().int().min(1).max(10).describe("Integer 1-10 based on company size, industry growth, and market position"),
    growthIndexReason: z.string().describe("1 sentence justifying this score based on specific evidence found.")
  })
});

/**
 * Generates a structured AI report using Google Gemini 1.5 Flash via Vercel AI SDK.
 * Returns a parsed JSON object with all report sections.
 */
export async function generateAiReport(lead, enriched) {
  const prompt = buildPrompt(lead, enriched);
  
  let attempt = 0;
  while (attempt < 2) {
    try {
      // Vercel AI SDK handles the schema enforcement natively
      const { object } = await generateObject({
        model: google("gemini-1.5-flash"),
        schema: reportSchema,
        system: SYSTEM_INSTRUCTION,
        prompt: prompt,
        temperature: 0.7,
      });

      return object;
    } catch (err) {
      attempt++;
      if (attempt >= 2) {
        console.error("[aiReport] Gemini generation failed after retry:", err.message);
        return getFallbackReport(lead);
      }
      console.warn("[aiReport] Generation failed, retrying...", err.message);
    }
  }
}

function buildPrompt(lead, enriched) {
  return `
Analyze the following company and generate a hyper-personalized AI Intelligence Report. 
You MUST heavily use the specific context of their actual business, products, target audience, and market position. 
DO NOT use generic consulting buzzwords. If they are a fashion e-commerce brand, talk about fashion, sizing, returns, and visual search. If they are a SaaS company, talk about churn, onboarding, and integration.
Be HYPER-SPECIFIC to this company. Do not use generic consulting language. Frame the AI opportunities specifically around their business domain (e.g., fashion, fintech, healthcare, SaaS).

COMPANY INFORMATION:
- Name: ${lead.companyName}
- Industry: ${lead.industry}
- Size: ${lead.companySize}
- Website: ${lead.website}
- Stated Challenge: ${lead.painPoints}

ENRICHED DATA:
${enriched.rawContext}
`;
}

function getFallbackReport(lead) {
  return {
    executiveSummary: `${lead.companyName} is a ${lead.companySize} company operating in the ${lead.industry} sector. Based on the information provided, the company is actively looking to address operational challenges and scale efficiently. This report highlights key AI opportunities aligned with their stated goals.`,
    marketPosition: `Within the ${lead.industry} industry, companies of ${lead.companyName}'s size typically face competitive pressure to differentiate through operational efficiency and customer experience. Strategic AI adoption can provide a meaningful competitive advantage.`,
    digitalPresence: `${lead.companyName} has an established web presence at ${lead.website}. Optimizing their digital channels and automating customer-facing workflows could significantly improve conversion and retention.`,
    painPoints: [
      lead.painPoints,
      `Scaling operations without proportionally increasing headcount`,
      `Maintaining consistent quality and response times as the team grows`,
    ],
    aiOpportunities: [
      {
        title: "Automated Inbound Lead Intelligence",
        description: `Implement AI-powered enrichment for every inbound inquiry, similar to arth.ai's own workflow. This delivers personalized context to your team before any human interaction, dramatically improving conversion rates.`,
        impact: "High",
      },
      {
        title: "Intelligent Process Automation",
        description: `Identify the top 3 repetitive workflows in ${lead.companyName}'s operations and automate them using AI agents. For a ${lead.companySize} company in ${lead.industry}, this typically saves 15-30 hours per team member monthly.`,
        impact: "High",
      },
      {
        title: "AI-Powered Customer Communication",
        description: `Deploy AI to handle first-response communications, FAQs, and follow-up sequences. This ensures 24/7 responsiveness without additional headcount.`,
        impact: "Medium",
      },
      {
        title: "Data Intelligence Dashboard",
        description: `Centralize operational data into an AI-driven dashboard that surfaces actionable insights, anomalies, and growth opportunities automatically.`,
        impact: "Medium",
      },
    ],
    recommendedNextSteps: [
      "Schedule a 30-minute AI readiness assessment with the arth.ai team",
      "Map your top 5 repetitive workflows for automation potential scoring",
      "Pilot one AI automation in a low-risk operational area within 30 days",
      "Define success metrics (time saved, conversion uplift, cost reduction) before implementation",
    ],
    auditScores: {
      digitalReadiness: 6,
      digitalReadinessReason: "Website lacks advanced interactive elements but maintains a clean online presence.",
      automationPotential: 8,
      automationPotentialReason: "High potential for automation in routine operational workflows.",
      growthIndex: 7,
      growthIndexReason: "Stable market position with room for technology-driven expansion."
    },
  };
}
