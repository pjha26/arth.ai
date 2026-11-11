"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/ResearchShell";
import { EvidenceRule } from "@/components/EvidenceRule";
import { deliveryCopy, shouldPollReport } from "@/shared/status.js";

function SuccessContent() {
  const params  = useSearchParams();
  const [company, setCompany] = useState(params.get("company") || "your company");
  const email   = params.get("email")   || "your inbox";
  const jobId   = params.get("jobId");

  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [activeStage,     setActiveStage]     = useState<string | null>(null);
  const [leadStatus,      setLeadStatus]      = useState<string>(jobId ? 'processing' : 'unavailable');
  const [elapsed,         setElapsed]         = useState(0);
  const [pdfReady,        setPdfReady]        = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState("pending");
  const [statusError, setStatusError] = useState<string | null>(null);

  const [description, setDescription] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Agent Terminal state
  const [agentThoughts, setAgentThoughts] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Dynamic Stages
  const STAGES = [
    { label: "Read public sources", key: "enrich"    },
    { label: "Draft and verify findings", key: "ai_report" },
    { label: "Prepare the private PDF", key: "pdf"       },
    { label: "Send the report email", key: "email"     },
  ];

  // Elapsed timer
  useEffect(() => {
    if (["done", "failed", "unavailable"].includes(leadStatus)) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [leadStatus]);

  // Poll serially and stop after both report generation and dispatch settle.
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController;
    const poll = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let again = true;
      try {
        const res = await fetch(`/api/leads/${jobId}`, { signal: controller.signal });
        if (cancelled) return;
        if ([401, 403, 404].includes(res.status)) {
          again = false;
          setLeadStatus('unavailable'); setStatusError('Private report access is unavailable or expired. Contact the team for a new link.'); return;
        }
        const data = await res.json();
        if (cancelled || !data.success || !data.lead) return;
        const lead = data.lead;
        setLeadStatus(lead.status); setDeliveryStatus(lead.deliveryStatus);
        if (lead.companyName) setCompany(lead.companyName);
        setDescription(lead.description); setIndustry(lead.industry);
        setCompanySize(lead.companySize); setAiSummary(lead.aiSummary);
        const stages = lead.stages as { stage: string; status: string }[];
        const completed = new Set(stages.filter(stage => stage.status === 'done' && (stage.stage !== 'email' || ['accepted', 'delivered'].includes(lead.deliveryStatus))).map(stage => stage.stage));
        if (lead.verificationStatus === 'reviewed') { completed.add('enrich'); completed.add('ai_report'); }
        if (lead.artifactStatus === 'ready') completed.add('pdf');
        if (['accepted', 'delivered'].includes(lead.deliveryStatus)) completed.add('email');
        setCompletedStages([...completed]);
        setActiveStage(stages.filter(stage => stage.status === 'running').at(-1)?.stage || null);
        setPdfReady(lead.artifactStatus === 'ready');
        again = shouldPollReport(lead.status, lead.deliveryStatus);
      } catch (error) {
        if (!cancelled) console.warn('Report status is temporarily unavailable', error instanceof Error ? error.name : 'Error');
      } finally {
        clearTimeout(timeout);
        if (!cancelled && again) timer = setTimeout(() => void poll(), 3000);
      }
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); };
  }, [jobId]);

  // SSE connection for real-time agent thoughts
  useEffect(() => {
    if (!jobId || ["done", "failed", "unavailable"].includes(leadStatus)) return;

    const eventSource = new EventSource(`/api/leads/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      const thought = event.data;
      if (thought) {
        setAgentThoughts((prev) => [...prev, thought].slice(-200));
      }
    };

    eventSource.onerror = () => {
      // SSE will auto-reconnect, but close permanently if the job is done
      if (leadStatus === "done" || leadStatus === "failed") {
        eventSource.close();
      }
    };

    return () => eventSource.close();
  }, [jobId, leadStatus]);

  // Auto-scroll the terminal to the bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [agentThoughts]);

  const ready = leadStatus === "done";
  const unavailable = ["failed", "unavailable"].includes(leadStatus);
  const processing = !ready && !unavailable;

  return (
    <>
      <PublicHeader />
      <main className="ui-document">
        <header className="ui-document-cover" aria-live="polite">
          <p className="ui-label">Report status</p>
          <h1 className="ui-display">{ready ? "Your report is ready" : unavailable ? "Report unavailable" : `Researching ${company}`}</h1>
          <p>{ready ? deliveryCopy(deliveryStatus)
            : unavailable ? statusError || (jobId ? "The report could not be completed. Contact the team to review your request." : "Open your private link or start a new request.")
            : `Your report is being prepared for ${email}. You can follow its progress here.`}</p>
        </header>
        {processing && (
          <section className="ui-document-section">
            <h2 className="ui-step-title">Research progress</h2>
            <EvidenceRule />
            <ol className="ui-ruled-list">
              {STAGES.map(({ key, label }, index) => (
                <li key={key} className="ui-progress-row" aria-current={activeStage === key ? "step" : undefined}>
                  <span className="ui-label">0{index + 1}</span>
                  <strong>{label}</strong>
                  <span className={activeStage === key ? "ui-status-active" : undefined}>
                    {completedStages.includes(key) ? "Complete" : activeStage === key ? "In progress" : "Waiting"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="ui-label">Elapsed {Math.floor(elapsed / 60)}m {elapsed % 60}s</p>
            {(description || industry || companySize) && <div className="ui-footnote">
              {(industry || companySize) && <p>{[industry, companySize].filter(Boolean).join(" · ")}</p>}
              {description && <p>{description}</p>}
            </div>}
            {agentThoughts.length > 0 && <details className="ui-updates">
              <summary>Research updates</summary>
              <div ref={terminalRef}>{agentThoughts.map((entry, index) => <p key={index}>{entry}</p>)}</div>
            </details>}
          </section>
        )}
        {(ready || pdfReady) && jobId && (
          <section className="ui-document-section">
            <h2 className="ui-step-title">Your research dossier</h2>
            {aiSummary && <p>{aiSummary}</p>}
            <div className="ui-actions ui-document-actions">
              {ready && <Link className="ui-button" href={`/report/${jobId}`}>Open report and chat →</Link>}
              {pdfReady && <a className="ui-button ui-button-secondary" href={`/api/leads/${jobId}/download`} download>Download PDF</a>}
            </div>
          </section>
        )}
        {!processing && <p className="ui-footnote"><Link href="/form">Request another report →</Link></p>}
      </main>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<><PublicHeader /><main className="ui-document">Loading report status…</main></>}>
      <SuccessContent />
    </Suspense>
  );
}
