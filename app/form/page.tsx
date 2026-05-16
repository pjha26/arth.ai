"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LeadSchema, Step1Schema, Step2Schema, Step3Schema,
  industryOptions, companySizeOptions,
} from "@/lib/validation";
import type { Lead } from "@/lib/validation";

type FormData = Partial<Lead>;
type FieldErrors = Partial<Record<keyof Lead, string>>;

const LogoBadge = () => (
  <div className="logo-badge">
    <svg viewBox="0 0 14 14" fill="none"><path d="M7 1L9.5 5.5H12.5L10 8.5L11 13L7 10.5L3 13L4 8.5L1.5 5.5H4.5L7 1Z" fill="white" /></svg>
  </div>
);

const STEP_LABELS = ["You", "Your Company", "Your Challenge"];

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progress = (step / 3) * 100;

  const update = (field: keyof Lead, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: undefined }));
  };

  const validateStep = (s: number) => {
    const schema = s === 1 ? Step1Schema : s === 2 ? Step2Schema : Step3Schema;
    const result = schema.safeParse(formData);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const e: FieldErrors = {};
      for (const [k, v] of Object.entries(flat)) e[k as keyof Lead] = (v as string[])[0];
      setErrors(e);
      return false;
    }
    setErrors({});
    return true;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, 3)); };
  const prevStep = () => { setErrors({}); setStep(s => Math.max(s - 1, 1)); };

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
        setSubmitError(err?.message || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/success?company=${encodeURIComponent(final.data.companyName)}&email=${encodeURIComponent(final.data.email)}`);
    } catch {
      setSubmitError("Network error. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  const err = (f: keyof Lead) => errors[f];

  return (
    <div style={{ background: "var(--cream)", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="navbar-logo"><LogoBadge />arth.ai</Link>
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>Free AI Intelligence Audit</span>
      </nav>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "5rem 1.5rem 3rem" }}>
        <div style={{ width: "100%", maxWidth: "520px" }}>

          {/* Header */}
          <div className="animate-fade-up" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span className="badge badge-neutral">Step {step} of 3</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>— {STEP_LABELS[step - 1]}</span>
            </div>
            <h1 className="display-md" style={{ marginBottom: "0.4rem" }}>
              {step === 1 && <>Tell us <span className="italic text-saffron">who you are.</span></>}
              {step === 2 && <>Tell us about <span className="italic text-saffron">your company.</span></>}
              {step === 3 && <>What's your <span className="italic text-saffron">biggest challenge?</span></>}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              {step === 1 && "We'll send your personalized AI audit to this email."}
              {step === 2 && "We'll research your company across multiple sources."}
              {step === 3 && "This shapes the AI recommendations in your report."}
            </p>
          </div>

          {/* Card */}
          <div className="card-flat animate-fade-up delay-100" style={{ padding: "2rem", background: "var(--ivory)" }}>

            {/* Step indicator */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div className="step-indicator" style={{ marginBottom: "0.75rem" }}>
                {[1, 2, 3].map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}>
                    <div className={`step-dot ${s < step ? "completed" : s === step ? "active" : "inactive"}`}>
                      {s < step ? "✓" : s}
                    </div>
                    {i < 2 && <div className={`step-line ${s < step ? "completed" : ""}`} />}
                  </div>
                ))}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="fullName">Full Name *</label>
                  <input id="fullName" className={`input-field ${err("fullName") ? "error" : ""}`} placeholder="Alex Johnson" value={formData.fullName || ""} onChange={e => update("fullName", e.target.value)} onKeyDown={e => e.key === "Enter" && nextStep()} autoFocus />
                  {err("fullName") && <span className="input-error-msg">{err("fullName")}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="email">Business Email *</label>
                  <input id="email" type="email" className={`input-field ${err("email") ? "error" : ""}`} placeholder="alex@yourcompany.com" value={formData.email || ""} onChange={e => update("email", e.target.value)} onKeyDown={e => e.key === "Enter" && nextStep()} />
                  {err("email") && <span className="input-error-msg">{err("email")}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="companyName">Company Name *</label>
                  <input id="companyName" className={`input-field ${err("companyName") ? "error" : ""}`} placeholder="Acme Corp" value={formData.companyName || ""} onChange={e => update("companyName", e.target.value)} onKeyDown={e => e.key === "Enter" && nextStep()} />
                  {err("companyName") && <span className="input-error-msg">{err("companyName")}</span>}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="website">Company Website *</label>
                  <input id="website" type="url" className={`input-field ${err("website") ? "error" : ""}`} placeholder="https://yourcompany.com" value={formData.website || ""} onChange={e => update("website", e.target.value)} autoFocus />
                  {err("website") && <span className="input-error-msg">{err("website")}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="industry">Industry *</label>
                  <select id="industry" className={`input-field ${err("industry") ? "error" : ""}`} value={formData.industry || ""} onChange={e => update("industry", e.target.value as typeof industryOptions[number])}>
                    <option value="" disabled>Select your industry</option>
                    {industryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {err("industry") && <span className="input-error-msg">{err("industry")}</span>}
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="companySize">Company Size *</label>
                  <select id="companySize" className={`input-field ${err("companySize") ? "error" : ""}`} value={formData.companySize || ""} onChange={e => update("companySize", e.target.value as typeof companySizeOptions[number])}>
                    <option value="" disabled>Select company size</option>
                    {companySizeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {err("companySize") && <span className="input-error-msg">{err("companySize")}</span>}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="painPoints">What's your biggest operational challenge right now? *</label>
                  <textarea id="painPoints" className={`input-field ${err("painPoints") ? "error" : ""}`} placeholder="E.g. We spend too much time on manual data entry and follow-ups. Our team is growing but we can't scale without adding headcount..." value={formData.painPoints || ""} onChange={e => update("painPoints", e.target.value)} rows={5} autoFocus />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    {err("painPoints") ? <span className="input-error-msg">{err("painPoints")}</span> : <span />}
                    <span style={{ fontSize: "0.72rem", color: (formData.painPoints?.length || 0) > 900 ? "#D97706" : "var(--text-muted)" }}>{formData.painPoints?.length || 0}/1000</span>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ padding: "1rem 1.1rem", background: "var(--saffron-light)", border: "1px solid #DEC090", borderRadius: "var(--radius-md)" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--saffron-hover)", fontWeight: 700, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>📄 What you'll receive</p>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {["AI Readiness Score (Digital, Automation, Growth)", "Personalized pain point analysis", "3–5 specific AI automation opportunities", "Recommended next steps for your industry"].map(i => (
                      <li key={i} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", gap: "0.5rem" }}>
                        <span style={{ color: "var(--sage)" }}>✓</span>{i}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div style={{ marginTop: "1rem", padding: "0.8rem 1rem", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "#DC2626" }}>
                ⚠️ {submitError}
              </div>
            )}

            {/* Navigation */}
            <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              {step > 1
                ? <button className="btn btn-outline" onClick={prevStep} disabled={isSubmitting}>← Back</button>
                : <Link href="/" className="btn btn-ghost">← Home</Link>
              }
              {step < 3
                ? <button className="btn btn-primary" onClick={nextStep}>Continue →</button>
                : (
                  <button id="submit-audit-btn" className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? "not-allowed" : "pointer", minWidth: "180px", justifyContent: "center" }}>
                    {isSubmitting ? <><Spinner />Generating…</> : "Generate My Audit →"}
                  </button>
                )
              }
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "1.25rem" }}>
            Your data is used only to generate your personalized report. No spam, ever.
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <span style={{ width: "13px", height: "13px", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin-slow 0.7s linear infinite", flexShrink: 0 }} />;
}
