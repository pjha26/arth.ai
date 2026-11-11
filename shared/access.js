import { createHmac, timingSafeEqual } from 'node:crypto';

export const STAFF_COOKIE = 'arth_staff';
export const reportCookie = (id) => `arth_report_${id}`;
/** @type {{httpOnly: boolean, secure: boolean, sameSite: 'lax', path: string}} */
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };

function secret() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters');
  return process.env.AUTH_SECRET;
}

export function equalSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const a = createHmac('sha256', 'arth-comparison').update(actual).digest();
  const b = createHmac('sha256', 'arth-comparison').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function signAccess(scope, subject, leadId = '', ttlSeconds = 7 * 86400) {
  const payload = Buffer.from(JSON.stringify({ scope, subject, leadId, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}

export function verifyAccess(token, scope, subject) {
  try {
    if (typeof token !== 'string' || token.length > 2048) return null;
    const [payload, signature, extra] = token.split('.');
    if (extra || !payload || !signature) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
    if (!equalSecret(signature, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.scope !== scope || data.subject !== subject || !Number.isFinite(data.exp) || data.exp <= Date.now() / 1000) return null;
    if (typeof data.leadId !== 'string') return null;
    return data;
  } catch { return null; }
}

export function appUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production APP URL must use HTTPS');
  return url.origin;
}

export function sameOrigin(request) {
  try { return request.headers.get('origin') === appUrl(); }
  catch { return false; }
}

export function sameReportRequestOrigin(request) {
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') return false;
  if (sameOrigin(request)) return true;
  if (site !== 'same-origin') return false;

  // Browsers control Fetch Metadata, even when a deployment alias differs from appUrl().
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === origin;
  } catch { return false; }
}

export function reportLink(reportId, leadId) {
  return `${appUrl()}/api/reports/${encodeURIComponent(reportId)}/access?token=${encodeURIComponent(signAccess('report', reportId, leadId))}`;
}

export function unsubscribeLink(leadId) {
  return `${appUrl()}/api/unsubscribe?leadId=${encodeURIComponent(leadId)}&token=${encodeURIComponent(signAccess('unsubscribe', leadId, leadId, 90 * 86400))}`;
}
