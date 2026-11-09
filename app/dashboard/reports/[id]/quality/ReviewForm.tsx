'use client';

import { useState, type FormEvent } from 'react';
import { reportQualityReviewSchema } from '@/shared/report-quality.js';

type Outcome = 'generated' | 'insufficient-evidence' | 'failed';
const criteria = [
  { name: 'citations', label: 'Material factual claims follow from the cited excerpts' },
  { name: 'uncertainty', label: 'The report clearly identifies gaps and assumptions' },
  { name: 'usefulness', label: 'The next step fits the prospect’s stated problem' },
] as const;

export default function ReviewForm({ reportId, generationAttempt, actual }: { reportId: string; generationAttempt: number; actual: Outcome }) {
  const [feedback, setFeedback] = useState('');

  function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = reportQualityReviewSchema.safeParse({
      version: 1, reportId, generationAttempt, actual, expected: form.get('expected'), notes: form.get('notes'),
      ratings: actual === 'generated' ? {
        citations: Number(form.get('citations')), uncertainty: Number(form.get('uncertainty')), usefulness: Number(form.get('usefulness')),
        criticalClaim: form.get('criticalClaim') === 'yes',
      } : null,
    });
    if (!parsed.success) { setFeedback('Complete the ratings and add reviewer notes.'); return; }

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
          <label className="grid gap-1">Does the report contain a fabricated or materially unsupported claim?
            <select name="criticalClaim" defaultValue="" required className="rounded border p-2">
              <option value="" disabled>Choose yes or no</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
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
