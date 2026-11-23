'use client';

import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';

type Entry = {
  id: string; name: string; website: string; country: string; region: string; city: string; industry: string; source: string;
  shortlistedAt: string | null;
  researchReport: { id: string; status: string } | null;
};
type Results = { rows: Entry[]; page: number; hasMore: boolean };
const fields = ['country', 'region', 'city', 'industry'] as const;
const endpoint = '/api/discovery/catalogue';
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function CataloguePanel() {
  const filters = useRef(new URLSearchParams());
  const [results, setResults] = useState<Results | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const interactive = useSyncExternalStore(subscribe, clientReady, serverReady) && !busy;

  async function load(query: URLSearchParams, page = 1) {
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    const response = await fetch(`${endpoint}?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Catalogue search failed.');
    filters.current = query;
    setResults(data);
  }

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Try again.'); }
    finally { setBusy(''); }
  }

  function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get('csv');
    setNotice('');
    if (!(file instanceof File) || !file.size) { setError('Choose a CSV file.'); return; }
    if (file.size > 256 * 1024) { setError('CSV must be 256 KiB or smaller.'); return; }
    void run('Importing CSV…', async () => {
      const bytes = await file.arrayBuffer();
      let csv: string;
      try { csv = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error('Save the CSV as UTF-8 and try again.'); }
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Catalogue import failed.');
      form.reset();
      setNotice(`${data.imported} imported, ${data.duplicates} duplicates skipped.`);
      await load(filters.current);
    });
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    for (const field of fields) {
      const value = String(data.get(field) || '').trim();
      if (value) query.set(field, value);
    }
    if (data.has('shortlisted')) query.set('shortlisted', '1');
    void run('Searching catalogue…', () => load(query));
  }

  function updateEntry(row: Entry, method: 'PATCH' | 'POST') {
    setNotice('');
    void run(method === 'PATCH' ? 'Saving shortlist…' : 'Requesting research…', async () => {
      const response = await fetch(`${endpoint}/${encodeURIComponent(row.id)}`, {
        method,
        ...(method === 'PATCH' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shortlisted: !row.shortlistedAt }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Catalogue action failed.');
      setNotice(method === 'PATCH'
        ? data.shortlisted ? 'Added to the shortlist.' : 'Removed from the shortlist.'
        : data.created ? 'Research request saved.' : 'A research report already exists for this entry.');
      await load(filters.current, results?.page ?? 1);
    });
  }

  return (
    <>
      <form className="flex flex-wrap items-end gap-4" onSubmit={importCsv}>
        <div className="min-w-0 flex-1">
          <label className="arth-label" htmlFor="catalogue-csv">Business CSV</label>
          <input className="arth-input mt-1 block w-full" id="catalogue-csv" name="csv" type="file" accept=".csv,text/csv" required aria-describedby="catalogue-csv-help" disabled={!interactive} />
          <p id="catalogue-csv-help" className="arth-page-sub">Use records you have permission to retain. <a href="/business-catalogue.csv" className="underline underline-offset-4" download>Download sample CSV</a></p>
        </div>
        <button className="arth-btn-primary min-h-11 px-4 disabled:opacity-60" disabled={!interactive}>Import CSV</button>
      </form>
      <form className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={search}>
        {fields.map(field => (
          <label key={field} className="arth-label capitalize">
            {field}
            <input className="arth-input mt-1 block w-full" name={field} maxLength={100} disabled={!interactive} />
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
          <label className="flex min-h-11 items-center gap-2">
            <input name="shortlisted" type="checkbox" disabled={!interactive} /> Shortlisted only
          </label>
          <button className="arth-btn-secondary min-h-11 px-4 disabled:opacity-60" disabled={!interactive}>Search catalogue</button>
        </div>
      </form>
      <div>
        <p role="status">{busy || notice}</p>
        {error && <p role="alert">{error}</p>}
      </div>
      {results && (
        <section aria-label="Catalogue results">
          {results.rows.length === 0 ? <p>No companies match these filters.</p> : (
            <ul className="divide-y break-words">
              {results.rows.map(row => (
                <li key={row.id} className="grid gap-1 py-3">
                  <a href={row.website} target="_blank" rel="noreferrer" className="w-fit font-semibold underline underline-offset-4">{row.name}</a>
                  <p>{[row.city, row.region, row.country].filter(Boolean).join(', ')} · {row.industry}</p>
                  <p className="arth-page-sub">{row.source}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button type="button" className="arth-btn-secondary min-h-11 px-4 disabled:opacity-60"
                      aria-label={`${row.shortlistedAt ? 'Remove from shortlist:' : 'Shortlist'} ${row.name}`}
                      disabled={!interactive} onClick={() => updateEntry(row, 'PATCH')}>
                      {row.shortlistedAt ? 'Remove from shortlist' : 'Shortlist'}
                    </button>
                    {row.researchReport ? (
                      <Link className="underline underline-offset-4" href={`/dashboard/reports/${row.researchReport.id}`} prefetch={false}>
                        Open report ({row.researchReport.status === 'done' ? 'ready' : row.researchReport.status})
                      </Link>
                    ) : row.shortlistedAt ? (
                      <button type="button" className="arth-btn-primary min-h-11 px-4 disabled:opacity-60"
                        aria-label={`Request research for ${row.name}`} disabled={!interactive} onClick={() => updateEntry(row, 'POST')}>
                        Request research
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(results.page > 1 || results.hasMore) && (
            <nav className="mt-4 flex flex-wrap items-center gap-3" aria-label="Catalogue result pages">
              <button className="arth-btn-secondary min-h-11 px-4 disabled:opacity-60" disabled={!!busy || results.page === 1} onClick={() => void run('Loading results…', () => load(filters.current, results.page - 1))}>Previous</button>
              <span>Page {results.page}</span>
              <button className="arth-btn-secondary min-h-11 px-4 disabled:opacity-60" disabled={!!busy || !results.hasMore} onClick={() => void run('Loading results…', () => load(filters.current, results.page + 1))}>Next</button>
            </nav>
          )}
        </section>
      )}
    </>
  );
}
