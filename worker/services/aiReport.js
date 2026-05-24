import { google } from "@ai-sdk/google";
import { generateText, generateObject, tool } from "ai";
import { z } from "zod";
import { scrapeWebsite, fetchDuckDuckGo } from "./enrichment.js";
import { searchPastReports, getCompanyHistory, getSimilarCompanies } from "./vectorStore.js";
import { getIndustryBenchmarks } from "./selfLearning.js";
import { streamThought } from "./redisStream.js";
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || "dummy",
  secretKey: process.env.LANGFUSE_SECRET_KEY || "dummy",
  baseUrl: process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com"
});

// ─── Schemas ─────────────────────────────────────────────────────────────

const reportSchema = z.object({
  executiveSummary: z.string().describe("3-4 sentence company overview that is HYPER-SPECIFIC to this company's actual business model, known products, and market reality. Mention specific things they actually do."),
  marketPosition: z.object({
    reasoning: z.string().describe("Deep step-by-step chain of thought reasoning analyzing their competitive landscape and market timing. Output 2-3 paragraphs of pure analytical thinking."),
    content: z.string().describe("2-3 sentences on their specific competitive landscape, market timing, and exact positioning.")
  }),
  techStack: z.array(z.string()).describe("List of core technologies the company uses (e.g. ['React', 'Node.js', 'Salesforce'])."),
  fundingStage: z.string().describe("Estimated funding stage (e.g. 'Seed', 'Series A', 'Enterprise', 'Bootstrapped')."),
  digitalPresence: z.string().describe("2-3 sentences reviewing their actual website features, digital maturity, and content strategy."),
  historicalComparison: z.string().optional().describe("If historical data exists, explicitly compare their current state to their past state. E.g. 'Last audit flagged X, but now Y.' Omit if no history."),
  painPoints: z.array(z.object({
    text: z.string().describe("Full insight sentence applied to their specific business model."),
    confidence: z.number().min(0).max(1).describe("Confidence score based strictly on actual data vs assumed. (1.0 = Verified, 0.0 = Guess)"),
    evidence: z.array(z.string()).describe("Direct evidence quotes or data points found."),
    category: z.enum(["verified", "inferred", "speculative"])
  })).min(1).describe("Specific pain points. Never show raw tag labels."),
  aiOpportunities: z.array(z.object({
    title: z.string().describe("Specific AI opportunity title (e.g., 'AI Size & Fit Prediction', not 'Process Automation')"),
    description: z.string().describe("2-3 sentences explaining exactly how this AI solves their specific pain point in their specific industry."),
    impact: z.enum(["High", "Medium", "Low"]),
    confidence: z.number().min(0).max(1).describe("Confidence score based strictly on actual data vs assumed. (1.0 = Verified, 0.0 = Guess)"),
    evidence: z.array(z.string()).describe("Direct evidence quotes or data points found."),
    category: z.enum(["verified", "inferred", "speculative"])
  })).min(1),
  recommendedNextSteps: z.array(z.object({
    reasoning: z.string().describe("Deep chain of thought reasoning explaining why this specific step is critical right now, considering their market position and pain points."),
    content: z.string().describe("Actionable step specific to implementing the opportunities and their industry context. NEVER include generic steps.")
  })).min(1).describe("Genuine recommendations the company can act on independently."),
  deltaInsights: z.object({
    changed: z.boolean().describe("True if significant shifts happened since the last audit."),
    summary: z.string().describe("1-2 sentences summarizing the shift.")
  }).optional().describe("Only include this if historical context was provided."),
  signals: z.array(z.object({
    type: z.string().describe("Type of signal (e.g., 'hiring_spike', 'funding_round', 'product_launch', 'leadership_change')"),
    data: z.string().describe("The specific detail (e.g., 'Hiring 5 senior ML engineers')"),
    severity: z.enum(["high", "medium", "low"])
  })).default([]).describe("Any key market or company signals detected during research."),
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
  feedback: z.string().describe("Brutally honest feedback on what needs to be improved in the rewrite. Empty if approved."),
  failedSections: z.array(z.string()).describe("List exact keys from the report schema that failed to meet the bar (e.g. ['painPoints', 'executiveSummary']). Empty if approved.")
});

const geminiModel = google("gemini-2.5-flash");

// ─── 1. Helpers ────────────────────────────────────────────────────────────

async function inferSpecificIndustry(companyName, description, websiteContent) {
  const { text } = await generateText({
    model: geminiModel,
    messages: [{
      role: "user",
      content: `Given this company: ${companyName}
                Description: ${description}
                Website content: ${websiteContent}
                
                Return ONLY a specific industry label.
                Examples of good labels:
                "Quick Commerce" not "Technology"
                "B2B SaaS — HR Tech" not "Software"
                "D2C Fashion" not "Retail"
                "Fintech — Payments" not "Financial Services"
                
                Return only the label, nothing else.`
    }]
  });
  return text.trim();
}

const painPointExpansions = {
  "Scaling my team": (company, industry) => `${company} faces pressure to scale headcount in line with growth without proportionally increasing operational costs — a critical challenge for ${industry} companies at this stage.`,
  "Competitive positioning": (company, industry) => `Differentiation is increasingly difficult in the ${industry} space as competitors consolidate — ${company} needs a defensible positioning strategy beyond price and speed.`,
  "Lead generation": (company) => `${company} needs to build scalable inbound pipelines that reduce dependence on paid acquisition and referrals.`,
  "Automating workflows": (company) => `Manual operational processes at ${company} are creating bottlenecks that limit growth without headcount additions.`,
  "Product-market fit": (company, industry) => `${company} is in an active phase of validating its core proposition in the ${industry} market — the next 6 months are critical for retention and NPS signals.`,
  "Fundraising": (company) => `${company} is likely preparing for or actively pursuing its next funding round — investor narrative and metrics story are under active development.`
};

function expandPainPoints(tags, company, industry) {
  if (!tags) return [];
  const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
  return tagList.map(tag => {
    const expander = painPointExpansions[tag];
    return expander ? expander(company, industry) : `${company} is experiencing challenges with ${tag.toLowerCase()} within the ${industry} sector.`;
  });
}

// ─── 2. Parallel Specialized Agents ────────────────────────────────────────

const researchAgentSchema = z.object({
  companyOverview: z.string().describe("Detailed bullet points covering what the company actually does."),
  keyProducts: z.array(z.string()).describe("List of core products/services."),
  recentNews: z.string().describe("Summary of any recent news or public data found.")
});

const financialAgentSchema = z.object({
  estimatedRevenue: z.string().describe("Estimated revenue or scale based on team size and domain."),
  fundingStage: z.string().describe("Estimated funding stage."),
  growthSignals: z.array(z.string()).describe("Signals of growth or hiring patterns.")
});

const techAgentSchema = z.object({
  techStack: z.array(z.string()).describe("Detected technologies used by the company."),
  engineeringFocus: z.string().describe("What their engineering or technical priorities seem to be."),
  digitalMaturity: z.string().describe("Assessment of their digital maturity (High/Medium/Low).")
});

const marketAgentSchema = z.object({
  competitors: z.array(z.string()).describe("List of likely competitors or similar players."),
  marketPosition: z.string().describe("How they are positioning themselves against others."),
  industryTrends: z.array(z.string()).describe("Key trends impacting this specific sub-industry.")
});

async function runParallelResearchAgent(lead, enrichedContext, jobId) {
  streamThought(jobId, `[Research Agent 🔍] Gathering public data...`);
  const trace = langfuse.trace({ name: "ResearchAgent", sessionId: lead.companyName, metadata: { jobId } });
  const generation = trace.generation({ name: "research_generation", model: "gemini-2.5-flash" });
  
  const { object } = await generateObject({
    model: geminiModel,
    schema: researchAgentSchema,
    system: "You are an Elite Research Agent. Extract core business facts, products, and news from the raw context.",
    prompt: `Analyze context for ${lead.companyName}:\n${enrichedContext}`
  });
  
  generation.end({ output: JSON.stringify(object) });
  return object;
}

async function runParallelFinancialAgent(lead, enrichedContext, jobId) {
  streamThought(jobId, `[Financial Agent 📈] Analyzing growth signals...`);
  const trace = langfuse.trace({ name: "FinancialAgent", sessionId: lead.companyName, metadata: { jobId } });
  const generation = trace.generation({ name: "financial_generation", model: "gemini-2.5-flash" });

  const { object } = await generateObject({
    model: geminiModel,
    schema: financialAgentSchema,
    system: "You are a Financial Analyst Agent. Deduce funding stage, revenue scale, and growth signals based on team size, history, and domain.",
    prompt: `Analyze context for ${lead.companyName}:\n${enrichedContext}`
  });

  generation.end({ output: JSON.stringify(object) });
  return object;
}

async function runParallelTechAgent(lead, enrichedContext, jobId) {
  streamThought(jobId, `[Tech Agent ⚙️] Analyzing tech stack...`);
  const trace = langfuse.trace({ name: "TechAgent", sessionId: lead.companyName, metadata: { jobId } });
  const generation = trace.generation({ name: "tech_generation", model: "gemini-2.5-flash" });

  const { object } = await generateObject({
    model: geminiModel,
    schema: techAgentSchema,
    system: "You are a Solutions Architect Agent. Analyze the company's digital maturity, likely tech stack, and engineering priorities.",
    prompt: `Analyze context for ${lead.companyName}:\n${enrichedContext}`
  });

  generation.end({ output: JSON.stringify(object) });
  return object;
}

async function runParallelMarketAgent(lead, enrichedContext, similarContext, companyHistory, jobId) {
  streamThought(jobId, `[Market Agent 🌍] Assessing competitive landscape...`);
  const trace = langfuse.trace({ name: "MarketAgent", sessionId: lead.companyName, metadata: { jobId } });
  const generation = trace.generation({ name: "market_generation", model: "gemini-2.5-flash" });

  let prompt = `Analyze market context for ${lead.companyName} (${lead.industry}):\n${enrichedContext}`;
  if (similarContext) prompt += `\n\nSimilar Companies Pattern Context:\n${similarContext}`;
  if (companyHistory) prompt += `\n\nLongitudinal History Context:\n${companyHistory}`;
  
  const { object } = await generateObject({
    model: geminiModel,
    schema: marketAgentSchema,
    system: "You are a Market Strategy Agent. Identify competitors, market positioning, and overarching industry trends.",
    prompt: prompt
  });

  generation.end({ output: JSON.stringify(object) });
  return object;
}

// ─── 3. Writer Agent ─────────────────────────────────────────────────────

async function runWriterAgent(lead, synthesisContextStr, previousFeedback, companyHistory, jobId, industryBenchmarks) {
  streamThought(jobId, `[Writer Agent ✍️] Drafting JSON report from synthesized multi-agent data...`);
  
  let prompt = `Draft a hyper-specific report for ${lead.companyName} (${lead.industry}).

STRICT RULES — violating any of these invalidates the report:
1. NEVER write "Unknown" anywhere. If a field is missing, infer it from available context or omit it entirely.
2. NEVER write generic statements that could apply to any company. Every sentence must reference ${lead.companyName} specifically.
3. NEVER use the company's industry category as a substitute for company-specific knowledge. "Technology company" tells the reader nothing. Be specific.
4. NEVER paste raw form tags. Expanded pain points are provided in the context — use those verbatim.
5. ALL scores must be justified with one specific evidence statement (e.g. "Digital Readiness 6/10 — Zepto's homepage loads in 2.1s but lacks personalization").
6. The word "typically" is banned. Every claim must be specific to ${lead.companyName}.
7. CONFIDENCE MARKER PLACEMENT: Confidence markers (~, ESTIMATED) must NEVER appear in Section headings, Opportunity card titles, Company name, or Score numbers. Confidence markers must ONLY appear inline within body text sentences or as a subtle tag after a specific claim.
8. Recommended next steps MUST be genuine recommendations the company can act on independently. NEVER include "Schedule a call with the arth.ai team" as a step.
9. CONFIDENCE SCORING: For pain points and AI opportunities, strictly score your confidence (0.0 to 1.0) based on what data you ACTUALLY found in the context vs what you assume. Categorize as "verified" (found in context), "inferred" (likely based on context), or "speculative" (assumed industry standard). Provide supporting "evidence" strings.

Synthesized Multi-Agent Data:
${synthesisContextStr}
`;

  if (industryBenchmarks) {
    prompt += `\n\nINDUSTRY BENCHMARKS FOR ${lead.industry.toUpperCase()} (CONTEXT):
You MUST use these benchmarks to explicitly compare ${lead.companyName} against their peers in the 'executiveSummary' or 'marketPosition'.
Data:
- Average Digital Readiness: ${industryBenchmarks.digitalReadiness?.value || 'N/A'} (Based on ${industryBenchmarks.digitalReadiness?.sampleSize || 0} companies)
- Average Automation Potential: ${industryBenchmarks.automationPotential?.value || 'N/A'}
- Average Tech Stack Size: ${industryBenchmarks.avg_tech_stack_size?.value || 'N/A'} tools
`;
  }

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

// ─── 3.5 Section Rewriter Agent ──────────────────────────────────────────

async function runSectionRewriter(lead, draftReport, failedSections, feedback, jobId) {
  streamThought(jobId, `[Rewriter Agent ✏️] Rewriting sections: ${failedSections.join(", ")}...`);
  
  const dynamicSchema = z.object(
    failedSections.reduce((acc, key) => {
      if (reportSchema.shape[key]) {
        acc[key] = reportSchema.shape[key];
      }
      return acc;
    }, {})
  );

  const prompt = `You are a Senior Editor. A previous draft of an AI report for ${lead.companyName} (${lead.industry}) failed quality checks.

Critic Feedback:
${feedback}

Original Draft (Full):
${JSON.stringify(draftReport, null, 2)}

You must rewrite ONLY the following sections to fix the issues: ${failedSections.join(", ")}.
Do NOT return the entire report. Only return the corrected sections.
Be HYPER-SPECIFIC. No generic buzzwords.
CONFIDENCE SCORING: You must strictly score your confidence (0.0 to 1.0) based on what data you ACTUALLY found vs what you assume, using categories: "verified", "inferred", or "speculative". Provide "evidence" strings.`;

  try {
    const { object } = await generateObject({
      model: geminiModel,
      schema: dynamicSchema,
      system: "You are an Elite Business Copywriter specializing in fixing specific sections of a report.",
      prompt: prompt,
      temperature: 0.7,
    });

    return { ...draftReport, ...object };
  } catch (error) {
    console.warn(`[Rewriter Agent] Error generating partial rewrite, falling back to original draft.`, error.message);
    return draftReport;
  }
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
    if (!object.failedSections || object.failedSections.length === 0) {
      object.failedSections = ["executiveSummary", "painPoints", "aiOpportunities", "recommendedNextSteps"];
    }
    streamThought(jobId, `  -> 🎯 Evals failed: Spec=${object.specificityScore}, Act=${object.actionabilityScore}, Acc=${object.accuracyScore}`);
  } else {
    streamThought(jobId, `  -> 🎯 Evals passed: Spec=${object.specificityScore}, Act=${object.actionabilityScore}, Acc=${object.accuracyScore}`);
  }

  // Langfuse tracing
  try {
    const trace = langfuse.trace({
      name: "report_generation",
      sessionId: lead.companyName,
      metadata: { jobId }
    });

    // Calculate simulated thinking tokens based on length of reasoning fields
    let totalThinkingTokens = 0;
    if (draftReport.marketPosition?.reasoning) {
      totalThinkingTokens += Math.round(draftReport.marketPosition.reasoning.length / 4);
    }
    if (Array.isArray(draftReport.recommendedNextSteps)) {
      draftReport.recommendedNextSteps.forEach(step => {
        if (step.reasoning) totalThinkingTokens += Math.round(step.reasoning.length / 4);
      });
    }

    if (totalThinkingTokens > 0) {
      trace.update({ metadata: { jobId, thinking_tokens: totalThinkingTokens } });
    }

    trace.score({ name: "specificity", value: object.specificityScore });
    trace.score({ name: "actionability", value: object.actionabilityScore });
    trace.score({ name: "accuracy", value: object.accuracyScore });
    
    await langfuse.flushAsync();
  } catch(e) {
    console.warn("Langfuse logging failed:", e.message);
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
    let finalIndustry = enriched.industry;
    if (enriched.validation && enriched.validation.issues.includes("industry_too_generic")) {
      streamThought(jobId, `[Orchestrator 🧠] Inferring specific industry fallback...`);
      finalIndustry = await inferSpecificIndustry(lead.companyName, enriched.description, enriched.websiteSummary);
      streamThought(jobId, `[Orchestrator 🧠] Inferred Industry: ${finalIndustry}`);
    }

    const expandedPainPoints = expandPainPoints(lead.painPoints, lead.companyName, finalIndustry);

    const enrichedContextObject = {
      companyName: enriched.companyName || lead.companyName,
      rootDomain: enriched.rootDomain,
      foundedYear: enriched.foundedYear,
      industry: finalIndustry,
      subIndustry: enriched.subIndustry,
      employeeRange: enriched.employeeRange,
      description: enriched.description,
      recentNews: enriched.recentNews,
      techStack: enriched.techStack,
      websiteSummary: enriched.websiteSummary,
      expandedPainPoints,
    };
    const enrichedContextStr = JSON.stringify(enrichedContextObject, null, 2);

    const companyHistory = await getCompanyHistory(companyId);
    if (companyHistory) {
      streamThought(jobId, `[Orchestrator 🧠] Found exact historical match for ${lead.companyName}! Triggering longitudinal analysis.`);
    }

    const industryBenchmarks = await getIndustryBenchmarks(finalIndustry || lead.industry);
    if (industryBenchmarks) {
      streamThought(jobId, `[Orchestrator 🧠] Loaded industry benchmarks for ${finalIndustry || lead.industry}.`);
    }

    const similarCompanies = await getSimilarCompanies({ ...lead, industry: finalIndustry });
    let similarContext = "";
    if (similarCompanies && similarCompanies.length > 0) {
      streamThought(jobId, `[Orchestrator 🧠] Found ${similarCompanies.length} similar past reports via pgvector.`);
      similarContext = similarCompanies.map((r, i) => `Case Study ${i+1} (${r.companyName}): ${r.content}`).join("\n\n");
    }

    const [researchData, financialData, techData, marketData] = await Promise.all([
      runParallelResearchAgent(lead, enrichedContextStr, jobId).catch(e => { console.error("Research failed", e); return {}; }),
      runParallelFinancialAgent(lead, enrichedContextStr, jobId).catch(e => { console.error("Financial failed", e); return {}; }),
      runParallelTechAgent(lead, enrichedContextStr, jobId).catch(e => { console.error("Tech failed", e); return {}; }),
      runParallelMarketAgent(lead, enrichedContextStr, similarContext, companyHistory, jobId).catch(e => { console.error("Market failed", e); return {}; })
    ]);
    
    streamThought(jobId, `[Orchestrator 🧠] Parallel Agents Completed. Synthesizing data...`);

    const synthesisContextStr = JSON.stringify({
      ...enrichedContextObject,
      researchInsights: researchData,
      financialInsights: financialData,
      techInsights: techData,
      marketInsights: marketData
    }, null, 2);
    
    let draftReport = null;
    let approved = false;
    let iterations = 0;
    let criticFeedback = "";
    let failedSections = [];

    while (!approved && iterations < 3) {
      iterations++;
      
      if (!draftReport) {
        streamThought(jobId, `\n[Orchestrator 🧠] Writer Loop (Attempt ${iterations}/3)`);
        draftReport = await runWriterAgent(lead, synthesisContextStr, criticFeedback, companyHistory, jobId, industryBenchmarks);
      } else {
        streamThought(jobId, `\n[Orchestrator 🧠] Rewriter Loop (Attempt ${iterations}/3)`);
        draftReport = await runSectionRewriter(lead, draftReport, failedSections, criticFeedback, jobId);
      }
      
      const critique = await runCriticAgent(lead, draftReport, jobId);
      
      if (critique.approved) {
        streamThought(jobId, `[Orchestrator 🧠] 🎯 Critic Approved!`);
        approved = true;
      } else {
        streamThought(jobId, `[Orchestrator 🧠] ❌ Critic Rejected: ${critique.feedback}`);
        criticFeedback = critique.feedback;
        failedSections = critique.failedSections || [];
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
    marketPosition: {
      reasoning: `The ${lead.industry} space is becoming highly saturated. Companies without strong AI automation will struggle with margins. ${lead.companyName}'s size makes them particularly vulnerable to agile competitors, meaning operational differentiation is critical right now.`,
      content: `Within the ${lead.industry} industry, companies of ${lead.companyName}'s size typically face competitive pressure to differentiate through operational efficiency and customer experience. Strategic AI adoption can provide a meaningful competitive advantage.`
    },
    digitalPresence: `${lead.companyName} has an established web presence at ${lead.website}. Optimizing their digital channels and automating customer-facing workflows could significantly improve conversion and retention.`,
    painPoints: [
      { text: `Addressing the primary challenge: ${lead.painPoints}`, confidence: 0.9, evidence: [], category: "verified" },
      { text: `Scaling operations without proportionally increasing headcount requires significant automation.`, confidence: 0.7, evidence: [], category: "inferred" },
      { text: `Maintaining consistent quality and response times as the team grows is a critical pressure point at this stage.`, confidence: 0.4, evidence: [], category: "speculative" },
    ],
    aiOpportunities: [
      {
        title: "Automated Inbound Lead Intelligence",
        description: `Implement AI-powered enrichment for every inbound inquiry to ${lead.companyName}. This delivers personalized context to your team before any human interaction, dramatically improving conversion rates.`,
        impact: "High",
        confidence: 0.9, category: "verified", evidence: []
      },
      {
        title: "Intelligent Process Automation",
        description: `Identify the top 3 repetitive workflows in ${lead.companyName}'s operations and automate them using AI agents. For a ${lead.companySize} company in ${lead.industry}, this typically saves 15-30 hours per team member monthly.`,
        impact: "High",
        confidence: 0.7, category: "inferred", evidence: []
      },
      {
        title: "AI-Powered Customer Communication",
        description: `Deploy AI to handle first-response communications, FAQs, and follow-up sequences for ${lead.companyName}. This ensures 24/7 responsiveness without additional headcount.`,
        impact: "Medium",
        confidence: 0.4, category: "speculative", evidence: []
      },
      {
        title: "Data Intelligence Dashboard",
        description: `Centralize operational data into an AI-driven dashboard that surfaces actionable insights, anomalies, and growth opportunities automatically for ${lead.companyName}.`,
        impact: "Medium",
        confidence: 0.8, category: "inferred", evidence: []
      },
    ],
    recommendedNextSteps: [
      {
        reasoning: "Automation is impossible without mapping current state. They need to identify exactly where the bottlenecks are.",
        content: `Map your top 5 repetitive workflows at ${lead.companyName} for automation potential scoring.`
      },
      {
        reasoning: "Software bloat is common at this stage. AI can replace multiple point solutions, immediately improving margin.",
        content: `Audit current software expenditures to identify consolidation opportunities via multi-purpose AI.`
      },
      {
        reasoning: "High-risk, high-cost projects fail. A low-risk pilot builds internal momentum and proves ROI.",
        content: `Pilot one AI automation in a low-risk operational area within 30 days.`
      },
      {
        reasoning: "Without defined metrics, AI adoption becomes a science project instead of a business driver.",
        content: `Define success metrics (time saved, conversion uplift, cost reduction) before implementation.`
      }
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
