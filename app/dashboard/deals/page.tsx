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
const dueFilters = [{ value: '', label: 'All deals' }, { value: 'today', label: 'Due today' }, { value: 'overdue', label: 'Overdue' }];

export default async function DealsPage({ searchParams }: { searchParams: Promise<{ deal?: string; from?: string; after?: string; due?: string }> }) {
  await requireStaff();
  if (!dealsEnabled()) notFound();
  const { deal, from, after, due } = await searchParams;
  const selected = id.safeParse(deal);
  const origin = id.safeParse(from);
  const cursor = id.safeParse(after);
  const dueFilter = due === 'today' || due === 'overdue' ? due : '';
  const today = new Date(new Date().toISOString().slice(0, 10));
  const query = (params: Record<string, string> = {}) => {
    const search = new URLSearchParams(dueFilter ? { due: dueFilter, ...params } : params).toString();
    return search ? `/dashboard/deals?${search}` : '/dashboard/deals';
  };
  const [deals, current, report] = await Promise.all([
    prisma.deal.findMany({
      where: dueFilter ? { stage: 'open', nextActionCompletedAt: null, nextActionOn: dueFilter === 'today' ? today : { lt: today } } : undefined,
      orderBy: dueFilter ? [{ nextActionOn: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }] : [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize + 1,
      ...(cursor.success ? { cursor: { id: cursor.data }, skip: 1 } : {}),
      select: { id: true, title: true, stage: true, nextAction: true, nextActionOn: true, nextActionCompletedAt: true,
        lead: { select: { company: { select: { name: true } } } } },
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
          nextAction={current.nextAction} nextActionOn={day(current.nextActionOn)} nextActionCompletedAt={day(current.nextActionCompletedAt)} /> : <p className="mt-4 break-words">{current.outcomeReason}</p>}
        <details className="mt-5">
          <summary className="cursor-pointer">Recent deal activity</summary>
          <ol className="ui-ruled-list">
            {current.activities.map(activity => <li className="break-words py-3" key={activity.version}>
              <p className="font-semibold">{activity.nextActionCompletedAt ? 'Action completed' : stageName[activity.stage]} · <time dateTime={activity.createdAt.toISOString()}>{day(activity.createdAt)}</time> UTC</p>
              <p>{activity.nextAction || activity.outcomeReason}{activity.nextActionOn && ` · Due ${day(activity.nextActionOn)}`}</p>
            </li>)}
          </ol>
        </details>
      </section>}
      <nav className="flex flex-wrap gap-3" aria-label="Filter deals by action due date">
        {dueFilters.map(filter => <Link key={filter.value} className="ui-button ui-button-secondary"
          href={filter.value ? `/dashboard/deals?due=${filter.value}` : '/dashboard/deals'}
          aria-current={filter.value === dueFilter ? 'page' : undefined}>{filter.label}</Link>)}
      </nav>
      {dueFilter && <p className="arth-page-sub">Due dates use UTC.</p>}
      {deals.length > 0 ? <ul className="ui-ruled-list mt-6">
        {deals.slice(0, pageSize).map(item => <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={item.id}>
          <div className="min-w-0 break-words">
            <Link href={query({ deal: item.id, ...(cursor.success ? { after: cursor.data } : {}) })} aria-current={current?.id === item.id ? 'page' : undefined}
              className="font-semibold underline underline-offset-4">{item.title}</Link>
            <p className="text-sm">{item.lead.company.name} · {stageName[item.stage]}{item.nextActionCompletedAt
              ? ` · Action completed ${day(item.nextActionCompletedAt)}` : item.nextActionOn && ` · Due ${day(item.nextActionOn)}`}</p>
            {item.nextAction && <p className="text-sm">{item.nextAction}</p>}
          </div>
        </li>)}
      </ul> : <p className="mt-6">{dueFilter === 'today' ? 'No actions due today.' : dueFilter === 'overdue' ? 'No overdue actions.' : cursor.success ? 'No more deals on this page.' : 'Open a qualified report to create your first deal.'}</p>}
      {(cursor.success || next) && <nav className="mt-6 flex gap-6" aria-label="Deals pages">
        {cursor.success && <Link href={query()} className="underline">First page</Link>}
        {next && <Link href={query({ after: next })} className="underline">More deals</Link>}
      </nav>}
    </main>
  );
}
