import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { STAFF_COOKIE } from '@/shared/access.js';

export async function POST(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const response = NextResponse.redirect(new URL('/login', request.url), 303);
  response.cookies.delete(STAFF_COOKIE);
  return response;
}
