"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import * as Tooltip from "@radix-ui/react-tooltip";

// Sidebar Component (simplified reuse)
function Sidebar({ active, setActive }: any) {
  const nav = [
    { id: "analytics", icon: "📊", label: "Analytics", href: "/dashboard" },
    { id: "leads", icon: "👥", label: "Leads & Reports", href: "/dashboard" },
    { id: "discover", icon: "🔍", label: "Lead Discovery", href: "/dashboard/discover" },
  ];
  return (
    <aside className="arth-sidebar">
      <div className="arth-sidebar-logo">
        <div className="arth-logo-mark">A</div>
        <div>
          <div className="arth-logo-name">ArthAI</div>
          <div className="arth-logo-sub">Intelligence CRM</div>
        </div>
      </div>
      <div className="arth-nav-section-label">Main Menu</div>
      <nav className="arth-nav">
        {nav.map(n => (
          <Link key={n.id} href={n.href} className={`arth-nav-item ${active === n.id ? "arth-nav-active" : ""}`}>
            <span>{n.icon}</span><span>{n.label}</span>
          </Link>
        ))}
      </nav>
      <div style={{ marginTop: "auto" }}>
        <div style={{ padding: "0 12px", marginBottom: 12 }}>
          <ThemeToggle />
        </div>
        <Link href="/" className="arth-nav-item" style={{ width: "100%", color: "var(--c-muted)" }}>
          <span>🏠</span><span>Back to Home</span>
        </Link>
      </div>
    </aside>
  );
}

export default function DiscoverPage() {
  const [searches, setSearches] = useState<any[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [activeSearchData, setActiveSearchData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  // Form State
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [signal, setSignal] = useState("");
  
  useEffect(() => {
    fetchSearches();
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeSearchId) {
       fetchActiveSearch(activeSearchId);
       interval = setInterval(() => {
         fetchActiveSearch(activeSearchId);
       }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeSearchId]);

  const fetchSearches = async () => {
    try {
      const res = await fetch("/api/discovery");
      const data = await res.json();
      if (data.success) {
        setSearches(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, region, signal: signal || undefined })
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
    } catch (e) {
      alert("Failed to start search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arth-layout">
      <Sidebar active="discover" setActive={() => {}} />
      <main className="arth-main" style={{ display: 'flex', gap: 24, padding: '32px 36px' }}>
        
        {/* Left Column: Form & History */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h1 className="arth-page-title">Lead Discovery</h1>
            <p className="arth-page-sub">Auto-prospect companies by region & signal</p>
          </div>

          <div className="arth-card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New Discovery Run</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="arth-label">Industry</label>
                <input required type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS, Fintech" className="arth-input" />
              </div>
              <div>
                <label className="arth-label">Region / City</label>
                <input required type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. San Francisco, CA" className="arth-input" />
              </div>
              <div>
                <label className="arth-label">Intent Signal (Optional)</label>
                <input type="text" value={signal} onChange={e => setSignal(e.target.value)} placeholder="e.g. Hiring, Funding" className="arth-input" />
              </div>
              <button disabled={loading} type="submit" className="arth-btn-primary" style={{ marginTop: 8, padding: 10, borderRadius: 8, width: '100%', display: 'flex', justifyContent: 'center' }}>
                {loading ? "Starting..." : "Run Discovery"}
              </button>
            </form>
          </div>

          <div className="arth-card" style={{ flex: 1, overflowY: 'auto' }}>
             <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Searches</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
               {searches.map(s => (
                 <div key={s.id} onClick={() => setActiveSearchId(s.id)} style={{ padding: 12, border: '1px solid var(--c-border)', borderRadius: 8, cursor: 'pointer', background: activeSearchId === s.id ? 'var(--c-accent-light)' : 'transparent', transition: 'background 0.2s' }}>
                   <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-heading)' }}>{s.industry} in {s.region}</div>
                   <div style={{ fontSize: 11, color: 'var(--c-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                     <span>{formatDistanceToNow(new Date(s.createdAt))} ago</span>
                     <span style={{ color: s.status === 'completed' ? 'var(--c-success)' : 'var(--c-accent)' }}>{s.status}</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div style={{ flex: 1, background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                 {activeSearchData.status !== 'completed' && <div className="arth-status-pill arth-status-processing"><span className="dot pulse"></span>Discovering...</div>}
               </div>

               <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                   {activeSearchData.companies?.map((company: any) => (
                     <div key={company.id} className="arth-lead-row" style={{ cursor: 'default' }}>
                       <div className="arth-lead-avatar">
                         <img src={`https://www.google.com/s2/favicons?domain=${company.domain || 'google.com'}&sz=64`} alt="" />
                       </div>
                       
                       <div className="arth-lead-main-info" style={{ minWidth: 200 }}>
                         <div className="arth-lead-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           {company.name}
                           <a href={`https://${company.domain}`} target="_blank" rel="noreferrer" style={{ color: 'var(--c-muted)', fontSize: 14 }}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span></a>
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
                         <div style={{ marginLeft: 16 }}>
                           <Link href="/dashboard" className="arth-icon-btn"><span className="material-symbols-outlined">analytics</span></Link>
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
        </div>

      </main>

      <style>{`
        /* Minimal required styles to complement globals */
        .arth-input { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--c-border); background: var(--c-surface); color: var(--c-text); font-family: var(--font-body); font-size: 13px; outline: none; transition: border-color 0.2s; }
        .arth-input:focus { border-color: var(--c-accent); }
      `}</style>
    </div>
  );
}
