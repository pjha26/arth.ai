import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { configurationChecks, hotLeadConfigurationChecks, intentScorerHealthy, migrationHistoryCheck, redisProbeNote } from '../shared/readiness.js';
import { reportDrive, checkSupabaseBucket } from '../shared/storage.js';

let files = {};
for (const name of ['.env', '.env.local']) {
  try { files = { ...files, ...parseEnv(await readFile(name, 'utf8')) }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const env = { ...files, ...process.env };
Object.assign(process.env, env);
const live = process.argv.includes('--live');
const hotLeads = process.argv.includes('--hot-leads');
const checks = configurationChecks(env);
if (hotLeads) checks.push(...hotLeadConfigurationChecks(env));
const configurationReady = checks.every(check => check.status === 'pass');
const note = (name, status, message) => checks.push({ name, status, note: message });
const remediation = {
  'staff-password': 'Set STAFF_PASSWORD to at least 16 characters in the web environment.',
  'private-storage-config': 'For a hosted pilot, configure REPORT_STORAGE=supabase and the private bucket settings on web and worker.',
  'email-and-signed-webhook': 'Set EMAIL_DELIVERY=disabled for dashboard-only delivery, or configure the sender and signed webhook.',
};
if (live) {
  if (hotLeads) {
    const configured = checks.some(check => check.name === 'intent-scorer-url' && check.status === 'pass');
    const healthy = configured && await intentScorerHealthy(env.ML_SERVICE_URL);
    note('intent-scorer-health', healthy ? 'pass' : 'unverified', 'GET /health checks whether the scorer has a model loaded. No scoring request or Slack message was sent.');
  }
  let prisma;
  try {
    const url = new URL(env.DATABASE_URL);
    url.searchParams.set('connect_timeout', '5'); url.searchParams.set('pool_timeout', '5');
    prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
    const rows = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`;
      return tx.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    }, { maxWait: 5000, timeout: 10000 });
    const expected = (await readdir('prisma/migrations')).filter(name => /^\d{14}_/.test(name));
    checks.push(migrationHistoryCheck(expected, rows));
  } catch { note('database-migrations', 'unverified', 'Cannot verify database connectivity or migration history. Back up and compare an actual database copy before deployment.'); }
  finally { await prisma?.$disconnect(); }
  let redis, redisError;
  try {
    if (new URL(env.UPSTASH_REDIS_URL).protocol !== 'rediss:') throw new Error('TLS required');
    redis = new Redis(env.UPSTASH_REDIS_URL, { lazyConnect: true, connectTimeout: 5000, commandTimeout: 5000, maxRetriesPerRequest: 1, retryStrategy: () => null });
    redis.on('error', error => { redisError = error; });
    await redis.connect();
    note('worker-redis-ping', await redis.ping() === 'PONG' ? 'pass' : 'fail', 'PING only. No queue data changed.');
  } catch (error) { note('worker-redis-ping', 'unverified', redisProbeNote(redisError ?? error)); }
  finally { redis?.disconnect(); }
  try {
    if (new URL(env.UPSTASH_REDIS_REST_URL).protocol !== 'https:') throw new Error('HTTPS required');
    const response = await fetch(env.UPSTASH_REDIS_REST_URL, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' }, body: '["PING"]' });
    if (!response.ok) note('limiter-redis-ping', 'fail', `Redis REST returned HTTP ${response.status}. Check the endpoint and write-capable token.`);
    else note('limiter-redis-ping', (await response.json()).result === 'PONG' ? 'pass' : 'fail', 'REST PING only. No limiter counters changed.');
  } catch (error) { note('limiter-redis-ping', 'unverified', redisProbeNote(error)); }
  if (!checks.some(check => check.name === 'private-storage-config' && check.status === 'pass')) {
    note('private-storage-access', 'unverified', 'Configure hosted storage before verifying access.');
  } else if (env.REPORT_STORAGE === 'supabase') {
    try {
      await checkSupabaseBucket();
      note('private-supabase-bucket', 'pass', 'Bucket metadata confirms private access. Upload and cross-process download still require a live test.');
    } catch { note('private-supabase-bucket', 'unverified', 'Private bucket metadata or service access could not be verified.'); }
  } else try {
    const client = reportDrive();
    const folder = await client.files.get({ fileId: env.GOOGLE_DRIVE_FOLDER_ID, fields: 'mimeType,driveId,capabilities(canAddChildren)', supportsAllDrives: true }, { timeout: 10000 });
    const permissions = await client.permissions.list({ fileId: env.GOOGLE_DRIVE_FOLDER_ID, supportsAllDrives: true, fields: 'permissions(type)' }, { timeout: 10000 });
    const safe = folder.data.mimeType === 'application/vnd.google-apps.folder' && !!folder.data.driveId && folder.data.capabilities?.canAddChildren && !permissions.data.permissions?.some(item => ['anyone', 'domain'].includes(item.type));
    note('private-shared-drive', safe ? 'pass' : 'fail', 'Folder metadata/permissions only. Upload and cross-process download still require a designated live test.');
  } catch { note('private-shared-drive', 'unverified', 'Folder metadata or service-account access could not be verified.'); }
  try {
    const model = env.REPORT_MODEL || 'gemini-2.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'x-goog-api-key': env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || '' } });
    note('research-model-metadata', response.ok ? 'pass' : 'unverified', 'Model metadata only; no generation or recommendation-quality test performed.');
  } catch { note('research-model-metadata', 'unverified', 'Configured model metadata could not be verified.'); }
  if (env.EMAIL_DELIVERY !== 'disabled') try {
    const response = await fetch('https://api.resend.com/domains', { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${env.RESEND_API_KEY || ''}` } });
    const body = await response.json();
    const domain = env.EMAIL_FROM?.match(/@([^>\s]+)/)?.[1]?.toLowerCase();
    const verified = response.ok && Array.isArray(body.data) && body.data.some(item => item.name?.toLowerCase() === domain && item.status === 'verified');
    note('sender-domain', verified ? 'pass' : 'unverified', 'Domain metadata only; scoped keys may require manual verification. No email was sent.');
  } catch { note('sender-domain', 'unverified', 'Sender metadata could not be verified. No email was sent.'); }
}
for (const check of checks) if (check.status === 'fail' && remediation[check.name]) check.note = remediation[check.name];
const result = { checkedAt: new Date().toISOString(), mode: live ? 'read-only-service-checks' : 'configuration-only', checks,
  configurationReady, checksPassed: checks.every(check => check.status === 'pass'), productionReleaseApproved: false,
  manualReleaseGates: ['Back up and validate a copy of the actual database', 'Designated-recipient live report, private storage, and delivery test', ...(hotLeads ? ['Controlled prospect chat, test Slack channel delivery, and staff qualification'] : []), 'Independent labelled model/report-quality evaluation', 'Agreed real-provider workload and cost measurement'] };
await mkdir('.data', { recursive: true }); await writeFile('.data/release-check.json', JSON.stringify(result, null, 2));
for (const check of checks) {
  console.log(`${check.status.toUpperCase()} ${check.name}`);
  if (check.status !== 'pass' && check.note) console.log(`  ${check.note}`);
  for (const name of check.pendingMigrations ?? []) console.log(`  Pending: ${name}`);
  for (const name of check.unfinishedMigrations ?? []) console.log(`  Unfinished: ${name}`);
}
console.log('Saved private .data/release-check.json. No migrations, email, Slack posts, or model generation performed.');
if (!result.checksPassed) process.exitCode = 1;
