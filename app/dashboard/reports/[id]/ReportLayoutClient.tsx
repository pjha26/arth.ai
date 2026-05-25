"use client";

import { useState } from "react";
import ReportChatUI from "./ReportChatUI";
import "./report-chat.css";

export default function ReportLayoutClient({ report }: { report: any }) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfError, setPdfError] = useState(false);

  const TOTAL_PAGES = 6;
  const pdfUrl = `/api/leads/${report.id}/download`;
  const pdfSrc = pdfUrl ? `${pdfUrl}#page=${pdfPage}&zoom=${pdfZoom}` : null;

  return (
    <>
      <div className="cr-shell">
        {/* ── Top bar ── */}
        <div className="cr-topbar">
          <div className="cr-topbar-left">
            <a href="/dashboard" className="cr-back-btn">
              ← Back
            </a>
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
                <span className="cr-pdf-page-info">Page {pdfPage} of {TOTAL_PAGES}</span>
                <button
                  className="cr-pdf-nav-btn"
                  disabled={pdfPage >= TOTAL_PAGES}
                  onClick={() => setPdfPage(p => Math.min(TOTAL_PAGES, p + 1))}
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
