"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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

  const [logo, setLogo] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [companySize, setCompanySize] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Agent Terminal state
  const [agentThoughts, setAgentThoughts] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Dynamic Stages
  const STAGES = [
    { label: `Analyzing ${company}'s tech stack...`,    icon: "🔍", key: "enrich"    },
    { label: "Identifying growth signals for your industry...",       icon: "🧠", key: "ai_report" },
    { label: "Generating personalized PDF...",     icon: "📄", key: "pdf"       },
    { label: "Delivering intelligence report",     icon: "📬", key: "email"     },
  ];

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
        
        // Update mirror fields
        setLogo(data.lead.logo);
        setDescription(data.lead.description);
        setIndustry(data.lead.industry);
        setCompanySize(data.lead.companySize);
        setAiSummary(data.lead.aiSummary);

        const doneKeys: string[]   = [];
        let   latestActive: string | null = null;

        stages.forEach((s: { stage: string; status: string; message?: string }) => {
          if (s.status === "done")    doneKeys.push(s.stage);
          if (s.status === "running") latestActive = s.stage;

          // Detect sandbox email skipped
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

  // SSE connection for real-time agent thoughts
  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`/api/leads/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      const thought = event.data;
      if (thought) {
        setAgentThoughts((prev) => [...prev, thought]);
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
        <Link href="/dashboard" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#18181B", textDecoration: "none" }}>
          Dashboard
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
                  ? <>Your AI intelligence report for <strong style={{ color: "#18181B" }}>{company}</strong> has been generated.</>
                  : <>Your AI intelligence report has been delivered to <strong style={{ color: "#18181B" }}>{email}</strong>.</>
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
                  ? <>Email delivery was restricted, but your PDF report for <strong style={{ color: "#18181B" }}>{company}</strong> was generated successfully.</>
                  : <>Something went wrong during processing. Please try submitting again.</>
                }
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", marginBottom: "0.65rem" }}>
                Compiling intelligence for {company}.
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#71717A", lineHeight: 1.7 }}>
                Your personalized audit will arrive at <strong style={{ color: "#18181B" }}>{email}</strong> in around 3 minutes.
              </p>
            </>
          )}
        </div>

        {/* Smart Welcome Screen Post-Report */}
        {allDone && aiSummary && (
          <div className="animate-fade-up delay-100" style={{
            background: "white", border: "1px solid #E8E6E1", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "600px", boxShadow: "0 4px 20px rgba(24,24,27,0.08)", textAlign: "left"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FDF5E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>✨</div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 700, color: "#18181B" }}>Intelligence Brief</h2>
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", color: "#3F3F46", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              {aiSummary}
            </p>
            
            {/* Download Button inside the welcome screen */}
            {pdfReady && jobId && (
              <div style={{ borderTop: "1px solid #E8E6E1", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, color: "#71717A", margin: 0 }}>
                  View the full breakdown in your PDF report.
                </p>
                <a
                  href={`/api/leads/${jobId}/download`}
                  download
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    background: "#18181B", color: "white",
                    fontFamily: "var(--font-heading)", fontSize: "0.875rem", fontWeight: 700,
                    padding: "0.65rem 1.5rem", borderRadius: "100px",
                    textDecoration: "none",
                    boxShadow: "0 4px 14px rgba(24,24,27,0.2)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#27272A")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#18181B")}
                >
                  ↓ Download PDF
                </a>
              </div>
            )}
          </div>
        )}

        {/* Fallback PDF Download for failures or if aiSummary is missing */}
        {pdfReady && jobId && (!allDone || !aiSummary) && (
          <div
            className="animate-fade-up delay-100"
            style={{
              background: "linear-gradient(135deg, #FDF5E8, #FFFBF5)", border: "1.5px solid #C58B45", borderRadius: "14px", padding: "1.5rem 2rem", width: "100%", maxWidth: "400px", boxShadow: "0 4px 20px rgba(197,139,69,0.15)", textAlign: "center",
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

        <div style={{ display: "flex", gap: "2rem", width: "100%", maxWidth: "800px", justifyContent: "center", flexWrap: "wrap", alignItems: "flex-start" }}>
          
          {/* Instant Company Mirror */}
          {(logo || description) && !allDone && !hasFailed && (
            <div className="animate-fade-up delay-100" style={{
              background: "white", border: "1px solid #E8E6E1", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: "340px", boxShadow: "0 1px 4px rgba(24,24,27,0.06)", display: "flex", flexDirection: "column", gap: "1rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {logo ? (
                  <img src={logo} alt={`${company} logo`} style={{ width: 48, height: 48, borderRadius: "8px", objectFit: "contain", border: "1px solid #E8E6E1" }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: "8px", background: "#F4F4F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold", color: "#A1A1AA", border: "1px solid #E8E6E1" }}>
                    {company.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 700, color: "#18181B", marginBottom: "0.15rem" }}>{company}</h2>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {industry && <span style={{ fontSize: "0.7rem", background: "#FDF5E8", color: "#C58B45", padding: "0.15rem 0.5rem", borderRadius: "100px", fontWeight: 600 }}>{industry}</span>}
                    {companySize && <span style={{ fontSize: "0.7rem", background: "#F4F4F5", color: "#71717A", padding: "0.15rem 0.5rem", borderRadius: "100px", fontWeight: 600 }}>{companySize}</span>}
                  </div>
                </div>
              </div>
              {description && (
                <p style={{ fontSize: "0.85rem", color: "#71717A", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Pipeline status card */}
          {!allDone && !hasFailed && (
            <div className="animate-fade-up delay-200" style={{
              background: "white", border: "1px solid #E8E6E1", borderRadius: "16px", padding: "1.75rem", width: "100%", maxWidth: "400px", boxShadow: "0 1px 4px rgba(24,24,27,0.06), 0 8px 24px rgba(24,24,27,0.04)",
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
          )}
        </div>

        {/* ── Agent Terminal ── */}
        {!allDone && !hasFailed && agentThoughts.length > 0 && (
          <div className="animate-fade-up delay-300" style={{
            width: "100%", maxWidth: "800px",
            background: "#0D0D0D", borderRadius: "16px",
            border: "1px solid #2A2A2A",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
            overflow: "hidden",
          }}>
            {/* Terminal Title Bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.65rem 1rem",
              background: "linear-gradient(180deg, #1A1A1A 0%, #141414 100%)",
              borderBottom: "1px solid #2A2A2A",
            }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <span style={{
                fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: "0.7rem", fontWeight: 600,
                color: "#6B6B6B", marginLeft: "0.5rem",
                letterSpacing: "0.03em",
              }}>
                agent-terminal — {company}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#28C840",
                  boxShadow: "0 0 6px #28C840",
                  animation: "pulse-dot 2s infinite",
                }} />
                <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "#4A4A4A" }}>LIVE</span>
              </div>
            </div>

            {/* Terminal Body */}
            <div
              ref={terminalRef}
              className="agent-terminal-scroll"
              style={{
                padding: "1rem 1.25rem",
                maxHeight: "280px",
                overflowY: "auto",
                scrollBehavior: "smooth",
              }}
            >
              {agentThoughts.map((thought, idx) => {
                // Determine color based on agent prefix
                let color = "#8B8B8B";
                if (thought.includes("Orchestrator"))    color = "#A78BFA";
                else if (thought.includes("Research"))   color = "#60A5FA";
                else if (thought.includes("Analysis"))   color = "#34D399";
                else if (thought.includes("Writer"))     color = "#FBBF24";
                else if (thought.includes("Critic"))     color = "#F87171";
                else if (thought.includes("System"))     color = "#6B7280";
                else if (thought.includes("->"))         color = "#6EE7B7";

                return (
                  <div key={idx} style={{
                    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                    fontSize: "0.78rem",
                    lineHeight: 1.7,
                    color: color,
                    opacity: idx === agentThoughts.length - 1 ? 1 : 0.7,
                    transition: "opacity 0.3s ease",
                  }}>
                    <span style={{ color: "#3A3A3A", marginRight: "0.5rem", userSelect: "none" }}>{'>'}</span>
                    {thought}
                  </div>
                );
              })}
              {/* Blinking cursor */}
              <div style={{
                fontFamily: "monospace", fontSize: "0.78rem",
                color: "#C58B45", marginTop: "0.25rem",
                animation: "blink-cursor 1s step-end infinite",
              }}>▋</div>
            </div>
          </div>
        )}

        {/* Actions below everything */}
        {(allDone || hasFailed) && (
          <div className="animate-fade-up delay-200" style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}>
            <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: "100px", border: "1.5px solid #E0DDD8", background: "white", color: "#52525B", textDecoration: "none" }}>
              ← Back to Home
            </Link>
            <Link href="/form" style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: "100px", border: "1.5px solid #E0DDD8", background: "white", color: "#52525B", textDecoration: "none" }}>
              Submit another company
            </Link>
          </div>
        )}

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
