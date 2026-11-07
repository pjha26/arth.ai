import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { assertStaging } from '../tests/fixtures/staging-safety.mjs';

const env = { ...process.env, ...parseEnv(readFileSync('.env.staging', 'utf8')) };
assertStaging(env);
env.NODE_OPTIONS = `--import=${pathToFileURL(path.resolve('tests/fixtures/provider-hook.mjs')).href}`;
// Next propagates CLI arguments into NODE_OPTIONS; --env-file itself cannot be propagated there.
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3101'], { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
