import { readFile } from 'node:fs/promises';
import { summarizeReportQuality } from '../shared/report-quality.js';

try {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error('Usage: node scripts/report-quality-benchmark.mjs REVIEW.json [REVIEW.json ...]');
  const reviews = await Promise.all(paths.map(async path => JSON.parse(await readFile(path, 'utf8'))));
  const summary = summarizeReportQuality(reviews);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pilotGatePassed) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
