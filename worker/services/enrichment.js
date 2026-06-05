import axios from "axios";
import * as cheerio from "cheerio";

export function normalizeUrl(input) {
  try {
    let urlString = input.trim();
    if (!urlString.startsWith('http')) {
      urlString = 'https://' + urlString;
    }
    const url = new URL(urlString);
    return `${url.protocol}//${url.hostname.replace(/^www\./, '')}`;
  } catch (e) {
    return input;
  }
}

/**
 * Enriches company data from multiple free sources in parallel.
 * Uses Promise.allSettled so any single failure doesn't block the pipeline.
 */
export async function enrich(lead) {
  const { companyName, website, industry } = lead;
  const rootDomain = normalizeUrl(website);

  const [clearbitResult, wikiResult, ddgResult, scrapeResult, tierResult] =
    await Promise.allSettled([
      fetchClearbit(rootDomain, companyName),
      fetchWikipedia(companyName),
      fetchDuckDuckGo(companyName),
      scrapeWebsite(rootDomain),
      detectCompanyTier(companyName),
    ]);

  const clearbit = clearbitResult.status === "fulfilled" ? clearbitResult.value : {};
  const wiki = wikiResult.status === "fulfilled" ? wikiResult.value : {};
  const ddg = ddgResult.status === "fulfilled" ? ddgResult.value : {};
  const scrape = scrapeResult.status === "fulfilled" ? scrapeResult.value : {};
  const companyTier = tierResult.status === "fulfilled" ? tierResult.value : "unknown";

  const finalDescription = (clearbit.description && clearbit.description.length >= 50) 
    ? clearbit.description 
    : (wiki.extract || ddg.abstract || scrape.description || "");

  const enrichmentData = {
    websiteUrl: website,
    rootDomain,
    companyTier,
    companyName: clearbit.name || companyName,
    industry: clearbit.industry || industry,
    subIndustry: clearbit.subIndustry || null,
    employeeRange: clearbit.metrics?.employeesRange || null,
    foundedYear: clearbit.foundedYear || wiki.founded || null,
    description: finalDescription,
    recentNews: ddg.recentNews || [],
    techStack: scrape.techStack || clearbit.tech || [],
    logo: clearbit.logo || null,
    websiteTitle: scrape.title || null,
    websiteSummary: scrape.markdown || scrape.headline || null,
  };

  const validation = validateEnrichmentData(enrichmentData);
  
  // Build raw context string for Gemini fallback usage or direct appending
  const contextParts = [
    `Company: ${enrichmentData.companyName}`,
    `Domain: ${enrichmentData.rootDomain}`,
    `Industry: ${enrichmentData.industry && enrichmentData.industry.toLowerCase() !== 'unknown' ? enrichmentData.industry + (enrichmentData.subIndustry ? ` (${enrichmentData.subIndustry})` : '') : "Not categorized. Please infer from website content."}`,
    `Employees: ${enrichmentData.employeeRange && enrichmentData.employeeRange.toLowerCase() !== 'unknown' ? enrichmentData.employeeRange : "Not publicly listed. Please infer from scale, traffic, and context."}`,
    `Description: ${enrichmentData.description}`,
    `Tech Stack: ${enrichmentData.techStack.join(", ")}`,
    enrichmentData.recentNews.length ? `Recent News: ${enrichmentData.recentNews.map(n => n.headline).join(" | ")}` : null,
    enrichmentData.websiteSummary ? `Website Content:\n${enrichmentData.websiteSummary}` : null,
  ].filter(Boolean).join("\n");

  return {
    ...enrichmentData,
    rawContext: contextParts,
    validation
  };
}

export function validateEnrichmentData(data) {
  const issues = [];

  const genericIndustries = ["Technology", "Software", "Internet", "Other"];
  if (genericIndustries.includes(data.industry) || !data.industry) {
    issues.push("industry_too_generic");
  }

  if (!data.employeeRange || data.employeeRange.toLowerCase() === "unknown") {
    issues.push("size_unknown");
  }

  if (!data.description || data.description.length < 50) {
    issues.push("description_insufficient");
  }

  if (data.websiteUrl !== data.rootDomain && !data.websiteUrl.includes(data.rootDomain)) {
    issues.push("url_not_normalized");
  }

  return { valid: issues.length === 0, issues, data };
}

// ── Clearbit ──
async function fetchClearbit(rootDomain, fallbackName) {
  try {
    if (process.env.CLEARBIT_API_KEY) {
      const url = `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(rootDomain.replace(/^https?:\/\//, ''))}`;
      const { data } = await axios.get(url, { 
        headers: { 'Authorization': `Bearer ${process.env.CLEARBIT_API_KEY}` },
        timeout: 6000 
      });
      return {
        logo: data.logo,
        domain: data.domain,
        name: data.name || data.legalName,
        description: data.description,
        industry: data.category?.industryGroup || data.category?.industry,
        subIndustry: data.category?.subIndustry,
        metrics: data.metrics,
        foundedYear: data.foundedYear,
        tech: data.tech,
      };
    }
  } catch (e) {
    console.warn("Clearbit API failed or unauthorized, falling back to autocomplete.");
  }
  
  // Fallback to autocomplete
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(fallbackName)}`;
  const { data } = await axios.get(url, { timeout: 6000 });
  if (!data?.length) return {};
  const top = data[0];
  return {
    logo: top.logo || null,
    domain: top.domain || null,
    name: top.name || null,
  };
}

// ── Wikipedia API ──
async function fetchWikipedia(companyName) {
  try {
    const encoded = encodeURIComponent(companyName.replace(/\s+/g, "_"));
    const { data } = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { timeout: 6000 }
    );
    if (data?.type === "standard" || data?.extract) {
      return {
        extract: data.extract ? data.extract.slice(0, 800) : null,
      };
    }
  } catch {
    try {
      const { data } = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(companyName)}&format=json&srlimit=1`,
        { timeout: 6000 }
      );
      const title = data?.query?.search?.[0]?.title;
      if (!title) return {};

      const { data: summary } = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { timeout: 6000 }
      );
      return { extract: summary.extract?.slice(0, 800) || null };
    } catch {
      return {};
    }
  }
  return {};
}

// ── DuckDuckGo Instant Answer ──
export async function fetchDuckDuckGo(companyName) {
  try {
    const query1 = `${companyName} funding OR product OR launch OR expansion 2025 OR 2026`;
    let res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query1)}&format=json&no_html=1&skip_disambig=1`, { timeout: 6000 }).catch(() => ({ data: {} }));
    
    if (!res.data?.AbstractText) {
      const query2 = `${companyName} news`;
      res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query2)}&format=json&no_html=1&skip_disambig=1`, { timeout: 6000 }).catch(() => ({ data: {} }));
    }

    const abstract = res.data?.AbstractText?.slice(0, 600) || null;
    return {
      abstract,
      recentNews: abstract ? [{ headline: abstract, date: new Date().toISOString().split('T')[0] }] : []
    };
  } catch (err) {
    return { abstract: null, recentNews: [] };
  }
}

// ── Generic DuckDuckGo Search (For Reflection Agent) ──
export async function fetchDuckDuckGoRaw(query) {
  try {
    const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { timeout: 6000 }).catch(() => ({ data: {} }));
    return res.data?.AbstractText?.slice(0, 800) || "No abstract found for this query.";
  } catch (err) {
    return "Search failed.";
  }
}

// ── Company Tier Detection (Well-Known vs Unknown) ──
export async function detectCompanyTier(companyName) {
  try {
    const query = `${companyName} funding OR business model OR valuation`;
    const res = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { timeout: 6000 }).catch(() => ({ data: {} }));
    
    // If the abstract has significant content, it's likely a known entity
    if (res.data?.AbstractText && res.data.AbstractText.length > 50) {
      return "well-known";
    }
  } catch (err) {}
  return "unknown";
}

// ── Website Scraper (Firecrawl -> Cheerio fallback) ──
export async function scrapeWebsite(url) {
  let scrapeData = { title: null, description: null, markdown: null, headline: null, techStack: [] };

  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const { data } = await axios.post(
        "https://api.firecrawl.dev/v1/scrape",
        { url, formats: ["markdown"] },
        {
          headers: { "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          timeout: 15000
        }
      );
      
      if (data && data.success && data.data) {
        scrapeData.title = data.data.metadata?.title?.slice(0, 200) || null;
        scrapeData.description = data.data.metadata?.description?.slice(0, 500) || null;
        scrapeData.markdown = data.data.markdown?.slice(0, 1500) || null;
      }
    } catch (err) {
      console.warn("[enrichment] Firecrawl failed, falling back to Cheerio");
    }
  }

  if (!scrapeData.markdown) {
    try {
      const { data: html } = await axios.get(url, {
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; arth.ai/1.0; +https://arth.ai)" },
        maxRedirects: 5,
      });

      const $ = cheerio.load(html);

      scrapeData.title = $("title").first().text()?.trim().slice(0, 200) || $('meta[property="og:title"]').attr("content")?.trim() || null;
      scrapeData.description = $('meta[name="description"]').attr("content")?.trim() || $('meta[property="og:description"]').attr("content")?.trim() || null;
      scrapeData.headline = $("h1").first().text()?.trim().slice(0, 300) || null;

      const scripts = $('script').map((i, el) => $(el).attr('src') || $(el).html()).get().join(' ').toLowerCase();
      if (scripts.includes('_next/')) scrapeData.techStack.push('Next.js');
      if (scripts.includes('react')) scrapeData.techStack.push('React');
      if (scripts.includes('wp-content')) scrapeData.techStack.push('WordPress');
      if (scripts.includes('shopify')) scrapeData.techStack.push('Shopify');
      if (scripts.includes('stripe')) scrapeData.techStack.push('Stripe');
      if (scripts.includes('hubspot')) scrapeData.techStack.push('HubSpot');
      if (scripts.includes('google-analytics') || scripts.includes('gtag')) scrapeData.techStack.push('Google Analytics');

    } catch (err) {
      console.warn(`[enrichment] Cheerio scrape failed for ${url}`);
    }
  }

  return scrapeData;
}
