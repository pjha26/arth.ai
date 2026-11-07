import { requireStaff } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <><form method="post" action="/api/auth/logout" style={{ position: "fixed", right: 18, bottom: 16, zIndex: 100 }}><button type="submit">Sign out</button></form>{children}</>;
}
