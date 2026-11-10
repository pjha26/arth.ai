import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichCompany } from '../worker/services/researchCache.js';

function fixture() {
  const source = { id: 'previous-report-source', url: 'https://example.com/products', title: 'Public product', excerpt: 'Public website evidence. '.repeat(20), retrievedAt: new Date(), publishedAt: null };
  let crawls = 0, lookups = 0;
  const services = { prisma: { report: { findFirst: async ({ where, select }) => {
    lookups++; assert.equal(where.companyId, 'company-id'); assert.equal(where.status, 'done'); assert.equal(where.verificationStatus, 'reviewed');
    assert.deepEqual(Object.keys(select), ['sources']); return { sources: [source], insights: { prospectSecret: 'Never reuse this' } };
  } } }, enrich: async lead => { crawls++; return { fresh: true, companyName: lead.companyName }; } };
  return { source, services, lead: { website: 'https://example.com', companyName: 'New requester', painPoints: 'Private challenge' }, crawls: () => crawls, lookups: () => lookups };
}

test('fresh reviewed evidence is reused without another lead context or regenerated retrieval dates', async () => {
  const f = fixture(); const result = await enrichCompany(f.lead, 'company-id', false, f.services);
  assert.equal(f.crawls(), 0); assert.equal(result.researchCacheHit, true);
  assert.equal(result.sources[0].retrievedAt, f.source.retrievedAt.toISOString());
  assert.ok(!JSON.stringify(result).includes('prospectSecret')); assert.ok(!JSON.stringify(result).includes('Private challenge'));
});

test('old, future, unrelated, private, and insufficient cached sources require a fresh crawl', async () => {
  for (const change of [
    f => { f.source.retrievedAt = new Date(Date.now() - 7 * 3600000); },
    f => { f.source.retrievedAt = new Date(Date.now() + 3600000); },
    f => { f.source.url = 'https://different.example/products'; },
    f => { f.source.url = 'http://127.0.0.1'; },
    f => { f.source.excerpt = 'Insufficient'; },
  ]) {
    const f = fixture(); change(f);
    assert.equal((await enrichCompany(f.lead, 'company-id', false, f.services)).fresh, true); assert.equal(f.crawls(), 1);
  }
});

test('explicit fresh research bypasses cache lookups', async () => {
  const f = fixture(); await enrichCompany(f.lead, 'company-id', true, f.services);
  assert.equal(f.lookups(), 0); assert.equal(f.crawls(), 1);
});
