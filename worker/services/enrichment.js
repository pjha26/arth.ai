import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Enriches company data from multiple free sources in parallel.
 * Uses Promise.allSettled so any single failure doesn't block the pipeline.
 */
export async function enrich(lead) {
  const { companyName, website, industry } = lead;

  const [clearbitResult, wikiResult, ddgResult, scrapeResult] =
    await Promise.allSettled([
      fetchClearbit(companyName),
      fetchWikipedia(companyName),
      fetchDuckDuckGo(companyName),
      scrapeWebsite(website),
    ]);

  const clearbit = clearbitResult.status === "fulfilled" ? clearbitResult.value : {};
  const wiki = wikiResult.status === "fulfilled" ? wikiResult.value : {};
  const ddg = ddgResult.status === "fulfilled" ? ddgResult.value : {};
  const scrape = scrapeResult.status === "fulfilled" ? scrapeResult.value : {};

  // Build raw context string for Gemini
  const contextParts = [
    `Company: ${companyName}`,
    `Industry: ${industry}`,
    wiki.extract ? `Wikipedia: ${wiki.extract}` : null,
    ddg.abstract ? `About: ${ddg.abstract}` : null,
    scrape.title ? `Website title: ${scrape.title}` : null,
    scrape.description ? `Website description: ${scrape.description}` : null,
    scrape.markdown ? `Website Content:\n${scrape.markdown}` : (scrape.headline ? `Website headline: ${scrape.headline}` : null),
    clearbit.domain ? `Domain: ${clearbit.domain}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    logo: clearbit.logo || null,
    domain: clearbit.domain || new URL(website).hostname,
    description: wiki.extract || ddg.abstract || scrape.description || null,
    founded: wiki.founded || null,
    headquarters: wiki.headquarters || null,
    websiteTitle: scrape.title || null,
    websiteDescription: scrape.description || null,
    rawContext: contextParts || `${companyName} — ${industry} company.`,
  };
}

// ── Clearbit Autocomplete (no API key needed) ──
async function fetchClearbit(companyName) {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(companyName)}`;
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
    // First try direct summary
    const encoded = encodeURIComponent(companyName.replace(/\s+/g, "_"));
    const { data } = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { timeout: 6000 }
    );
    if (data?.type === "standard" || data?.extract) {
      return {
        extract: data.extract
          ? data.extract.slice(0, 800)
          : null,
        founded: null,
        headquarters: null,
      };
    }
  } catch {
    // Fallback to search API
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
  const { data } = await axios.get(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(companyName + " company")}&format=json&no_html=1&skip_disambig=1`,
    { timeout: 6000 }
  );
  return {
    abstract: data?.AbstractText?.slice(0, 600) || null,
    source: data?.AbstractSource || null,
  };
}

// ── Website Scraper (Firecrawl -> Cheerio fallback) ──
export async function scrapeWebsite(url) {
  // Try Firecrawl if API key is present
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const { data } = await axios.post(
        "https://api.firecrawl.dev/v1/scrape",
        { url, formats: ["markdown"] },
        {
          headers: {
            "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15000 // Firecrawl can take a bit longer
        }
      );
      
      if (data && data.success && data.data) {
        return {
          title: data.data.metadata?.title?.slice(0, 200) || null,
          description: data.data.metadata?.description?.slice(0, 500) || null,
          markdown: data.data.markdown?.slice(0, 1500) || null // Send up to 1500 chars of clean markdown
        };
      }
    } catch (err) {
      console.warn("[enrichment] Firecrawl failed, falling back to Cheerio:", err.message);
    }
  }

  // Fallback to Cheerio
  try {
    const { data: html } = await axios.get(url, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; arth.ai/1.0; +https://arth.ai)",
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);

    const title =
      $("title").first().text()?.trim().slice(0, 200) ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      null;

    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      $('meta[name="twitter:description"]').attr("content")?.trim() ||
      null;

    const h1 = $("h1").first().text()?.trim().slice(0, 300) || null;

    return {
      title: title?.slice(0, 200),
      description: description?.slice(0, 500),
      headline: h1,
    };
  } catch (err) {
    console.warn(`[enrichment] Cheerio scrape failed for ${url}:`, err.message);
    return {};
  }
}
