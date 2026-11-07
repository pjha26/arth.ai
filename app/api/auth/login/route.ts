import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth';
import { limitRequest } from '@/lib/rateLimit';
import { appUrl, cookieOptions, equalSecret, signAccess, STAFF_COOKIE } from '@/shared/access.js';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Invalid origin', { status: 403 });
  const limited = await limitRequest(request, 'login', 5, 900, 500);
  if (limited) return limited;
  if (!process.env.STAFF_PASSWORD || process.env.STAFF_PASSWORD.length < 16 || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    return new Response('Team access has not been configured', { status: 503 });
  }
  const form = await request.formData();
  if (!equalSecret(form.get('password'), process.env.STAFF_PASSWORD)) return new Response('Invalid credentials', { status: 401 });
  const response = NextResponse.redirect(new URL('/dashboard', appUrl()), 303);
  response.cookies.set(STAFF_COOKIE, signAccess('staff', 'team', '', 8 * 3600), { ...cookieOptions, maxAge: 8 * 3600 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
