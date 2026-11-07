import axios from 'axios';
import { mkdir, appendFile, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { assertStaging } from './staging-safety.mjs';

assertStaging();
const directory = path.resolve('.data/staging');
const fixtureText = 'Staging Research Company builds accounting software for small business teams. Its public product page describes invoice tracking, reconciliation, and reporting. The product has an API for importing transaction records. This is controlled integration-test evidence, not a real prospect or independent market research. No funding, staff size, revenue, conversion rate, or savings are stated.';
const source = 'https://www.iana.org';
const originalAdapter = axios.getAdapter(axios.defaults.adapter);
axios.defaults.adapter = async config => {
  if (new URL(config.url).origin === source) return { status: 200, statusText: 'OK', headers: { 'content-type': 'text/html' }, config,
    data: `<html><title>Staging Research Company</title><main><h1>Accounting tools</h1><p>${fixtureText}</p></main></html>` };
  if (new URL(config.url).hostname !== '127.0.0.1') throw new Error('External Axios request blocked by staging fixtures');
  return originalAdapter(config);
};
const json = (data, status = 200) => Response.json(data, { status });
function report(data) {
  const s = data.sources[0], quote = s.excerpt.slice(0, 95);
  return {
    executiveSummary: `Controlled staging analysis for ${data.company}. The website self-reports accounting software [${s.id}]. Recommendations are hypotheses.`,
    marketPosition: { reasoning: 'Only the provided website statements were used.', content: `Accounting software is described by the source [${s.id}]. Competitive position is not established.` },
    techStack: [], fundingStage: 'Not established from available evidence', digitalPresence: `The source describes an API [${s.id}]. This is not a live performance measurement.`,
    painPoints: [{ text: `The prospect asks about ${data.challengeTags.join(', ') || 'manual work'}. This is prospect context, not an independently verified company fact.`, confidence: 0.5, evidence: [], category: 'inferred' }],
    aiOpportunities: [{ title: 'Pilot an invoice-review assistant', description: 'Hypothesis: test a small review workflow and measure errors before wider adoption.', impact: 'Medium', confidence: 0.5, evidence: [s.id], category: 'inferred' }],
    recommendedNextSteps: [{ reasoning: 'Validate feasibility before rollout.', content: 'Choose a small sample and record a baseline before a pilot.' }],
    auditScores: { digitalReadiness: 6, digitalReadinessReason: 'Subjective assessment of the available text; no performance measurement.', automationPotential: 7, automationPotentialReason: 'A proposed experiment, not measured savings.', growthIndex: 5, growthIndexReason: 'Insufficient independent growth evidence.' },
    claims: [{ text: 'The source describes accounting software.', sourceId: s.id, quote }], signals: [],
  };
}
function generation(object) {
  return { candidates: [{ content: { role: 'model', parts: [{ text: typeof object === 'string' ? object : JSON.stringify(object) }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 30, totalTokenCount: 50 } };
}
async function log(data) { await mkdir(directory, { recursive: true }); await appendFile(path.join(directory, 'provider-events.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...data }) + '\n'); }
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init), url = new URL(request.url);
  if (url.hostname === '127.0.0.1' && url.port === '58001' && url.pathname === '/score') {
    const body = await request.json();
    if (body.message.includes('scoring outage')) return json({ error: 'Controlled scorer outage' }, 503);
    return json({ intent_probability: body.message.includes('pricing') ? 0.9 : 0.2, model_version: 'fixture-model', experimental: true });
  }
  if (url.hostname === '127.0.0.1') return originalFetch(request);
  if (url.hostname === 'generativelanguage.googleapis.com') {
    const body = await request.json();
    if (url.pathname.endsWith(':embedContent')) return json({ embedding: { values: Array.from({ length: 768 }, (_, i) => i === 0 ? 1 : 0) } });
    const system = body.systemInstruction?.parts?.map(p => p.text || '').join('') || '';
    const text = body.contents?.flatMap(c => c.parts).map(p => p.text || '').join('') || '';
    if (url.pathname.endsWith(':streamGenerateContent')) {
      await log({ provider: 'google-fixture', action: 'chat' });
      return new Response(`data: ${JSON.stringify(generation('The report recommends a small invoice-review pilot. This is a hypothesis; measure a baseline before implementation.'))}\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
    }
    const data = JSON.parse(text);
    if (system.startsWith('Extract only directly supported facts.')) {
      await log({ provider: 'google-fixture', action: 'research' });
      return json(generation({ findings: [{ text: 'The source describes accounting software.', sourceId: data.sources[0].id, quote: data.sources[0].excerpt.slice(0, 95) }], missing: ['Independent funding and growth evidence'] }));
    }
    if (system.startsWith('You write evidence-backed company research.')) { await log({ provider: 'google-fixture', action: 'writer' }); return json(generation(report(data))); }
    if (system.startsWith('Independently audit every section')) { await log({ provider: 'google-fixture', action: 'review' }); return json(generation({ approved: true, reason: 'Controlled integration fixture; semantic accuracy is not being evaluated.' })); }
    throw new Error('Unrecognized model operation in staging fixture');
  }
  if (url.hostname === 'api.resend.com' && url.pathname === '/emails') {
    const email = await request.json();
    const recipients = Array.isArray(email.to) ? email.to : [email.to];
    if (recipients.some(address => !String(address).endsWith('@example.invalid'))) throw new Error('Staging only accepts synthetic example.invalid recipients');
    const key = request.headers.get('idempotency-key');
    await log({ provider: 'resend-attempt', key });
    let events = []; try { events = (await readFile(path.join(directory, 'provider-events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse); } catch { /* First fixture email. */ }
    const existing = events.find(e => e.provider === 'resend-fixture' && e.key === key);
    if (existing) return json({ id: existing.id });
    const id = randomUUID();
    await log({ provider: 'resend-fixture', action: 'accepted-locally', id, key, to: recipients, html: email.html, attachments: email.attachments?.length || 0 });
    if (process.env.ARTHAI_CRASH_BOUNDARY === 'provider' && key === `report-${process.env.ARTHAI_CRASH_REPORT_ID}`) {
      await writeFile(path.join(directory, `crash-${process.env.ARTHAI_CRASH_REPORT_ID}.json`), JSON.stringify({ boundary: 'provider' }));
      await new Promise(() => {});
    }
    return json({ id });
  }
  throw new Error(`External fetch blocked by staging fixtures: ${url.hostname}`);
};
