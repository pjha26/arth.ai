"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";

// ── Shared UI Elements (Sparkline, MetricCard, etc.) ─────────

function Sparkline({ data = [], color = "#C4922A", height = 36 }: any) {
  if (!data.length) return null;
  const w = 120, h = height;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v: number, i: number) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
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

function AnimatedNumber({ value = 0, duration = 1200 }: any) {
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

function MetricCard({ label, value, trend, trendLabel, spark, sparkColor, delay = 0 }: any) {
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
          {isFlat ? "→" : isUp ? "↑" : "↓"} {Math.abs(trendLabel)}%
        </span>
      </div>
      <div className="arth-metric-value"><AnimatedNumber value={value} /></div>
      <div style={{ marginTop: 8 }}><Sparkline data={spark} color={sparkColor} /></div>
    </div>
  );
}

function StripItem({ icon, label, value, delay = 0 }: any) {
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

function IndustryBar({ name, count, max, delay = 0 }: any) {
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

function PersonaCard({ icon, name, count, avg, rate, color, delay = 0 }: any) {
  return (
    <div className="arth-persona-card" style={{ borderTop: `3px solid ${color}`, animationDelay: `${delay}ms`, animation: "fadeSlideUp 0.5s ease both" }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--c-heading)", marginBottom: 12 }}>{name}</div>
      <div className="arth-persona-row"><span className="arth-label">Leads</span><span style={{ fontWeight: 600, color: "var(--c-text)" }}>{count}</span></div>
      <div className="arth-persona-row"><span className="arth-label">Avg score</span><span style={{ fontWeight: 600, color: "var(--c-text)" }}>{avg ?? "—"}</span></div>
      <div className="arth-persona-row"><span className="arth-label">Converted</span><span style={{ fontWeight: 600, color: "var(--c-text)" }}>{rate ?? "—"}</span></div>
    </div>
  );
}

function Heatmap({ data = {} }: any) {
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

function TrendItem({ text, time, isNew = false }: any) {
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

function Sidebar({ active, setActive, lastSyncedTime }: any) {
  const nav = [
    { id: "analytics", icon: "📊", label: "Analytics" },
    { id: "leads", icon: "👥", label: "Leads & Reports" },
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
          <button key={n.id} className={`arth-nav-item ${active === n.id ? "arth-nav-active" : ""}`} onClick={() => setActive(n.id)}>
            <span>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div style={{ marginTop: "auto" }}>
        <Link href="/" className="arth-nav-item" style={{ width: "100%", color: "var(--c-muted)" }}>
          <span>🏠</span><span>Back to Home</span>
        </Link>
        <div className="arth-sync-badge"><span className="arth-pulse-dot" /><span>Last synced: {lastSyncedTime}</span></div>
      </div>
    </aside>
  );
}

function TooltipWrapper({ content, children }: any) {
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

function EmptyState({ icon, title, subtitle }: any) {
  return (
    <div className="arth-empty">
      <div className="arth-empty-icon">{icon}</div>
      <div className="arth-empty-title">{title}</div>
      <div className="arth-empty-sub">{subtitle}</div>
    </div>
  );
}

// ── LEADS & REPORTS VIEW ───────────────────────────────────────

function LeadsView({ leads, setLeads, loading }: any) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Filter and sort leads (highest intent score first)
  const filtered = useMemo(() => {
    let result = leads.filter((l: any) => {
      const matchSearch = l.companyName.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });

    // Sort by score (DESC) and then by createdAt (DESC)
    result.sort((a: any, b: any) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [leads, search, statusFilter]);

  const selectedLead = useMemo(() => leads.find((l: any) => l.id === selectedLeadId), [leads, selectedLeadId]);

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRows(next);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimistic UI Delete
    const previousLeads = [...leads];
    setLeads(leads.filter((l: any) => l.id !== id));
    if (selectedLeadId === id) setSelectedLeadId(null);
    
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
    } catch {
      // Revert if failed
      setLeads(previousLeads);
    }
  };

  const StatusPill = ({ status }: { status: string }) => {
    if (status === "done") return <div className="arth-status-pill arth-status-done"><span className="dot solid"></span>Done</div>;
    if (status === "failed") return <div className="arth-status-pill arth-status-failed"><span className="dot solid"></span>Failed</div>;
    return <div className="arth-status-pill arth-status-processing"><span className="dot pulse"></span>Processing</div>;
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
              className="arth-toolbar-search"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <select className="arth-toolbar-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">Status: All</option>
            <option value="done">Done</option>
            <option value="pending">Processing</option>
            <option value="failed">Failed</option>
          </select>

          <div style={{ flex: 1 }} />

          <div className="arth-toolbar-toggle">
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><span className="material-symbols-outlined">view_list</span></button>
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><span className="material-symbols-outlined">grid_view</span></button>
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
            <img src="https://raw.githubusercontent.com/KaterinaLupacheva/undraw-illustrations/master/svg/undraw_empty_re_opql.svg" alt="Empty" className="arth-empty-svg" style={{ filter: 'sepia(1) hue-rotate(10deg) saturate(2)' }} />
            <h2 className="arth-empty-headline">No leads yet</h2>
            <p className="arth-empty-sub">Submit your first company URL to generate an intelligence report.</p>
            <Link href="/" className="arth-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '10px 20px', borderRadius: 99 }}>
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
            {filtered.map((lead: any) => (
              <motion.div 
                key={lead.id} 
                variants={itemAnim}
                className={`arth-lead-row ${selectedLeadId === lead.id ? 'active' : ''} ${viewMode === 'grid' ? 'is-card' : ''} ${lead.score >= 30 ? 'hot-signal' : ''}`}
                onClick={() => setSelectedLeadId(lead.id)}
              >
                <input type="checkbox" className="arth-checkbox" checked={selectedRows.has(lead.id)} onChange={(e: any) => toggleRow(lead.id, e)} />
                
                <div className="arth-lead-avatar">
                  <img src={`https://www.google.com/s2/favicons?domain=${lead.website}&sz=64`} alt="" />
                </div>

                <div className="arth-lead-main-info">
                  <div className="arth-lead-name">{lead.companyName}</div>
                  <div className="arth-lead-meta">{lead.industry} • {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</div>
                </div>

                <div className="arth-lead-tags">
                  <div className="arth-tag-persona">{lead.personaType || 'General'}</div>
                  <StatusPill status={lead.status} />
                  {lead.score >= 30 && (
                    <div className="arth-tag-persona" style={{ background: '#FFF1EC', color: '#E85D04', border: '1px solid #FFD3C4' }}>🔥 HOT</div>
                  )}
                </div>

                <div className="arth-lead-score" title="Intent Score">
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
                      <a href={`/api/leads/${lead.id}/download`} download onClick={e => e.stopPropagation()} className="arth-icon-btn"><span className="material-symbols-outlined">download</span></a>
                    </TooltipWrapper>
                  )}
                  <TooltipWrapper content="Delete">
                    <button onClick={(e) => handleDelete(lead.id, e)} className="arth-icon-btn arth-danger-hover"><span className="material-symbols-outlined">delete</span></button>
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
                <button className="arth-close-btn" onClick={() => setSelectedLeadId(null)}><span className="material-symbols-outlined">close</span></button>
              </div>
              
              <div className="arth-panel-body">
                {/* Status Block */}
                <div className="arth-panel-block">
                  <div className="arth-label">Pipeline Status</div>
                  <div style={{ marginTop: 8 }}>
                    <StatusPill status={selectedLead.status} />
                  </div>
                  {selectedLead.status === 'pending' && (
                    <div className="arth-progress-track">
                      <motion.div className="arth-progress-fill" initial={{ width: "10%" }} animate={{ width: "75%" }} transition={{ duration: 10, ease: "linear" }} />
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
                  <p className="arth-stated-challenge">"{selectedLead.painPoints}"</p>
                </div>

                {selectedLead.status === 'done' && (
                  <>
                    <div className="arth-panel-block">
                      <div className="arth-label">Engagement & Intent</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                        <div style={{ fontSize: 32, fontWeight: 600, color: selectedLead.score >= 30 ? '#E85D04' : 'var(--c-accent)', lineHeight: 1 }}>
                           {selectedLead.score || 0}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-heading)' }}>
                            {selectedLead.score >= 30 ? 'High Intent Signal 🔥' : 'Standard Engagement'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>
                            Score increases automatically as lead interrogates the AI report.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="arth-panel-block">
                      <div className="arth-label">AI Insights</div>
                      <ul className="arth-insight-list">
                        {selectedLead.insights?.aiOpportunities?.length ? (
                          selectedLead.insights.aiOpportunities.map((opp: any, idx: number) => (
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
                            <li>Calculated intent score: <strong>{selectedLead.score}</strong>.</li>
                            <li>High likelihood of conversion based on pain points.</li>
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

                      {(selectedLead.insights?.marketPosition?.reasoning || (selectedLead.insights?.recommendedNextSteps && selectedLead.insights.recommendedNextSteps.some((s: any) => s.reasoning))) && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <details className="arth-reasoning-collapsible" style={{ background: '#F8F9FA', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px' }}>
                            <summary style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>psychology</span>
                              View AI Reasoning
                            </summary>
                            <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.6 }}>
                              {selectedLead.insights?.marketPosition?.reasoning && (
                                <div style={{ marginBottom: '12px' }}>
                                  <strong style={{ color: '#334155' }}>Market Position Logic:</strong>
                                  <p style={{ marginTop: '4px' }}>{selectedLead.insights.marketPosition.reasoning}</p>
                                </div>
                              )}
                              {selectedLead.insights?.recommendedNextSteps && selectedLead.insights.recommendedNextSteps.some((s: any) => s.reasoning) && (
                                <div>
                                  <strong style={{ color: '#334155' }}>Strategic Recommendations Logic:</strong>
                                  <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                                    {selectedLead.insights.recommendedNextSteps.filter((s: any) => s.reasoning).map((step: any, idx: number) => (
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
                      <button className="arth-btn-secondary" style={{ width: '100%', padding: 12, borderRadius: 8, marginTop: 8 }}>Re-Audit Company</button>
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
  const [active, setActive] = useState("analytics");
  const [loaded, setLoaded] = useState(false);

  const [leads, setLeads] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [leadsRes, analyticsRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/analytics")
      ]);
      const leadsData = await leadsRes.json();
      const analyticsData = await analyticsRes.json();
      
      if (leadsData.success && analyticsData.success) {
        setLeads(leadsData.leads);
        setAnalytics(analyticsData.data);
        setLastSynced(new Date());
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const t = setTimeout(() => setLoaded(true), 100);
    
    // Live Status Polling: poll every 5s if ANY lead is processing, else poll every 15s.
    // Done dynamically in a ref to always use latest state.
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const hasPending = leads.some(l => l.status === "pending");
    const intervalTime = hasPending ? 5000 : 15000;
    const interval = setInterval(fetchDashboardData, intervalTime);
    return () => clearInterval(interval);
  }, [leads]);

  // Map Data
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const generated = leads.filter(l => l.status === "done").length;
    const failed = leads.filter(l => l.status === "failed").length;
    const avgScore = analytics?.overview?.avgReportScore || 0;
    return { totalLeads, generated, avgScore, failed };
  }, [leads, analytics]);

  const industries = analytics?.industryBreakdown || [];

  const rawPersonas = analytics?.personaPerformance || [];
  const findPersona = (type: string) => rawPersonas.find((p: any) => p.persona === type) || { count: 0, avgScore: null, conversionRate: null };
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
    { text: analytics.trendIntelligence, time: "Generated today", isNew: true }
  ] : [];

  const topIndustry = analytics?.overview?.mostCommonIndustry || "N/A";
  const topPersona = analytics?.overview?.topPersona || "General";
  const peakDay = analytics?.overview?.peakSubmissionDay || "N/A";

  const sparkBlue   = [2, 4, 3, 5, 4, 7, 5, 6, 8, 7, 9, 8];
  const sparkGreen  = [1, 3, 2, 4, 5, 4, 6, 5, 7, 8, 7, 9];
  const sparkPurple = [5, 4, 6, 5, 7, 6, 5, 7, 6, 8, 7, 9];
  const sparkRed    = [3, 2, 1, 3, 2, 1, 2, 1, 2, 1, 0, 1];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --c-bg:          #F5F0E6;
          --c-surface:     #FDFAF4;
          --c-sidebar:     #FEFCF7;
          --c-heading:     #1C0F05;
          --c-text:        #3D2B1A;
          --c-muted:       #9C845F;
          --c-accent:      #C4922A;
          --c-accent-light:#FBF0D9;
          --c-border:      #EAE2D2;
          --c-border-strong:#D4C8B0;
          --c-success:     #3E7A2E;
          --c-success-bg:  #EBF5E8;
          --c-danger:      #B83A2A;
          --c-danger-bg:   #FBEEE9;
          --c-shadow:      rgba(60,30,10,0.07);
          --font-display:  'Fraunces', Georgia, serif;
          --font-body:     'DM Sans', system-ui, sans-serif;
        }

        body { background: var(--c-bg); font-family: var(--font-body); }
        .arth-layout { display: flex; min-height: 100vh; background: var(--c-bg); overflow: hidden; }

        /* ── Sidebar ── */
        .arth-sidebar { width: 220px; background: var(--c-sidebar); border-right: 1px solid var(--c-border); display: flex; flex-direction: column; padding: 20px 12px; z-index: 50; }
        .arth-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; border-bottom: 1px solid var(--c-border); margin-bottom: 16px; }
        .arth-logo-mark { width: 34px; height: 34px; background: var(--c-accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 600; font-size: 17px; color: #fff; flex-shrink: 0; box-shadow: 0 2px 8px rgba(196,146,42,0.35); }
        .arth-logo-name { font-family: var(--font-display); font-weight: 600; font-size: 15px; color: var(--c-heading); }
        .arth-logo-sub  { font-size: 10px; color: var(--c-muted); letter-spacing: 0.06em; text-transform: uppercase; }
        .arth-nav-section-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--c-muted); padding: 0 10px; margin-bottom: 6px; }
        .arth-nav { display: flex; flex-direction: column; gap: 2px; }
        .arth-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; color: var(--c-text); background: transparent; border: none; cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s; font-family: var(--font-body); text-decoration: none; }
        .arth-nav-item:hover { background: var(--c-accent-light); color: var(--c-accent); }
        .arth-nav-active { background: var(--c-accent-light) !important; color: var(--c-accent) !important; font-weight: 500; border-left: 3px solid var(--c-accent); }
        .arth-sync-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--c-muted); padding: 10px 12px 0; }
        .arth-pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c-success); box-shadow: 0 0 0 0 rgba(62,122,46,0.4); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(62,122,46,0.4)} 50%{box-shadow:0 0 0 5px rgba(62,122,46,0)} }

        /* ── Main ── */
        .arth-main { flex: 1; padding: 32px 36px; overflow-y: auto; position: relative; }
        .arth-page-title { font-family: var(--font-display); font-size: 28px; font-weight: 600; color: var(--c-heading); letter-spacing: -0.02em; }
        .arth-page-sub   { font-size: 14px; color: var(--c-muted); margin-top: 4px; }
        .arth-divider    { height: 1px; background: var(--c-border); margin: 24px 0; }

        /* ── Shared Elements ── */
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .arth-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px; padding: 18px 20px; transition: box-shadow 0.2s, transform 0.2s; cursor: default; }
        .arth-card:hover { box-shadow: 0 6px 24px var(--c-shadow); transform: translateY(-2px); }
        .arth-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--c-muted); font-weight: 600; }
        .arth-metric-value { font-family: var(--font-display); font-size: 34px; font-weight: 600; color: var(--c-heading); margin-top: 6px; line-height: 1; }
        .arth-badge { font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 20px; }
        
        /* ── Grid/Sections ── */
        .arth-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        .arth-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .arth-grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
        .arth-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .arth-strip-item { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; transition: box-shadow 0.2s; }
        .arth-strip-item:hover { box-shadow: 0 4px 14px var(--c-shadow); }
        .arth-strip-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--c-accent-light); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .arth-strip-value { font-weight: 600; font-size: 15px; color: var(--c-heading); text-transform: capitalize; }
        .arth-section { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px; padding: 22px 24px; }
        .arth-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .arth-section-title { font-family: var(--font-display); font-size: 16px; font-weight: 500; color: var(--c-heading); display: flex; align-items: center; gap: 8px; }
        .arth-section-icon { font-size: 16px; }
        .arth-bar-track { height: 6px; background: var(--c-border); border-radius: 99px; overflow: hidden; }
        .arth-bar-fill { height: 100%; background: var(--c-accent); border-radius: 99px; width: 0; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
        .arth-persona-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 14px; padding: 20px; transition: box-shadow 0.2s, transform 0.2s; }
        .arth-persona-card:hover { box-shadow: 0 6px 20px var(--c-shadow); transform: translateY(-2px); }
        .arth-persona-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--c-border); }
        .arth-persona-row:last-child { border-bottom: none; }
        .arth-trend-item { padding: 12px 0; border-bottom: 1px solid var(--c-border); }
        .arth-trend-item:last-child { border-bottom: none; }
        .arth-timeline-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
        .arth-new-badge { font-size: 10px; font-weight: 600; color: var(--c-accent); background: var(--c-accent-light); padding: 2px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }

        .arth-ai-banner { background: linear-gradient(135deg, #FBF0D9 0%, #FDF7EC 100%); border: 1px solid var(--c-border-strong); border-radius: 14px; padding: 18px 22px; display: flex; align-items: flex-start; gap: 14px; position: relative; overflow: hidden; }
        .arth-ai-banner::before { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='1' fill='%23C4922A' opacity='0.12'/%3E%3C/svg%3E"); pointer-events: none; }
        .arth-ai-icon { width: 40px; height: 40px; background: var(--c-accent); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(196,146,42,0.3); }
        .arth-ai-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-accent); font-weight: 600; margin-bottom: 4px; }
        .arth-ai-text  { font-size: 14px; color: var(--c-text); line-height: 1.55; }
        .arth-ai-meta  { font-size: 11px; color: var(--c-muted); margin-top: 6px; display: flex; align-items: center; gap: 5px; }

        .arth-empty { padding: 40px 20px; text-align: center; }
        .arth-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }
        .arth-empty-title { font-family: var(--font-display); font-size: 15px; color: var(--c-heading); margin-bottom: 6px; }
        .arth-empty-sub   { font-size: 13px; color: var(--c-muted); }

        /* ── Leads UI (Split Zone) ── */
        .arth-leads-layout { display: flex; width: 100%; height: 100%; border: 1px solid var(--c-border); border-radius: 14px; background: var(--c-surface); overflow: hidden; }
        .arth-leads-main { display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--c-border); }
        .arth-leads-panel { background: var(--c-sidebar); border-left: 1px solid var(--c-border); overflow: hidden; display: flex; flex-direction: column; }
        
        .arth-toolbar { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--c-border); align-items: center; background: var(--c-surface); }
        .arth-toolbar-search { padding: 8px 16px 8px 36px; border-radius: 99px; border: 1px solid var(--c-border); background: var(--c-sidebar); font-family: var(--font-body); font-size: 13px; width: 220px; outline: none; transition: border-color 0.2s; }
        .arth-toolbar-search:focus { border-color: var(--c-accent); }
        .arth-toolbar-select { padding: 8px 32px 8px 12px; border-radius: 8px; border: 1px solid var(--c-border); background: var(--c-sidebar); font-family: var(--font-body); font-size: 13px; outline: none; appearance: none; cursor: pointer; color: var(--c-text); background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239C845F%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); background-repeat: no-repeat; background-position: right 12px top 50%; background-size: 10px auto; }
        .arth-toolbar-toggle { display: flex; background: var(--c-border); padding: 3px; border-radius: 8px; }
        .arth-toolbar-toggle button { background: transparent; border: none; padding: 4px 8px; border-radius: 5px; cursor: pointer; color: var(--c-muted); display: flex; align-items: center; justify-content: center; }
        .arth-toolbar-toggle button.active { background: var(--c-surface); color: var(--c-accent); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .arth-toolbar-toggle span { font-size: 18px; }

        /* Leads List View */
        .arth-leads-wrapper { flex: 1; overflow-y: auto; padding: 0; }
        .arth-lead-row { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--c-border); cursor: pointer; transition: background 0.15s; background: var(--c-surface); position: relative; }
        .arth-lead-row:hover { background: var(--c-sidebar); }
        .arth-lead-row.active { background: var(--c-accent-light); }
        .hot-signal { border-left: 3px solid #E85D04; background: linear-gradient(to right, rgba(232, 93, 4, 0.05) 0%, var(--c-surface) 100%); }
        .hot-signal:hover { background: linear-gradient(to right, rgba(232, 93, 4, 0.08) 0%, var(--c-sidebar) 100%); }
        .hot-signal .circle { stroke: #E85D04; }
        .hot-signal .score-text { color: #E85D04; }
        .arth-checkbox { width: 16px; height: 16px; border-radius: 4px; accent-color: var(--c-accent); cursor: pointer; }
        .arth-lead-avatar { width: 36px; height: 36px; border-radius: 8px; background: var(--c-border); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
        .arth-lead-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .arth-lead-main-info { flex: 1; min-width: 0; }
        .arth-lead-name { font-weight: 600; font-size: 14.5px; color: var(--c-heading); whiteSpace: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .arth-lead-meta { font-size: 12px; color: var(--c-muted); margin-top: 2px; }
        
        .arth-lead-tags { display: flex; gap: 8px; align-items: center; width: 220px; }
        .arth-tag-persona { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; background: var(--c-border); color: var(--c-text); padding: 4px 8px; border-radius: 6px; font-weight: 600; }
        
        .arth-status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.05em; }
        .arth-status-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
        .arth-status-done { background: var(--c-success-bg); color: var(--c-success); }
        .arth-status-done .dot { background: var(--c-success); }
        .arth-status-failed { background: var(--c-danger-bg); color: var(--c-danger); }
        .arth-status-failed .dot { background: var(--c-danger); }
        .arth-status-processing { background: #FEF3C7; color: #B45309; }
        .arth-status-processing .dot { background: #F59E0B; animation: pulse 1.5s infinite; }
        
        .arth-lead-score { display: flex; align-items: center; gap: 8px; width: 60px; justify-content: flex-end; }
        .circular-chart { display: block; margin: 0 auto; max-width: 80%; max-height: 250px; width: 28px; height: 28px; }
        .circle-bg { fill: none; stroke: var(--c-border); stroke-width: 3.8; }
        .circle { fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--c-accent); animation: progress 1s ease-out forwards; }
        @keyframes progress { 0% { stroke-dasharray: 0 100; } }
        .score-text { font-size: 12px; font-weight: 600; color: var(--c-heading); }

        .arth-lead-actions { position: absolute; right: 16px; display: flex; gap: 6px; opacity: 0; transform: translateX(10px); transition: all 0.2s; background: linear-gradient(90deg, transparent, var(--c-sidebar) 20%); padding-left: 20px; }
        .arth-lead-row:hover .arth-lead-actions { opacity: 1; transform: translateX(0); }
        .arth-icon-btn { width: 32px; height: 32px; border-radius: 8px; background: var(--c-surface); border: 1px solid var(--c-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--c-text); transition: all 0.15s; text-decoration: none; }
        .arth-icon-btn:hover { background: var(--c-border); color: var(--c-heading); }
        .arth-danger-hover:hover { background: var(--c-danger-bg); color: var(--c-danger); border-color: var(--c-danger-bg); }
        .arth-icon-btn span { font-size: 18px; }

        /* Leads Grid View */
        .arth-leads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 16px; flex: 1; overflow-y: auto; background: var(--c-bg); }
        .arth-lead-row.is-card { flex-direction: column; align-items: flex-start; border: 1px solid var(--c-border); border-radius: 14px; gap: 12px; }
        .arth-lead-row.is-card .arth-lead-tags { width: 100%; justify-content: space-between; margin-top: 4px; }
        .arth-lead-row.is-card .arth-lead-score { position: absolute; top: 16px; right: 16px; }
        .arth-lead-row.is-card .arth-checkbox { position: absolute; top: 16px; right: 80px; }
        .arth-lead-row.is-card .arth-lead-actions { bottom: 16px; right: 16px; top: auto; background: transparent; padding: 0; }

        /* Skeletons */
        .arth-skeleton-row { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border-bottom: 1px solid var(--c-border); }
        .arth-skeleton-avatar { width: 36px; height: 36px; border-radius: 8px; background: var(--c-border); }
        .arth-skeleton-text { height: 12px; border-radius: 4px; background: var(--c-border); margin-bottom: 6px; }

        /* Empty State */
        .arth-leads-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; text-align: center; }
        .arth-empty-svg { width: 250px; margin-bottom: 24px; opacity: 0.9; }
        .arth-empty-headline { font-family: var(--font-display); font-size: 24px; color: var(--c-heading); margin-bottom: 8px; }

        /* Slide-in Detail Panel */
        .arth-panel-inner { width: 100%; height: 100%; display: flex; flex-direction: column; min-width: 350px; }
        .arth-panel-header { padding: 20px; border-bottom: 1px solid var(--c-border); display: flex; justify-content: space-between; align-items: flex-start; }
        .arth-panel-favicon { width: 44px; height: 44px; border-radius: 10px; background: #fff; border: 1px solid var(--c-border); padding: 4px; object-fit: contain; }
        .arth-close-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--c-border); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--c-muted); transition: background 0.2s; }
        .arth-close-btn:hover { background: var(--c-border-strong); color: var(--c-heading); }
        .arth-panel-body { padding: 20px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }
        .arth-panel-block { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 16px; }
        .arth-progress-track { height: 6px; background: var(--c-border); border-radius: 99px; overflow: hidden; margin-top: 12px; }
        .arth-progress-fill { height: 100%; background: #F59E0B; border-radius: 99px; }
        .arth-contact-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 12px; font-size: 13px; }
        .arth-contact-grid .k { color: var(--c-muted); }
        .arth-contact-grid .v { color: var(--c-heading); font-weight: 500; }
        .arth-stated-challenge { background: var(--c-bg); border-left: 3px solid var(--c-accent); padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: var(--c-text); font-style: italic; margin-top: 16px; }
        .arth-insight-list { margin-top: 12px; padding-left: 20px; font-size: 13.5px; color: var(--c-text); line-height: 1.6; }
        .arth-insight-list li { margin-bottom: 8px; }
        .arth-btn-primary { background: var(--c-accent); color: #fff; font-weight: 600; border: none; cursor: pointer; transition: opacity 0.2s; }
        .arth-btn-primary:hover { opacity: 0.9; }
        .arth-btn-secondary { background: var(--c-surface); color: var(--c-heading); font-weight: 600; border: 1px solid var(--c-border-strong); cursor: pointer; transition: background 0.2s; }
        .arth-btn-secondary:hover { background: var(--c-border); }

        /* Floating Bulk Actions Bar */
        .arth-bulk-bar { position: fixed; bottom: 32px; left: 50%; background: var(--c-heading); color: #fff; padding: 12px 24px; border-radius: 99px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); z-index: 100; border: 1px solid rgba(255,255,255,0.1); }
        .arth-bulk-count { font-weight: 600; font-size: 14px; }
        .arth-bulk-btn { background: transparent; border: none; color: #fff; font-size: 13.5px; font-weight: 500; display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        .arth-bulk-btn:hover { background: rgba(255,255,255,0.1); }
        .arth-bulk-btn span { font-size: 18px; }
        .arth-bulk-btn.arth-btn-error:hover { background: var(--c-danger); color: #fff; }

        /* Tooltip */
        .arth-tooltip-content { border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 600; color: #fff; background-color: var(--c-heading); box-shadow: 0 4px 6px rgba(0,0,0,0.1); animation: fadeIn 0.2s; font-family: var(--font-body); letter-spacing: 0.02em; }
        .arth-tooltip-arrow { fill: var(--c-heading); }
        
      `}</style>

      <div className="arth-layout">
        <Sidebar active={active} setActive={setActive} lastSyncedTime={lastSynced ? formatDistanceToNow(lastSynced, { addSuffix: true }) : 'just now'} />

        <main className="arth-main">
          {/* Page header */}
          <div style={{ animation: "fadeSlideUp 0.4s ease both" }}>
            <h1 className="arth-page-title">{active === "analytics" ? "Intelligence CRM" : "Leads & Reports"}</h1>
            <p className="arth-page-sub">
              {active === "analytics" ? "Real-time prospect analytics and pipeline overview." : "Manage inbound submissions and view generated intelligence reports."}
            </p>
          </div>

          <div className="arth-divider" />

          {active === "analytics" ? (
            <>
              {/* Metric cards */}
              <div className="arth-grid-4" style={{ marginBottom: 20 }}>
                <MetricCard label="Total Leads"         value={stats.totalLeads} trend={12}  trendLabel={12} spark={sparkBlue}   sparkColor="#4A7AB5" delay={0}   />
                <MetricCard label="Reports Generated"   value={stats.generated}  trend={8}   trendLabel={8}  spark={sparkGreen}  sparkColor="#5B8A4A" delay={80}  />
                <MetricCard label="Avg Score"            value={stats.avgScore}   trend={0}   trendLabel={0}  spark={sparkPurple} sparkColor="#9B7FD4" delay={160} />
                <MetricCard label="Failed Pipelines"     value={stats.failed}     trend={-2}  trendLabel={2}  spark={sparkRed}    sparkColor="#C4422A" delay={240} />
              </div>

              {/* Strip */}
              <div className="arth-strip" style={{ marginBottom: 24 }}>
                <StripItem icon="🏭" label="Top Industry"       value={topIndustry} delay={100} />
                <StripItem icon="👤" label="Top Persona"        value={topPersona}  delay={160} />
                <StripItem icon="📅" label="Peak Submission Day" value={peakDay}    delay={220} />
              </div>

              {/* Industry + Persona */}
              <div className="arth-grid-2" style={{ marginBottom: 24 }}>
                <div className="arth-section" style={{ animation: "fadeSlideUp 0.5s ease both", animationDelay: "200ms" }}>
                  <div className="arth-section-head">
                    <span className="arth-section-title"><span className="arth-section-icon">📊</span> Industry Breakdown</span>
                  </div>
                  {industries.length ? (
                    industries.map((ind: any, i: number) => (
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
                    <div className="arth-ai-label">AI Trend Intelligence</div>
                    {trends.length ? (
                      trends.map((t, i) => <TrendItem key={i} {...t} />)
                    ) : (
                      <p className="arth-ai-text">Trends will appear here once your pipeline processes enough leads. Submit a few leads to activate AI-powered pattern detection.</p>
                    )}
                    <div className="arth-ai-meta">
                      <span>🕐</span>
                      <span>Updated daily · Powered by Gemini</span>
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
            <LeadsView leads={leads} setLeads={setLeads} loading={!loaded} />
          )}

        </main>
      </div>
    </>
  );
}
