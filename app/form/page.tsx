"use client";

import { Suspense, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { IntakeShell } from "@/components/ResearchShell";
import { LeadSchema, Step1Schema, Step2Schema, Step3Schema, personaOptions, type Lead } from "@/lib/validation";
import { researchChallenge, researchChallenges, researchFocuses } from "@/lib/research-focus";

const steps = [
  { label: "Contact", title: "Tell us who you are", schema: Step1Schema },
  { label: "Company", title: "Tell us about your company", schema: Step2Schema },
  { label: "Challenge", title: "What’s your biggest challenge?", schema: Step3Schema },
];

type FieldErrors = Partial<Record<keyof Lead, string>>;

function RequestForm() {
  const router = useRouter();
  const search = useSearchParams();
  const company = search.get("company")?.trim().slice(0, 200);
  const focus = researchChallenge(search.get("focus"));
  const reduce = useReducedMotion();
  const id = useId();
  const [submissionId, setSubmissionId] = useState<string>();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<Lead>>({ fullName: "", email: "", website: "", challengeTags: focus ? [focus] : [] });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const current = steps[step];
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);

  function update<K extends keyof Lead>(field: K, value: Lead[K]) {
    setData(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }

  function toggleChallenge(challenge: string) {
    const selected = data.challengeTags ?? [];
    update("challengeTags", selected.includes(challenge)
      ? selected.filter(value => value !== challenge)
      : [...selected, challenge]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const parsed = current.schema.safeParse(data);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors as Partial<Record<keyof Lead, string[]>>;
      const nextErrors: FieldErrors = {};
      for (const field of Object.keys(fields) as (keyof Lead)[]) nextErrors[field] = fields[field]?.[0];
      if (nextErrors.personaType && !data.personaType) nextErrors.personaType = "Select your role.";
      setErrors(nextErrors);
      return;
    }
    if (step < steps.length - 1) {
      setErrors({});
      setStep(step + 1);
      return;
    }
    const final = LeadSchema.safeParse({ ...data, companyName: company || undefined });
    if (!final.success) {
      setSubmitError("Check your contact and company details before submitting.");
      return;
    }
    const key = submissionId ?? crypto.randomUUID();
    setSubmissionId(key);
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        referrerPolicy: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(final.data),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(response.status === 403
          ? "ArthAI rejected this submission. Open the request form directly in your browser and try again."
          : result?.message || result?.error || "Could not submit your request. Try again.");
        setIsSubmitting(false);
        return;
      }
      if (typeof result?.jobId !== "string" || !result.jobId) {
        setSubmitError("ArthAI could not confirm your request. Try again.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/success?jobId=${encodeURIComponent(result.jobId)}`);
    } catch {
      setSubmitError("Could not reach ArthAI. Try again.");
      setIsSubmitting(false);
    }
  }

  function error(field: keyof Lead) {
    return errors[field] && <p className="ui-error" id={`${id}-${field}-error`} role="alert">{errors[field]}</p>;
  }

  function input(field: "fullName" | "email" | "website", label: string, type: string, placeholder: string, autoComplete: string) {
    const fieldId = `${id}-${field}`;
    return (
      <div className="ui-field">
        <label htmlFor={fieldId}>{label}</label>
        <input className="ui-input" id={fieldId} type={type} required autoComplete={autoComplete} placeholder={placeholder}
          value={data[field] ?? ""} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${fieldId}-error` : undefined}
          onChange={event => update(field, event.target.value)} />
        {error(field)}
      </div>
    );
  }

  return (
    <>
      {company && <p className="ui-footnote">Research request for <strong>{company}</strong></p>}
      {focus && <p className="ui-footnote">Starting focus: <strong>{focus}</strong>. You can change it in the final step.</p>}
      <ol className="ui-step-list ui-label" aria-label="Request steps">
        {steps.map(({ label }, index) => (
          <li key={label} className={index < step ? "ui-step-done" : undefined} aria-current={index === step ? "step" : undefined}>
            <span aria-hidden="true">0{index + 1}</span>{label}
          </li>
        ))}
      </ol>
      <motion.form key={step} className="ui-form" noValidate onSubmit={submit}
        initial={reduce ? false : { opacity: .7, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : .2 }}>
        <h2 className="ui-step-title" tabIndex={-1} ref={heading}>{current.title}</h2>
        {step === 0 && <>
          {input("fullName", "Full name", "text", "Alex Johnson", "name")}
          {input("email", "Business email", "email", "alex@yourcompany.com", "email")}
          <p className="ui-help">We use this email to send your private report. Optional follow-up is a separate choice in the final step.</p>
        </>}
        {step === 1 && <>
          {input("website", "Company website", "url", "https://yourcompany.com", "url")}
          <fieldset className="ui-field" aria-describedby={errors.personaType ? `${id}-personaType-error` : undefined}>
            <legend>Your role</legend>
            <div className="ui-options">{personaOptions.map(role => (
              <label className="ui-choice" key={role}>
                <input type="radio" name="role" checked={data.personaType === role} onChange={() => update("personaType", role)} />{role}
              </label>
            ))}</div>
            {error("personaType")}
          </fieldset>
        </>}
        {step === 2 && <>
          <fieldset className="ui-field" aria-describedby={errors.challengeTags ? `${id}-challengeTags-error` : undefined}>
            <legend>Select the topics your report should address</legend>
            <div className="ui-options">{researchChallenges.map(challenge => (
              <button key={challenge} className="ui-choice" type="button" aria-pressed={data.challengeTags?.includes(challenge) ?? false}
                onClick={() => toggleChallenge(challenge)}>{challenge}</button>
            ))}</div>
            {error("challengeTags")}
          </fieldset>
          <div className="ui-field">
            <label htmlFor={`${id}-context`}>Tell us more (optional)</label>
            <textarea className="ui-input" id={`${id}-context`} rows={3} maxLength={1000} value={data.painPoints ?? ""}
              placeholder={researchFocuses.find(focus => data.challengeTags?.includes(focus.challenge))?.prompt ?? "What would you like to learn? Describe the challenge and the outcome you want."}
              onChange={event => update("painPoints", event.target.value)} />
            {error("painPoints")}
          </div>
          <section className="ui-request-review" aria-labelledby={`${id}-review`}>
            <h3 id={`${id}-review`}>Review your request</h3>
            <dl>
              <div><dt>Report recipient</dt><dd>{data.fullName} · {data.email}</dd></div>
              <div><dt>Company website</dt><dd>{data.website}</dd></div>
              <div><dt>Your role</dt><dd>{data.personaType}</dd></div>
              <div><dt>Research focus</dt><dd>{data.challengeTags?.join(", ") || "Choose at least one topic above."}</dd></div>
            </dl>
            <p>Use Back to edit your contact or company details. Findings depend on the public evidence available.</p>
          </section>
          <label className="ui-check"><input type="checkbox" checked={data.outreachConsent ?? false}
            onChange={event => update("outreachConsent", event.target.checked)} />
            Send me optional follow-up emails about these recommendations. I can unsubscribe at any time.
          </label>
        </>}
        {submitError && <p className="ui-error" role="alert">{submitError}</p>}
        <div className="ui-form-actions">
          {step > 0
            ? <button type="button" className="ui-button ui-button-secondary" disabled={isSubmitting} onClick={() => { setErrors({}); setSubmitError(""); setStep(step - 1); }}>← Back</button>
            : <Link href="/" className="ui-text-link">← Home</Link>}
          <button type="submit" className="ui-button" disabled={isSubmitting}>
            {step < 2 ? "Continue" : isSubmitting ? "Submitting…" : "Request report"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </motion.form>
    </>
  );
}

export default function FormPage() {
  return (
    <IntakeShell title="Request a report" description="Share a company website and a business challenge. ArthAI will look for public evidence and send you a private report.">
      <Suspense fallback={<p className="ui-footnote">Loading request form…</p>}><RequestForm /></Suspense>
    </IntakeShell>
  );
}
