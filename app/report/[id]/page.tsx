import { accessFor } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicHeader } from "@/components/ResearchShell";
import { EvidenceRule, ReadingTrace } from "@/components/EvidenceRule";
import { reportSchema } from "@/shared/report.js";
import LeadChatUI from "./LeadChatUI";

export default async function PublicReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await accessFor(id);
  if (!access) return notFound();

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true, sources: { select: { id: true, title: true, url: true } } },
  });
  if (!report || (!access.staff && access.leadId !== report.leadId)) notFound();

  await prisma.reportEvent.create({ data: { reportId: id, type: "view", actor: access.staff ? "staff" : access.leadId } });
  const company = report.company?.name || "Your company";
  const ready = report.status === "done";
  const pdf = report.artifactStatus === "ready" && report.pdfUrl ? `/api/leads/${id}/download` : null;
  const parsed = ready && report.verificationStatus === "reviewed" ? reportSchema.safeParse(report.insights) : null;
  const research = parsed?.success ? parsed.data : null;
  const summary = research?.executiveSummary || report.aiSummary;

  return (
    <>
      <PublicHeader>{pdf && <a className="ui-button ui-button-secondary" href={pdf} download>Download PDF</a>}</PublicHeader>
      {research && <ReadingTrace />}
      <main className="ui-document">
        <header className="ui-document-cover">
          <p className="ui-label">Private research report</p>
          <h1 className="ui-display">{company}</h1>
          <p>{summary || (ready ? "Your research report is ready to review." : "Check the status of your research below.")}</p>
        </header>
        {ready ? (
          <>
            <nav className="ui-document-links" aria-label="Report sections">
              {research && <a href="#findings">Evidence</a>}
              <a href="#report-chat">Report chat</a>
            </nav>
            {research && (
              <section className="ui-document-section" id="findings" aria-labelledby="findings-title">
                <h2 id="findings-title" className="ui-step-title">Findings and evidence</h2>
                <EvidenceRule />
                <ol className="ui-ruled-list">
                  {research.claims.map(({ text, sourceId, quote }, index) => {
                    const source = report.sources.find(item => item.id === sourceId || item.id === `${id}-${sourceId}`);
                    return <li key={index}>
                      <strong>{text}</strong>
                      <blockquote className="ui-evidence-quote"><q>{quote}</q></blockquote>
                      {source && <a className="ui-text-link" href={source.url} target="_blank" rel="noreferrer">{source.title || source.url} ↗</a>}
                    </li>;
                  })}
                </ol>
              </section>
            )}
            <section className="ui-document-section" id="report-chat" aria-labelledby="report-chat-title">
              <h2 className="ui-step-title" id="report-chat-title">Discuss this report</h2>
              <LeadChatUI key={id} reportId={id} companyName={company} />
            </section>
          </>
        ) : (
          <section className="ui-document-section">
            <h2 className="ui-step-title">{report.status === "failed" ? "Report could not be completed" : "Research in progress"}</h2>
            <p>{report.status === "failed" ? "Contact the team to review your request." : "Return to this page after generation completes."}</p>
          </section>
        )}
      </main>
    </>
  );
}
