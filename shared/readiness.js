export function configurationChecks(env) {
  const checks = [];
  const check = (name, valid) => checks.push({ name, status: valid ? 'pass' : 'fail' });
  check('signing-secret', typeof env.AUTH_SECRET === 'string' && env.AUTH_SECRET.length >= 32);
  check('staff-password', typeof env.STAFF_PASSWORD === 'string' && env.STAFF_PASSWORD.length >= 16);
  try { const url = new URL(env.NEXT_PUBLIC_APP_URL); check('canonical-https-origin', url.protocol === 'https:' && !url.username && !url.password); }
  catch { check('canonical-https-origin', false); }
  for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
    try { check(name, ['postgres:', 'postgresql:'].includes(new URL(env[name]).protocol)); }
    catch { check(name, false); }
  }
  try { check('worker-redis-tls', new URL(env.UPSTASH_REDIS_URL).protocol === 'rediss:'); }
  catch { check('worker-redis-tls', false); }
  try { check('limiter-redis-https', new URL(env.UPSTASH_REDIS_REST_URL).protocol === 'https:' && !!env.UPSTASH_REDIS_REST_TOKEN); }
  catch { check('limiter-redis-https', false); }
  check('research-provider-key', !!(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY));
  check('private-drive-config', env.REPORT_STORAGE === 'drive' && !!env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!env.GOOGLE_PRIVATE_KEY && !!env.GOOGLE_DRIVE_FOLDER_ID);
  check('email-and-signed-webhook', !!env.RESEND_API_KEY && !!env.RESEND_WEBHOOK_SECRET && !!env.EMAIL_FROM);
  return checks;
}
