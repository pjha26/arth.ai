import * as cheerio from 'cheerio';
import axios from 'axios';
import { createHash } from 'node:crypto';
import { fetchPublicPage, publicUrl } from '../../shared/network.js';
import { INSUFFICIENT_RESEARCH_EVIDENCE } from '../../shared/report.js';

export function normalizeUrl(input) {
  const url = publicUrl(input.startsWith('http') ? input : `https://${input}`);
  return url.origin;
}

export function extractPage(html, url) {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim().slice(0, 200);
  const description = $('meta[name="description"]').attr('content')?.slice(0, 500) || '';
  const headline = $('h1').first().text().trim().slice(0, 300);
  const scripts = $('script[src]').map((_, el) => $(el).attr('src')).get().join(' ').toLowerCase();
  const techStack = [['_next/', 'Next.js'], ['wp-content','WordPress'], ['shopify','Shopify']].filter(([hint]) => scripts.includes(hint)).map(([, name]) => name);
  const links = $('a[href]').map((_, el) => { try { return new URL($(el).attr('href'), url).href; } catch { return ''; } }).get();
  $('script,style,noscript,iframe,nav,footer,svg,form').remove();
  const text = ($('main').text() || $('body').text()).replace(/\s+/g, ' ').trim().slice(0, 12000);
  return { title, description, headline, markdown: text, techStack, links, url };
}

export async function scrapeWebsite(input) {
  const { html, url } = await fetchPublicPage(input);
  return extractPage(html, url);
}

export async function enrich(lead) {
  const rootDomain = normalizeUrl(lead.website);
  const first = await scrapeWebsite(rootDomain);
  const rootHost = new URL(first.url).hostname.replace(/^www\./, '');
  // An unrelated redirect must not silently become the researched company.
  if (rootHost !== new URL(rootDomain).hostname.replace(/^www\./, '')) throw new Error('Company website redirects to a different domain; identity review required');
  const urls = [...new Set(first.links)].filter(link => {
    try { const url = new URL(link); return url.origin === new URL(first.url).origin && /^\/(about|products?|pricing|solutions?)(\/|$)/i.test(url.pathname); } catch { return false; }
  }).slice(0, 3);
  const extra = await Promise.allSettled(urls.map(scrapeWebsite));
  const pages = [first, ...extra.filter(r => r.status === 'fulfilled').map(r => r.value)].filter(p => p.markdown.length >= 80);
  if (!pages.length || pages.reduce((n, p) => n + p.markdown.length, 0) < 250) throw new Error(INSUFFICIENT_RESEARCH_EVIDENCE);
  const sources = pages.map(p => ({ id: createHash('sha256').update(p.url).digest('hex').slice(0, 12), url: p.url,
    title: p.title || lead.companyName, excerpt: p.markdown.slice(0, 8000), retrievedAt: new Date().toISOString(), publishedAt: null }));
  return { rootDomain, companyName: lead.companyName, industry: lead.industry, employeeRange: lead.companySize,
    companyTier: 'source-only', description: first.description, websiteSummary: sources.map(s => s.excerpt).join('\n'),
    techStack: [...new Set(pages.flatMap(p => p.techStack))], recentNews: [], logo: null, sources,
    rawContext: JSON.stringify(sources), validation: { valid: true, issues: [] } };
}

// Search hints are not evidence until the returned source has been fetched and identity checked.
export async function fetchDuckDuckGoRaw(query) {
  const { data } = await axios.get('https://api.duckduckgo.com/', { params: { q: query, format: 'json', no_html: 1 }, timeout: 6000, maxRedirects: 0 });
  return data?.AbstractText || '';
}

export async function fetchDuckDuckGo(companyName) {
  return { abstract: await fetchDuckDuckGoRaw(companyName).catch(() => ''), recentNews: [] };
}
