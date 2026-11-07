import test from 'node:test';
import assert from 'node:assert/strict';
import { assertStaging } from './fixtures/staging-safety.mjs';

const local = { ARTHAI_STAGING: '1', DATABASE_URL: 'postgresql://test:test@127.0.0.1:55439/arthai_staging', DIRECT_URL: 'postgresql://test:test@127.0.0.1:55439/arthai_staging', UPSTASH_REDIS_URL: 'redis://127.0.0.1:56379' };
test('staging permits only the isolated database and Redis endpoints', () => {
  assert.doesNotThrow(() => assertStaging(local));
  assert.doesNotThrow(() => assertStaging({ ...local, DATABASE_URL: local.DATABASE_URL.replace('arthai_staging', 'arthai_migrationcheck_123') }));
  for (const change of [
    { ARTHAI_STAGING: '0' },
    { DATABASE_URL: 'postgresql://test:test@db.example.com:55439/arthai_staging' },
    { DIRECT_URL: 'postgresql://test:test@127.0.0.1:5432/arthai_staging' },
    { DATABASE_URL: 'postgresql://test:test@127.0.0.1:55439/production' },
    { UPSTASH_REDIS_URL: 'redis://redis.example.com:56379' },
    { UPSTASH_REDIS_URL: 'redis://127.0.0.1:6379' },
  ]) assert.throws(() => assertStaging({ ...local, ...change }));
});
