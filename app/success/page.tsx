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

const LogoBadge = () => (
  <div className="logo-badge">
    <svg viewBox="0 0 14 14" fill="none"><path d="M7 1L9.5 5.5H12.5L10 8.5L11 13L7 10.5L3 13L4 8.5L1.5 5.5H4.5L7 1Z" fill="white" /></svg>
  </div>
);

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
    STAGES.forEach((stage, index) => {
      timers.push(setTimeout(() => setCurrentStage(index), cumulative + 200));
      cumulative += stage.duration;
      timers.push(setTimeout(() => setCompletedStages(p => [...p, index]), cumulative));
    });
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { timers.forEach(clearTimeout); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const allDone = completedStages.length === STAGES.length;

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      <nav className="navbar">
        <Link href="/" className="navbar-logo"><LogoBadge />arth.ai</Link>
      </nav>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "5rem 1.5rem", gap: "2.5rem" }}>

        {/* Orbit — warm palette */}
        <div className="animate-fade-in" style={{ position: "relative", width: "180px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Outer ring */}
          <div style={{ position: "absolute", width: "165px", height: "165px", border: "1.5px solid var(--warm-gray)", borderRadius: "50%", animation: "spin-slow 14s linear infinite" }} />
          {/* Outer orbiting dot */}
          <div style={{ position: "absolute", width: "165px", height: "165px", display: "flex", alignItems: "flex-start", justifyContent: "center", animation: "spin-slow 9s linear infinite" }}>
            <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--saffron)", marginTop: "-4.5px", boxShadow: "0 0 10px rgba(197,139,69,0.4)" }} />
          </div>
          {/* Inner ring */}
          <div style={{ position: "absolute", width: "110px", height: "110px", border: "1.5px solid #E8E1D8", borderRadius: "50%", animation: "spin-slow 7s linear infinite reverse" }} />
          {/* Inner orbiting dot */}
          <div style={{ position: "absolute", width: "110px", height: "110px", display: "flex", alignItems: "flex-start", justifyContent: "center", animation: "spin-slow 5s linear infinite reverse" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--sage)", marginTop: "-3.5px", boxShadow: "0 0 8px rgba(110,139,116,0.35)" }} />
          </div>
          {/* Center */}
          <div style={{ zIndex: 2, fontWeight: 700, fontSize: "1rem", color: "var(--charcoal)", letterSpacing: "-0.04em", fontFamily: "var(--font-body)" }}>
            arth.ai
          </div>
        </div>

        {/* Status text */}
        <div className="animate-fade-up" style={{ textAlign: "center", maxWidth: "480px" }}>
          <h1 className="display-md" style={{ marginBottom: "0.6rem" }}>
            {allDone
              ? <>Report sent! <span className="italic text-saffron">Check your inbox.</span></>
              : <>Compiling your audit for <span className="italic text-saffron">{company}</span></>
            }
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {allDone
              ? `Your AI intelligence report has been delivered to ${email}`
              : `Your personalized report will arrive at ${email} in ~3 minutes`
            }
          </p>
        </div>

        {/* Pipeline stages */}
        <div className="card-flat animate-fade-up delay-200" style={{ padding: "1.75rem", width: "100%", maxWidth: "440px", background: "var(--ivory)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)" }}>Pipeline Status</span>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {STAGES.map((stage, idx) => {
              const isCompleted = completedStages.includes(idx);
              const isActive = currentStage === idx && !isCompleted;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.85rem", opacity: idx > currentStage + 1 ? 0.3 : 1, transition: "opacity 0.5s" }}>
                  <div style={{
                    width: "30px", height: "30px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0,
                    background: isCompleted ? "var(--sage)" : isActive ? "var(--saffron-light)" : "white",
                    border: isCompleted ? "none" : isActive ? "1.5px solid var(--saffron)" : "1.5px solid var(--warm-gray)",
                    color: isCompleted ? "white" : "inherit",
                    transition: "all 0.4s",
                  }}>
                    {isCompleted ? "✓" : stage.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: isCompleted ? "var(--sage)" : isActive ? "var(--charcoal)" : "var(--text-muted)", marginBottom: "0.3rem", transition: "color 0.4s" }}>
                      {stage.label}
                    </div>
                    {isActive && (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: "55%", background: "linear-gradient(90deg, var(--saffron), #D4A04E, var(--saffron))", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
                      </div>
                    )}
                    {isCompleted && (
                      <div className="progress-bar"><div className="progress-fill" style={{ width: "100%", background: "var(--sage)" }} /></div>
                    )}
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

        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", maxWidth: "380px" }}>
          Didn't receive it? Check your spam folder or{" "}
          <Link href="/form" style={{ color: "var(--saffron-hover)", textDecoration: "none", fontWeight: 500 }}>resubmit with a different email</Link>.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ background: "var(--cream)", display: "flex", justifyContent: "center", paddingTop: "10rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
