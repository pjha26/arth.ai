'use client';

import { useRef, useState, type FormEvent } from 'react';
import { reportQualityReviewSchema } from '@/shared/report-quality.js';

type Outcome = 'generated' | 'insufficient-evidence' | 'failed';
type ListedClaim = { text: string; sourceId: string; quote: string };
const criteria = [
  { name: 'citations', label: 'Material factual claims follow from the cited excerpts' },
  { name: 'uncertainty', label: 'The report clearly identifies gaps and assumptions' },
  { name: 'usefulness', label: 'The next step fits the prospect’s stated problem' },
] as const;

function ClaimFields({ prefix, claim, onRemove }: { prefix: string; claim?: ListedClaim; onRemove?: () => void }) {
  return (
    <fieldset className="grid gap-2 rounded border p-3">
      <legend>{claim ? 'Listed claim' : 'Claim from report text'}</legend>
      {claim ? (
        <>
          <p className="break-words">{claim.text}</p>
          <p className="break-words text-sm">Source {claim.sourceId} · “{claim.quote}”</p>
        </>
      ) : (
        <label className="grid gap-1">Claim text
          <textarea name={`${prefix}-text`} required rows={2} className="rounded border p-2" />
        </label>
      )}
      <label className="grid gap-1">Evidence verdict
        <select name={`${prefix}-verdict`} defaultValue="" required className="rounded border p-2">
          <option value="" disabled>Choose a verdict</option>
          <option value="supported">Supported by the evidence</option>
          <option value="unsupported">Unsupported by the evidence</option>
          <option value="contradicted">Contradicted by the evidence</option>
          <option value="excluded">Exclude duplicate or immaterial claim</option>
        </select>
      </label>
      <label className="grid gap-1">Citation in the report
        <select name={`${prefix}-citation`} defaultValue={claim ? '' : 'none'} required className="rounded border p-2">
          <option value="" disabled>Choose citation type</option>
          <option value="none">No citation</option>
          <option value="company">Company’s own sources only</option>
          <option value="independent">Includes an independent source</option>
          <option value="unclear">Cited source with unclear provenance</option>
        </select>
      </label>
      {onRemove && <button type="button" onClick={onRemove} className="w-fit underline">Remove this claim</button>}
    </fieldset>
  );
}

export default function ReviewForm({ reportId, generationAttempt, actual, listedClaims }: {
  reportId: string; generationAttempt: number; actual: Outcome; listedClaims: ListedClaim[];
}) {
  const [feedback, setFeedback] = useState('');
  const [addedClaims, setAddedClaims] = useState<number[]>([]);
  const nextClaim = useRef(0);

  function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const claimReview = (prefix: string, text: FormDataEntryValue | null) => ({
      text, verdict: form.get(`${prefix}-verdict`), citation: form.get(`${prefix}-citation`),
    });
    const claims = actual === 'generated' ? [
      ...listedClaims.map((claim, index) => claimReview(`listed-${index}`, claim.text)),
      ...addedClaims.map(id => claimReview(`added-${id}`, form.get(`added-${id}-text`))),
    ] : [];
    const parsed = reportQualityReviewSchema.safeParse({
      version: 2, reportId, generationAttempt, actual, expected: form.get('expected'), notes: form.get('notes'), claims,
      ratings: actual === 'generated' ? {
        citations: Number(form.get('citations')), uncertainty: Number(form.get('uncertainty')), usefulness: Number(form.get('usefulness')),
      } : null,
    });
    if (!parsed.success) { setFeedback('Complete the ratings, review at least one claim, and add reviewer notes.'); return; }

    const url = URL.createObjectURL(new Blob([JSON.stringify(parsed.data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-quality-${reportId}-${generationAttempt}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback('Review file is ready to download.');
  }

  return (
    <form className="mt-8 grid max-w-2xl gap-4 rounded border p-4" onSubmit={download}>
      <h2 className="font-semibold">Record your review</h2>
      <p>Use the expected outcome from the benchmark case. Check the full report, including material claims outside its citation list.</p>
      <label className="grid gap-1">Expected outcome
        <select name="expected" defaultValue="" required className="rounded border p-2">
          <option value="" disabled>Choose an outcome</option>
          <option value="generated">A report should be generated</option>
          <option value="insufficient-evidence">Evidence should be insufficient</option>
        </select>
      </label>
      {actual === 'generated' && (
        <>
          {criteria.map(({ name, label }) => (
            <label className="grid gap-1" key={name}>{label}
              <select name={name} defaultValue="" required className="rounded border p-2">
                <option value="" disabled>Choose a rating</option>
                <option value="0">0 · Fails</option>
                <option value="1">1 · Partly meets</option>
                <option value="2">2 · Meets</option>
              </select>
            </label>
          ))}
          <div className="grid gap-3">
            <h3 className="font-semibold">Claim review</h3>
            <p>Check the report PDF for citations and the saved excerpts for support. Add any material claim missing from this list.</p>
            {listedClaims.map((claim, index) => <ClaimFields key={`listed-${index}`} prefix={`listed-${index}`} claim={claim} />)}
            {addedClaims.map(id => <ClaimFields key={`added-${id}`} prefix={`added-${id}`} onRemove={() => setAddedClaims(current => current.filter(item => item !== id))} />)}
            <button type="button" name="addClaim" className="w-fit rounded border px-4 py-2" onClick={() => {
              const id = nextClaim.current++;
              setAddedClaims(current => [...current, id]);
            }}>Add claim from report text</button>
          </div>
        </>
      )}
      <label className="grid gap-1">Reviewer notes
        <textarea name="notes" required maxLength={2000} rows={4} className="rounded border p-2" />
      </label>
      <button type="submit" className="w-fit rounded border px-4 py-2">Download review file</button>
      <p role="status">{feedback}</p>
    </form>
  );
}
