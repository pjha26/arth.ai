"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
    // Simulate stage progression
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    STAGES.forEach((stage, index) => {
      const t = setTimeout(() => {
        setCurrentStage(index);
      }, cumulative + 200);
      timers.push(t);

      cumulative += stage.duration;

      const tComplete = setTimeout(() => {
        setCompletedStages((prev) => [...prev, index]);
      }, cumulative);
      timers.push(tComplete);
    });

    // Elapsed counter
    intervalRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => {
      timers.forEach(clearTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const allDone = completedStages.length === STAGES.length;

  return (
    <>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      <nav className="navbar">
        <Link href="/" className="navbar-logo">
          <span className="logo-dot" />
          arth<span style={{ color: "var(--accent-violet)" }}>.ai</span>
        </Link>
      </nav>

      <div
        className="page-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "5rem 1.5rem",
          flexDirection: "column",
          gap: "2.5rem",
        }}
      >
        {/* Orbit Animation */}
        <div
          className="animate-fade-in"
          style={{
            position: "relative",
            width: "200px",
            height: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Outer ring */}
          <div
            style={{
              position: "absolute",
              width: "180px",
              height: "180px",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "50%",
              animation: "spin-slow 12s linear infinite",
            }}
          />
          {/* Orbiting dot outer */}
          <div
            style={{
              position: "absolute",
              width: "180px",
              height: "180px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              animation: "spin-slow 8s linear infinite",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "var(--accent-violet)",
                boxShadow: "0 0 12px var(--accent-violet)",
                marginTop: "-5px",
              }}
            />
          </div>
          {/* Inner ring */}
          <div
            style={{
              position: "absolute",
              width: "120px",
              height: "120px",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "50%",
              animation: "spin-slow 6s linear infinite reverse",
            }}
          />
          {/* Orbiting dot inner */}
          <div
            style={{
              position: "absolute",
              width: "120px",
              height: "120px",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              animation: "spin-slow 4s linear infinite reverse",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--accent-indigo)",
                boxShadow: "0 0 10px var(--accent-indigo)",
                marginTop: "-4px",
              }}
            />
          </div>
          {/* Center logo */}
          <div
            style={{
              zIndex: 2,
              fontFamily: "var(--font-heading)",
              fontSize: "1.4rem",
              fontWeight: 800,
              background:
                "linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.04em",
            }}
          >
            arth.ai
          </div>
        </div>

        {/* Status Text */}
        <div className="animate-fade-up" style={{ textAlign: "center" }}>
          <h1 className="heading-md" style={{ marginBottom: "0.75rem" }}>
            {allDone ? (
              <>
                Report sent!{" "}
                <span className="text-gradient">Check your inbox.</span>
              </>
            ) : (
              <>
                Compiling your audit for{" "}
                <span className="text-gradient">{company}</span>
              </>
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {allDone
              ? `Your AI intelligence report has been delivered to ${email}`
              : `Your personalized report will arrive at ${email} in ~3 minutes`}
          </p>
        </div>

        {/* Stage Progress */}
        <div
          className="glass-card animate-fade-up delay-200"
          style={{ padding: "1.75rem", width: "100%", maxWidth: "480px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            >
              Pipeline Status
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                fontFamily: "monospace",
              }}
            >
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
              {String(elapsed % 60).padStart(2, "0")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {STAGES.map((stage, idx) => {
              const isCompleted = completedStages.includes(idx);
              const isActive = currentStage === idx && !isCompleted;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    opacity: idx > currentStage + 1 ? 0.35 : 1,
                    transition: "opacity 0.5s ease",
                  }}
                >
                  {/* Status icon */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "0.85rem",
                      background: isCompleted
                        ? "var(--success)"
                        : isActive
                        ? "rgba(99, 102, 241, 0.2)"
                        : "rgba(255,255,255,0.05)",
                      border: isActive
                        ? "1px solid rgba(99, 102, 241, 0.5)"
                        : "1px solid var(--border)",
                      transition: "all 0.4s ease",
                    }}
                  >
                    {isCompleted ? "✓" : stage.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 500,
                        color: isCompleted
                          ? "var(--success)"
                          : isActive
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        marginBottom: "0.3rem",
                        transition: "color 0.4s ease",
                      }}
                    >
                      {stage.label}
                    </div>
                    {isActive && (
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: "60%",
                            animation: `shimmer 2s linear infinite`,
                            background:
                              "linear-gradient(90deg, var(--accent-indigo), var(--accent-violet), var(--accent-indigo))",
                            backgroundSize: "200% 100%",
                          }}
                        />
                      </div>
                    )}
                    {isCompleted && (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: "100%" }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="animate-fade-up delay-300"
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          <Link href="/" className="btn btn-secondary btn-sm">
            ← Back to Home
          </Link>
          <Link href="/form" className="btn btn-secondary btn-sm">
            Submit Another Company
          </Link>
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          Didn't receive it? Check your spam folder or{" "}
          <Link
            href="/form"
            style={{ color: "var(--accent-indigo)", textDecoration: "none" }}
          >
            resubmit with a different email
          </Link>
          .
        </p>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div style={{ color: "white", display: "flex", justifyContent: "center", paddingTop: "10rem" }}>Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
