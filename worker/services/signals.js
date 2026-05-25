import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { fetchDuckDuckGo, scrapeWebsite, normalizeUrl } from "./enrichment.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function checkCompanySignals(company, lastReport) {
  const rootDomain = normalizeUrl(company.domain);
  
  // Fetch latest data
  const [news, scrape] = await Promise.all([
    fetchDuckDuckGo(company.name),
    scrapeWebsite(rootDomain)
  ]);
  
  const freshData = `
    Recent News / Abstract: ${news.abstract || "None"}
    Website Title: ${scrape.title || "None"}
    Website Headline: ${scrape.headline || "None"}
    Website Markdown: ${scrape.markdown ? scrape.markdown.substring(0, 1000) : "None"}
  `;
  
  const historicalData = lastReport?.deltaInsights 
    ? JSON.stringify(lastReport.deltaInsights)
    : lastReport?.aiSummary || "No historical summary available.";

  const { object: signalResult } = await generateObject({
    model: google("gemini-flash-latest"),
    schema: z.object({
      detectedSignal: z.boolean().describe("True if a significant new business signal is detected."),
      type: z.enum(["funding", "hiring_spike", "leadership_change", "product_launch", "pivot", "other"]).nullable(),
      severity: z.enum(["high", "medium", "low"]).nullable(),
      message: z.string().describe("Short sentence describing the new signal.")
    }),
    system: "You are a business intelligence agent. Compare the fresh data against historical data to detect MAJOR new business signals (e.g., funding, product launches). Be conservative; do not trigger signals for minor wording changes. Only return detectedSignal: true if there is substantive news or a major pivot.",
    prompt: `Company: ${company.name}\n\nHISTORICAL DATA:\n${historicalData}\n\nFRESH DATA:\n${freshData}`
  });

  return signalResult;
}
