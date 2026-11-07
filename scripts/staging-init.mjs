import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const password = () => randomBytes(24).toString('hex');
const dbPassword = process.env.STAGING_DB_PASSWORD || password(), redisPassword = password();
const values = {
  ARTHAI_STAGING: '1', NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
  STAGING_DB_PASSWORD: dbPassword, STAGING_REDIS_PASSWORD: redisPassword,
  DATABASE_URL: `postgresql://arthai:${dbPassword}@127.0.0.1:55439/arthai_staging`,
  DIRECT_URL: `postgresql://arthai:${dbPassword}@127.0.0.1:55439/arthai_staging`,
  UPSTASH_REDIS_URL: `redis://:${redisPassword}@127.0.0.1:56379`,
  UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:58079', UPSTASH_REDIS_REST_TOKEN: password(),
  AUTH_SECRET: password(), STAFF_PASSWORD: password(),
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3101', NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101',
  GEMINI_API_KEY: 'staging-fixture-key', GOOGLE_GENERATIVE_AI_API_KEY: '', GROQ_API_KEY: '',
  RESEND_API_KEY: 're_staging_fixture_key', RESEND_WEBHOOK_SECRET: `whsec_${randomBytes(32).toString('base64')}`,
  EMAIL_FROM: 'ArthAI Staging <reports@example.invalid>', EMAIL_REPLY_TO: 'qa@example.invalid',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: '', GOOGLE_PRIVATE_KEY: '', GOOGLE_DRIVE_FOLDER_ID: '', GOOGLE_PLACES_API_KEY: '',
  SLACK_WEBHOOK_URL: '', CRM_WEBHOOK_URL: '', GOOGLE_SHEETS_ID: '',
  REPORT_STORAGE: 'local', ENABLE_INTENT_SCORING: 'false', ENABLE_VISUAL_ANALYSIS: 'false',
  ML_SERVICE_URL: 'http://127.0.0.1:58001',
};
try {
  await writeFile('.env.staging', Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Created .env.staging with isolated local credentials. Existing application configuration was not changed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env.staging already exists; preserved its credentials and local database.');
}
