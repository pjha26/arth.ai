import Link from 'next/link';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const pageSize = 20;
const cursorSchema = z.tuple([z.string().datetime(), z.string().uuid()]);
const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });

export default async function NeedsReviewPage({ searchParams }: { searchParams: Promise<{ after?: string | string[] }> }) {
  await requireStaff();
  const { after } = await searchParams;
  const cursor = cursorSchema.safeParse(typeof after === 'string' ? after.split(',') : null);
  const [date, id] = cursor.success ? cursor.data : [];
  const alerts = await prisma.reportEvent.findMany({
    where: {
      type: { in: ['intent-alert', 'intent-sample'] },
      qualificationDecision: null,
      report: { lead: { source: 'manual' } },
      ...(date && id ? { OR: [{ createdAt: { gt: new Date(date) } }, { createdAt: new Date(date), id: { gt: id } }] } : {}),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: pageSize + 1,
    select: { id: true, reportId: true, createdAt: true, type: true, intentScore: true, report: { select: { company: { select: { name: true } } } } },
  });
  const page = alerts.slice(0, pageSize);
  const lastAlert = page.at(-1);
  const next = alerts.length > pageSize && lastAlert
    ? new URLSearchParams({ after: `${lastAlert.createdAt.toISOString()},${lastAlert.id}` })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="underline">Back to CRM</Link>
      <h1 className="mt-5 text-3xl font-semibold">Needs Review</h1>
      <p className="mt-2">Review hot-lead alerts and sampled chats. Oldest items appear first.</p>
      {page.length ? (
        <ul className="mt-6 divide-y divide-current/20 rounded-lg border border-current/20 px-4">
          {page.map(alert => (
            <li key={alert.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <h2 className="font-semibold">{alert.report.company.name}</h2>
                <p className="text-sm">
                  {alert.type === 'intent-sample' ? 'Below-threshold sample' : 'Hot-lead alert'} · <time dateTime={alert.createdAt.toISOString()}>{dateFormat.format(alert.createdAt)} UTC</time>
                  {alert.intentScore != null && ` · ${Math.round(alert.intentScore * 100)}% experimental intent`}
                </p>
              </div>
              <Link href={`/dashboard/reports/${alert.reportId}?alert=${alert.id}`} prefetch={false} className="underline">
                {alert.type === 'intent-sample' ? 'Review sample' : 'Review alert'}<span className="sr-only"> for {alert.report.company.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-6">{cursor.success ? 'No more items on this page.' : 'No inbound items are waiting for review.'}</p>}
      {(cursor.success || next) && (
        <nav className="mt-6 flex gap-6" aria-label="Review queue pages">
          {cursor.success && <Link href="/dashboard/needs-review" className="underline">Oldest items</Link>}
          {next && <Link href={`/dashboard/needs-review?${next}`} className="underline">More items</Link>}
        </nav>
      )}
    </main>
  );
}
