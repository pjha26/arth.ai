import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { INSUFFICIENT_RESEARCH_EVIDENCE, reportSchema } from '@/shared/report.js';
import { EvidenceRule } from '@/components/EvidenceRule';
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
  const parsedReport = reportSchema.safeParse(report.insights);
  const listedClaims = parsedReport.success ? parsedReport.data.claims : [];

  return (
    <main className="arth-main ui-review">
      <header className="ui-document-cover">
        <p className="ui-label">{report.company.name} · {report.personaType}</p>
        <h1 className="ui-display">Research quality review</h1>
        <p>Recorded outcome: {actual === 'insufficient-evidence' ? 'Insufficient evidence' : actual === 'generated' ? 'Report generated' : 'Report failed'}</p>
      </header>
      <EvidenceRule />
      <section className="ui-document-section">
        <h2 className="ui-step-title">Prospect challenge</h2>
        <p className="mt-2 whitespace-pre-wrap break-words">{report.lead.painPoints || 'No challenge description recorded.'}</p>
        {report.lead.challengeTags.length > 0 && <p className="mt-2">{report.lead.challengeTags.join(', ')}</p>}
      </section>
      {actual === 'generated' && (
        <>
          <section className="ui-document-section">
            <h2 className="ui-step-title">Generated report</h2>
            {parsedReport.success && <p className="mb-3">{parsedReport.data.executiveSummary}</p>}
            <Link href={`/api/leads/${id}/download`} target="_blank" prefetch={false} className="ui-text-link">Open the report PDF</Link>
            <details className="mt-3">
              <summary className="cursor-pointer">View full report data</summary>
              <pre className="mt-2 max-h-96 overflow-auto border p-3 text-sm whitespace-pre-wrap break-words">{JSON.stringify(reportContent, null, 2)}</pre>
            </details>
          </section>
          <section className="ui-document-section">
            <h2 className="ui-step-title">Saved source excerpts</h2>
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
      <ReviewForm reportId={id} generationAttempt={report.generationAttempt} actual={actual} listedClaims={listedClaims} />
    </main>
  );
}
