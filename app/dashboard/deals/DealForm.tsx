'use client';

import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

type Props = { reportId: string; companyName: string } | {
  dealId: string; version: number; nextAction: string | null; nextActionOn: string | null; nextActionCompletedAt: string | null;
};

export function DealForm(props: Props) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('open');
  const interactive = useSyncExternalStore(subscribe, clientReady, serverReady) && !saving;
  const creating = 'reportId' in props;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submittingButton = (event.nativeEvent as SubmitEvent).submitter;
    const completing = submittingButton instanceof HTMLButtonElement && submittingButton.value === 'complete_action';
    const action = { nextAction: form.get('nextAction'), nextActionOn: form.get('nextActionOn') || null };
    const body = creating
      ? { ...action, id: requestId.current ??= crypto.randomUUID(), reportId: props.reportId, title: form.get('title') }
      : { id: props.dealId, version: props.version, ...(completing ? { command: 'complete_action' }
        : { stage, ...(stage === 'open' ? action : { outcomeReason: form.get('outcomeReason') }) }) };
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/deals', {
        method: creating ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.message || 'Could not save the deal. Try again.'); return; }
      if (creating) router.replace(`/dashboard/deals?deal=${result.id}`);
      else router.refresh();
    } catch {
      setError('Could not save the deal. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-4 max-w-xl" method="post" onSubmit={submit}>
      {!creating && props.nextActionCompletedAt && <p role="status">Action completed on {props.nextActionCompletedAt} UTC. {props.nextAction}</p>}
      <fieldset className="grid gap-4" disabled={!interactive}>
        {creating ? <label className="grid gap-1">Deal title
          <input className="ui-input" name="title" defaultValue={props.companyName} required maxLength={150} />
        </label> : <label className="grid gap-1">Stage
          <select className="ui-input" name="stage" value={stage} onChange={event => setStage(event.target.value)}>
            <option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option>
          </select>
        </label>}
        {stage === 'open' && <>
          <label className="grid gap-1">Next action
            <input className="ui-input" name="nextAction" defaultValue={creating || props.nextActionCompletedAt ? '' : props.nextAction ?? ''} required maxLength={500} />
          </label>
          <label className="grid gap-1">Due date (optional)
            <input className="ui-input" type="date" name="nextActionOn" defaultValue={creating || props.nextActionCompletedAt ? '' : props.nextActionOn ?? ''} />
          </label>
        </>}
        {stage !== 'open' && <label className="grid gap-1">Outcome reason
          <textarea className="ui-input" name="outcomeReason" rows={3} required maxLength={500} />
        </label>}
        <button className="ui-button justify-self-start" type="submit" disabled={!interactive}>
          {saving ? 'Saving…' : creating ? 'Create deal' : stage === 'open' ? 'Save next action' : `Close as ${stage}`}
        </button>
        {!creating && stage === 'open' && !props.nextActionCompletedAt && (
          <button className="ui-button ui-button-secondary justify-self-start" type="submit" value="complete_action" formNoValidate disabled={!interactive}>
            Mark saved action complete
          </button>
        )}
      </fieldset>
      {error && <p className="ui-error mt-3" role="alert">{error}</p>}
    </form>
  );
}
