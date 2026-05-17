import { GoogleGenerativeAI } from "@google/generative-ai";


const SYSTEM_INSTRUCTION = `You are an elite AI business intelligence analyst at arth.ai, an AI-powered inbound personalization platform. 
Your job is to analyze company information and produce structured, insightful, and highly personalized audit reports.
You must respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanations, just raw JSON.`;

/**
 * Generates a structured AI report using Google Gemini 1.5 Flash.
 * Returns a parsed JSON object with all report sections.
 */
export async function generateAiReport(lead, enriched) {
  const prompt = buildPrompt(lead, enriched);
  
  let attempt = 0;
  while (attempt < 2) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2500,
          temperature: 0.7,
        },
      });

      const text = result.response.text().trim();

      // Strip markdown code fences if present
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      validateReport(parsed);
      return parsed;
    } catch (err) {
      attempt++;
      if (attempt >= 2) {
        console.error("[aiReport] Gemini parse failed after retry:", err.message);
        return getFallbackReport(lead);
      }
      console.warn("[aiReport] Parse failed, retrying...");
    }
  }
}

function buildPrompt(lead, enriched) {
  return `
Analyze the following company and generate a hyper-personalized AI Intelligence Report. 
You MUST heavily use the specific context of their actual business, products, target audience, and market position. 
DO NOT use generic consulting buzzwords. If they are a fashion e-commerce brand, talk about fashion, sizing, returns, and visual search. If they are a SaaS company, talk about churn, onboarding, and integration.

COMPANY INFORMATION:
- Name: ${lead.companyName}
- Industry: ${lead.industry}
- Size: ${lead.companySize}
- Website: ${lead.website}
- Stated Challenge: ${lead.painPoints}

ENRICHED DATA:
${enriched.rawContext}

Generate a response in this EXACT JSON format (no other text):
{
  "executiveSummary": "3-4 sentence company overview that is HYPER-SPECIFIC to this company's actual business model, known products, and market reality. Mention specific things they actually do.",
  "marketPosition": "2-3 sentences on their specific competitive landscape, market timing, and exact positioning.",
  "digitalPresence": "2-3 sentences reviewing their actual website features, digital maturity, and content strategy.",
  "painPoints": [
    "Specific pain point 1 incorporating their exact stated challenge but applied to their specific business model",
    "Specific pain point 2 (e.g. for e-commerce: high return rates due to sizing; for B2B: long sales cycles)",
    "Specific pain point 3"
  ],
  "aiOpportunities": [
    {
      "title": "Specific AI opportunity title (e.g., 'AI Size & Fit Prediction', not 'Process Automation')",
      "description": "2-3 sentences explaining exactly how this AI solves their specific pain point in their specific industry.",
      "impact": "High"
    },
    {
      "title": "Second hyper-specific opportunity",
      "description": "2-3 sentences.",
      "impact": "High"
    },
    {
      "title": "Third hyper-specific opportunity",
      "description": "2-3 sentences.",
      "impact": "Medium"
    },
    {
      "title": "Fourth hyper-specific opportunity",
      "description": "2-3 sentences.",
      "impact": "Medium"
    }
  ],
  "recommendedNextSteps": [
    "Actionable step 1 specific to implementing the first opportunity",
    "Actionable step 2 specific to their industry context",
    "Actionable step 3",
    "Actionable step 4"
  ],
  "auditScores": {
    "digitalReadiness": <integer 1-10 based on digital presence and tech adoption signals>,
    "digitalReadinessReason": "1 sentence justifying this score based on specific evidence found.",
    "automationPotential": <integer 1-10 based on stated challenges and industry>,
    "automationPotentialReason": "1 sentence justifying this score based on specific evidence found.",
    "growthIndex": <integer 1-10 based on company size, industry growth, and market position>,
    "growthIndexReason": "1 sentence justifying this score based on specific evidence found."
  }
}

Be HYPER-SPECIFIC to this company. Do not use generic consulting language. Frame the AI opportunities specifically around their business domain (e.g., fashion, fintech, healthcare, SaaS).`;
}

function validateReport(report) {
  const required = [
    "executiveSummary",
    "marketPosition",
    "digitalPresence",
    "painPoints",
    "aiOpportunities",
    "recommendedNextSteps",
    "auditScores",
  ];
  for (const key of required) {
    if (!report[key]) throw new Error(`Missing required field: ${key}`);
  }
  if (!Array.isArray(report.painPoints) || report.painPoints.length === 0) {
    throw new Error("painPoints must be a non-empty array");
  }
  if (!Array.isArray(report.aiOpportunities) || report.aiOpportunities.length === 0) {
    throw new Error("aiOpportunities must be a non-empty array");
  }
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
