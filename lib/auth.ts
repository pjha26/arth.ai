import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { STAFF_COOKIE, reportCookie, verifyAccess } from '@/shared/access.js';

export async function accessFor(reportId?: string) {
  const jar = await cookies();
  if (verifyAccess(jar.get(STAFF_COOKIE)?.value, 'staff', 'team')) return { staff: true, leadId: '' };
  const access = reportId && verifyAccess(jar.get(reportCookie(reportId))?.value, 'report', reportId);
  return access ? { staff: false, leadId: access.leadId as string } : null;
}

export function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export async function guard(request: Request, reportId?: string) {
  const access = await accessFor(reportId);
  if (!access) return Response.json({ error: 'Authentication required' }, { status: 401 });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !sameOrigin(request)) {
    return Response.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  return null;
}

export async function requireStaff() {
  if (!(await accessFor())?.staff) redirect('/login');
}
