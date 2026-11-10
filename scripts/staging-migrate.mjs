import { spawnSync } from 'node:child_process';
import { assertStaging } from '../tests/fixtures/staging-safety.mjs';

assertStaging();
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
process.exitCode = result.status ?? 1;
