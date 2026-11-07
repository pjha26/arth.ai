import axios from 'axios';
import { prisma } from '../../shared/db.js';
import { publicUrl } from '../../shared/network.js';
import { candidateFit } from '../../shared/discovery.js';
import { scrapeWebsite } from './enrichment.js';


export async function processDiscoverySearch(searchId, input) {
  try {
    if (!process.env.GOOGLE_PLACES_API_KEY) throw new Error('GOOGLE_PLACES_API_KEY is required for verified business records');
    await prisma.discoverySearch.update({ where: { id: searchId }, data: { status: 'processing' } });
    const { data: results } = await axios.post('https://places.googleapis.com/v1/places:searchText', { textQuery: `${input.industry} companies in ${input.region}`, pageSize: 10 }, { timeout: 10000, maxRedirects: 0,
      headers: { 'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.formattedAddress,places.googleMapsUri' } });
    const candidates = [], domains = new Set();
    for (const listing of (results.places || []).slice(0, 10)) {
      const business = { name: listing.displayName?.text, website: listing.websiteUri, formatted_address: listing.formattedAddress, url: listing.googleMapsUri };
      if (!business?.website || !business.name) continue; // Never invent domains or substitute name autocomplete.
      try {
        const url = publicUrl(business.website), domain = url.hostname.replace(/^www\./, '');
        if (domains.has(domain)) continue; domains.add(domain);
        const page = await scrapeWebsite(url.href);
        if (new URL(page.url).hostname.replace(/^www\./, '') !== domain) continue;
        const fit = candidateFit(input, { name: business.name, address: business.formatted_address || '' }, page);
        candidates.push({ domain, name: business.name, fit, listingUrl: business.url || null, sourceUrl: page.url });
      } catch (error) { console.warn('Discovery candidate could not be established:', error.message); }
    }
    const rows = candidates.sort((a,b) => b.fit.score - a.fit.score);
    await prisma.$transaction(async tx => {
      await tx.discoveredCompany.deleteMany({ where: { searchId } });
      let rank = 0;
      for (const candidate of rows) {
        let companyId = null, status = 'filtered_out';
        if (candidate.fit.eligible) {
          const company = await tx.company.upsert({ where: { domain: candidate.domain }, update: {}, create: { domain: candidate.domain, website: candidate.sourceUrl, name: candidate.name, industry: input.industry } });
          companyId = company.id;
          const existing = await tx.report.findFirst({ where: { companyId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) }, status: { in: ['done', 'pending', 'processing'] } }, orderBy: { createdAt: 'desc' } });
          if (!existing) {
            const lead = await tx.lead.create({ data: { companyId, source: 'auto_discovered', painPoints: `Research fit for ${input.industry} in ${input.region}`, personaType: 'general' } });
            await tx.report.create({ data: { companyId, leadId: lead.id, personaType: 'general', deliveryStatus: 'skipped' } });
            status = 'queued'; // The reconciler dispatches the transaction's pending report.
          } else status = existing.status === 'done' ? 'researched' : 'queued';
        }
        await tx.discoveredCompany.create({ data: { searchId, companyId, name: candidate.name, domain: candidate.domain,
          source: 'google_places', websiteLive: true, sourcesCorroborating: 2,
          confidenceTier: candidate.fit.eligible ? 'likely' : 'unconfirmed', verificationSignals: { listingUrl: candidate.listingUrl, websiteUrl: candidate.sourceUrl },
          fitScore: candidate.fit.score, fitReasons: candidate.fit.reasons, status, rank: ++rank } });
      }
      await tx.discoverySearch.update({ where: { id: searchId }, data: { status: 'completed' } });
    }, { timeout: 20000 });
  } catch (error) {
    await prisma.discoverySearch.update({ where: { id: searchId }, data: { status: 'failed' } });
    throw error;
  }
}
