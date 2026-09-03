import axios from "axios";
import { scrapeWebsite, fetchDuckDuckGoRaw } from "./enrichment.js";
import pkg from "@prisma/client/index.js";
const { PrismaClient } = pkg;
import { Queue } from "bullmq";
import IORedis from "ioredis";

const prisma = new PrismaClient();

const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 1000, 10000);
  },
  tls: process.env.UPSTASH_REDIS_URL?.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
});

const leadsQueue = new Queue("leads", { connection });

function cleanUrl(urlString) {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    return `${url.protocol}//${url.hostname.replace(/^www\./, '')}`;
  } catch {
    return urlString;
  }
}

function extractDomain(urlString) {
  try {
    return new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return urlString.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

export async function processDiscoverySearch(searchId, input) {
  const { industry, region, sizeMin, sizeMax, signal } = input;
  console.log(`[Discovery] Starting for ${industry} in ${region} (Search: ${searchId})`);

  try {
    await prisma.discoverySearch.update({
      where: { id: searchId },
      data: { status: "processing" },
    });

    const discoveredMap = new Map();

    // Step A: Discovery via Google Places
    if (process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const query = encodeURIComponent(`${industry} companies in ${region}`);
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        const { data } = await axios.get(url, { timeout: 10000 });
        
        if (data.results) {
          for (const place of data.results) {
            // Text Search doesn't reliably return website. Let's do a quick DDG search to find the domain if needed,
            // or just rely on the secondary web search to populate domains.
            // For now, we will use the name.
            const name = place.name;
            const domainRes = await axios.get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(name)}`).catch(() => ({ data: [] }));
            let domain = null;
            if (domainRes.data && domainRes.data.length > 0) {
               domain = domainRes.data[0].domain;
            }
            if (!domain) {
              domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
            }
            
            if (domain) {
               discoveredMap.set(domain, { name, domain, source: "google_places", sources: 1 });
            }
          }
        }
      } catch (e) {
        console.warn("[Discovery] Google Places API failed:", e.message);
      }
    }

    // Secondary Web Search using DuckDuckGo
    try {
      const webQuery = `top ${industry} companies in ${region} list`;
      const webRes = await fetchDuckDuckGoRaw(webQuery);
      // Try to extract domains/names from abstract? It's plain text.
      // We can use clearbit autocomplete again on extracted capitalized words.
      const words = webRes.match(/\b[A-Z][a-zA-Z]+\b/g) || [];
      for (const word of words.slice(0, 10)) { // limit to avoid too many requests
        if (word.length > 3) {
          const domainRes = await axios.get(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(word)}`).catch(() => ({ data: [] }));
          if (domainRes.data && domainRes.data.length > 0) {
            const domain = domainRes.data[0].domain;
            const name = domainRes.data[0].name;
            if (discoveredMap.has(domain)) {
              discoveredMap.get(domain).sources += 1;
            } else {
              discoveredMap.set(domain, { name, domain, source: "web_search", sources: 1 });
            }
          }
        }
      }
    } catch (e) {
       console.warn("[Discovery] Web search failed:", e.message);
    }

    // Step B & C & D
    let rank = 1;
    for (const [domain, companyData] of discoveredMap.entries()) {
      // Deduplicate against existing Company table
      const existingCompany = await prisma.company.findUnique({ where: { domain } });
      let companyId = existingCompany ? existingCompany.id : null;

      // Verification
      const scrape = await scrapeWebsite(`https://${domain}`);
      const websiteLive = scrape.title !== null || scrape.description !== null || scrape.markdown !== null;
      
      const sourcesCorroborating = companyData.sources;
      
      let confidenceTier = "unconfirmed";
      if (websiteLive && sourcesCorroborating >= 2) confidenceTier = "verified";
      else if (websiteLive && sourcesCorroborating === 1) confidenceTier = "likely";

      const verificationSignals = [
        `${companyData.source === 'google_places' ? 'Google Places listing found' : 'Web search result found'}`,
        websiteLive ? 'Website is live' : 'Website appears inactive'
      ];

      // Fit Scoring
      let fitScore = 0;
      const fitReasons = [];

      if (confidenceTier === "verified" || confidenceTier === "likely") {
        const textToSearch = ((scrape.title || '') + ' ' + (scrape.description || '')).toLowerCase();
        
        let industryMatch = 0;
        if (textToSearch.includes(industry.toLowerCase())) {
          industryMatch = 1;
          fitReasons.push(`Industry keyword match (${industry})`);
        }

        let sizeMatch = 0.5; // Neutral default
        if (sizeMin || sizeMax) {
           fitReasons.push(`Size parameters considered`);
        }

        let regionMatch = 1; // Assumed from initial search
        fitReasons.push(`Region match (${region})`);

        let signalMatch = 0;
        if (signal && textToSearch.includes(signal.toLowerCase())) {
          signalMatch = 1;
          fitReasons.push(`Signal match (${signal})`);
        } else if (!signal) {
          signalMatch = 1; // If no signal required, give full points
        }

        const hasActiveWebsite = websiteLive ? 1 : 0;

        fitScore = (industryMatch * 0.30) + (sizeMatch * 0.20) + (hasActiveWebsite * 0.15) + (regionMatch * 0.15) + (signalMatch * 0.20);
      }

      // Determine Outcome
      let status = "discovered";
      if ((confidenceTier === "verified" || confidenceTier === "likely") && fitScore >= 0.6) {
         status = "queued";
         
         // Auto-queue winners natively
         try {
           const derivedCompanyName = companyData.name;
           
           // Upsert Company
           const upsertedCompany = await prisma.company.upsert({
             where: { domain },
             update: {
               name: derivedCompanyName,
               industry: industry,
             },
             create: {
               domain,
               name: derivedCompanyName,
               industry: industry,
             }
           });
           
           companyId = upsertedCompany.id;

           // Deduplication check
           const existingReport = await prisma.report.findFirst({
             where: { companyId },
             orderBy: { createdAt: 'desc' }
           });

           if (!existingReport) {
             // Create Lead (nullable email/fullName via auto_discovered source)
             const lead = await prisma.lead.create({
               data: {
                 companyId,
                 source: "auto_discovered",
                 painPoints: `Auto discovered via ${industry} search in ${region}` + (signal ? ` (Signal: ${signal})` : ""),
               }
             });

             // Create Report Shell
             const report = await prisma.report.create({
               data: {
                 companyId,
                 personaType: "general",
                 status: "pending",
               }
             });

             // Enqueue process-report
             await leadsQueue.add(
               "process-report",
               {
                 leadId: lead.id,
                 companyId,
                 reportId: report.id,
                 leadInput: {
                   website: domain,
                   companyName: derivedCompanyName,
                   industry: industry,
                   painPoints: `Auto discovered via ${industry} search in ${region}` + (signal ? ` (Signal: ${signal})` : ""),
                 },
                 jobId: report.id,
                 submittedAt: new Date().toISOString(),
               },
               { jobId: report.id }
             );
           }
         } catch (queueErr) {
           console.error("[Discovery] Error auto-queueing winner", queueErr);
           status = "discovered"; // fallback
         }
      } else {
         status = "filtered_out";
      }

      await prisma.discoveredCompany.create({
        data: {
          searchId,
          companyId,
          name: companyData.name,
          domain: companyData.domain,
          source: companyData.source,
          websiteLive,
          sourcesCorroborating,
          confidenceTier,
          verificationSignals,
          fitScore,
          fitReasons,
          status,
          rank: rank++,
        }
      });
    }

    // Step E: Complete
    await prisma.discoverySearch.update({
      where: { id: searchId },
      data: { status: "completed" },
    });
    console.log(`[Discovery] Completed for search: ${searchId}`);
  } catch (err) {
    console.error(`[Discovery] Failed for search ${searchId}:`, err);
    await prisma.discoverySearch.update({
      where: { id: searchId },
      data: { status: "failed" },
    });
  }
}
