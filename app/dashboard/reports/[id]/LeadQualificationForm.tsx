"use client";

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';

const decisions = [
  { value: 'qualified', label: 'Qualified' },
  { value: 'needs_evidence', label: 'Needs more evidence' },
  { value: 'rejected', label: 'Rejected' },
];
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type SavedReview = { decision: string; reason: string; sourceIds: string[]; reviewedAt: string };
type Source = { id: string; title: string; url: string; excerpt: string };

export default function LeadQualificationForm({ reportId, generationAttempt, sources, saved, allowDeal }: {
  reportId: string; generationAttempt: number; sources: Source[]; saved: SavedReview | null; allowDeal: boolean;
}) {
  const [review, setReview] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const interactive = useSyncExternalStore(subscribe, clientReady, serverReady) && !saving;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const decision = String(form.get('decision'));
    const reason = String(form.get('reason')).trim();
    const sourceIds = form.getAll('sourceId').map(String);
    if (!reason) { setFeedback('Enter a reason for your decision.'); return; }
    if (decision === 'qualified' && !sourceIds.length) { setFeedback('Select at least one report source.'); return; }
    setSaving(true);
    setFeedback('');
    try {
      const response = await fetch(`/api/reports/${reportId}/qualification`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason, sourceIds, generationAttempt }),
      });
      const result = await response.json();
      if (!response.ok) { setFeedback(result.message || 'Could not save qualification. Try again.'); return; }
      setReview({ decision, reason, sourceIds, reviewedAt: result.reviewedAt });
      setFeedback('Lead qualification saved.');
    } catch {
      setFeedback('Could not save qualification. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="cr-qualification cr-lead-review">
      <summary>Report-based lead qualification · {decisions.find(item => item.value === review?.decision)?.label ?? 'Awaiting review'}</summary>
      {review && <p>Last reviewed by staff on <time dateTime={review.reviewedAt}>{review.reviewedAt.slice(0, 10)}</time> (UTC)</p>}
      <form method="post" onSubmit={save}>
        <label>Decision <select name="decision" defaultValue={saved?.decision ?? ''} required disabled={!interactive}>
          <option value="" disabled>Select a decision</option>
          {decisions.map(item => <option key={item.value} value={item.value} disabled={item.value === 'qualified' && !sources.length}>{item.label}</option>)}
        </select></label>
        <label>Reason <input name="reason" defaultValue={saved?.reason ?? ''} maxLength={500} required disabled={!interactive} /></label>
        {sources.length > 0 && <fieldset className="cr-qualification-evidence" disabled={!interactive}>
          <legend>Supporting report sources</legend>
          {sources.map(source => <div key={source.id}>
            <label><input type="checkbox" name="sourceId" value={source.id} defaultChecked={saved?.sourceIds.includes(source.id)} />{source.title || source.url}</label>
            <details><summary>Read excerpt</summary><p>{source.url}</p><blockquote className="cr-qualification-message">{source.excerpt}</blockquote></details>
          </div>)}
        </fieldset>}
        {sources.length === 0 && <p>No source excerpts are available for this report.</p>}
        <button type="submit" className="cr-btn-outline" disabled={!interactive}>{saving ? 'Saving…' : 'Save lead qualification'}</button>
        {allowDeal && review?.decision === 'qualified' && <Link className="cr-btn-outline" href={`/dashboard/deals?from=${reportId}`}>Create deal</Link>}
      </form>
      <p role="status">{feedback}</p>
    </details>
  );
}
