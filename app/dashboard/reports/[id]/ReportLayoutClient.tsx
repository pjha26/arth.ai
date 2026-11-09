"use client";

import Link from "next/link";
import type { ReportView } from "@/lib/ui-types";
import { useState, type FormEvent } from "react";
import ReportChatUI from "./ReportChatUI";
import "./report-chat.css";

type ReviewableAlert = { id: string; slackScore: number | null; qualificationDecision: string | null; qualificationReason: string | null };

function QualificationReview({ reportId, alert }: { reportId: string; alert: ReviewableAlert }) {
  const [savedDecision, setSavedDecision] = useState(alert.qualificationDecision);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const decision = String(form.get('decision'));
    const reason = String(form.get('reason')).trim();
    if (!reason) { setFeedback('Enter a reason for your decision.'); return; }
    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(`/api/leads/${reportId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualification: { alertId: alert.id, decision, reason } }),
      });
      if (!response.ok) throw new Error('Save failed');
      setSavedDecision(decision);
      setFeedback('Qualification saved.');
    } catch {
      setFeedback('Could not save qualification. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="cr-qualification" open={!alert.qualificationDecision}>
      <summary>Lead qualification · {savedDecision ?? 'Awaiting review'}{alert.slackScore == null ? '' : ` · ${Math.round(alert.slackScore * 100)}% experimental intent`}</summary>
      <form onSubmit={save}>
        <label>Decision <select name="decision" defaultValue={alert.qualificationDecision ?? ''} required disabled={saving}>
          <option value="" disabled>Select a decision</option>
          <option value="qualified">Qualified</option>
          <option value="rejected">Rejected</option>
        </select></label>
        <label>Reason <input name="reason" defaultValue={alert.qualificationReason ?? ''} maxLength={500} required disabled={saving} /></label>
        <button type="submit" className="cr-btn-outline" disabled={saving}>{saving ? 'Saving…' : 'Save qualification'}</button>
      </form>
      <p role="status">{feedback}</p>
    </details>
  );
}

export default function ReportLayoutClient({ report, alert }: { report: ReportView; alert?: ReviewableAlert }) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfError, setPdfError] = useState(false);

  const pdfUrl = `/api/leads/${report.id}/download`;
  const pdfSrc = pdfUrl ? `${pdfUrl}#page=${pdfPage}&zoom=${pdfZoom}` : null;

  return (
    <>
      <div className="cr-shell">
        {/* ── Top bar ── */}
        <div className="cr-topbar">
          <div className="cr-topbar-left">
            <Link href="/dashboard" className="cr-back-btn">
              ← Back
            </Link>
            <div className="cr-company-badge">
              <div className="cr-company-initial">
                {report.company.name.charAt(0).toUpperCase()}
              </div>
              <span className="cr-company-name">{report.company.name} Intelligence Report</span>
            </div>
          </div>
          <div className="cr-topbar-right">
            {!isChatOpen && (
              <button 
                onClick={() => setIsChatOpen(true)}
                className="cr-btn-outline"
                style={{ borderColor: "var(--cr-accent)", color: "var(--cr-accent)", background: "var(--cr-accent-dim)" }}
              >
                <span>✦</span> Open Chat
              </button>
            )}
            <a href={pdfUrl} download className="cr-btn-outline">
              ↓ Download PDF
            </a>
          </div>
        </div>

        {alert && <QualificationReview key={alert.id} reportId={report.id} alert={alert} />}
        {/* ── Body ── */}
        <div className="cr-body">
          {/* ── PDF Panel ── */}
          <div className="cr-pdf-panel">
            <div className="cr-pdf-toolbar">
              <div className="cr-pdf-nav">
                <button
                  className="cr-pdf-nav-btn"
                  disabled={pdfPage <= 1}
                  onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                >← Prev</button>
                <span className="cr-pdf-page-info">Page {pdfPage}</span>
                <button
                  className="cr-pdf-nav-btn"
                  disabled={false}
                  onClick={() => setPdfPage(p => p + 1)}
                >Next →</button>
              </div>
              <div className="cr-pdf-zoom">
                <button className="cr-zoom-btn" onClick={() => setPdfZoom(z => Math.max(50, z - 10))}>−</button>
                <span className="cr-zoom-pct">{pdfZoom}%</span>
                <button className="cr-zoom-btn" onClick={() => setPdfZoom(z => Math.min(200, z + 10))}>+</button>
              </div>
            </div>

            <div className="cr-pdf-viewport">
              {pdfSrc && !pdfError ? (
                <div className="cr-pdf-frame-wrapper">
                  <iframe
                    src={pdfSrc}
                    className="cr-pdf-frame"
                    title={`${report.company.name} Intelligence Report`}
                    onError={() => setPdfError(true)}
                  />
                </div>
              ) : (
                <div className="cr-pdf-error">
                  <div className="cr-pdf-error-icon">📄</div>
                  <p className="cr-pdf-error-text">
                    PDF preview unavailable.<br />Use the Download button above to view your report.
                  </p>
                  <a href={pdfUrl} download className="cr-btn-gold" style={{ textDecoration: "none", marginTop: 8 }}>
                    ↓ Download Report
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── Chat Panel ── */}
          {isChatOpen && (
            <ReportChatUI report={report} onClose={() => setIsChatOpen(false)} />
          )}
        </div>
      </div>
    </>
  );
}
