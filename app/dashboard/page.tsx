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
    <div className="flex h-screen overflow-hidden antialiased font-body-md text-body-md bg-background text-on-background">
      {/* SideNavBar */}
      <nav className="hidden md:flex flex-col h-screen sticky top-0 w-64 left-0 bg-surface border-r border-outline-variant z-40 transition-all duration-200 ease-in-out shrink-0">
        <div className="p-gutter flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">A</div>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-primary m-0 p-0 leading-none">ArthAI</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">Quiet Intelligence</p>
          </div>
        </div>
        <div className="flex-1 py-stack-md px-3 flex flex-col gap-1 overflow-y-auto">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-primary font-bold bg-surface-container-low transition-colors duration-200" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            Dashboard
          </a>
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200 mt-auto">
            <span className="material-symbols-outlined">logout</span>
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TopNavBar (Mobile Only) */}
        <header className="md:hidden flex justify-between items-center w-full px-margin-mobile h-16 sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant transition-opacity duration-150">
          <h1 className="font-headline-sm text-headline-sm text-on-surface">ArthAI</h1>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">home</span>
            </Link>
          </div>
        </header>

        {/* Main Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto bg-surface-bright">
          <div className="max-w-[1280px] mx-auto px-5 md:px-16 py-8 md:py-16 flex flex-col gap-12 md:gap-20">
            {/* Header Section */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Intelligence CRM</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {stats.total} total leads · {stats.generated} successful · {stats.failed} failed · {stats.processing} processing
                </p>
              </div>
              <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline text-on-surface hover:bg-surface-container-lowest transition-colors font-body-md cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export CSV
              </button>
            </section>

            {/* KPI Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface-container-low/40 border border-outline-variant/60 rounded-xl p-6 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
                <h3 className="font-headline-sm text-[18px] text-on-surface-variant mb-2 font-headline-md">TOTAL LEADS</h3>
                <p className="font-display-lg-mobile text-headline-md text-on-surface">{stats.total}</p>
              </div>
              <div className="bg-surface-container-low/40 border border-outline-variant/60 rounded-xl p-6 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
                <h3 className="font-headline-sm text-[18px] text-on-surface-variant mb-2 font-headline-md">REPORTS GENERATED</h3>
                <p className="font-display-lg-mobile text-headline-md text-primary">{stats.generated}</p>
              </div>
              <div className="bg-surface-container-low/40 border border-outline-variant/60 rounded-xl p-6 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
                <h3 className="font-headline-sm text-[18px] text-on-surface-variant mb-2 font-headline-md">FAILED PIPELINES</h3>
                <p className="font-display-lg-mobile text-headline-md text-error">{stats.failed}</p>
              </div>
              <div className="bg-surface-container-low/40 border border-outline-variant/60 rounded-xl p-6 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
                <h3 className="font-headline-sm text-[18px] text-on-surface-variant mb-2 font-headline-md">AVG GENERATION TIME</h3>
                <p className="font-display-lg-mobile text-headline-md text-secondary">{stats.avgTime}</p>
              </div>
            </section>

            {/* Complex Layout: Main List + Sidebar Activity */}
            <section className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Leads List */}
              <div className="flex-1 flex flex-col gap-4">
                {/* Toolbar */}
                <div className="bg-surface-container-low/30 border border-outline-variant rounded-xl p-3 flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                    <input 
                      className="w-full bg-surface border-none rounded-lg pl-10 pr-4 py-2 font-body-md text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary focus:outline-none transition-shadow" 
                      placeholder="Search company or email..." 
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                    <select className="px-4 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-body-md hover:bg-surface-container-low transition-colors outline-none cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="done">Successful</option>
                      <option value="processing">Processing</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                    
                    <select className="px-4 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-body-md hover:bg-surface-container-low transition-colors outline-none cursor-pointer" value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}>
                      {industries.map(ind => <option key={ind} value={ind}>{ind === "All" ? "All Industries" : ind}</option>)}
                    </select>

                    <select className="px-4 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-body-md hover:bg-surface-container-low transition-colors outline-none cursor-pointer" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                      <option value="All Time">All Time</option>
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                    </select>

                    <select className="px-4 py-2 rounded-lg bg-surface border border-outline-variant text-on-surface font-body-md hover:bg-surface-container-low transition-colors outline-none cursor-pointer md:ml-auto" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                      <option value="Newest">Sort: Newest</option>
                      <option value="Oldest">Sort: Oldest</option>
                      <option value="Company (A-Z)">Company (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Grid List */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {loading && leads.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-on-surface-variant font-body-md">Loading leads...</div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="col-span-full bg-surface border border-outline-variant/60 rounded-xl p-16 flex flex-col items-center justify-center">
                       <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">search_off</span>
                       <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 font-headline-md">No leads found</h3>
                       <p className="font-body-md text-on-surface-variant">Try adjusting your filters or search query.</p>
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <div 
                        key={lead.id} 
                        className={`bg-surface border ${selectedLead?.id === lead.id ? 'border-primary ring-1 ring-primary' : 'border-outline-variant/60'} rounded-xl p-6 hover:shadow-sm hover:border-outline transition-all duration-300 group cursor-pointer flex flex-col h-full`}
                        onClick={() => setSelectedLead(lead)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
                            {lead.industry}
                            {lead.status === 'processing' && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>}
                          </div>
                          {lead.status === "done" ? (
                            <span className="px-2.5 py-0.5 bg-secondary-container text-on-secondary-container text-[11px] rounded-full font-medium">Done</span>
                          ) : lead.status === "failed" ? (
                             <span className="px-2.5 py-0.5 bg-error-container text-on-error-container text-[11px] rounded-full font-medium">Failed</span>
                          ) : (
                             <span className="px-2.5 py-0.5 bg-primary-container text-on-primary-container text-[11px] rounded-full font-medium flex items-center gap-1">
                               <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>
                               Processing
                             </span>
                          )}
                        </div>
                        <h4 className="font-headline-md text-headline-sm text-on-surface mb-1 group-hover:text-primary transition-colors">{lead.companyName}</h4>
                        <p className="font-body-md text-body-md text-on-surface-variant/80 mb-6">{lead.email}</p>
                        <div className="mt-auto pt-4 border-t border-outline-variant/30 font-mono-ui text-mono-ui text-on-surface-variant/60">
                            {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Activity Feed */}
              <div className="w-full lg:w-80 shrink-0 lg:ml-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl h-full p-6 flex flex-col max-h-[600px] sticky top-8">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2 font-headline-md">
                    <span className="material-symbols-outlined text-primary">history</span>
                    Recent Activity
                  </h3>
                  <div className="flex-1 overflow-y-auto pr-2 timeline-scroll">
                    {activities.length === 0 ? (
                      <div className="text-on-surface-variant font-body-md text-sm">No recent activity.</div>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-outline-variant before:via-outline-variant/50 before:to-transparent">
                        {activities.map((act) => (
                          <div key={act.id} className="relative flex items-start group">
                            <div className={`absolute left-[-24px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface border-2 ${act.status === 'done' ? 'border-secondary' : act.status === 'failed' ? 'border-error' : 'border-primary'} ring-4 ring-surface-container-lowest z-10`}>
                              {act.status === 'done' ? (
                                <span className="material-symbols-outlined text-[14px] text-secondary">check</span>
                              ) : act.status === 'failed' ? (
                                <span className="material-symbols-outlined text-[14px] text-error">close</span>
                              ) : (
                                <span className="material-symbols-outlined text-[14px] text-primary animate-spin">sync</span>
                              )}
                            </div>
                            <div>
                              <p className="font-body-md text-body-md text-on-surface"><span className="font-bold text-primary">{act.companyName}</span>: {act.stage} {act.status}</p>
                              <time className="font-mono-ui text-mono-ui text-on-surface-variant/70">{formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}</time>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Slide-over Modal for Selected Lead */}
      {selectedLead && (
        <>
          <div 
            className="fixed inset-0 bg-surface-container-highest/60 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setSelectedLead(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-[600px] bg-surface shadow-2xl z-[51] flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center sticky top-0 bg-surface/95 backdrop-blur z-10">
              <div>
                <div className="font-label-caps text-label-caps text-primary mb-1">{selectedLead.industry}</div>
                <h2 className="font-headline-md text-headline-md text-on-surface m-0 leading-tight">{selectedLead.companyName}</h2>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-8 flex flex-col gap-8 overflow-y-auto">
              
              {/* Controls */}
              <div className="flex gap-3 flex-wrap">
                {selectedLead.status === "done" && selectedLead.hasPdf ? (
                  <a href={`/api/leads/${selectedLead.id}/download`} download={`${selectedLead.companyName.replace(/\s+/g, '_')}_Report.pdf`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-body-md font-semibold hover:bg-primary/90 transition-colors cursor-pointer" style={{ textDecoration: "none" }}>
                    <span className="material-symbols-outlined text-[18px]">download</span> Download Report
                  </a>
                ) : selectedLead.status === "failed" ? (
                  <button onClick={() => handleRetry(selectedLead.id)} disabled={isRetrying} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-body-md font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-70">
                    <span className="material-symbols-outlined text-[18px]">{isRetrying ? "sync" : "refresh"}</span> {isRetrying ? "Retrying..." : "Retry Pipeline"}
                  </button>
                ) : (
                  <button disabled className="inline-flex items-center gap-2 px-5 py-2.5 border border-outline-variant text-on-surface-variant rounded-full font-body-md bg-surface-container-low opacity-80 cursor-not-allowed">
                    <span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Processing...
                  </button>
                )}
                
                <button onClick={(e) => deleteLead(selectedLead.id, e)} className="inline-flex items-center gap-2 px-5 py-2.5 border border-error text-error rounded-full font-body-md hover:bg-error-container/50 transition-colors ml-auto cursor-pointer">
                  Delete
                </button>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                <div>
                  <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">Contact Name</div>
                  <div className="font-body-md text-on-surface font-medium">{selectedLead.fullName}</div>
                </div>
                <div>
                  <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">Email</div>
                  <div className="font-body-md text-on-surface font-medium">{selectedLead.email}</div>
                </div>
                <div>
                  <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">Website</div>
                  <a href={selectedLead.website} target="_blank" className="font-body-md text-primary font-medium hover:underline">{selectedLead.website}</a>
                </div>
                <div>
                  <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">Company Size</div>
                  <div className="font-body-md text-on-surface font-medium">{selectedLead.companySize}</div>
                </div>
                <div className="col-span-2">
                  <div className="font-label-caps text-label-caps text-on-surface-variant mb-2">Submitted Challenge</div>
                  <p className="font-body-md text-on-surface leading-relaxed m-0 p-4 bg-surface rounded-lg border border-outline-variant/40">{selectedLead.painPoints}</p>
                </div>
              </div>

              {/* Pipeline Logs */}
              <div>
                <h3 className="font-headline-sm text-[20px] text-on-surface mb-4 font-headline-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">terminal</span>
                  Pipeline Execution Log
                </h3>
                {selectedLead.stages.length === 0 ? (
                  <div className="font-body-md text-on-surface-variant p-4 bg-surface-container-low rounded-lg border border-outline-variant/50">No logs generated yet.</div>
                ) : (
                  <div className="bg-inverse-surface rounded-xl p-5 text-inverse-on-surface font-mono-ui text-[13px] flex flex-col gap-3 overflow-x-auto shadow-inner">
                    {selectedLead.stages.map(s => {
                      let colorClass = "text-on-surface-variant";
                      let icon = "⏳";
                      if (s.status === "done") { colorClass = "text-secondary-fixed"; icon = "✅"; }
                      if (s.status === "failed") { colorClass = "text-error-container"; icon = "❌"; }
                      
                      const time = new Date(s.createdAt).toLocaleTimeString();
                      
                      return (
                        <div key={s.id} className="flex gap-3 whitespace-nowrap">
                          <span className="text-on-surface-variant/60">[{time}]</span>
                          <span>{icon}</span>
                          <span className={colorClass}>{s.stage.toUpperCase()}</span>
                          <span className="text-inverse-on-surface">- {s.status}</span>
                          {s.message && <span className="text-primary-fixed-dim">// {s.message}</span>}
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
    </div>
  );
}
