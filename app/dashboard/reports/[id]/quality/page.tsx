import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { INSUFFICIENT_RESEARCH_EVIDENCE } from '@/shared/report.js';
import ReviewForm from './ReviewForm';

export default async function ReportQualityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const report = await prisma.report.findUnique({ where: { id }, select: {
    status: true, verificationStatus: true, errorMessage: true, generationAttempt: true, insights: true, personaType: true,
    lead: { select: { source: true, painPoints: true, challengeTags: true } },
    company: { select: { name: true } },
    sources: { orderBy: { id: 'asc' }, select: { id: true, url: true, title: true, excerpt: true, retrievedAt: true, publishedAt: true } },
  } });
  if (!report || report.lead?.source !== 'manual' || !['done', 'failed'].includes(report.status)) notFound();
  if (report.status === 'done' && (report.verificationStatus !== 'reviewed' || !report.insights)) notFound();

  const actual = report.status === 'done' ? 'generated'
    : report.errorMessage === INSUFFICIENT_RESEARCH_EVIDENCE ? 'insufficient-evidence' : 'failed';
  const reportContent = report.insights && typeof report.insights === 'object' && !Array.isArray(report.insights)
    ? Object.fromEntries(Object.entries(report.insights).filter(([key]) => key !== 'sources')) : report.insights;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/dashboard" className="underline">Back to CRM</Link>
      <h1 className="mt-5 text-3xl font-semibold">Research quality review</h1>
      <p className="mt-2">{report.company.name} · {report.personaType}</p>
      <p className="mt-2">Recorded outcome: {actual === 'insufficient-evidence' ? 'Insufficient evidence' : actual === 'generated' ? 'Report generated' : 'Report failed'}</p>
      <section className="mt-6">
        <h2 className="font-semibold">Prospect challenge</h2>
        <p className="mt-2 whitespace-pre-wrap break-words">{report.lead.painPoints || 'No challenge description recorded.'}</p>
        {report.lead.challengeTags.length > 0 && <p className="mt-2">{report.lead.challengeTags.join(', ')}</p>}
      </section>
      {actual === 'generated' && (
        <>
          <section className="mt-6">
            <h2 className="font-semibold">Generated report</h2>
            <Link href={`/api/leads/${id}/download`} target="_blank" prefetch={false} className="underline">Open the report PDF</Link>
            <pre className="mt-2 max-h-96 overflow-auto rounded border p-3 text-sm whitespace-pre-wrap break-words">{JSON.stringify(reportContent, null, 2)}</pre>
          </section>
          <section className="mt-6">
            <h2 className="font-semibold">Saved source excerpts</h2>
            {report.sources.map(source => (
              <details key={source.id} className="mt-2 rounded border p-3">
                <summary className="cursor-pointer">{source.title} · {source.id.replace(`${id}-`, '')}</summary>
                <p className="mt-2 break-all">{source.url}</p>
                <p className="text-sm">Retrieved {source.retrievedAt.toISOString()} · Published {source.publishedAt?.toISOString() ?? 'unknown'}</p>
                <p className="mt-2 whitespace-pre-wrap break-words">{source.excerpt}</p>
              </details>
            ))}
          </section>
        </>
      )}
      <ReviewForm reportId={id} generationAttempt={report.generationAttempt} actual={actual} />
    </main>
  );
}
