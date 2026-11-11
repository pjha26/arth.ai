"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DiscoveryRecord } from "@/lib/ui-types";
import { formatDistanceToNow } from "date-fns";

export default function DiscoverPage() {
  const [searches, setSearches] = useState<DiscoveryRecord[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [activeSearchData, setActiveSearchData] = useState<DiscoveryRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [shortlist, setShortlist] = useState<{ id: string; name: string; domain: string }[] | null>(null);
  const [shortlistSaving, setShortlistSaving] = useState(false);
  const [shortlistFeedback, setShortlistFeedback] = useState('');

  // Form State
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [signal, setSignal] = useState("");
  
  const fetchSearches = async () => {
    try {
      const res = await fetch("/api/discovery");
      const data = await res.json();
      if (data.success) {
        setSearches(data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  async function fetchShortlist() {
    try {
      const response = await fetch('/api/discovery?shortlist=1');
      if (!response.ok) throw new Error('Unable to load shortlist');
      const result = await response.json();
      setShortlist(result.data);
    } catch {
      setShortlistFeedback('Unable to load the shortlist. Refresh to try again.');
    }
  }

  async function changeShortlist(companyId: string, candidateId?: string) {
    setShortlistSaving(true);
    setShortlistFeedback('');
    try {
      const response = await fetch('/api/discovery', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, candidateId, shortlisted: candidateId !== undefined }),
      });
      if (!response.ok) throw new Error('Unable to save shortlist');
      await fetchShortlist();
    } catch {
      setShortlistFeedback('Unable to update the shortlist. Try again.');
    } finally {
      setShortlistSaving(false);
    }
  }

  const fetchActiveSearch = async (id: string) => {
    try {
      const res = await fetch(`/api/discovery?searchId=${id}`);
      const data = await res.json();
      if (data.success) {
        setActiveSearchData(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const initial = setTimeout(() => { void fetchSearches(); void fetchShortlist(); }, 0);
    return () => clearTimeout(initial);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeSearchId) {
       setTimeout(() => void fetchActiveSearch(activeSearchId), 0);
       interval = setInterval(() => {
         fetchActiveSearch(activeSearchId);
       }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeSearchId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, region, signal: signal || undefined, sizeMin: sizeMin ? Number(sizeMin) : null, sizeMax: sizeMax ? Number(sizeMax) : null })
      });
      const data = await res.json();
      if (data.success) {
        setActiveSearchId(data.searchId);
        setIndustry("");
        setRegion("");
        setSignal("");
        fetchSearches();
      } else {
        alert(data.message || "Error starting search");
      }
    } catch {
      alert("Failed to start search");
    } finally {
      setLoading(false);
    }
  };

  const shortlistedCompanyIds = new Set(shortlist?.map(company => company.id));

  return (
    <main className="arth-main ui-discovery">
        
        {/* Left Column: Form & History */}
        <div className="ui-discovery-controls">
          <div>
            <h1 className="arth-page-title">Lead Discovery</h1>
            <p className="arth-page-sub">Find companies by industry, region, and public signals.</p>
          </div>

          <div className="arth-card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New Discovery Run</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label htmlFor="discover-industry" className="arth-label">Industry</label>
                <input id="discover-industry" required type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS, Fintech" className="arth-input" />
              </div>
              <div>
                <label htmlFor="discover-region" className="arth-label">Region / City</label>
                <input id="discover-region" required type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. San Francisco, CA" className="arth-input" />
              </div>
              <div>
                <label htmlFor="discover-signal" className="arth-label">Intent Signal (Optional)</label>
                <input id="discover-signal" type="text" value={signal} onChange={e => setSignal(e.target.value)} placeholder="e.g. Hiring, Funding" className="arth-input" />
              </div>
              <fieldset>
                <legend className="arth-label">Employee range (optional)</legend>
                <div className="ui-size-range">
                  <label className="arth-label">Minimum<input aria-label="Minimum employees" type="number" min="0" value={sizeMin} onChange={e => setSizeMin(e.target.value)} className="arth-input" /></label>
                  <label className="arth-label">Maximum<input aria-label="Maximum employees" type="number" min="0" value={sizeMax} onChange={e => setSizeMax(e.target.value)} className="arth-input" /></label>
                </div>
              </fieldset>
              <button disabled={loading} type="submit" className="arth-btn-primary" style={{ marginTop: 8, padding: 10, borderRadius: 8, width: '100%', display: 'flex', justifyContent: 'center' }}>
                {loading ? "Starting..." : "Run Discovery"}
              </button>
            </form>
          </div>

          <details className="arth-card" open>
            <summary>Staff shortlist{shortlist && ` (${shortlist.length})`}</summary>
            {shortlist?.length === 0 && <p className="arth-page-sub">Shortlist a matched company to review it later.</p>}
            {shortlist && shortlist.length > 0 && <ul style={{ display: 'grid', gap: 8, marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
              {shortlist.map(company => <li key={company.id} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <a href={`https://${company.domain}`} target="_blank" rel="noreferrer">{company.name}</a>
                <button type="button" className="arth-btn-secondary" aria-label={`Remove ${company.name} from shortlist`} disabled={shortlistSaving} onClick={() => void changeShortlist(company.id)}>Remove</button>
              </li>)}
            </ul>}
            <p role="status">{shortlistFeedback}</p>
          </details>

          <div className="arth-card" style={{ flex: 1, overflowY: 'auto' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Searches</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
               {searches.map(s => (
                 <button type="button" key={s.id} data-search-id={s.id} onClick={() => setActiveSearchId(s.id)} style={{ textAlign: 'left', padding: 12, border: '1px solid var(--c-border)', borderRadius: 8, cursor: 'pointer', background: activeSearchId === s.id ? 'var(--c-accent-light)' : 'transparent', transition: 'background 0.2s' }}>
                   <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--c-heading)' }}>{s.industry} in {s.region}</span>
                   <span style={{ fontSize: 11, color: 'var(--c-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                     <span>{formatDistanceToNow(new Date(s.createdAt))} ago</span>
                     <span style={{ color: s.status === 'completed' ? 'var(--c-success)' : 'var(--c-accent)' }}>{s.status}</span>
                   </span>
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <section className="ui-discovery-results" aria-label="Discovery results">
          {activeSearchData ? (
             <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                 <div>
                   <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--c-heading)' }}>Results: {activeSearchData.industry} in {activeSearchData.region}</h2>
                   <div style={{ fontSize: 13, color: 'var(--c-muted)', marginTop: 4 }}>
                     Status: <strong style={{ color: activeSearchData.status === 'completed' ? 'var(--c-success)' : 'var(--c-accent)' }}>{activeSearchData.status}</strong>
                     &nbsp;&nbsp;•&nbsp;&nbsp;Found: {activeSearchData.companies?.length || 0} companies
                   </div>
                 </div>
                 {['pending', 'processing'].includes(activeSearchData.status) && <div className="arth-status-pill arth-status-processing"><span className="dot pulse"></span>Discovering...</div>}
               </div>

               <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {activeSearchData.companies?.map((company) => (
                     <div key={company.id} className="arth-lead-row" style={{ cursor: 'default' }}>
                       <div className="arth-lead-avatar">
                         <img src={`https://www.google.com/s2/favicons?domain=${company.domain || 'google.com'}&sz=64`} alt="" />
                       </div>
                       
                       <div className="arth-lead-main-info" style={{ minWidth: 200 }}>
                         <div className="arth-lead-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           {company.name}
                           {company.domain && <a href={`https://${company.domain}`} aria-label={`Open ${company.name} website`} target="_blank" rel="noreferrer" style={{ color: 'var(--c-muted)', fontSize: 14 }}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 14 }}>open_in_new</span></a>}
                         </div>
                         <div className="arth-lead-meta">{company.domain} • via {company.source.replace('_', ' ')}</div>
                       </div>

                       <div className="arth-lead-tags" style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {company.confidenceTier === 'verified' && <div className="arth-tag-persona" style={{ background: '#EBF5E8', color: '#3E7A2E', border: '1px solid #C3E2BB' }}>Verified</div>}
                          {company.confidenceTier === 'likely' && <div className="arth-tag-persona" style={{ background: '#FFF7E6', color: '#D48806', border: '1px solid #FFE58F' }}>Likely</div>}
                          {company.confidenceTier === 'unconfirmed' && <div className="arth-tag-persona" style={{ background: '#F8F9FA', color: '#6C757D', border: '1px solid #DEE2E6' }}>Unconfirmed</div>}
                          
                          {company.status === 'queued' && <div className="arth-tag-persona" style={{ background: '#E8F4FD', color: '#0284C7', border: '1px solid #BAE6FD' }}>Auto-Queued ⚡</div>}
                          {company.status === 'filtered_out' && <div className="arth-tag-persona" style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}>Filtered Out</div>}

                          {company.fitReasons && company.fitReasons.map((r: string, i: number) => (
                            <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: 'var(--c-border)', borderRadius: 4, color: 'var(--c-text)' }}>{r}</span>
                          ))}
                       </div>

                       <div style={{ textAlign: 'right', minWidth: 80 }}>
                         <div style={{ fontSize: 11, color: 'var(--c-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fit Score</div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <div style={{ flex: 1, height: 6, background: 'var(--c-border)', borderRadius: 99, overflow: 'hidden' }}>
                             <div style={{ height: '100%', width: `${(company.fitScore || 0) * 100}%`, background: (company.fitScore || 0) >= 0.6 ? 'var(--c-success)' : 'var(--c-muted)' }} />
                           </div>
                           <span style={{ fontSize: 13, fontWeight: 600 }}>{((company.fitScore || 0) * 100).toFixed(0)}</span>
                         </div>
                       </div>
                       
                       {company.status === 'researched' || company.status === 'queued' ? (
                         <div style={{ marginLeft: 16, display: 'grid', gap: 6 }}>
                           <Link href="/dashboard" className="arth-icon-btn" aria-label="View reports"><span className="material-symbols-outlined">analytics</span></Link>
                           {company.companyId && <button type="button" className="arth-btn-secondary"
                             aria-label={`Shortlist ${company.name}`}
                             disabled={!shortlist || shortlistSaving || shortlistedCompanyIds.has(company.companyId)}
                             onClick={() => { if (company.companyId) void changeShortlist(company.companyId, company.id); }}>
                             {shortlistedCompanyIds.has(company.companyId) ? 'Shortlisted' : 'Shortlist'}
                           </button>}
                         </div>
                       ) : <div style={{ width: 44, marginLeft: 16 }} />}
                     </div>
                   ))}
                   
                   {activeSearchData.companies?.length === 0 && activeSearchData.status === 'completed' && (
                     <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-muted)' }}>No companies found matching the criteria.</div>
                   )}
                 </div>
               </div>
             </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)' }}>
              Select a search from the left or run a new discovery.
            </div>
          )}
        </section>
    </main>
  );
}
