import { createHash } from 'node:crypto';
import { publicUrl } from '../../shared/network.js';

const ttl = 6 * 3600000;
const host = url => publicUrl(url).hostname.replace(/^www\./, '').toLowerCase();

export async function enrichCompany(lead, companyId, freshResearch, { prisma, enrich }) {
  if (!freshResearch) {
    const now = new Date();
    const previous = await prisma.report.findFirst({
      where: { companyId, status: 'done', verificationStatus: 'reviewed', sources: { some: {}, every: { retrievedAt: { gte: new Date(now.getTime() - ttl), lte: now } } } },
      orderBy: { generatedAt: 'desc' }, select: { sources: { take: 5 } },
    });
    if (previous?.sources.length && previous.sources.length <= 4) {
      try {
        const sources = previous.sources.map(source => {
          const retrievedAt = new Date(source.retrievedAt);
          if (!Number.isFinite(retrievedAt.getTime()) || retrievedAt > now || now - retrievedAt > ttl || host(source.url) !== host(lead.website) || typeof source.excerpt !== 'string') throw new Error('Cached evidence is stale or belongs to another website');
          return { id: createHash('sha256').update(source.url).digest('hex').slice(0, 12), url: source.url, title: source.title,
            excerpt: source.excerpt, retrievedAt: retrievedAt.toISOString(), publishedAt: source.publishedAt ? new Date(source.publishedAt).toISOString() : null };
        });
        if (sources.reduce((total, source) => total + source.excerpt.length, 0) >= 250) return { rootDomain: publicUrl(lead.website).origin, logo: null, sources, researchCacheHit: true };
      } catch { /* Unusable cached evidence is replaced by a fresh bounded crawl. */ }
    }
  }
  return enrich(lead);
}
