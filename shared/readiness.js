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

export function hotLeadConfigurationChecks(env) {
  const check = (name, valid) => ({ name, status: valid ? 'pass' : 'fail' });
  function serviceUrl(value, protocols) {
    try {
      const url = new URL(value);
      return protocols.includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash ? url : null;
    } catch { return null; }
  }
  const scorer = serviceUrl(env.ML_SERVICE_URL, ['http:', 'https:']);
  const webhook = serviceUrl(env.SLACK_WEBHOOK_URL, ['https:']);
  return [
    check('intent-scoring-enabled', env.ENABLE_INTENT_SCORING === 'true'),
    check('intent-scorer-url', !!scorer && !env.ML_SERVICE_URL.endsWith('/')),
    check('slack-webhook-config', !!webhook && webhook.pathname !== '/'),
  ];
}

export async function intentScorerHealthy(url) {
  try {
    const response = await fetch(`${url}/health`, { redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok' && typeof data.model_version === 'string' && !!data.model_version.trim() && data.experimental === true;
  } catch { return false; }
}

export function assertWorkerConfiguration(env) {
  const required = ['DATABASE_URL', 'DIRECT_URL', 'UPSTASH_REDIS_URL'];
  const errors = required.filter(name => !env[name]);
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) errors.push('AUTH_SECRET');
  if (!env.GEMINI_API_KEY && !env.GOOGLE_GENERATIVE_AI_API_KEY) errors.push('research-provider-key');
  if (env.NODE_ENV === 'production') {
    const names = ['canonical-https-origin', 'worker-redis-tls', 'private-drive-config'];
    errors.push(...configurationChecks(env).filter(check => names.includes(check.name) && check.status !== 'pass').map(check => check.name));
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) errors.push('email-sender-config');
  }
  if (errors.length) throw new Error(`Worker configuration incomplete: ${errors.join(', ')}`);
}
