import { readFile } from 'node:fs/promises';
import { summarizeChatQuality } from '../shared/report-chat-quality.js';

try {
  const [path, ...extra] = process.argv.slice(2);
  if (!path || extra.length) throw new Error('Usage: node scripts/report-chat-benchmark.mjs reviewed-chat-cases.json');
  const reviews = JSON.parse(await readFile(path, 'utf8'));
  console.log(JSON.stringify(summarizeChatQuality(reviews), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
