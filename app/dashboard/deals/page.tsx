import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { dealsEnabled } from '@/lib/deals';
import { prisma } from '@/lib/prisma';
import { DealForm } from './DealForm';

const id = z.string().uuid();
const pageSize = 20;
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
const stageName = { open: 'Open', won: 'Won', lost: 'Lost' } as Record<string, string>;

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ deal?: string; from?: string; after?: string }> }) {
  await requireStaff();
  if (!dealsEnabled()) notFound();
  const { deal, from, after } = await searchParams;
  const selected = id.safeParse(deal);
  const origin = id.safeParse(from);
  const cursor = id.safeParse(after);
  const [deals, current, report] = await Promise.all([
    prisma.deal.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1,
      ...(cursor.success ? { cursor: { id: cursor.data }, skip: 1 } : {}),
      select: { id: true, title: true, stage: true, nextAction: true, nextActionOn: true, lead: { select: { company: { select: { name: true } } } } },
    }),
    selected.success ? prisma.deal.findUnique({ where: { id: selected.data }, include: {
      activities: { orderBy: { version: 'desc' }, take: 20 },
    } }) : null,
    origin.success && !selected.success ? prisma.report.findUnique({ where: { id: origin.data }, select: {
      id: true, status: true, generationAttempt: true, leadId: true, company: { select: { name: true } },
    } }) : null,
  ]);
  const review = report?.leadId && report.status === 'done' ? await prisma.leadQualification.findUnique({
    where: { reportId_generationAttempt: { reportId: report.id, generationAttempt: report.generationAttempt } }, select: { decision: true },
  }) : null;
  const next = deals.length > pageSize ? deals[pageSize - 1].id : null;

  return (
    <main className="arth-main ui-deals">
      <h1 className="arth-page-title">Deals</h1>
      <p className="arth-page-sub">Track next actions and record outcomes for qualified leads.</p>
      {from && !current && <section className="mt-6" aria-labelledby="new-deal">
        <h2 className="arth-section-title" id="new-deal">New deal</h2>
        {report && review?.decision === 'qualified' ? <>
          <Link className="underline underline-offset-4" href={`/dashboard/reports/${report.id}`}>Back to the report</Link>
          <DealForm key={report.id} reportId={report.id} companyName={report.company.name} />
        </> : <p>Open a completed report and save a qualified decision before creating a deal.</p>}
      </section>}
      {deal && !current && <p className="mt-6">Deal unavailable.</p>}
      {current && <section className="mt-6" aria-labelledby="current-deal">
        <h2 className="arth-section-title break-words" id="current-deal">{current.title}</h2>
        <p>{stageName[current.stage]}{current.closedAt && ` · Closed ${day(current.closedAt)}`}</p>
        {current.reportId && <Link className="underline underline-offset-4" href={`/dashboard/reports/${current.reportId}`}>View qualification report</Link>}
        {current.stage === 'open' ? <DealForm key={`${current.id}:${current.version}`} dealId={current.id} version={current.version}
          nextAction={current.nextAction} nextActionOn={day(current.nextActionOn)} /> : <p className="mt-4 break-words">{current.outcomeReason}</p>}
        <details className="mt-5">
          <summary className="cursor-pointer">Recent deal activity</summary>
          <ol className="ui-ruled-list">
            {current.activities.map(activity => <li className="break-words py-3" key={activity.version}>
              <p className="font-semibold">{stageName[activity.stage]} · <time dateTime={activity.createdAt.toISOString()}>{day(activity.createdAt)}</time> UTC</p>
              <p>{activity.nextAction || activity.outcomeReason}{activity.nextActionOn && ` · Due ${day(activity.nextActionOn)}`}</p>
            </li>)}
          </ol>
        </details>
      </section>}
      {deals.length > 0 ? <ul className="ui-ruled-list mt-6">
        {deals.slice(0, pageSize).map(item => <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={item.id}>
          <div className="min-w-0 break-words">
            <Link href={`/dashboard/deals?deal=${item.id}`} aria-current={current?.id === item.id ? 'page' : undefined}
              className="font-semibold underline underline-offset-4">{item.title}</Link>
            <p className="text-sm">{item.lead.company.name} · {stageName[item.stage]}{item.nextActionOn && ` · Due ${day(item.nextActionOn)}`}</p>
            {item.nextAction && <p className="text-sm">{item.nextAction}</p>}
          </div>
        </li>)}
      </ul> : <p className="mt-6">Open a qualified report to create your first deal.</p>}
      {(cursor.success || next) && <nav className="mt-6 flex gap-6" aria-label="Deals pages">
        {cursor.success && <Link href="/dashboard/deals" className="underline">Latest deals</Link>}
        {next && <Link href={`/dashboard/deals?after=${next}`} className="underline">Older deals</Link>}
      </nav>}
    </main>
  );
}
