"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const STAGES = [
  { label: "Enriching company data",    icon: "🔍", key: "enrich"    },
  { label: "Running AI analysis",       icon: "🧠", key: "ai_report" },
  { label: "Generating PDF report",     icon: "📄", key: "pdf"       },
  { label: "Sending to your inbox",     icon: "📬", key: "email"     },
];

function SuccessContent() {
  const params  = useSearchParams();
  const company = params.get("company") || "Your Company";
  const email   = params.get("email")   || "your inbox";
  const jobId   = params.get("jobId");

  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [activeStage,     setActiveStage]     = useState<string | null>(null);
  const [leadStatus,      setLeadStatus]      = useState<string>("processing");
  const [elapsed,         setElapsed]         = useState(0);
  const [pdfReady,        setPdfReady]        = useState(false);
  const [emailSkipped,    setEmailSkipped]    = useState(false);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Real-time DB polling
  useEffect(() => {
    if (!jobId) return;

    const checkStatus = async () => {
      try {
        const res  = await fetch(`/api/leads/${jobId}`);
        const data = await res.json();

        if (!data.success || !data.lead) return;

        const { status, stages } = data.lead;
        setLeadStatus(status);

        const doneKeys: string[]   = [];
        let   latestActive: string | null = null;

        stages.forEach((s: { stage: string; status: string; message?: string }) => {
          if (s.status === "done")    doneKeys.push(s.stage);
          if (s.status === "running") latestActive = s.stage;

          // Detect sandbox email skipped — message contains "sandbox" or "skipped"
          if (
            s.stage === "email" &&
            s.status === "done" &&
            s.message?.toLowerCase().includes("skipped")
          ) {
            setEmailSkipped(true);
          }
        });

        setCompletedStages(doneKeys);
        setActiveStage(latestActive);

        // PDF is ready once the 'pdf' stage is done
        if (doneKeys.includes("pdf")) setPdfReady(true);

        // If overall job is done or failed, mark all core stages complete
        if (status === "done") {
          setCompletedStages(["enrich", "ai_report", "pdf", "email"]);
          setActiveStage(null);
          setPdfReady(true);
        }
      } catch (err) {
        console.error("[success] Polling error:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  const allDone = leadStatus === "done";
  const hasFailed = leadStatus === "failed";

  const stageStatus = (key: string) => {
    if (completedStages.includes(key)) return "done";
    if (activeStage === key)           return "active";
    return "waiting";
  };

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>

      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2.5rem", background: "rgba(250,250,248,0.9)",
        backdropFilter: "blur(16px)", borderBottom: "1px solid #E8E6E1",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.55rem", textDecoration: "none" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white", fontFamily: "var(--font-heading)" }}>a</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.03em", color: "#18181B" }}>arth.ai</span>
        </Link>
      </nav>

      {/* Main */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh",
        padding: "5rem 1.5rem", gap: "2rem",
      }}>

        {/* Status heading */}
        <div className="animate-fade-up" style={{ textAlign: "center", maxWidth: "480px" }}>
          {allDone ? (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🎉</div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", marginBottom: "0.65rem" }}>
                Your report is ready!
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#71717A", lineHeight: 1.7 }}>
                {emailSkipped
                  ? <>Your AI intelligence report for <strong style={{ color: "#18181B" }}>{company}</strong> has been generated. Download it directly below.</>
                  : <>Your AI intelligence report has been delivered to <strong style={{ color: "#18181B" }}>{email}</strong>. You can also download it directly below.</>
                }
              </p>
            </>
          ) : hasFailed ? (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", marginBottom: "0.65rem" }}>
                Pipeline note
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#71717A", lineHeight: 1.7 }}>
                {pdfReady
                  ? <>Email delivery was restricted, but your PDF report for <strong style={{ color: "#18181B" }}>{company}</strong> was generated successfully. Download it below!</>
                  : <>Something went wrong during processing. Please try submitting again.</>
                }
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", marginBottom: "0.65rem" }}>
                Compiling your report for {company}.
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#71717A", lineHeight: 1.7 }}>
                Your personalized audit will arrive at <strong style={{ color: "#18181B" }}>{email}</strong> in around 3 minutes.
              </p>
            </>
          )}
        </div>

        {/* PDF Download — slides in once PDF is ready */}
        {pdfReady && jobId && (
          <div
            className="animate-fade-up"
            style={{
              background: "linear-gradient(135deg, #FDF5E8, #FFFBF5)",
              border: "1.5px solid #C58B45",
              borderRadius: "14px",
              padding: "1.5rem 2rem",
              width: "100%", maxWidth: "400px",
              boxShadow: "0 4px 20px rgba(197,139,69,0.15)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📄</div>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, color: "#18181B", marginBottom: "1rem" }}>
              Your AI Intelligence Report is ready
            </p>
            <a
              href={`/api/leads/${jobId}/download`}
              download
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: "#C58B45", color: "white",
                fontFamily: "var(--font-heading)", fontSize: "0.875rem", fontWeight: 700,
                padding: "0.65rem 1.5rem", borderRadius: "100px",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(197,139,69,0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#A97030")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#C58B45")}
            >
              ↓ Download PDF Report
            </a>
          </div>
        )}

        {/* Pipeline status card */}
        <div className="animate-fade-up delay-100" style={{
          background: "white",
          border: "1px solid #E8E6E1",
          borderRadius: "16px",
          padding: "1.75rem",
          width: "100%", maxWidth: "400px",
          boxShadow: "0 1px 4px rgba(24,24,27,0.06), 0 8px 24px rgba(24,24,27,0.04)",
        }}>
          {/* Timer row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A1A1AA" }}>
              Pipeline
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#A1A1AA" }}>
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>

          {/* Stages */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {STAGES.map((stage) => {
              const st = stageStatus(stage.key);
              const done   = st === "done";
              const active = st === "active";
              const waiting = st === "waiting";

              return (
                <div key={stage.key} style={{
                  display: "flex", alignItems: "center", gap: "0.85rem",
                  opacity: waiting ? 0.35 : 1,
                  transition: "opacity 0.5s ease",
                }}>
                  {/* Status dot */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: done ? "0.75rem" : "0.9rem",
                    fontFamily: "var(--font-heading)", fontWeight: 700,
                    background: done ? "#5C7A62" : active ? "#FDF5E8" : "#F4F4F5",
                    border: active ? "1.5px solid #C58B45" : "none",
                    color: done ? "white" : "inherit",
                    transition: "all 0.4s ease",
                  }}>
                    {done ? "✓" : stage.icon}
                  </div>

                  {/* Label + bar */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "var(--font-heading)", fontSize: "0.875rem", fontWeight: 600,
                      color: done ? "#5C7A62" : active ? "#18181B" : "#71717A",
                      marginBottom: active ? "0.35rem" : 0,
                      transition: "color 0.4s ease",
                    }}>
                      {stage.label}
                      {stage.key === "email" && emailSkipped && done && (
                        <span style={{ fontSize: "0.72rem", color: "#A1A1AA", fontWeight: 400, marginLeft: "0.4rem" }}>(sandbox)</span>
                      )}
                    </div>

                    {/* Active progress bar */}
                    {active && (
                      <div style={{ height: 3, borderRadius: 100, background: "#E8E6E1", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: "55%", borderRadius: 100,
                          background: "linear-gradient(90deg, #C58B45, #D4A04E, #C58B45)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2s linear infinite",
                        }} />
                      </div>
                    )}

                    {/* Done bar */}
                    {done && (
                      <div style={{ height: 3, borderRadius: 100, background: "#E8E6E1", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "100%", background: "#5C7A62", borderRadius: 100 }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="animate-fade-up delay-200" style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: "100px", border: "1.5px solid #E0DDD8", background: "white", color: "#52525B", textDecoration: "none" }}>
            ← Back to Home
          </Link>
          <Link href="/form" style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: "100px", border: "1.5px solid #E0DDD8", background: "white", color: "#52525B", textDecoration: "none" }}>
            Submit another company
          </Link>
        </div>

        <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.72rem", color: "#A1A1AA", textAlign: "center" }}>
          Didn't receive the email? Check spam, or{" "}
          <Link href="/form" style={{ color: "#A97030", textDecoration: "none", fontWeight: 600 }}>
            resubmit with a different email
          </Link>.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#FAFAF8", display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: "#A1A1AA" }}>
        Loading…
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
