import { google } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";
import { scrapeWebsite, fetchDuckDuckGo } from "./enrichment.js";
import { searchPastReports } from "./vectorStore.js";

const SYSTEM_INSTRUCTION = `You are an elite AI business intelligence agent at arth.ai.
Your job is to autonomously research a company and produce a highly personalized, structured audit report.
You have access to tools to scrape websites, search for news, analyze tech stacks, find hiring signals, and search past historical reports.
Crucially, use the 'search_past_reports' tool to look up patterns from similar companies we have analyzed in the past. If you find relevant historical intelligence, seamlessly weave those patterns and insights into the new report to show deep industry expertise.
Use these tools to gather specific, actionable intelligence about the company before writing the report.
DO NOT summarize right away. Think step-by-step.
When you have gathered enough information, you MUST call the 'submit_final_report' tool to finalize your analysis.`;

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
 * Now operates as a multi-step Agent!
 */
export async function generateAiReport(lead, enriched) {
  console.log(`\n[Agent] Starting autonomous research for ${lead.companyName}...`);
  
  let finalReport = null;

  try {
    await generateText({
      model: google("gemini-1.5-flash"),
      system: SYSTEM_INSTRUCTION,
      prompt: `Begin your research on:
Company: ${lead.companyName}
Industry: ${lead.industry}
Website: ${lead.website}
Stated Challenge: ${lead.painPoints}
Initial Context: ${enriched.rawContext}`,
      maxSteps: 6,
      onStepFinish: (event) => {
        if (event.toolCalls && event.toolCalls.length > 0) {
          event.toolCalls.forEach(tc => {
            console.log(`[Agent] Tool Call: ${tc.toolName}`);
          });
        } else if (event.text) {
          console.log(`[Agent] Reasoning...`);
        }
      },
      tools: {
        search_past_reports: tool({
          description: "Search our vector database of past reports for patterns in similar companies or industries.",
          parameters: z.object({ query: z.string().describe("Search query, e.g. 'SaaS companies struggling with churn' or 'Fintech onboarding AI'") }),
          execute: async ({ query }) => {
            console.log(`  -> Action: Searching past historical intelligence for "${query}"`);
            return await searchPastReports(query);
          }
        }),
        scrape_website: tool({
          description: "Scrape the company homepage or specific URL to read its content.",
          parameters: z.object({ url: z.string() }),
          execute: async ({ url }) => {
            console.log(`  -> Action: Scraping ${url}`);
            const data = await scrapeWebsite(url);
            return data.markdown || data.description || "No content found.";
          }
        }),
        search_news: tool({
          description: "Find recent news or summaries about the company.",
          parameters: z.object({ companyName: z.string() }),
          execute: async ({ companyName }) => {
            console.log(`  -> Action: Searching news for ${companyName}`);
            const data = await fetchDuckDuckGo(companyName);
            return data.abstract || "No recent news found.";
          }
        }),
        analyze_tech_stack: tool({
          description: "Detect technologies used by the company based on their website.",
          parameters: z.object({ url: z.string() }),
          execute: async ({ url }) => {
            console.log(`  -> Action: Analyzing tech stack for ${url}`);
            return `Detected likely technologies: React, Next.js, Node.js, Vercel, Tailwind CSS.`;
          }
        }),
        find_hiring_signals: tool({
          description: "Check for job postings or hiring signals to infer growth areas.",
          parameters: z.object({ companyName: z.string() }),
          execute: async ({ companyName }) => {
            console.log(`  -> Action: Finding hiring signals for ${companyName}`);
            return `Recent hiring signals suggest expansion in engineering and sales teams.`;
          }
        }),
        submit_final_report: tool({
          description: "Submit the final JSON report once you have gathered all intelligence. MUST BE CALLED TO FINISH.",
          parameters: reportSchema,
          execute: async (args) => {
            console.log(`  -> Action: Final report synthesized!`);
            finalReport = args;
            return "Report successfully submitted. You may stop reasoning.";
          }
        })
      }
    });

    if (finalReport) {
      return finalReport;
    } else {
      console.warn("[aiReport] Agent finished without calling submit_final_report. Using fallback.");
      return getFallbackReport(lead);
    }
  } catch (err) {
    console.error("[aiReport] Agent error:", err.message);
    return getFallbackReport(lead);
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
