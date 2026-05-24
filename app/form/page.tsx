"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LeadSchema, Step1Schema, Step2Schema, Step3Schema } from "@/lib/validation";
import type { Lead } from "@/lib/validation";

type FormData = Partial<Lead>;
type FieldErrors = Partial<Record<keyof Lead, string>>;

const CHALLENGE_TAGS = [
  "Scaling my team",
  "Lead generation",
  "Automating workflows",
  "Competitive positioning",
  "Product-market fit",
  "Fundraising"
];

const PERSONAS = [
  { id: "Founder", icon: "🚀", title: "Founder", desc: "Strategic growth & vision" },
  { id: "CTO", icon: "⚙️", title: "CTO / Tech Lead", desc: "Infrastructure & automation" },
  { id: "Marketer", icon: "📣", title: "Marketer", desc: "Pipeline & positioning" },
] as const;

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({ challengeTags: [] });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Favicon fetching state
  const [favicon, setFavicon] = useState<string | null>(null);

  // When website changes, try fetching favicon
  useEffect(() => {
    if (formData.website && formData.website.length > 5 && formData.website.includes(".")) {
      try {
        const url = new URL(formData.website.startsWith('http') ? formData.website : `https://${formData.website}`);
        setFavicon(`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`);
      } catch {
        setFavicon(null);
      }
    } else {
      setFavicon(null);
    }
  }, [formData.website]);

  const update = (field: keyof Lead, value: any) => {
    setFormData(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: undefined }));
  };

  const toggleTag = (tag: string) => {
    const current = formData.challengeTags || [];
    if (current.includes(tag)) {
      update("challengeTags", current.filter(t => t !== tag));
    } else {
      update("challengeTags", [...current, tag]);
    }
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
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data?.message || "Something went wrong.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/success?email=${encodeURIComponent(final.data.email)}&jobId=${data.jobId}`);
    } catch {
      setSubmitError("Network error.");
      setIsSubmitting(false);
    }
  };

  const err = (f: keyof Lead) => errors[f];

  // Blur values for right panel: Step 1 = 12px, 2 = 8px, 3 = 4px
  const blurValue = step === 1 ? "12px" : step === 2 ? "8px" : "4px";

  // Slide Variants
  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div style={{ background: "#0E0C0A", minHeight: "100vh", display: "flex", color: "#F5F0E6", fontFamily: "var(--font-body)", overflow: "hidden" }}>
      
      {/* ── LEFT PANEL (55%) ── */}
      <div className="form-left-panel">
        
        {/* Logo Header */}
        <div style={{ padding: "32px 48px", position: "absolute", top: 0, left: 0 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, background: "#C4922A", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E0C0A", fontWeight: 800, fontFamily: "var(--font-heading)" }}>A</div>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, color: "#F5F0E6", letterSpacing: "-0.02em" }}>ArthAI</span>
          </Link>
        </div>

        {/* Form Container */}
        <div style={{ maxWidth: 520, width: "100%", margin: "0 auto", marginTop: "15vh" }}>
          
          {/* Progress Indicator */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ color: "#C4922A", fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {step} of 3</span>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 2, background: "#2E2A25", transform: "translateY(-50%)", zIndex: 0 }} />
              <div style={{ position: "absolute", top: "50%", left: 0, width: `${((step - 1) / 2) * 100}%`, height: 2, background: "#C4922A", transform: "translateY(-50%)", transition: "width 0.4s ease", zIndex: 1 }} />
              
              {[1, 2, 3].map((s) => (
                <div key={s} style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2,
                  background: s < step ? "#3E7A2E" : s === step ? "#C4922A" : "#1A1714",
                  border: `2px solid ${s < step ? "#3E7A2E" : s === step ? "#C4922A" : "#2E2A25"}`,
                  color: s < step ? "#fff" : s === step ? "#0E0C0A" : "#9C845F",
                  fontWeight: 700, transition: "all 0.3s"
                }}>
                  {s < step ? "✓" : s}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: "#1A1714", border: "1px solid #2E2A25", borderRadius: 20, padding: 40, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", position: "relative", minHeight: 400 }}>
            <AnimatePresence mode="wait">
              <motion.div key={step} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}>
                
                {/* STEP 1 */}
                {step === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, color: "#F5F0E6", marginBottom: 8, fontWeight: 500 }}>Tell us who you are</h2>
                    </div>
                    
                    <div className="dark-input-group">
                      <label className="dark-label">Full Name *</label>
                      <input className={`dark-input ${err("fullName") ? "input-err" : ""}`} placeholder="Alex Johnson" value={formData.fullName || ""} onChange={e => update("fullName", e.target.value)} onKeyDown={e => e.key === "Enter" && nextStep()} autoFocus />
                      {err("fullName") && <span className="dark-error">{err("fullName")}</span>}
                    </div>

                    <div className="dark-input-group">
                      <label className="dark-label">Business Email *</label>
                      <input type="email" className={`dark-input ${err("email") ? "input-err" : ""}`} placeholder="alex@yourcompany.com" value={formData.email || ""} onChange={e => update("email", e.target.value)} onKeyDown={e => e.key === "Enter" && nextStep()} />
                      {err("email") && <span className="dark-error">{err("email")}</span>}
                    </div>
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, color: "#F5F0E6", marginBottom: 8, fontWeight: 500 }}>Tell us about your company</h2>
                    </div>
                    
                    <div className="dark-input-group">
                      <label className="dark-label">Company Website URL *</label>
                      <div style={{ position: "relative" }}>
                        <input type="url" className={`dark-input ${err("website") ? "input-err" : ""}`} placeholder="https://yourcompany.com" value={formData.website || ""} onChange={e => update("website", e.target.value)} onKeyDown={e => e.key === "Enter" && nextStep()} autoFocus style={{ paddingLeft: favicon ? 48 : 16 }} />
                        {favicon && <img src={favicon} alt="Favicon" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, borderRadius: 4 }} />}
                      </div>
                      {favicon && !err("website") && <span style={{ fontSize: 13, color: "#3E7A2E", marginTop: 4, display: "block" }}>✓ Company found</span>}
                      {err("website") && <span className="dark-error">{err("website")}</span>}
                    </div>

                    <div className="dark-input-group">
                      <label className="dark-label">Which describes you best? *</label>
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        {PERSONAS.map(p => {
                          const isSel = formData.personaType === p.id;
                          return (
                            <div key={p.id} onClick={() => update("personaType", p.id)} style={{
                              flex: 1, padding: "16px 12px", borderRadius: 12, border: `1.5px solid ${isSel ? "#C4922A" : "#2E2A25"}`,
                              background: isSel ? "rgba(196,146,42,0.08)" : "#0E0C0A", cursor: "pointer", transition: "all 0.2s",
                              textAlign: "center"
                            }}>
                              <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: isSel ? "#C4922A" : "#F5F0E6", marginBottom: 4 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: "#9C845F", lineHeight: 1.3 }}>{p.desc}</div>
                            </div>
                          );
                        })}
                      </div>
                      {err("personaType") && <span className="dark-error">{err("personaType")}</span>}
                    </div>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div>
                      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, color: "#F5F0E6", marginBottom: 8, fontWeight: 500 }}>What's your biggest challenge?</h2>
                      <p style={{ color: "#9C845F", fontSize: 14 }}>This shapes the AI recommendations in your report.</p>
                    </div>

                    <div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {CHALLENGE_TAGS.map(tag => {
                          const isSel = formData.challengeTags?.includes(tag);
                          return (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)} style={{
                              padding: "10px 16px", borderRadius: 9999, border: `1px solid ${isSel ? "#C4922A" : "#2E2A25"}`,
                              background: isSel ? "rgba(196,146,42,0.12)" : "transparent", color: isSel ? "#C4922A" : "#9C845F",
                              fontSize: 14, cursor: "pointer", transition: "all 0.2s", transform: isSel ? "scale(1.02)" : "scale(1)"
                            }}>
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                      {err("challengeTags") && <span className="dark-error" style={{ marginTop: 8, display: "block" }}>{err("challengeTags")}</span>}
                    </div>

                    <AnimatePresence>
                      {formData.challengeTags && formData.challengeTags.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                          <div className="dark-input-group" style={{ marginTop: 8 }}>
                            <label className="dark-label">Tell us more (optional)</label>
                            <textarea className="dark-input" placeholder="E.g. We spend too much time on manual follow-ups..." value={formData.painPoints || ""} onChange={e => update("painPoints", e.target.value)} rows={3} />
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                              <span style={{ fontSize: 12, color: "#9C845F" }}>{formData.painPoints?.length || 0}/1000</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div style={{ padding: 20, background: "#2A2218", border: "1px solid rgba(196,146,42,0.4)", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 18 }}>📄</span>
                        <span style={{ color: "#C4922A", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>WHAT YOU'LL RECEIVE</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {["AI Readiness Score (Digital, Automation, Growth)", "Personalized pain point analysis", "3–5 specific AI automation opportunities", "Actionable next steps for your industry"].map(i => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#C4922A", fontSize: 14 }}>✓</span>
                            <span style={{ color: "#F5F0E6", fontSize: 14 }}>{i}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Error & Controls anchored to bottom */}
            <div style={{ marginTop: 40 }}>
              {submitError && (
                <div style={{ padding: "12px 16px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, color: "#ef4444", fontSize: 14, marginBottom: 24 }}>
                  ⚠️ {submitError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {step > 1 ? (
                  <button onClick={prevStep} disabled={isSubmitting} style={{ background: "transparent", border: "none", color: "#9C845F", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>←</span> Back
                  </button>
                ) : (
                  <Link href="/" style={{ color: "#9C845F", fontSize: 15, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>←</span> Home
                  </Link>
                )}

                {step < 3 ? (
                  <button onClick={nextStep} style={{ background: "#C4922A", color: "#0E0C0A", padding: "12px 24px", borderRadius: 9999, border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                    Continue →
                  </button>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#C4922A", fontSize: 11, marginBottom: 8 }}>⚡ Report ready in under 60 seconds</div>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="shimmer-btn" style={{ background: "#C4922A", color: "#0E0C0A", padding: "14px 32px", borderRadius: 9999, border: "none", fontWeight: 700, fontSize: 15, cursor: isSubmitting ? "not-allowed" : "pointer", position: "relative", overflow: "hidden" }}>
                      {isSubmitting ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 14, height: 14, border: "2px solid rgba(14,12,10,0.3)", borderTopColor: "#0E0C0A", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                          Generating your audit...
                        </div>
                      ) : "Generate My Audit →"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#9C845F", fontSize: 12 }}>
            <span>🔒</span> Your data is never sold or shared
          </div>

        </div>
      </div>

      {/* ── RIGHT PANEL (45%) LIVE PREVIEW ── */}
      <div className="form-right-panel" style={{ width: "45%", background: "#151310", borderLeft: "1px solid #2E2A25", display: "flex", alignItems: "center", justifyContent: "center", padding: 64, position: "relative" }}>
        <div style={{ position: "absolute", top: 40, right: 40, color: "#9C845F", fontSize: 14, fontFamily: "var(--font-heading)", letterSpacing: "0.05em" }}>
          Your intelligence report is taking shape...
        </div>

        <div style={{ width: "100%", maxWidth: 450, background: "#1A1714", borderRadius: 12, border: "1px solid #2E2A25", padding: 32, boxShadow: "0 24px 48px rgba(0,0,0,0.5)", transition: "filter 0.8s ease", filter: `blur(${blurValue})` }}>
          {/* Skeleton Header */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 32 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: "#2E2A25", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {favicon ? <img src={favicon} style={{ width: 32, height: 32 }} /> : <div style={{ width: 32, height: 32, background: "#3a352f", borderRadius: 4 }} />}
            </div>
            <div>
              <div style={{ width: 180, height: 24, background: "#2E2A25", borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: 120, height: 16, background: "#2E2A25", borderRadius: 4 }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <div style={{ flex: 1, height: 80, background: "#2E2A25", borderRadius: 8 }} />
            <div style={{ flex: 1, height: 80, background: "#2E2A25", borderRadius: 8 }} />
            <div style={{ flex: 1, height: 80, background: "#2E2A25", borderRadius: 8 }} />
          </div>

          <div style={{ width: "100%", height: 20, background: "#2E2A25", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ width: "80%", height: 20, background: "#2E2A25", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ width: "90%", height: 20, background: "#2E2A25", borderRadius: 4, marginBottom: 32 }} />

          <div style={{ width: "60%", height: 32, background: "#2A2218", borderRadius: 8, border: "1px solid #C4922A" }} />
        </div>
      </div>

      <style>{`
        /* Custom Styles for Form */
        .form-left-panel { width: 55%; position: relative; display: flex; flex-direction: column; }
        @media(max-width: 1000px) {
          .form-left-panel { width: 100%; }
          .form-right-panel { display: none !important; }
        }

        .dark-input-group { display: flex; flex-direction: column; margin-bottom: 4px; }
        .dark-label { font-size: 14px; color: #9C845F; margin-bottom: 8px; display: block; }
        .dark-input {
          width: 100%; background: #0E0C0A; border: 1px solid #2E2A25; border-radius: 12px;
          padding: 16px; color: #F5F0E6; font-size: 16px; outline: none; transition: all 0.2s;
          font-family: inherit; resize: none;
        }
        .dark-input::placeholder { color: #514538; }
        .dark-input:focus { border-color: #C4922A; box-shadow: 0 0 0 4px rgba(196,146,42,0.1); }
        .input-err { border-color: #ef4444 !important; }
        .dark-error { color: #ef4444; font-size: 13px; margin-top: 6px; display: block; }

        .shimmer-btn::after {
          content: ""; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg); transition: 0s;
        }
        .shimmer-btn:hover:not(:disabled)::after {
          left: 150%; transition: 0.6s ease-in-out;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
