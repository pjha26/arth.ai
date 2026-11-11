"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { isResearchActive } from '@/shared/status.js';
import Link from "next/link";
import type { CRMReport, Analytics } from "@/lib/ui-types";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";
import { EvidenceRule } from "@/components/EvidenceRule";

// ── Shared UI Elements (Sparkline, MetricCard, etc.) ─────────

function Sparkline({ data = [], color = "#C4922A", height = 36 }: { data?: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const w = 120, h = height;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v: number, i: number) => `${data.length === 1 ? w / 2 : (i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: "drawLine 1.4s ease forwards" }}
      />
    </svg>
  );
}

function AnimatedNumber({ value = 0, duration = 1200 }: { value?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined || value === null) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(p * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return <span>{display}</span>;
}

function MetricCard({ label, value, trend, trendLabel, spark, sparkColor, delay = 0 }: { label: string; value: number | null; trend: number; trendLabel: number | null; spark: number[]; sparkColor: string; delay?: number }) {
  const isUp = trend > 0;
  const isFlat = trend === 0;
  return (
    <div className="arth-card" style={{ animationDelay: `${delay}ms`, animation: "fadeSlideUp 0.5s ease both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="arth-label">{label}</span>
        <span className="arth-badge" style={{
            color: isFlat ? "var(--c-muted)" : isUp ? "var(--c-success)" : "var(--c-danger)",
            background: isFlat ? "var(--c-border)" : isUp ? "var(--c-success-bg)" : "var(--c-danger-bg)",
        }}>
          {trendLabel == null ? "Last 30 days" : `${isFlat ? "→" : isUp ? "↑" : "↓"} ${Math.abs(trendLabel)}%`}
        </span>
      </div>
      <div className="arth-metric-value">{value == null ? "—" : <AnimatedNumber value={value} />}</div>
      <div style={{ marginTop: 8 }}><Sparkline data={spark} color={sparkColor} /></div>
    </div>
  );
}

function StripItem({ icon, label, value, delay = 0 }: { icon: React.ReactNode; label: string; value: string; delay?: number }) {
  return (
    <div className="arth-strip-item" style={{ animationDelay: `${delay}ms`, animation: "fadeSlideUp 0.5s ease both" }}>
      <div className="arth-strip-icon">{icon}</div>
      <div>
        <div className="arth-label" style={{ marginBottom: 2 }}>{label}</div>
        <div className="arth-strip-value">{value || "N/A"}</div>
      </div>
    </div>
  );
}

function IndustryBar({ name, count, max, delay = 0 }: { name: string; count: number; max: number; delay?: number }) {
  const pct = max ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 14, animationDelay: `${delay}ms`, animation: "fadeSlideUp 0.5s ease both" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--c-text)" }}>{name}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-accent)" }}>{count}</span>
      </div>
      <div className="arth-bar-track">
        <div className="arth-bar-fill" style={{ width: `${pct}%`, transitionDelay: `${delay + 200}ms` }} />
      </div>
    </div>
  );
}

function PersonaCard({ icon, name, count, avg, rate, color, delay = 0 }: { icon: string; name: string; count: number; avg: number | null; rate: string | null; color: string; delay?: number }) {
  return (
    <div className="arth-persona-card" style={{ borderTop: `3px solid ${color}`, animationDelay: `${delay}ms`, animation: "fadeSlideUp 0.5s ease both" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--c-heading)", marginBottom: 12 }}>{name}</div>
      <div className="arth-persona-row"><span className="arth-label">Leads</span><span style={{ fontWeight: 600, color: "var(--c-text)" }}>{count}</span></div>
      <div className="arth-persona-row"><span className="arth-label">Avg score</span><span style={{ fontWeight: 600, color: "var(--c-text)" }}>{avg ?? "—"}</span></div>
      <div className="arth-persona-row"><span className="arth-label">Downloaded PDF</span><span style={{ fontWeight: 600, color: "var(--c-text)" }}>{rate ?? "—"}</span></div>
    </div>
  );
}

function Heatmap({ data = {} }: { data?: Record<string, number> }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const max = Math.max(...Object.values(data as Record<string, number>), 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "32px repeat(24, 1fr)", gap: 3, minWidth: 600 }}>
        <div />
        {hours.map(h => <div key={h} style={{ fontSize: 10, color: "var(--c-muted)", textAlign: "center" }}>{h % 6 === 0 ? `${h}h` : ""}</div>)}
        {days.map(day => (
          <div key={`${day}-row`} style={{ display: "contents" }}>
            <div key={`${day}-label`} style={{ fontSize: 11, color: "var(--c-muted)", display: "flex", alignItems: "center" }}>{day}</div>
            {hours.map(h => {
              const v = data[`${day}-${h}`] || 0;
              const opacity = v ? 0.2 + (v / max) * 0.8 : 0.06;
              return (
                <div
                  key={`${day}-${h}`}
                  title={`${day} ${h}:00 — ${v} leads`}
                  style={{ height: 14, borderRadius: 3, background: `rgba(196,146,42,${opacity})`, cursor: v ? "pointer" : "default", transition: "transform 0.15s" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.transform = "scale(1.3)" }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.transform = "scale(1)" }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendItem({ text, time, isNew = false }: { text: string; time: string; isNew?: boolean }) {
  return (
    <div className="arth-trend-item">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div className="arth-timeline-dot" style={{ background: isNew ? "var(--c-accent)" : "var(--c-border-strong)" }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13.5, color: "var(--c-text)", lineHeight: 1.5, margin: 0 }}>{text}</p>
          <span style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 3, display: "block" }}>{time}</span>
        </div>
        {isNew && <span className="arth-new-badge">new</span>}
      </div>
    </div>
  );
}

function TooltipWrapper({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="arth-tooltip-content" sideOffset={5}>
            {content}
            <Tooltip.Arrow className="arth-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="arth-empty">
      <div className="arth-empty-icon">{icon}</div>
      <div className="arth-empty-title">{title}</div>
      <div className="arth-empty-sub">{subtitle}</div>
    </div>
  );
}

// ── LEADS & REPORTS VIEW ───────────────────────────────────────

const StatusPill = ({ status }: { status: string }) => {
    if (status === "done") return <div className="arth-status-pill arth-status-done"><span className="dot solid"></span>Done</div>;
    if (status === "failed") return <div className="arth-status-pill arth-status-failed"><span className="dot solid"></span>Failed</div>;
    return <div className="arth-status-pill arth-status-processing"><span className="dot pulse"></span>Processing</div>;
  };

function LeadsView({ leads, setLeads, loading }: { leads: CRMReport[]; setLeads: React.Dispatch<React.SetStateAction<CRMReport[]>>; loading: boolean }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Filter and sort leads (highest intent score first)
  const filtered = useMemo(() => {
    const result = leads.filter((l) => {
      const matchSearch = l.companyName.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || (statusFilter === 'pending' ? isResearchActive(l.status) : l.status === statusFilter);
      return matchSearch && matchStatus;
    });

    // Sort by score (DESC) and then by createdAt (DESC)
    result.sort((a, b) => {
      const scoreA = a.intentProbability || 0;
      const scoreB = b.intentProbability || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [leads, search, statusFilter]);

  const selectedLead = useMemo(() => leads.find((l) => l.id === selectedLeadId), [leads, selectedLeadId]);

  const toggleRow = (id: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic UI Delete
    const previousLeads = [...leads];
    setLeads(leads.filter((l) => l.id !== id));
    if (selectedLeadId === id) setSelectedLeadId(null);
    
    try {
      const response = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
    } catch {
      // Revert if failed
      setLeads(previousLeads);
    }
  };



  const listContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="arth-leads-layout">
      {/* ── Left Zone (70% or 100%) ── */}
      <motion.div 
        className="arth-leads-main" 
        animate={{ width: selectedLead ? "70%" : "100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      >
        {/* Toolbar */}
        <div className="arth-toolbar">
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: 9, fontSize: 16, color: 'var(--c-muted)' }}>search</span>
            <input 
              type="text" 
              placeholder="Search companies..."
              aria-label="Search companies"
              className="arth-toolbar-search"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <select aria-label="Report status" className="arth-toolbar-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">Status: All</option>
            <option value="done">Done</option>
            <option value="pending">Processing</option>
            <option value="failed">Failed</option>
          </select>

          <div style={{ flex: 1 }} />

          <div className="arth-toolbar-toggle">
            <button aria-label="List view" aria-pressed={viewMode === 'list'} className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><span className="material-symbols-outlined" aria-hidden="true">view_list</span></button>
            <button aria-label="Grid view" aria-pressed={viewMode === 'grid'} className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><span className="material-symbols-outlined" aria-hidden="true">grid_view</span></button>
          </div>
        </div>

        {loading ? (
          /* Skeleton Loaders */
          <div className="arth-leads-wrapper">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="arth-skeleton-row animate-pulse">
                <div className="arth-skeleton-avatar" />
                <div style={{ flex: 1 }}><div className="arth-skeleton-text" style={{ width: 120 }}/><div className="arth-skeleton-text" style={{ width: 180, opacity: 0.5 }}/></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Designed Empty State */
          <div className="arth-leads-empty">
            <h2 className="arth-empty-headline">No leads yet</h2>
            <p className="arth-empty-sub">Submit your first company URL to generate an intelligence report.</p>
            <Link href="/form" className="ui-button" style={{ marginTop: 16 }}>
              Submit a Lead <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </Link>
          </div>
        ) : (
          /* Staggered List/Grid */
          <motion.div 
            className={viewMode === 'list' ? "arth-leads-wrapper" : "arth-leads-grid"}
            variants={listContainer}
            initial="hidden"
            animate="show"
          >
            {filtered.map((lead) => (
              <motion.div 
                key={lead.id} 
                data-report-id={lead.id}
                variants={itemAnim}
                className={`arth-lead-row ${selectedLeadId === lead.id ? 'active' : ''} ${viewMode === 'grid' ? 'is-card' : ''} ${lead.intentProbability != null && lead.intentProbability > 0.75 ? 'hot-signal' : ''}`}
                onClick={() => setSelectedLeadId(lead.id)}
              >
                <input type="checkbox" className="arth-checkbox" aria-label={`Select ${lead.companyName}`} checked={selectedRows.has(lead.id)} onChange={(e) => toggleRow(lead.id, e)} />
                
                <div className="arth-lead-avatar">
                  <img src={`https://www.google.com/s2/favicons?domain=${lead.website}&sz=64`} alt="" />
                </div>

                <div className="arth-lead-main-info">
                  <button type="button" className="arth-lead-name ui-lead-open" onClick={event => { event.stopPropagation(); setSelectedLeadId(lead.id); }}>{lead.companyName}</button>
                  <div className="arth-lead-meta">{lead.industry} • {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</div>
                </div>

                <div className="arth-lead-tags">
                  <div className="arth-tag-persona">{lead.personaType || 'General'}</div>
                  <StatusPill status={lead.status} />
                  {lead.intentProbability != null && lead.intentProbability > 0.75 && (
                    <div className="arth-tag-persona" style={{ background: '#FFF1EC', color: '#E85D04', border: '1px solid #FFD3C4' }}>Experimental intent</div>
                  )}
                  {lead.company?.signals?.[0]?.severity === "high" && (
                    <div className="arth-tag-persona" style={{ background: '#FCE7F3', color: '#BE185D', border: '1px solid #FBCFE8' }}>🔥 NEW SIGNAL</div>
                  )}
                </div>

                <div className="arth-lead-score" title="Readiness assessment, 0–100">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="circle" strokeDasharray={`${lead.score || 0}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="score-text">{lead.score || '--'}</span>
                </div>

                {/* Hover Actions */}
                <div className="arth-lead-actions">
                  {lead.status === 'done' && (
                    <TooltipWrapper content="Download PDF">
                      <a href={`/api/leads/${lead.id}/download`} aria-label={`Download report for ${lead.companyName}`} download onClick={e => e.stopPropagation()} className="arth-icon-btn"><span className="material-symbols-outlined" aria-hidden="true">download</span></a>
                    </TooltipWrapper>
                  )}
                  <TooltipWrapper content="Delete">
                    <button aria-label={`Delete report for ${lead.companyName}`} onClick={(e) => handleDelete(lead.id, e)} className="arth-icon-btn arth-danger-hover"><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                  </TooltipWrapper>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ── Right Zone (30% Slide-in Panel) ── */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div 
            className="arth-leads-panel"
            initial={{ width: 0, opacity: 0, x: 20 }}
            animate={{ width: "30%", opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 20 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          >
            <div className="arth-panel-inner">
              <div className="arth-panel-header">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img src={`https://www.google.com/s2/favicons?domain=${selectedLead.website}&sz=64`} alt="" className="arth-panel-favicon" />
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{selectedLead.companyName}</h3>
                    <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>{selectedLead.website}</div>
                  </div>
                </div>
                <button aria-label="Close lead details" className="arth-close-btn" onClick={() => setSelectedLeadId(null)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
              </div>
              
              <div className="arth-panel-body">
                {/* Status Block */}
                <div className="arth-panel-block">
                  <div className="arth-label">Pipeline Status</div>
                  <div style={{ marginTop: 8 }}>
                    <StatusPill status={selectedLead.status} /><span className="arth-label">Evidence: {selectedLead.verificationStatus} · PDF: {selectedLead.artifactStatus} · Email: {selectedLead.deliveryStatus}</span>
                  </div>
                  {selectedLead.leadSource === 'manual' && (selectedLead.status === 'failed' || selectedLead.status === 'done' && selectedLead.verificationStatus === 'reviewed') && (
                    <Link href={`/dashboard/reports/${selectedLead.id}/quality`} prefetch={false} className="underline">Review research quality</Link>
                  )}
                  {isResearchActive(selectedLead.status) && (
                    <div className="arth-progress-track">
                      <motion.div className="arth-progress-fill" style={{ width: '100%' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    </div>
                  )}
                </div>

                <div className="arth-panel-block">
                  <div className="arth-label">Submitted Context</div>
                  <div className="arth-contact-grid">
                    <div><span className="k">Name:</span> <span className="v">{selectedLead.fullName || 'N/A'}</span></div>
                    <div><span className="k">Email:</span> <span className="v">{selectedLead.email || 'N/A'}</span></div>
                    <div><span className="k">Persona:</span> <span className="v" style={{ textTransform: 'capitalize' }}>{selectedLead.personaType || 'General'}</span></div>
                  </div>
                  <label className="arth-label">Sales outcome <select value={selectedLead.salesStatus || 'new'} onChange={async e => { const salesStatus = e.target.value; const response = await fetch(`/api/leads/${selectedLead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salesStatus }) }); if (response.ok) setLeads(current => current.map(lead => lead.id === selectedLead.id ? { ...lead, salesStatus } : lead)); else window.alert('Unable to save sales outcome'); }}>{['new','contacted','engaged','converted','rejected'].map(status => <option key={status} value={status}>{status}</option>)}</select></label><p className="arth-stated-challenge">&ldquo;{selectedLead.painPoints}&rdquo;</p>
                </div>

                {selectedLead.status === 'done' && (
                  <>
                    {selectedLead.company?.signals?.[0]?.severity === "high" && (
                      <div className="arth-panel-block" style={{ border: '1px solid #FBCFE8', background: '#FDF2F8' }}>
                        <div className="arth-label" style={{ color: '#BE185D' }}>🔥 Signal Detected: {selectedLead.company.signals[0].type}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#831843' }}>
                          {selectedLead.company.signals[0].data?.message}
                        </div>
                        <div style={{ fontSize: 11, color: '#9D174D', marginTop: 8, opacity: 0.8 }}>
                          {new Date(selectedLead.company.signals[0].detectedAt).toLocaleDateString()} — Report auto-regeneration triggered.
                        </div>
                      </div>
                    )}
                    
                    <div className="arth-panel-block">
                      <div className="arth-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Engagement & Intent</span>
                        {selectedLead.verificationStatus === 'reviewed' && <span className="ui-label">AI reviewed</span>}
                      </div>
                      <div className="ui-intent-summary">
                        {selectedLead.intentProbability != null && <div className="ui-intent-value">{Math.round(selectedLead.intentProbability * 100)}%</div>}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-heading)' }}>
                            {selectedLead.intentStatus === 'disabled' ? 'Scoring disabled' : selectedLead.intentStatus === 'unavailable' ? 'Scorer unavailable' : selectedLead.intentProbability != null && selectedLead.intentProbability > 0.75 ? 'Experimental high-intent signal' : 'Experimental intent estimate'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>
                            Readiness and buying intent are separate assessments. Intent scoring is experimental.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="arth-panel-block">
                      <div className="arth-label">AI Insights</div>
                      <ul className="arth-insight-list">
                        {selectedLead.insights?.aiOpportunities?.length ? (
                          selectedLead.insights.aiOpportunities.map((opp, idx: number) => (
                            <li key={idx} style={{ marginBottom: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: "var(--c-heading)" }}>
                                {opp.confidence != null && opp.confidence < 0.5 && <span className="arth-tag-persona" style={{ background: '#FCEFD4', color: '#B8860B', border: '1px solid #F1D592' }}>ESTIMATED</span>}
                                {opp.confidence != null && opp.confidence >= 0.5 && opp.confidence <= 0.8 && <span className="arth-tag-persona" style={{ background: '#E8E0D0', color: '#9C845F', border: '1px solid #D8CDB6' }}>~</span>}
                                {opp.title}
                              </div>
                              <div style={{ marginTop: 4 }}>{opp.description}</div>
                            </li>
                          ))
                        ) : (
                          <>
                            <li>Company operates in the <strong>{selectedLead.industry}</strong> sector.</li>
                            <li>No reviewed recommendations are available yet.</li>
                          </>
                        )}
                      </ul>
                    </div>

                    {selectedLead.insights?.visualIntelligence && (
                      <div className="arth-panel-block">
                        <div className="arth-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-accent)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span> Visual Intelligence
                        </div>
                        <ul className="arth-insight-list">
                          <li style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 600, color: 'var(--c-heading)' }}>Design Maturity</div>
                            <div style={{ marginTop: 4 }}>{selectedLead.insights.visualIntelligence.designMaturity}</div>
                          </li>
                          <li style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 600, color: 'var(--c-heading)' }}>UX Quality Signals</div>
                            <div style={{ marginTop: 4 }}>{selectedLead.insights.visualIntelligence.uxQualitySignals?.join(', ')}</div>
                          </li>
                          <li style={{ marginBottom: 12 }}>
                            <div style={{ fontWeight: 600, color: 'var(--c-heading)' }}>Conversion Gaps</div>
                            <div style={{ marginTop: 4 }}>{selectedLead.insights.visualIntelligence.conversionGaps?.join(', ')}</div>
                          </li>
                          <li>
                            <div style={{ fontWeight: 600, color: 'var(--c-heading)' }}>Company Stage Signal</div>
                            <div style={{ marginTop: 4 }}>{selectedLead.insights.visualIntelligence.companyStageSignal}</div>
                          </li>
                        </ul>
                      </div>
                    )}

                      {(selectedLead.insights?.marketPosition?.reasoning || (selectedLead.insights?.recommendedNextSteps && selectedLead.insights.recommendedNextSteps.some((s) => s.reasoning))) && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <details className="arth-reasoning-collapsible" style={{ background: 'var(--ui-inset)', border: '1px solid var(--ui-rule)', borderRadius: 2, padding: '12px' }}>
                            <summary style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ui-ink)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>psychology</span>
                              Recommendation rationale
                            </summary>
                            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--ui-muted)', lineHeight: 1.6 }}>
                              {selectedLead.insights?.marketPosition?.reasoning && (
                                <div style={{ marginBottom: '12px' }}>
                                  <strong style={{ color: 'var(--ui-ink)' }}>Market position</strong>
                                  <p style={{ marginTop: '4px' }}>{selectedLead.insights.marketPosition.reasoning}</p>
                                </div>
                              )}
                              {selectedLead.insights?.recommendedNextSteps && selectedLead.insights.recommendedNextSteps.some((s) => s.reasoning) && (
                                <div>
                                  <strong style={{ color: 'var(--ui-ink)' }}>Recommendations</strong>
                                  <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                                    {selectedLead.insights.recommendedNextSteps.filter((s) => s.reasoning).map((step, idx: number) => (
                                      <li key={idx} style={{ marginBottom: '6px' }}>{step.reasoning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      )}

                    <div className="arth-panel-actions" style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                      <Link href={`/dashboard/reports/${selectedLead.id}`} className="arth-btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block', padding: 12, borderRadius: 8, textDecoration: 'none' }}>View Report & Chat</Link>
                      <button className="arth-btn-secondary" onClick={async () => { const response = await fetch(`/api/reports/${selectedLead.id}/reaudit`, { method: 'POST' }); const result = await response.json(); if (response.ok) router.push(`/dashboard/reports/${result.jobId}`); else window.alert(result.message || 'Unable to start audit'); }} style={{ width: '100%', padding: 12, borderRadius: 8, marginTop: 8 }}>Re-Audit Company</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div 
            className="arth-bulk-bar"
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="arth-bulk-count">{selectedRows.size} leads selected</span>
              <div style={{ width: 1, height: 24, background: 'var(--c-border-strong)' }} />
              <button className="arth-btn-secondary arth-bulk-btn"><span className="material-symbols-outlined">download</span> Download All</button>
              <button className="arth-btn-secondary arth-bulk-btn"><span className="material-symbols-outlined">csv</span> Export CSV</button>
              <button className="arth-btn-error arth-bulk-btn"><span className="material-symbols-outlined">delete</span> Delete Selected</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [active, setActive] = useState("analytics");
  const [loaded, setLoaded] = useState(false);

  const [leads, setLeads] = useState<CRMReport[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [leadsRes, analyticsRes] = await Promise.all([
        fetch(`/api/leads?page=${page}`),
        fetch("/api/analytics")
      ]);
      if (leadsRes.status === 401 || analyticsRes.status === 401) { router.replace('/login'); return; }
      const leadsData = await leadsRes.json();
      const analyticsData = await analyticsRes.json();
      
      if (leadsData.success) { setLeads(leadsData.leads); setPages(Math.max(1, leadsData.pages)); }
      if (analyticsData.success) setAnalytics(analyticsData.data);
      if (leadsData.success || analyticsData.success) setLastSynced(new Date());
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    }
  }, [page, router]);

  useEffect(() => {
    const t = setTimeout(() => { void fetchDashboardData(); setLoaded(true); }, 0);
    
    // Live Status Polling: poll every 5s if ANY lead is processing, else poll every 15s.
    // Done dynamically in a ref to always use latest state.
    return () => clearTimeout(t);
  }, [fetchDashboardData]);

  useEffect(() => {
    const hasPending = leads.some(l => isResearchActive(l.status));
    const intervalTime = hasPending ? 5000 : 15000;
    const interval = setInterval(fetchDashboardData, intervalTime);
    return () => clearInterval(interval);
  }, [leads, fetchDashboardData]);

  // Map Data
  const stats = useMemo(() => {
    const totalLeads = analytics?.overview?.totalLeads || 0;
    const generated = analytics?.overview?.generated || 0;
    const failed = analytics?.overview?.failed || 0;
    const avgScore = analytics?.overview?.avgReportScore ?? null;
    return { totalLeads, generated, avgScore, failed };
  }, [analytics]);

  const industries = analytics?.industryBreakdown || [];

  const rawPersonas = analytics?.personaPerformance || [];
  const findPersona = (type: string) => rawPersonas.find((p) => p.persona === type) || { count: 0, avgScore: null, conversionRate: null };
  const personas = [
    { icon: "🚀", name: "Founder", color: "#C4922A", ...findPersona("founder") },
    { icon: "⚙️", name: "CTO", color: "#5B8A4A", ...findPersona("cto") },
    { icon: "📣", name: "Marketer", color: "#4A7AB5", ...findPersona("marketer") },
  ].map(p => ({
    ...p,
    avg: p.avgScore,
    rate: p.conversionRate
  }));

  const heatmapData = analytics?.signalHeatmap || {};

  const trends = analytics?.trendIntelligence && analytics.trendIntelligence !== "No trends generated yet." ? [
    { text: analytics.trendIntelligence, time: "Last 30 days, UTC", isNew: true }
  ] : [];

  const topIndustry = analytics?.overview?.mostCommonIndustry || "N/A";
  const topPersona = analytics?.overview?.topPersona || "General";
  const peakDay = analytics?.overview?.peakSubmissionDay || "N/A";
  const qualification = analytics?.qualification;
  const reviewedAlerts = (qualification?.qualified ?? 0) + (qualification?.rejected ?? 0);
  const sampleQualification = analytics?.sampleQualification;

  const sparkBlue = analytics?.sparks?.leads || [];
  const sparkGreen = analytics?.sparks?.generated || [];
  const sparkPurple: number[] = [];
  const sparkRed = analytics?.sparks?.failed || [];

  return (
    <>

        <main className="arth-main">
          {/* Page header */}
          <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
            <h1 className="arth-page-title">{active === "analytics" ? "Research workspace" : "Leads & Reports"}</h1>
            <p className="arth-page-sub">
              {active === "analytics" ? "Review inbound research, report delivery, and lead activity." : "Manage inbound submissions and view generated intelligence reports."}
            </p>
          </div>

          <div className="ui-workspace-controls">
            <div className="ui-workspace-tabs" role="group" aria-label="Workspace views">
              <button type="button" aria-pressed={active === "analytics"} onClick={() => setActive("analytics")}>Overview</button>
              <button type="button" aria-pressed={active === "leads"} onClick={() => setActive("leads")}>Leads &amp; Reports</button>
            </div>
            {lastSynced && <p className="ui-label ui-sync">Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}</p>}
          </div>
          <EvidenceRule />

          {active === "analytics" ? (
            <>
              {/* Metric cards */}
              <div className="arth-grid-4 ui-workspace-metrics">
                <MetricCard label="Total Leads"         value={stats.totalLeads} trend={0} trendLabel={null} spark={sparkBlue}   sparkColor="#4A7AB5" delay={0}   />
                <MetricCard label="Reports Generated"   value={stats.generated}  trend={0} trendLabel={null}  spark={sparkGreen}  sparkColor="#5B8A4A" delay={80}  />
                <MetricCard label="Avg Score"            value={stats.avgScore}   trend={0} trendLabel={null}  spark={sparkPurple} sparkColor="#9B7FD4" delay={160} />
                <MetricCard label="Failed Pipelines"     value={stats.failed}     trend={0} trendLabel={null}  spark={sparkRed}    sparkColor="#C4422A" delay={240} />
              </div>

              {/* Strip */}
              <div className="arth-strip" style={{ marginBottom: 24 }}>
                <StripItem icon="🏭" label="Top Industry"       value={topIndustry} delay={100} />
                <StripItem icon="👤" label="Top Persona"        value={topPersona}  delay={160} />
                <StripItem icon="📅" label="Peak Submission Day" value={peakDay}    delay={220} />
              </div>

              {qualification && (
                <section className="arth-card" style={{ marginBottom: 24 }}>
                  <h2 className="arth-section-title">Inbound alert qualification</h2>
                  <p className="arth-page-sub">Last 30 days · {reviewedAlerts} of {qualification.alerts} alerts reviewed</p>
                  <p>{qualification.qualified} qualified · {qualification.rejected} rejected</p>
                  <p>{reviewedAlerts ? `${Math.round(100 * qualification.qualified / reviewedAlerts)}% of reviewed alerts qualified` : 'No reviewed alerts yet'}</p>
                </section>
              )}

              {sampleQualification && (
                <section className="arth-card" style={{ marginBottom: 24 }}>
                  <h2 className="arth-section-title">Below-threshold chat sample</h2>
                  <p className="arth-page-sub">Last 30 days · {sampleQualification.qualified + sampleQualification.rejected} of {sampleQualification.total} samples reviewed</p>
                  <p>{sampleQualification.qualified} qualified · {sampleQualification.rejected} rejected</p>
                </section>
              )}

              {!!analytics?.qualificationByModel?.length && (
                <section className="arth-card" style={{ marginBottom: 24 }}>
                  <h2 className="arth-section-title">Staff reviews by model version</h2>
                  <p className="arth-page-sub">Last 30 days · Qualified, reviewed, and total counts for each group</p>
                  <div className="overflow-x-auto">
                    <table className="mt-3 w-full text-left text-sm">
                      <thead><tr><th scope="col">Model version</th><th scope="col">Hot-lead alerts</th><th scope="col">Below-threshold samples</th></tr></thead>
                      <tbody>{analytics.qualificationByModel.map(({ model, alerts, samples }) => (
                        <tr key={model == null ? 'legacy' : `model:${model}`}>
                          <th scope="row" className="py-2 pr-4 break-all">{model ?? 'Unknown version'}</th>
                          {[alerts, samples].map((counts, index) => (
                            <td key={index} className="py-2 pr-4">{counts.qualified} qualified · {counts.qualified + counts.rejected} of {counts.total} reviewed</td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Industry + Persona */}
              <div className="arth-grid-2" style={{ marginBottom: 24 }}>
                <div className="arth-section" style={{ animation: "fadeSlideUp 0.5s ease both", animationDelay: "200ms" }}>
                  <div className="arth-section-head">
                    <span className="arth-section-title"><span className="arth-section-icon">📊</span> Industry Breakdown</span>
                  </div>
                  {industries.length ? (
                    industries.map((ind, i: number) => (
                      <IndustryBar key={ind.name} name={ind.name} count={ind.count} max={industries[0]?.count} delay={i * 60} />
                    ))
                  ) : (
                    <EmptyState icon="🏭" title="No industry data yet" subtitle="Submit leads to see breakdown" />
                  )}
                </div>

                <div className="arth-section" style={{ animation: "fadeSlideUp 0.5s ease both", animationDelay: "260ms" }}>
                  <div className="arth-section-head">
                    <span className="arth-section-title"><span className="arth-section-icon">👥</span> Persona Performance</span>
                  </div>
                  <div className="arth-grid-3" style={{ gap: 10 }}>
                    {personas.map((p, i) => (
                      <PersonaCard key={p.name} {...p} delay={i * 60} />
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Trend Intelligence */}
              <div style={{ marginBottom: 24, animation: "fadeSlideUp 0.5s ease both", animationDelay: "300ms" }}>
                <div className="arth-ai-banner">
                  <div className="arth-ai-icon">✦</div>
                  <div style={{ flex: 1 }}>
                    <div className="arth-ai-label">Research activity</div>
                    {trends.length ? (
                      trends.map((t, i) => <TrendItem key={i} {...t} />)
                    ) : (
                      <p className="arth-ai-text">Recorded submission and report activity will appear here.</p>
                    )}
                    <div className="arth-ai-meta">
                      <span>Last 30 days · UTC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div className="arth-section" style={{ animation: "fadeSlideUp 0.5s ease both", animationDelay: "340ms" }}>
                <div className="arth-section-head">
                  <span className="arth-section-title"><span className="arth-section-icon">🗓</span> Submission Heatmap</span>
                </div>
                {Object.keys(heatmapData).length ? (
                  <Heatmap data={heatmapData} />
                ) : (
                  <EmptyState icon="🗓" title="No submission data yet" subtitle="Heatmap builds over time as leads come in" />
                )}
              </div>
            </>
          ) : (
            <><div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {pages} · Search filters this page</span><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button></div><LeadsView leads={leads} setLeads={setLeads} loading={!loaded} /></>
          )}

        </main>
    </>
  );
}
