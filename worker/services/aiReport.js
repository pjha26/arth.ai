import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are an elite AI business intelligence analyst at arth.ai, an AI-powered inbound personalization platform. 
Your job is to analyze company information and produce structured, insightful, and highly personalized audit reports.
You must respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanations, just raw JSON.`;

/**
 * Generates a structured AI report using Gemini 1.5 Flash.
 * Returns a parsed JSON object with all report sections.
 */
export async function generateAiReport(lead, enriched) {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const prompt = buildPrompt(lead, enriched);

  let attempt = 0;
  while (attempt < 2) {
    try {
      const result = await model.generateContent(prompt);
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
      console.warn("[aiReport] Parse failed, retrying with strict prompt...");
    }
  }
}

function buildPrompt(lead, enriched) {
  return `
Analyze the following company and generate a comprehensive AI Intelligence Report.

COMPANY INFORMATION:
- Name: ${lead.companyName}
- Industry: ${lead.industry}
- Size: ${lead.companySize}
- Website: ${lead.website}
- Stated Challenge: ${lead.painPoints}

ENRICHED DATA:
${enriched.rawContext}

${enriched.description ? `Description: ${enriched.description}` : ""}
${enriched.websiteTitle ? `Website Title: ${enriched.websiteTitle}` : ""}
${enriched.websiteDescription ? `Website Description: ${enriched.websiteDescription}` : ""}

Generate a response in this EXACT JSON format (no other text):
{
  "executiveSummary": "3-4 sentence company overview that is highly specific to this company's actual business, industry position, and context. Do NOT use generic phrases.",
  "marketPosition": "2-3 sentences on competitive landscape, market timing, and positioning specific to their industry and company size.",
  "digitalPresence": "2-3 sentences on their website, content strategy, and digital maturity based on available data.",
  "painPoints": [
    "Specific pain point 1 derived from their stated challenge and industry",
    "Specific pain point 2",
    "Specific pain point 3"
  ],
  "aiOpportunities": [
    {
      "title": "Specific AI opportunity title (5-8 words)",
      "description": "2-3 sentences explaining the specific automation or AI opportunity and the measurable business impact for this company.",
      "impact": "High"
    },
    {
      "title": "Second opportunity title",
      "description": "2-3 sentences.",
      "impact": "High"
    },
    {
      "title": "Third opportunity title",
      "description": "2-3 sentences.",
      "impact": "Medium"
    },
    {
      "title": "Fourth opportunity title",
      "description": "2-3 sentences.",
      "impact": "Medium"
    }
  ],
  "recommendedNextSteps": [
    "Specific actionable step 1 for this company",
    "Specific actionable step 2",
    "Specific actionable step 3",
    "Specific actionable step 4"
  ],
  "auditScores": {
    "digitalReadiness": <integer 1-10 based on digital presence and tech adoption signals>,
    "automationPotential": <integer 1-10 based on stated challenges and industry>,
    "growthIndex": <integer 1-10 based on company size, industry growth, and market position>
  }
}

Be SPECIFIC to this company. Do not use generic consulting language. Reference their actual industry, size, and challenge.`;
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
      lead.painPoints.slice(0, 150),
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
      automationPotential: 8,
      growthIndex: 7,
    },
  };
}
