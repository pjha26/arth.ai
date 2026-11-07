import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import { assertStaging } from '../tests/fixtures/staging-safety.mjs';

const env = { ...process.env, ...parseEnv(await readFile('.env.staging', 'utf8')) };
assertStaging(env);
const children = [], streams = [];
const hook = pathToFileURL(path.resolve('tests/fixtures/provider-hook.mjs')).href;
await mkdir('.data/staging', { recursive: true });
// Invalidate an old passing summary before attempting a fresh run.
await rm('.data/staging/flow-check.json', { force: true });

function start(name, args, childEnv = env) {
  const log = createWriteStream(`.data/staging/${name}.log`);
  streams.push(log);
  const child = spawn(process.execPath, args, { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  child.on('error', error => log.write(`${error.message}\n`));
  return child;
}
async function run(name, args) {
  const child = start(name, args);
  const code = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  if (code !== 0) throw new Error(`${name} failed; inspect .data/staging/${name}.log`);
}
function connects(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = value => { socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true)); socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}
async function ready(port, child) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Staging process exited before port ${port} became ready`);
    if (await connects(port)) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Staging process did not open port ${port}`);
}
async function stop() {
  await Promise.all(children.filter(child => child.exitCode === null && child.signalCode === null).map(child => new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000); timer.unref();
    child.once('exit', () => { clearTimeout(timer); resolve(); }); child.kill('SIGTERM');
  })));
  for (const stream of streams) stream.end();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().finally(() => process.exit(1)); });
try {
  for (const port of [55439, 56379]) if (!await connects(port)) throw new Error(`Isolated service missing on localhost:${port}; start staging PostgreSQL/Redis first. Docker is optional.`);
  for (const port of [3101, 58079]) if (await connects(port)) throw new Error(`Port ${port} is already occupied; stop the previous staging app first.`);
  await run('migrations', ['tests/staging-migrations.mjs']);
  await run('deploy', ['scripts/staging-migrate.mjs']);
  const bridge = start('redis-rest', ['tests/fixtures/redis-rest.mjs']);
  await ready(58079, bridge);
  const web = start('web', ['scripts/staging-web.mjs']);
  await ready(3101, web);
  const worker = start('worker', ['--import', hook, 'worker/bootstrap.js']);
  await run('flow', ['tests/staging-flow.mjs']);
  if (worker.exitCode !== null || worker.signalCode !== null) throw new Error('Main worker exited before recovery checks');
  const stopped = new Promise(resolve => worker.once('exit', resolve));
  worker.kill('SIGTERM'); await stopped;
  await run('recovery', ['tests/staging-recovery.mjs']);
  const summary = JSON.parse(await readFile('.data/staging/flow-check.json', 'utf8'));
  console.log(`Staging passed: ${summary.checks.length} workflow checks. No real email or paid AI calls.`);
} catch (error) {
  console.error(error.message);
  for (const name of ['migrations', 'deploy', 'web', 'worker', 'flow', 'recovery']) {
    let content;
    try { content = await readFile(`.data/staging/${name}.log`, 'utf8'); } catch { continue; }
    for (const [key, value] of Object.entries(env)) if (/SECRET|PASSWORD|TOKEN|KEY|DATABASE_URL|DIRECT_URL/.test(key) && value) content = content.replaceAll(value, '[redacted]');
    content = content.replace(/([?&]token=)[^\s&]+/g, '$1[redacted]');
    console.error(`${name}:\n${content.split('\n').slice(-30).join('\n')}`);
  }
  process.exitCode = 1;
} finally { await stop(); }
