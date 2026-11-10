import { createHash, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { personaSchema } from '../shared/jobs.js';
import { publicUrl } from '../shared/network.js';
import { INSUFFICIENT_RESEARCH_EVIDENCE } from '../shared/report.js';

const expectation = z.string().trim().min(1).max(500);
const caseSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,49}$/),
  website: z.string().url(), companyName: z.string().trim().min(1).max(200),
  personaType: personaSchema, painPoints: z.string().trim().min(1).max(3000),
  challengeTags: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
  expected: z.enum(['generated', 'insufficient-evidence']),
  expectedFacts: z.array(expectation).max(20), expectedUnknowns: z.array(expectation).max(20),
}).strict().refine(entry => entry.expected !== 'generated' || entry.expectedFacts.length > 0, {
  message: 'A case expected to generate a report needs at least one expected fact',
});
const usage = 'Usage: node scripts/report-quality-pilot.mjs CASES.json [--live]\n'
  + 'Provide {"cases":[...]} with id, website, companyName, personaType, painPoints, expected, expectedFacts, and expectedUnknowns.\n'
  + 'Use expected="generated" or expected="insufficient-evidence" and arrays of strings for facts and unknowns.\n'
  + 'By default this validates the manifest. --live runs the scraper and model using the configured Gemini key.\n'
  + 'For each case, read case-*.json, fill in review-*.json, then pass the completed review files to scripts/report-quality-benchmark.mjs.';

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { live: { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) console.log(usage);
  else if (positionals.length !== 1) throw new Error(usage);
  else {
    const input = await readFile(positionals[0], 'utf8');
    const { cases } = z.object({ cases: z.array(caseSchema).min(1).max(15) }).strict().parse(JSON.parse(input));
    if (new Set(cases.map(entry => entry.id)).size !== cases.length) throw new Error('Case IDs must be unique');
    for (const entry of cases) publicUrl(entry.website);
    if (!values.live) console.log(JSON.stringify({ validated: cases.length, ran: false }));
    else await runPilot(cases, createHash('sha256').update(input).digest('hex'));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function runPilot(cases, manifestSha256) {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY for a pilot run');
  const [{ enrich }, { generateAiReport, reportModelName }] = await Promise.all([
    import('../worker/services/enrichment.js'), import('../worker/services/aiReport.js'),
  ]);
  const base = path.resolve('.data/report-pilots');
  await mkdir(base, { recursive: true });
  const output = await mkdtemp(path.join(base, 'run-'));
  const save = (name, data) => writeFile(path.join(output, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const model = reportModelName();
  const startedAt = new Date().toISOString();
  const results = [];

  for (const entry of cases) {
    const { website, companyName, personaType, painPoints, challengeTags } = entry;
    const lead = { website, companyName, personaType, painPoints, challengeTags, industry: 'Unknown', companySize: 'Unknown' };
    const reportId = randomUUID();
    let sources = [];
    let report = null;
    let actual = 'failed';
    let failedStage = 'source-collection';
    try {
      const enriched = await enrich(lead);
      sources = enriched.sources;
      failedStage = 'report-generation-or-review';
      const { sources: reportSources, ...content } = await generateAiReport(lead, enriched);
      sources = reportSources;
      report = content;
      actual = 'generated';
      failedStage = null;
    } catch (error) {
      if (failedStage === 'source-collection' && error.message === INSUFFICIENT_RESEARCH_EVIDENCE) {
        actual = 'insufficient-evidence';
        failedStage = null;
      }
    }

    const packetFile = `case-${entry.id}.json`;
    const reviewFile = `review-${entry.id}.json`;
    await save(packetFile, { reportId, model, case: entry, actual, failedStage, sources, report });
    await save(reviewFile, {
      version: 2, reportId, generationAttempt: 1, expected: entry.expected, actual, notes: '',
      ratings: report ? { citations: null, uncertainty: null, usefulness: null } : null,
      claims: report ? report.claims.map(claim => ({ text: claim.text, verdict: null, citation: null })) : [],
    });
    results.push({ id: entry.id, expected: entry.expected, actual, packetFile, reviewFile });
  }

  await save('run.json', { model, manifestSha256, startedAt, results });
  console.log(JSON.stringify({ output, cases: results.length, outcomeMismatches: results.filter(result => result.actual !== result.expected).length }));
  if (results.some(result => result.actual !== result.expected)) process.exitCode = 1;
}
