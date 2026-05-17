"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";

type PipelineStage = {
  id: string;
  stage: string;
  status: string;
  message: string | null;
  createdAt: string;
};

type Lead = {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  painPoints: string;
  status: string;
  createdAt: string;
  hasPdf: boolean;
  stages: PipelineStage[];
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [sortBy, setSortBy] = useState("Newest");

  // Selection for Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Polling control
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchLeads = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      
      if (data.success) {
        setLeads(data.leads);
        // Update selected lead if it's currently open to get new stages
        if (selectedLead) {
          const updated = data.leads.find((l: Lead) => l.id === selectedLead.id);
          if (updated) setSelectedLead(updated);
        }
      } else {
        setError(data.message || "Failed to load reports");
      }
    } catch (err) {
      setError("Network error while fetching reports.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads(true);
    const interval = setInterval(() => fetchLeads(false), 3000);
    return () => clearInterval(interval);
  }, [selectedLead]); // Rebind interval if selectedLead changes so closure has latest id

  const handleRetry = async (id: string) => {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/leads/${id}/retry`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchLeads(false);
      } else {
        alert(data.message || "Failed to retry");
      }
    } catch (err) {
      alert("Network error while retrying.");
    } finally {
      setIsRetrying(false);
    }
  };

  const deleteLead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        if (selectedLead?.id === id) setSelectedLead(null);
      } else {
        alert(data.message || "Failed to delete");
      }
    } catch (err) {
      alert("Network error while deleting");
    }
  };

  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ["ID", "Company", "Industry", "Name", "Email", "Status", "Created At", "Size", "Pain Points"];
    const rows = filteredLeads.map(l => [
      l.id,
      `"${l.companyName.replace(/"/g, '""')}"`,
      `"${l.industry.replace(/"/g, '""')}"`,
      `"${l.fullName.replace(/"/g, '""')}"`,
      l.email,
      l.status,
      l.createdAt,
      l.companySize,
      `"${(l.painPoints || "").replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arth_leads_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Derived Data
  const industries = ["All", ...Array.from(new Set(leads.map(l => l.industry))).filter(Boolean)];
  
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = l.companyName.toLowerCase().includes(searchLower) || l.email.toLowerCase().includes(searchLower);
      
      // Status
      const matchesStatus = statusFilter === "All" ? true : l.status.toLowerCase() === statusFilter.toLowerCase();
      
      // Industry
      const matchesIndustry = industryFilter === "All" ? true : l.industry === industryFilter;
      
      // Date
      let matchesDate = true;
      if (dateFilter !== "All Time") {
        const leadDate = new Date(l.createdAt);
        const now = new Date();
        if (dateFilter === "Today") {
          matchesDate = leadDate.toDateString() === now.toDateString();
        } else if (dateFilter === "This Week") {
          const diff = now.getTime() - leadDate.getTime();
          matchesDate = diff <= 7 * 24 * 60 * 60 * 1000;
        } else if (dateFilter === "This Month") {
          matchesDate = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesIndustry && matchesDate;
    }).sort((a, b) => {
      if (sortBy === "Newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "Oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "Company (A-Z)") return a.companyName.localeCompare(b.companyName);
      return 0;
    });
  }, [leads, search, statusFilter, industryFilter, dateFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const generated = leads.filter(l => l.status === "done").length;
    const failed = leads.filter(l => l.status === "failed").length;
    const processing = leads.filter(l => l.status === "processing" || l.status === "pending").length;
    
    // Calculate average generation time for successful leads
    let totalTimeMs = 0;
    let timeCount = 0;
    leads.filter(l => l.status === "done").forEach(l => {
      const enrichStart = l.stages.find(s => s.stage === "enrich" && s.status === "running");
      const pdfDone = l.stages.find(s => s.stage === "pdf" && s.status === "done");
      if (enrichStart && pdfDone) {
        totalTimeMs += new Date(pdfDone.createdAt).getTime() - new Date(enrichStart.createdAt).getTime();
        timeCount++;
      }
    });
    const avgTime = timeCount > 0 ? `${(totalTimeMs / timeCount / 1000).toFixed(1)}s` : "N/A";

    return { total, generated, failed, processing, avgTime };
  }, [leads]);

  // Activity Feed (flattens all stages from all leads, sorts by time)
  const activities = useMemo(() => {
    return leads.flatMap(l => 
      l.stages.map(s => ({
        ...s,
        companyName: l.companyName,
        leadId: l.id
      }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);
  }, [leads]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--charcoal)" }}>
      {/* Navbar */}
      <nav className="navbar">
        <Link href="/" className="navbar-logo">
          <div className="logo-mark">a</div>arth.ai
        </Link>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/form" className="btn btn-saffron" style={{ textDecoration: "none" }}>Book a Demo</Link>
        </div>
      </nav>

      <main style={{ padding: "100px 40px 80px", maxWidth: 1600, margin: "0 auto" }}>
        
        {/* Header & Stats */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 800, color: "var(--charcoal)", margin: "0 0 8px 0", letterSpacing: "-0.02em" }}>
                Intelligence CRM
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 16, margin: 0 }}>
                {stats.total} total leads · {stats.generated} successful · {stats.failed} failed · {stats.processing} processing
              </p>
            </div>
            <button onClick={handleExportCSV} className="btn btn-outline" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
              Export CSV
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div className="card-flat" style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Total Leads</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--charcoal)", fontFamily: "var(--font-heading)" }}>{stats.total}</div>
            </div>
            <div className="card-flat" style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Reports Generated</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--saffron-dark)", fontFamily: "var(--font-heading)" }}>{stats.generated}</div>
            </div>
            <div className="card-flat" style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Failed Pipelines</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#DC2626", fontFamily: "var(--font-heading)" }}>{stats.failed}</div>
            </div>
            <div className="card-flat" style={{ padding: "20px" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Avg Generation Time</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "var(--sage)", fontFamily: "var(--font-heading)" }}>{stats.avgTime}</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, padding: "16px", background: "white", borderRadius: 12, border: "1px solid var(--border-light)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ flex: "1 1 250px", display: "flex", alignItems: "center", background: "var(--bg)", borderRadius: 8, padding: "0 12px", border: "1px solid var(--border-light)" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--text-muted)", fontSize: 20 }}>search</span>
            <input 
              type="text" 
              placeholder="Search company or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", padding: "10px", width: "100%", outline: "none", fontSize: 14, fontFamily: "var(--font-body)" }}
            />
          </div>
          
          <select className="input-field" style={{ flex: "0 1 150px", padding: "10px", height: "auto" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="done">Successful</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <select className="input-field" style={{ flex: "0 1 180px", padding: "10px", height: "auto" }} value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}>
            {industries.map(ind => <option key={ind} value={ind}>{ind === "All" ? "All Industries" : ind}</option>)}
          </select>

          <select className="input-field" style={{ flex: "0 1 150px", padding: "10px", height: "auto" }} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="All Time">All Time</option>
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
          </select>

          <select className="input-field" style={{ flex: "0 1 150px", padding: "10px", height: "auto" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="Newest">Sort: Newest</option>
            <option value="Oldest">Sort: Oldest</option>
            <option value="Company (A-Z)">Company (A-Z)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Main List */}
          <div style={{ flex: "1 1 auto" }}>
            {loading && leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="card-flat" style={{ textAlign: "center", padding: "80px 20px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--border-light)", marginBottom: 16 }}>search_off</span>
                <h3 style={{ margin: "0 0 8px 0", color: "var(--charcoal)", fontFamily: "var(--font-heading)" }}>No leads found</h3>
                <p style={{ color: "var(--text-muted)", margin: 0 }}>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {filteredLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="card-flat"
                    style={{ 
                      padding: 24,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      border: selectedLead?.id === lead.id ? "1px solid var(--saffron-main)" : "1px solid var(--border-light)"
                    }}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--saffron-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                          {lead.industry}
                        </div>
                        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", fontWeight: 700, color: "var(--charcoal)", margin: 0 }}>
                          {lead.companyName}
                        </h3>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{lead.email}</div>
                      </div>
                      
                      {lead.status === "done" ? (
                        <div style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: "rgba(111,140,115,0.1)", color: "var(--sage)", fontSize: 12, fontWeight: 600 }}>Done</div>
                      ) : lead.status === "failed" ? (
                        <div style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600 }}>Failed</div>
                      ) : (
                        <div style={{ padding: "4px 8px", borderRadius: 4, backgroundColor: "rgba(217,119,87,0.1)", color: "var(--saffron-main)", fontSize: 12, fontWeight: 600, display: "flex", gap: 4, alignItems: "center" }}>
                           <span className="material-symbols-outlined" style={{ fontSize: 12, animation: "spin-cw 1s linear infinite" }}>sync</span>
                          Processing
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div style={{ width: 320, flexShrink: 0, position: "sticky", top: 100 }} className="hidden-mobile">
            <div className="card-flat" style={{ padding: 24, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", margin: "0 0 20px 0", color: "var(--charcoal)" }}>Recent Activity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {activities.length === 0 ? (
                   <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No recent activity.</div>
                ) : activities.map((act) => (
                  <div key={act.id} style={{ display: "flex", gap: 12, position: "relative" }}>
                    <div style={{ width: 2, background: "var(--border-light)", position: "absolute", left: 15, top: 24, bottom: -16, zIndex: 0 }} />
                    <div style={{ 
                      width: 32, height: 32, borderRadius: "50%", background: "white", border: "1px solid var(--border-light)", 
                      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, flexShrink: 0 
                    }}>
                      {act.status === "done" ? <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--sage)" }}>check</span> :
                       act.status === "failed" ? <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#DC2626" }}>close</span> :
                       <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--saffron-main)" }}>hourglass_empty</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--charcoal)", fontWeight: 500 }}>
                        <span style={{ fontWeight: 700 }}>{act.companyName}</span>: {act.stage} {act.status}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Slide-over Modal for Selected Lead */}
      {selectedLead && (
        <>
          <div 
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 200 }}
            onClick={() => setSelectedLead(null)}
          />
          <div style={{ 
            position: "fixed", top: 0, right: 0, bottom: 0, width: "100%", maxWidth: 600, 
            background: "white", zIndex: 201, boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
            overflowY: "auto", display: "flex", flexDirection: "column",
            animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--saffron-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{selectedLead.industry}</div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", margin: 0, color: "var(--charcoal)" }}>{selectedLead.companyName}</h2>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
              
              {/* Controls */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {selectedLead.status === "done" && selectedLead.hasPdf ? (
                  <a href={`/api/leads/${selectedLead.id}/download`} download={`${selectedLead.companyName.replace(/\s+/g, '_')}_Report.pdf`} className="btn btn-saffron" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span> Download Report
                  </a>
                ) : selectedLead.status === "failed" ? (
                  <button onClick={() => handleRetry(selectedLead.id)} disabled={isRetrying} className="btn btn-dark" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span> {isRetrying ? "Retrying..." : "Retry Pipeline"}
                  </button>
                ) : (
                  <button disabled className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, animation: "spin-cw 1s linear infinite" }}>sync</span> Processing...
                  </button>
                )}
                
                <button onClick={(e) => deleteLead(selectedLead.id, e)} className="btn btn-outline" style={{ color: "#DC2626", borderColor: "#FECACA" }}>
                  Delete
                </button>
              </div>

              {/* Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, background: "var(--bg)", padding: 24, borderRadius: 12, border: "1px solid var(--border-light)" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>Contact Name</div>
                  <div style={{ fontSize: 14, color: "var(--charcoal)", fontWeight: 500 }}>{selectedLead.fullName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>Email</div>
                  <div style={{ fontSize: 14, color: "var(--charcoal)", fontWeight: 500 }}>{selectedLead.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>Website</div>
                  <a href={selectedLead.website} target="_blank" style={{ fontSize: 14, color: "var(--saffron-dark)", fontWeight: 500, textDecoration: "none" }}>{selectedLead.website}</a>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>Company Size</div>
                  <div style={{ fontSize: 14, color: "var(--charcoal)", fontWeight: 500 }}>{selectedLead.companySize}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 4 }}>Submitted Challenge</div>
                  <p style={{ fontSize: 14, color: "var(--charcoal)", margin: 0, lineHeight: 1.5 }}>{selectedLead.painPoints}</p>
                </div>
              </div>

              {/* Pipeline Logs */}
              <div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", margin: "0 0 16px 0", color: "var(--charcoal)" }}>Pipeline Execution Log</h3>
                {selectedLead.stages.length === 0 ? (
                  <div style={{ fontSize: 14, color: "var(--text-muted)" }}>No logs generated yet.</div>
                ) : (
                  <div style={{ background: "#1E1E1E", borderRadius: 12, padding: "20px", color: "#A3A3A3", fontFamily: "monospace", fontSize: 13, display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedLead.stages.map(s => {
                      let color = "#A3A3A3";
                      let icon = "⏳";
                      if (s.status === "done") { color = "#4ADE80"; icon = "✅"; }
                      if (s.status === "failed") { color = "#F87171"; icon = "❌"; }
                      
                      const time = new Date(s.createdAt).toLocaleTimeString();
                      
                      return (
                        <div key={s.id} style={{ display: "flex", gap: 12 }}>
                          <span style={{ color: "#737373" }}>[{time}]</span>
                          <span>{icon}</span>
                          <span style={{ color }}>{s.stage.toUpperCase()}</span>
                          <span style={{ color: "white" }}>- {s.status}</span>
                          {s.message && <span style={{ color: "#FBBF24" }}>// {s.message}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
      
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
