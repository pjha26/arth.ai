"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import Link from "next/link";
import {
  LeadSchema,
  Step1Schema,
  Step2Schema,
  Step3Schema,
  industryOptions,
  companySizeOptions,
} from "@/lib/validation";
import type { Lead } from "@/lib/validation";

type FormData = Partial<Lead>;
type FieldErrors = Partial<Record<keyof Lead, string>>;

const TOTAL_STEPS = 3;

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progress = (step / TOTAL_STEPS) * 100;

  const update = (field: keyof Lead, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (s: number): boolean => {
    const schemas = { 1: Step1Schema, 2: Step2Schema, 3: Step3Schema };
    const schema = schemas[s as 1 | 2 | 3];
    const result = schema.safeParse(formData);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FieldErrors = {};
      for (const [k, v] of Object.entries(flat)) {
        newErrors[k as keyof Lead] = (v as string[])[0];
      }
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    const final = LeadSchema.safeParse(formData);
    if (!final.success) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(final.data),
      });

      if (!res.ok) {
        const err = await res.json();
        setSubmitError(
          err?.message || "Something went wrong. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      router.push(
        `/success?company=${encodeURIComponent(final.data.companyName)}&email=${encodeURIComponent(final.data.email)}`
      );
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const err = (field: keyof Lead) => errors[field];

  return (
    <>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="navbar-logo">
          <span className="logo-dot" />
          arth<span style={{ color: "var(--accent-violet)" }}>.ai</span>
        </Link>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Free AI Intelligence Audit
        </span>
      </nav>

      <div
        className="page-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "6rem 1.5rem 3rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "560px" }}>
          {/* Header */}
          <div
            style={{ textAlign: "center", marginBottom: "2.5rem" }}
            className="animate-fade-up"
          >
            <div className="badge badge-indigo" style={{ marginBottom: "1rem" }}>
              <span className="badge-dot" />
              Step {step} of {TOTAL_STEPS}
            </div>
            <h1
              className="heading-md"
              style={{ marginBottom: "0.5rem" }}
            >
              {step === 1 && "Tell us who you are"}
              {step === 2 && "Tell us about your company"}
              {step === 3 && "What's your biggest challenge?"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {step === 1 && "We'll send your personalized AI audit here."}
              {step === 2 && "We'll research your company across multiple sources."}
              {step === 3 &&
                "This shapes the AI recommendations in your report."}
            </p>
          </div>

          {/* Card */}
          <div
            className="glass-card animate-scale-in"
            style={{ padding: "2.25rem" }}
          >
            {/* Progress */}
            <div style={{ marginBottom: "2rem" }}>
              {/* Step dots */}
              <div className="step-indicator">
                {[1, 2, 3].map((s, i) => (
                  <div
                    key={s}
                    style={{ display: "flex", alignItems: "center", flex: i < 2 ? "1" : "none" }}
                  >
                    <div
                      className={`step-dot ${
                        s < step ? "completed" : s === step ? "active" : "inactive"
                      }`}
                    >
                      {s < step ? "✓" : s}
                    </div>
                    {i < 2 && (
                      <div className={`step-line ${s < step ? "completed" : ""}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="progress-bar" style={{ marginTop: "1rem" }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
                className="animate-slide-right"
              >
                <div className="input-group">
                  <label className="input-label" htmlFor="fullName">
                    Full Name *
                  </label>
                  <input
                    id="fullName"
                    className={`input-field ${err("fullName") ? "error" : ""}`}
                    placeholder="Alex Johnson"
                    value={formData.fullName || ""}
                    onChange={(e) => update("fullName", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                  />
                  {err("fullName") && (
                    <span className="input-error-msg">{err("fullName")}</span>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="email">
                    Business Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`input-field ${err("email") ? "error" : ""}`}
                    placeholder="alex@yourcompany.com"
                    value={formData.email || ""}
                    onChange={(e) => update("email", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                  />
                  {err("email") && (
                    <span className="input-error-msg">{err("email")}</span>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="companyName">
                    Company Name *
                  </label>
                  <input
                    id="companyName"
                    className={`input-field ${err("companyName") ? "error" : ""}`}
                    placeholder="Acme Corp"
                    value={formData.companyName || ""}
                    onChange={(e) => update("companyName", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                  />
                  {err("companyName") && (
                    <span className="input-error-msg">{err("companyName")}</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <div className="input-group">
                  <label className="input-label" htmlFor="website">
                    Company Website *
                  </label>
                  <input
                    id="website"
                    type="url"
                    className={`input-field ${err("website") ? "error" : ""}`}
                    placeholder="https://yourcompany.com"
                    value={formData.website || ""}
                    onChange={(e) => update("website", e.target.value)}
                  />
                  {err("website") && (
                    <span className="input-error-msg">{err("website")}</span>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="industry">
                    Industry *
                  </label>
                  <select
                    id="industry"
                    className={`input-field ${err("industry") ? "error" : ""}`}
                    value={formData.industry || ""}
                    onChange={(e) =>
                      update("industry", e.target.value as (typeof industryOptions)[number])
                    }
                  >
                    <option value="" disabled>
                      Select your industry
                    </option>
                    {industryOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {err("industry") && (
                    <span className="input-error-msg">{err("industry")}</span>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="companySize">
                    Company Size *
                  </label>
                  <select
                    id="companySize"
                    className={`input-field ${err("companySize") ? "error" : ""}`}
                    value={formData.companySize || ""}
                    onChange={(e) =>
                      update(
                        "companySize",
                        e.target.value as (typeof companySizeOptions)[number]
                      )
                    }
                  >
                    <option value="" disabled>
                      Select company size
                    </option>
                    {companySizeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {err("companySize") && (
                    <span className="input-error-msg">{err("companySize")}</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
              >
                <div className="input-group">
                  <label className="input-label" htmlFor="painPoints">
                    What's your biggest operational challenge right now? *
                  </label>
                  <textarea
                    id="painPoints"
                    className={`input-field ${err("painPoints") ? "error" : ""}`}
                    placeholder="E.g. We spend too much time on manual data entry and customer follow-ups. Our team is growing but we can't scale operations without adding headcount..."
                    value={formData.painPoints || ""}
                    onChange={(e) => update("painPoints", e.target.value)}
                    rows={5}
                    style={{ minHeight: "140px" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    {err("painPoints") ? (
                      <span className="input-error-msg">{err("painPoints")}</span>
                    ) : (
                      <span />
                    )}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color:
                          (formData.painPoints?.length || 0) > 900
                            ? "var(--warning)"
                            : "var(--text-muted)",
                      }}
                    >
                      {formData.painPoints?.length || 0}/1000
                    </span>
                  </div>
                </div>

                {/* What you'll get preview */}
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    background: "rgba(99, 102, 241, 0.08)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "#a5b4fc",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    📄 What you'll receive
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    {[
                      "AI Readiness Score (Digital, Automation, Growth)",
                      "Personalized pain point analysis",
                      "3–5 specific AI automation opportunities",
                      "Recommended next steps for your industry",
                    ].map((item) => (
                      <li
                        key={item}
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          display: "flex",
                          gap: "0.5rem",
                        }}
                      >
                        <span style={{ color: "var(--success)" }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.85rem 1rem",
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  color: "#fca5a5",
                }}
              >
                ⚠️ {submitError}
              </div>
            )}

            {/* Navigation */}
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                gap: "1rem",
                justifyContent: "space-between",
              }}
            >
              {step > 1 ? (
                <button
                  className="btn btn-secondary"
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
              ) : (
                <Link href="/" className="btn btn-secondary">
                  ← Home
                </Link>
              )}

              {step < TOTAL_STEPS ? (
                <button className="btn btn-primary" onClick={nextStep}>
                  Continue →
                </button>
              ) : (
                <button
                  id="submit-audit-btn"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    opacity: isSubmitting ? 0.7 : 1,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    minWidth: "180px",
                    justifyContent: "center",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner />
                      Generating Audit…
                    </>
                  ) : (
                    "Generate My Audit →"
                  )}
                </button>
              )}
            </div>
          </div>

          <p
            style={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "1.5rem",
            }}
          >
            Your data is used only to generate your personalized report. No spam, ever.
          </p>
        </div>
      </div>
    </>
  );
}

function LoadingSpinner() {
  return (
    <span
      style={{
        width: "14px",
        height: "14px",
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin-slow 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}
