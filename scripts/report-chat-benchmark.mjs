import { readFile } from 'node:fs/promises';
import { compareChatQuality, summarizeChatQuality } from '../shared/report-chat-quality.js';

try {
  const [first, second, third, ...extra] = process.argv.slice(2);
  const read = async path => JSON.parse(await readFile(path, 'utf8'));
  let result;
  if (first === '--compare' && second && third && !extra.length) {
    const [baseline, candidate] = await Promise.all([read(second), read(third)]);
    result = compareChatQuality(baseline, candidate);
  } else if (first && !first.startsWith('--') && !second) {
    result = summarizeChatQuality(await read(first));
  } else throw new Error('Usage: node scripts/report-chat-benchmark.mjs reviews.json or --compare baseline.json candidate.json');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
