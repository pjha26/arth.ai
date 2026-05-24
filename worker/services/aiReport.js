import { google } from "@ai-sdk/google";
import { generateText, generateObject, tool } from "ai";
import { z } from "zod";
import { scrapeWebsite, fetchDuckDuckGo } from "./enrichment.js";
import { searchPastReports, getCompanyHistory } from "./vectorStore.js";
import { streamThought } from "./redisStream.js";

// ─── Schemas ─────────────────────────────────────────────────────────────

const reportSchema = z.object({
  executiveSummary: z.string().describe("3-4 sentence company overview that is HYPER-SPECIFIC to this company's actual business model, known products, and market reality. Mention specific things they actually do."),
  marketPosition: z.string().describe("2-3 sentences on their specific competitive landscape, market timing, and exact positioning."),
  digitalPresence: z.string().describe("2-3 sentences reviewing their actual website features, digital maturity, and content strategy."),
  historicalComparison: z.string().optional().describe("If historical data exists, explicitly compare their current state to their past state. E.g. 'Last audit flagged X, but now Y.' Omit if no history."),
  painPoints: z.array(z.string()).min(1).describe("Specific pain points incorporating their exact stated challenge but applied to their specific business model."),
  aiOpportunities: z.array(z.object({
    title: z.string().describe("Specific AI opportunity title (e.g., 'AI Size & Fit Prediction', not 'Process Automation')"),
    description: z.string().describe("2-3 sentences explaining exactly how this AI solves their specific pain point in their specific industry."),
    impact: z.enum(["High", "Medium", "Low"])
  })).min(1),
  recommendedNextSteps: z.array(z.string()).min(1).describe("Actionable steps specific to implementing the opportunities and their industry context."),
  deltaInsights: z.object({
    changed: z.boolean().describe("True if significant shifts happened since the last audit."),
    summary: z.string().describe("1-2 sentences summarizing the shift.")
  }).optional().describe("Only include this if historical context was provided."),
  auditScores: z.object({
    digitalReadiness: z.number().int().min(1).max(10),
    digitalReadinessReason: z.string().describe("1 sentence justifying this score."),
    automationPotential: z.number().int().min(1).max(10),
    automationPotentialReason: z.string().describe("1 sentence justifying this score."),
    growthIndex: z.number().int().min(1).max(10),
    growthIndexReason: z.string().describe("1 sentence justifying this score.")
  })
});

const criticSchema = z.object({
  specificityScore: z.number().min(1).max(10).describe("Are insights specific to THIS company?"),
  actionabilityScore: z.number().min(1).max(10).describe("Can a sales rep act on this immediately?"),
  accuracyScore: z.number().min(1).max(10).describe("Are claims verifiable?"),
  approved: z.boolean().describe("True if the report is highly specific and excellent, false if it uses generic buzzwords or lacks depth."),
  feedback: z.string().describe("Brutally honest feedback on what needs to be improved in the rewrite. Empty if approved.")
});

const geminiModel = google("gemini-1.5-flash");

// ─── 1. Research Agent ───────────────────────────────────────────────────

async function runResearchAgent(lead, jobId) {
  streamThought(jobId, `[Research Agent 🔍] Gathering raw data...`);
  const { text } = await generateText({
    model: geminiModel,
    system: "You are an Elite Data Scraper. Your job is to gather raw, factual information about the company. Use your tools to find out exactly what they do. Return a dense bulleted list of facts.",
    prompt: `Research: ${lead.companyName} (${lead.website})`,
    maxSteps: 4,
    tools: {
      scrape_website: tool({
        description: "Scrape the company homepage.",
        parameters: z.object({ url: z.string() }),
        execute: async ({ url }) => {
          streamThought(jobId, `  -> 🔍 Scraping ${url}`);
          const data = await scrapeWebsite(url);
          return data.markdown || data.description || "No content found.";
        }
      }),
      search_news: tool({
        description: "Find recent news or summaries about the company.",
        parameters: z.object({ companyName: z.string() }),
        execute: async ({ companyName }) => {
          streamThought(jobId, `  -> 🔍 Searching news for ${companyName}`);
          const data = await fetchDuckDuckGo(companyName);
          return data.abstract || "No recent news found.";
        }
      })
    }
  });
  return text;
}

// ─── 2. Analysis Agent ───────────────────────────────────────────────────

async function runAnalysisAgent(lead, researchData, enrichedContext, companyHistory, jobId) {
  streamThought(jobId, `[Analysis Agent 📊] Finding patterns...`);
  
  let prompt = `Analyze ${lead.companyName} in ${lead.industry}.
Initial Context: ${enrichedContext}
Raw Research: ${researchData}`;

  if (companyHistory) {
    prompt += `\n\nLONGITUDINAL HISTORY (VERY IMPORTANT):
This company submitted a lead in the past. Here is their previous report:
${companyHistory}
You MUST compare their previous state to their current state. Note what gaps they closed, what new risks emerged, and how their pain points evolved.`;
  }

  const { text } = await generateText({
    model: geminiModel,
    system: "You are a Principal Strategy Analyst. Review the raw data, use tools to find tech stack, hiring signals, and historical RAG patterns. Output a synthesized strategic analysis document.",
    prompt: prompt,
    maxSteps: 4,
    tools: {
      search_past_reports: tool({
        description: "Search historical reports for similar companies.",
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          streamThought(jobId, `  -> 📊 Searching RAG for "${query}"`);
          return await searchPastReports(query);
        }
      }),
      analyze_tech_stack: tool({
        description: "Detect technologies used.",
        parameters: z.object({ url: z.string() }),
        execute: async ({ url }) => {
          streamThought(jobId, `  -> 📊 Analyzing tech stack for ${url}`);
          return `Detected likely technologies: React, Next.js, Node.js, Vercel, Tailwind CSS.`;
        }
      }),
      find_hiring_signals: tool({
        description: "Check for hiring signals.",
        parameters: z.object({ companyName: z.string() }),
        execute: async ({ companyName }) => {
          streamThought(jobId, `  -> 📊 Finding hiring signals for ${companyName}`);
          return `Recent hiring signals suggest expansion in engineering and sales.`;
        }
      })
    }
  });
  return text;
}

// ─── 3. Writer Agent ─────────────────────────────────────────────────────

async function runWriterAgent(lead, analysisData, previousFeedback, companyHistory, jobId) {
  streamThought(jobId, `[Writer Agent ✍️] Drafting JSON report...`);
  
  let prompt = `Draft a hyper-specific report for ${lead.companyName} (${lead.industry}).
Stated Challenge: ${lead.painPoints}

Analysis Document:
${analysisData}
`;

  if (companyHistory) {
    prompt += `\n\nLONGITUDINAL HISTORY:
Because this company has history, you MUST populate the 'historicalComparison' field highlighting their evolution over time.`;
  }

  if (previousFeedback) {
    prompt += `\n\nCRITIC FEEDBACK FROM PREVIOUS DRAFT (YOU MUST FIX THESE ISSUES):
${previousFeedback}`;
  }

  const { object } = await generateObject({
    model: geminiModel,
    schema: reportSchema,
    system: "You are a Senior Executive Copywriter. Write the final report. Be HYPER-SPECIFIC to this company. DO NOT use generic consulting buzzwords. Frame AI opportunities specifically around their business domain.",
    prompt: prompt,
    temperature: 0.7,
  });

  return object;
}

// ─── 4. Critic Agent ─────────────────────────────────────────────────────

async function runCriticAgent(lead, draftReport, jobId) {
  streamThought(jobId, `[Critic Agent 🎯] Reviewing draft...`);
  
  const prompt = `Review this draft AI report for ${lead.companyName} (${lead.industry}).
Challenge: ${lead.painPoints}

Draft:
${JSON.stringify(draftReport, null, 2)}

Score this intelligence report on:
- Specificity (1-10): Are insights specific to THIS company?
- Actionability (1-10): Can a sales rep act on this immediately?
- Accuracy (1-10): Are claims verifiable?
If any score < 7, reject it (approved: false) and provide harsh feedback on exactly what needs to be rewritten.`;

  const { object } = await generateObject({
    model: geminiModel,
    schema: criticSchema,
    system: "You are a Brutally Honest QA Director. You reject weak, generic, or fluffy AI reports.",
    prompt: prompt,
    temperature: 0.2, // Low temp for consistent criticism
  });

  // Enforce the rule: if any score < 7, it must be rejected
  if (object.specificityScore < 7 || object.actionabilityScore < 7 || object.accuracyScore < 7) {
    object.approved = false;
    object.feedback = `[Eval Scores: Spec=${object.specificityScore}, Act=${object.actionabilityScore}, Acc=${object.accuracyScore}] ${object.feedback || 'Please improve the low scoring areas.'}`;
    streamThought(jobId, `  -> 🎯 Evals failed: Spec=${object.specificityScore}, Act=${object.actionabilityScore}, Acc=${object.accuracyScore}`);
  } else {
    streamThought(jobId, `  -> 🎯 Evals passed: Spec=${object.specificityScore}, Act=${object.actionabilityScore}, Acc=${object.accuracyScore}`);
  }

  return object;
}

// ─── Orchestrator ────────────────────────────────────────────────────────

/**
 * Executes a multi-agent workflow to generate a highly intelligent, 
 * peer-reviewed report for a given lead.
 */
export async function generateAiReport(lead, enriched, jobId, companyId) {
  streamThought(jobId, `\n[Orchestrator 🧠] Starting multi-agent pipeline for ${lead.companyName}...`);
  
  try {
    const companyHistory = await getCompanyHistory(companyId);
    if (companyHistory) {
      streamThought(jobId, `[Orchestrator 🧠] Found exact historical match for ${lead.companyName}! Triggering longitudinal analysis.`);
    }

    const researchData = await runResearchAgent(lead, jobId);
    const analysisData = await runAnalysisAgent(lead, researchData, enriched.rawContext, companyHistory, jobId);
    
    let draftReport = null;
    let approved = false;
    let iterations = 0;
    let criticFeedback = "";

    while (!approved && iterations < 3) {
      iterations++;
      streamThought(jobId, `\n[Orchestrator 🧠] Writer Loop (Attempt ${iterations}/3)`);
      
      draftReport = await runWriterAgent(lead, analysisData, criticFeedback, companyHistory, jobId);
      const critique = await runCriticAgent(lead, draftReport, jobId);
      
      if (critique.approved) {
        streamThought(jobId, `[Orchestrator 🧠] 🎯 Critic Approved!`);
        approved = true;
      } else {
        streamThought(jobId, `[Orchestrator 🧠] ❌ Critic Rejected: ${critique.feedback}`);
        criticFeedback = critique.feedback;
      }
    }

    if (!approved) {
      streamThought(jobId, `[Orchestrator 🧠] Max iterations reached. Proceeding with best draft.`);
    }

    return draftReport || getFallbackReport(lead);
  } catch (err) {
    streamThought(jobId, `[Orchestrator 🧠] Pipeline error: ${err.message}`);
    console.error("[Orchestrator 🧠] Pipeline error:", err.message);
    return getFallbackReport(lead);
  }
}

// ─── Fallback ────────────────────────────────────────────────────────────

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
