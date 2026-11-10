import test from 'node:test';
import assert from 'node:assert/strict';
import { configurationChecks, assertWorkerConfiguration, hotLeadConfigurationChecks, intentScorerHealthy } from '../shared/readiness.js';

const configured = { AUTH_SECRET: 'a'.repeat(32), STAFF_PASSWORD: 'p'.repeat(16), NEXT_PUBLIC_APP_URL: 'https://example.com', DATABASE_URL: 'postgresql://user:pass@db.example.com/app', DIRECT_URL: 'postgresql://user:pass@db.example.com/app', UPSTASH_REDIS_URL: 'rediss://redis.example.com', UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'test', GEMINI_API_KEY: 'test', REPORT_STORAGE: 'drive', GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@example.invalid', GOOGLE_PRIVATE_KEY: 'test', GOOGLE_DRIVE_FOLDER_ID: 'test', RESEND_API_KEY: 'test', RESEND_WEBHOOK_SECRET: 'test', EMAIL_FROM: 'test@example.invalid' };
test('release config checks distinguish missing configuration without exposing values', () => {
  assert.ok(configurationChecks(configured).every(check => check.status === 'pass'));
  assert.ok(configurationChecks({}).every(check => check.status === 'fail'));
  const weak = configurationChecks({ ...configured, AUTH_SECRET: 'short', NEXT_PUBLIC_APP_URL: 'http://example.com', UPSTASH_REDIS_URL: 'redis://redis.example.com' });
  for (const name of ['signing-secret', 'canonical-https-origin', 'worker-redis-tls']) assert.equal(weak.find(check => check.name === name).status, 'fail');
  assert.ok(!JSON.stringify(configurationChecks(configured)).includes(configured.AUTH_SECRET));
});

test('workers reject missing services before paid processing and enforce production transport/storage', () => {
  assert.doesNotThrow(() => assertWorkerConfiguration({ ...configured, NODE_ENV: 'production' }));
  assert.throws(() => assertWorkerConfiguration({}), /Worker configuration incomplete/);
  assert.throws(() => assertWorkerConfiguration({ ...configured, NODE_ENV: 'production', REPORT_STORAGE: 'local' }), /private-drive-config/);
  assert.doesNotThrow(() => assertWorkerConfiguration({ ...configured, NODE_ENV: 'development', REPORT_STORAGE: 'local', UPSTASH_REDIS_URL: 'redis://127.0.0.1:56379' }));
});

test('hot-lead readiness requires explicit scoring and service configuration without reporting secrets', () => {
  const env = { ENABLE_INTENT_SCORING: 'true', ML_SERVICE_URL: 'http://scorer.internal:8001', SLACK_WEBHOOK_URL: 'https://example.invalid/services/webhook-secret' };
  const checks = hotLeadConfigurationChecks(env);
  assert.ok(checks.every(check => check.status === 'pass'));
  assert.ok(!JSON.stringify(checks).includes('webhook-secret'));
  assert.ok(hotLeadConfigurationChecks({ ...env, ENABLE_INTENT_SCORING: 'false', ML_SERVICE_URL: 'http://scorer.internal/', SLACK_WEBHOOK_URL: 'http://example.invalid/hook' }).every(check => check.status === 'fail'));
});

test('scorer health probes the read-only endpoint and verifies a loaded experimental model', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ status: 'ok', model_version: 'fixture', experimental: true }));
  assert.equal(await intentScorerHealthy('http://scorer.internal'), true);
  assert.equal(fetch.mock.calls[0].arguments[0], 'http://scorer.internal/health');
  assert.equal(fetch.mock.calls[0].arguments[1].redirect, 'error');
  fetch.mock.mockImplementation(async () => Response.json({ detail: 'Model not loaded' }, { status: 503 }));
  assert.equal(await intentScorerHealthy('http://scorer.internal'), false);
});
