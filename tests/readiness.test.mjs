import test from 'node:test';
import assert from 'node:assert/strict';
import { configurationChecks } from '../shared/readiness.js';

const configured = { AUTH_SECRET: 'a'.repeat(32), STAFF_PASSWORD: 'p'.repeat(16), NEXT_PUBLIC_APP_URL: 'https://example.com', DATABASE_URL: 'postgresql://user:pass@db.example.com/app', DIRECT_URL: 'postgresql://user:pass@db.example.com/app', UPSTASH_REDIS_URL: 'rediss://redis.example.com', UPSTASH_REDIS_REST_URL: 'https://redis.example.com', UPSTASH_REDIS_REST_TOKEN: 'test', GEMINI_API_KEY: 'test', REPORT_STORAGE: 'drive', GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@example.invalid', GOOGLE_PRIVATE_KEY: 'test', GOOGLE_DRIVE_FOLDER_ID: 'test', RESEND_API_KEY: 'test', RESEND_WEBHOOK_SECRET: 'test', EMAIL_FROM: 'test@example.invalid' };
test('release config checks distinguish missing configuration without exposing values', () => {
  assert.ok(configurationChecks(configured).every(check => check.status === 'pass'));
  assert.ok(configurationChecks({}).every(check => check.status === 'fail'));
  const weak = configurationChecks({ ...configured, AUTH_SECRET: 'short', NEXT_PUBLIC_APP_URL: 'http://example.com', UPSTASH_REDIS_URL: 'redis://redis.example.com' });
  for (const name of ['signing-secret', 'canonical-https-origin', 'worker-redis-tls']) assert.equal(weak.find(check => check.name === name).status, 'fail');
  assert.ok(!JSON.stringify(configurationChecks(configured)).includes(configured.AUTH_SECRET));
});
