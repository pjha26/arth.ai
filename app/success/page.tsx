"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const STAGES = [
  { label: "Enriching company data", icon: "🔍", duration: 15000 },
  { label: "Running AI analysis", icon: "🧠", duration: 35000 },
  { label: "Generating PDF report", icon: "📄", duration: 25000 },
  { label: "Sending to your inbox", icon: "📬", duration: 15000 },
];

function SuccessContent() {
  const params = useSearchParams();
  const company = params.get("company") || "Your Company";
  const email = params.get("email") || "your inbox";

  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((_, idx) => {
      timers.push(setTimeout(() => setCurrentStage(idx), cumulative + 200));
      cumulative += STAGES[idx].duration;
      timers.push(setTimeout(() => setCompletedStages(p => [...p, idx]), cumulative));
    });
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { timers.forEach(clearTimeout); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const allDone = completedStages.length === STAGES.length;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <nav className="navbar">
        <Link href="/" className="navbar-logo">
          <div className="logo-mark">a</div>arth.ai
        </Link>
      </nav>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "5rem 1.5rem", gap: "2.5rem" }}>

        {/* Orbit — calm, soft */}
        <div className="animate-fade-in" style={{ position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: "150px", height: "150px", border: "1.5px solid var(--border-strong)", borderRadius: "50%", animation: "spin-cw 16s linear infinite" }} />
          <div style={{ position: "absolute", width: "150px", height: "150px", display: "flex", alignItems: "flex-start", justifyContent: "center", animation: "spin-cw 10s linear infinite" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--saffron)", marginTop: "-4px", boxShadow: "var(--shadow-saffron)" }} />
          </div>
          <div style={{ position: "absolute", width: "100px", height: "100px", border: "1.5px solid var(--border)", borderRadius: "50%", animation: "spin-cw 8s linear infinite reverse" }} />
          <div style={{ position: "absolute", width: "100px", height: "100px", display: "flex", alignItems: "flex-start", justifyContent: "center", animation: "spin-cw 6s linear infinite reverse" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--sage)", marginTop: "-3px" }} />
          </div>
          <div style={{ zIndex: 2, fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", color: "var(--charcoal)", letterSpacing: "-0.04em" }}>
            arth.ai
          </div>
        </div>

        {/* Status */}
        <div className="animate-fade-up" style={{ textAlign: "center", maxWidth: "460px" }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.025em", marginBottom: "0.65rem", color: "var(--charcoal)" }}>
            {allDone ? "Report sent. Check your inbox." : `Compiling your audit for ${company}.`}
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.7", fontFamily: "var(--font-body)" }}>
            {allDone
              ? `Your AI intelligence report has been delivered to ${email}.`
              : `Your personalized report will arrive at ${email} in around 3 minutes.`
            }
          </p>
        </div>

        {/* Pipeline stages */}
        <div className="card-flat animate-fade-up delay-200" style={{ padding: "1.75rem", width: "100%", maxWidth: "420px", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>Pipeline Status</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {STAGES.map((stage, idx) => {
              const isCompleted = completedStages.includes(idx);
              const isActive = currentStage === idx && !isCompleted;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.85rem", opacity: idx > currentStage + 1 ? 0.3 : 1, transition: "opacity 0.5s" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", flexShrink: 0,
                    background: isCompleted ? "var(--sage)" : isActive ? "var(--saffron-50)" : "var(--bg)",
                    border: isCompleted ? "none" : isActive ? "1.5px solid var(--saffron)" : "1.5px solid var(--border-strong)",
                    color: isCompleted ? "white" : "inherit",
                    transition: "all 0.4s",
                    boxShadow: isActive ? "0 0 0 3px rgba(197,139,69,0.12)" : "none",
                  }}>
                    {isCompleted ? "✓" : stage.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.875rem", fontWeight: 600, color: isCompleted ? "var(--sage)" : isActive ? "var(--charcoal)" : "var(--text-muted)", marginBottom: "0.3rem", transition: "color 0.4s" }}>
                      {stage.label}
                    </div>
                    {isActive && (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: "55%", background: "linear-gradient(90deg, var(--saffron), #D4A04E, var(--saffron))", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
                      </div>
                    )}
                    {isCompleted && <div className="progress-bar"><div className="progress-fill" style={{ width: "100%", background: "var(--sage)" }} /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="animate-fade-up delay-300" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" className="btn btn-outline btn-sm">← Back to Home</Link>
          <Link href="/form" className="btn btn-outline btn-sm">Submit Another Company</Link>
        </div>

        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", maxWidth: "360px", fontFamily: "var(--font-heading)" }}>
          Didn't receive it? Check your spam folder or{" "}
          <Link href="/form" style={{ color: "var(--saffron-600)", textDecoration: "none", fontWeight: 600 }}>resubmit with a different email</Link>.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ background: "var(--bg)", display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "var(--text-muted)", fontFamily: "var(--font-heading)", fontSize: "0.9rem" }}>Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
