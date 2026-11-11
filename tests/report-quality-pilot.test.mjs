import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { reportQualityReviewSchema } from '../shared/report-quality.js';

test('report pilot validates first and preserves generated and insufficient-evidence cases for review', { timeout: 45000 }, async t => {
  const tempRoot = path.resolve(tmpdir());
  const directory = await mkdtemp(path.join(tempRoot, 'arth-report-pilot-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), tempRoot);
    assert.match(path.basename(directory), /^arth-report-pilot-/);
    await rm(directory, { recursive: true, force: true });
  });
  const manifest = path.join(directory, 'cases.json');
  const script = fileURLToPath(new URL('../scripts/report-quality-pilot.mjs', import.meta.url));
  const fixture = new URL('./fixtures/provider-hook.mjs', import.meta.url).href;
  const complete = {
    id: 'complete', website: 'https://1.1.1.1/product', companyName: 'Fixture Research Company', personaType: 'cto',
    painPoints: 'Reduce manual invoice checks.', expected: 'generated',
    expectedFacts: ['Evaluator-only expectation that must stay out of the generated report.'], expectedUnknowns: ['Funding'],
  };
  const sparse = { ...complete, id: 'sparse', website: 'https://8.8.8.8', expected: 'insufficient-evidence', expectedFacts: [] };
  const env = { ...process.env, ARTHAI_STAGING: '1', ARTHAI_REPORT_PILOT_FIXTURE: '1', ARTHAI_SCENARIO: '',
    GEMINI_API_KEY: 'staging-fixture-key', GOOGLE_GENERATIVE_AI_API_KEY: '', ENABLE_VISUAL_ANALYSIS: 'false', REPORT_MODEL: 'gemini-2.5-flash',
    DATABASE_URL: 'postgresql://arthai:unused@127.0.0.1:55439/arthai_staging', DIRECT_URL: 'postgresql://arthai:unused@127.0.0.1:55439/arthai_staging',
    UPSTASH_REDIS_URL: 'redis://127.0.0.1:56379',
  };
  const run = (...args) => spawnSync(process.execPath, ['--import', fixture, script, manifest, ...args], { cwd: directory, env, encoding: 'utf8', timeout: 30000 });
  const read = async file => JSON.parse(await readFile(file, 'utf8'));

  await writeFile(manifest, JSON.stringify({ cases: [complete, { ...sparse, website: 'http://127.0.0.1' }] }));
  const invalid = run('--live');
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /Private network/);
  await writeFile(manifest, JSON.stringify({ cases: [complete, sparse] }));
  const validated = run();
  assert.equal(validated.status, 0, validated.stderr);
  assert.deepEqual(JSON.parse(validated.stdout), { validated: 2, ran: false });
  const eventsPath = path.join(directory, '.data/staging/provider-events.jsonl');
  await assert.rejects(readFile(eventsPath), { code: 'ENOENT' });

  const result = run('--live');
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  const { output, outcomeMismatches } = JSON.parse(result.stdout);
  assert.equal(outcomeMismatches, 0);
  const summary = await read(path.join(output, 'run.json'));
  assert.equal(summary.model, 'gemini-2.5-flash');
  assert.deepEqual(summary.results.map(entry => entry.actual), ['generated', 'insufficient-evidence']);
  const packet = await read(path.join(output, 'case-complete.json'));
  assert.equal(packet.sources[0].url, complete.website);
  assert.ok(packet.sources[0].excerpt.includes('accounting software'));
  assert.equal(packet.report.claims[0].sourceId, packet.sources[0].id);
  assert.equal(packet.case.expectedFacts[0], complete.expectedFacts[0]);
  assert.equal(JSON.stringify(packet.report).includes(complete.expectedFacts[0]), false);
  const review = await read(path.join(output, 'review-complete.json'));
  assert.equal(review.reportId, packet.reportId);
  assert.equal(reportQualityReviewSchema.safeParse(review).success, false);
  assert.equal(reportQualityReviewSchema.safeParse({ ...review, notes: 'Fixture review', ratings: { citations: 2, uncertainty: 2, usefulness: 2 },
    claims: review.claims.map(claim => ({ ...claim, verdict: 'supported', citation: 'company' })),
  }).success, true);
  const events = (await readFile(eventsPath, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(event => [event.provider, event.action]), [
    ['google-fixture', 'research'], ['google-fixture', 'research'], ['google-fixture', 'research'], ['google-fixture', 'writer'], ['google-fixture', 'review'],
  ]);

  env.ARTHAI_SCENARIO = 'pilot-truncated';
  const failed = run('--live');
  assert.equal(failed.status, 1, failed.stderr);
  const failedSummary = await read(path.join(JSON.parse(failed.stdout).output, 'run.json'));
  assert.deepEqual(failedSummary.results.map(entry => [entry.actual, entry.failureCode]), [
    ['failed', 'model-output-truncated'], ['insufficient-evidence', null],
  ]);

  const later = { ...complete, id: 'later' };
  const oversized = { ...complete, id: 'oversized', website: 'https://9.9.9.9' };
  await writeFile(manifest, JSON.stringify({ cases: [complete, later, oversized, sparse] }));
  env.ARTHAI_SCENARIO = 'quota';
  const limited = run('--live');
  assert.equal(limited.status, 1, limited.stderr);
  const limitedOutput = JSON.parse(limited.stdout).output;
  const limitedSummary = await read(path.join(limitedOutput, 'run.json'));
  assert.deepEqual(limitedSummary.results.map(entry => [entry.actual, entry.failureCode]), [
    ['failed', 'model-rate-limited'], ['failed', 'model-deferred-after-rate-limit'],
    ['failed', 'source-page-too-large'], ['insufficient-evidence', null],
  ]);
  assert.ok((await read(path.join(limitedOutput, 'case-later.json'))).sources.length > 0);
  const quotaCalls = (await readFile(eventsPath, 'utf8')).trim().split('\n').map(JSON.parse)
    .filter(event => event.action === 'quota');
  assert.ok(quotaCalls.length > 0 && quotaCalls.length <= 6);
});
