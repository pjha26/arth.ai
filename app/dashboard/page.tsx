"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

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

type AnalyticsData = {
  overview: {
    mostCommonIndustry: string;
    topPersona: string;
    peakSubmissionDay: string;
    avgReportScore: number;
  };
  industryBreakdown: { name: string; count: number }[];
  personaPerformance: { persona: string; count: number; avgScore: number; conversionRate: string }[];
  signalHeatmap: { day: string; count: number }[];
  trendIntelligence: string;
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");

  // Selection for Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
        
        if (selectedLead) {
          const updated = leadsData.leads.find((l: Lead) => l.id === selectedLead.id);
          if (updated) setSelectedLead(updated);
        }
      } else {
        setError(leadsData.message || analyticsData.message || "Failed to load dashboard data");
      }
    } catch (err) {
      setError("Network error while fetching dashboard data.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
    const interval = setInterval(() => fetchDashboardData(false), 15000); // 15s polling to save DB load
    return () => clearInterval(interval);
  }, [selectedLead]);

  // Derived Data
  const industries = ["All", ...Array.from(new Set(leads.map(l => l.industry))).filter(Boolean)];
  
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const searchLower = search.toLowerCase();
      const matchesSearch = l.companyName.toLowerCase().includes(searchLower) || l.email.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "All" ? true : l.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesIndustry = industryFilter === "All" ? true : l.industry === industryFilter;
      return matchesSearch && matchesStatus && matchesIndustry;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, search, statusFilter, industryFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const generated = leads.filter(l => l.status === "done").length;
    const failed = leads.filter(l => l.status === "failed").length;
    
    // Sparkline mock data based on recent trend (normally calculated per day)
    const trendBase = Math.floor(total / 3);
    const sparkData = [trendBase, trendBase+2, trendBase-1, trendBase+4, trendBase+1, trendBase+5];

    return { total, generated, failed, sparkData };
  }, [leads]);

  // --- UI Subcomponents --- //

  const Sparkline = ({ data, color }: { data: number[], color: string }) => (
    <div className="h-8 w-full mt-3 opacity-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.map((v, i) => ({ value: v, name: i }))}>
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden antialiased font-body-md text-body-md bg-background text-on-background">
      {/* SideNavBar */}
      <nav className="hidden md:flex flex-col h-screen sticky top-0 w-64 left-0 bg-surface border-r border-outline-variant z-40 shrink-0">
        <div className="p-gutter flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">A</div>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-primary m-0 p-0 leading-none">ArthAI</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">Analytics Edition</p>
          </div>
        </div>
        
        <div className="flex-1 py-stack-md px-3 flex flex-col gap-6 overflow-y-auto mt-4">
          
          <div>
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-3 mb-2">Main Menu</div>
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary font-bold bg-primary/10 border-l-4 border-primary transition-colors duration-200" href="#">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
              Analytics
            </a>
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low border-l-4 border-transparent transition-colors duration-200" href="#">
              <span className="material-symbols-outlined">group</span>
              Leads & Reports
            </a>
          </div>

          <div className="mt-auto">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors duration-200">
              <span className="material-symbols-outlined">logout</span>
              Back to Home
            </Link>
            
            {lastSynced && (
              <div className="px-3 py-4 mt-4 text-xs text-on-surface-variant/50 border-t border-outline-variant/30 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">sync</span>
                Last synced: {format(lastSynced, 'HH:mm:ss')}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-surface-bright pb-20">
          <div className="max-w-[1400px] mx-auto px-5 md:px-12 py-8 flex flex-col gap-8">
            
            {/* Header Section */}
            <section className="flex flex-col gap-2">
              <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Intelligence CRM</h1>
              <p className="font-body-lg text-on-surface-variant">Real-time prospect analytics and pipeline overview.</p>
            </section>

            {/* KPI Metric Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-surface border border-outline-variant rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Leads</h3>
                  <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 bg-primary/10 px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-[12px]">trending_up</span> +12%</span>
                </div>
                <p className="text-3xl font-extrabold text-on-surface">{stats.total}</p>
                <Sparkline data={stats.sparkData} color="#6366f1" />
              </div>

              <div className="bg-surface border border-outline-variant rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Generated</h3>
                  <span className="text-[11px] font-bold text-secondary flex items-center gap-0.5 bg-secondary/10 px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-[12px]">trending_up</span> +8%</span>
                </div>
                <p className="text-3xl font-extrabold text-secondary">{stats.generated}</p>
                <Sparkline data={stats.sparkData.map(v => v * 0.8)} color="#10b981" />
              </div>

              <div className="bg-surface border border-outline-variant rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Avg Score</h3>
                  <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-0.5 bg-surface-container-high px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-[12px]">trending_flat</span> 0%</span>
                </div>
                <p className="text-3xl font-extrabold text-on-surface">{analytics?.overview.avgReportScore || 0}</p>
                <Sparkline data={[80, 85, 82, 88, 86, 89]} color="#8b5cf6" />
              </div>

              <div className="bg-surface border border-outline-variant rounded-xl p-5 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Failed</h3>
                  <span className="text-[11px] font-bold text-error flex items-center gap-0.5 bg-error/10 px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-[12px]">trending_down</span> -2%</span>
                </div>
                <p className="text-3xl font-extrabold text-error">{stats.failed}</p>
                <Sparkline data={[2, 1, 0, 1, 0, 0]} color="#ef4444" />
              </div>
            </section>

            {/* Section 1: Leads Overview Strip */}
            <section className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-wrap gap-8 items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><span className="material-symbols-outlined">domain</span></div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant">Top Industry</div>
                  <div className="font-bold text-on-surface text-sm">{analytics?.overview.mostCommonIndustry || 'Loading...'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary"><span className="material-symbols-outlined">person</span></div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant">Top Persona</div>
                  <div className="font-bold text-on-surface text-sm capitalize">{analytics?.overview.topPersona || 'Loading...'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b]"><span className="material-symbols-outlined">today</span></div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant">Peak Submission Day</div>
                  <div className="font-bold text-on-surface text-sm">{analytics?.overview.peakSubmissionDay || 'Loading...'}</div>
                </div>
              </div>
            </section>

            {/* Middle Grid: Charts & Persona */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Section 2: Industry Breakdown */}
              <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                  Industry Breakdown
                </h3>
                <div className="h-64 w-full">
                  {analytics && analytics.industryBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.industryBreakdown} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={120} />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]}>
                          {analytics.industryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-on-surface-variant">Insufficient data</div>
                  )}
                </div>
              </div>

              {/* Section 3: Persona Performance */}
              <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                  Persona Performance
                </h3>
                <div className="flex-1 flex flex-col gap-3 justify-center">
                  {analytics?.personaPerformance.map((p, i) => (
                    <div key={i} className="bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-4 hover:border-outline-variant transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-on-surface capitalize">{p.persona}</span>
                        <span className="text-[10px] font-bold bg-surface-container-low px-2 py-0.5 rounded-full">{p.count} Leads</span>
                      </div>
                      <div className="flex justify-between text-xs text-on-surface-variant">
                        <span>Avg Score: <strong className="text-on-surface">{p.avgScore}</strong></span>
                        <span>Conv: <strong className="text-secondary">{p.conversionRate}</strong></span>
                      </div>
                    </div>
                  )) || <div className="text-sm text-center text-on-surface-variant py-8">Loading personas...</div>}
                </div>
              </div>
            </div>

            {/* Section 4: Trend Intelligence Feed */}
            <section className="bg-gradient-to-r from-primary/10 via-surface to-surface border border-primary/20 rounded-xl p-6 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center text-primary mt-1">
                <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">AI Trend Intelligence</h3>
                <p className="font-headline-sm text-[18px] text-on-surface leading-snug">
                  {analytics?.trendIntelligence || (loading ? "Analyzing database aggregates..." : "No insights available.")}
                </p>
                <div className="text-[11px] text-on-surface-variant mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span> Updated daily via Gemini 2.5 Pro
                </div>
              </div>
            </section>

            {/* Bottom Grid: Leads Table & Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Leads Table / List */}
              <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">list_alt</span>
                    Recent Inbound Leads
                  </h3>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                    <input 
                      className="bg-surface-container-lowest border border-outline-variant rounded-full pl-8 pr-4 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none" 
                      placeholder="Search company..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  {loading && leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-on-surface-variant gap-3">
                      <span className="material-symbols-outlined animate-spin text-[32px]">sync</span>
                      <p>Loading inbound leads...</p>
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    /* Designed Empty State */
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                      <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center text-outline-variant mb-4">
                        <span className="material-symbols-outlined text-[40px]">inbox</span>
                      </div>
                      <h4 className="text-base font-bold text-on-surface mb-1">No Leads Found</h4>
                      <p className="text-sm text-on-surface-variant max-w-[250px] mb-6">You don't have any matching leads. Try adjusting your filters or share your intake form.</p>
                      <Link href="/" className="px-5 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary/90 transition-colors">
                        Add First Lead
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredLeads.slice(0, 10).map((lead) => (
                        <div 
                          key={lead.id} 
                          onClick={() => setSelectedLead(lead)}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-lowest border border-transparent hover:border-outline-variant/60 cursor-pointer transition-colors group"
                        >
                          {/* Company Favicon */}
                          <div className="w-10 h-10 rounded-md bg-surface-container-high border border-outline-variant/40 flex items-center justify-center overflow-hidden shrink-0">
                            <img 
                              src={`https://logo.clearbit.com/${lead.website.replace(/^https?:\/\//, '').split('/')[0]}?size=64`} 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                            <span className="absolute text-on-surface-variant font-bold text-xs">{lead.companyName.charAt(0)}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{lead.companyName}</h5>
                            <p className="text-xs text-on-surface-variant truncate">{lead.email}</p>
                          </div>

                          <div className="hidden sm:block shrink-0 text-right">
                            <p className="text-xs font-bold text-on-surface">{lead.industry}</p>
                            <p className="text-[10px] text-on-surface-variant">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</p>
                          </div>

                          {/* Status Dot */}
                          <div className="shrink-0 flex items-center justify-center w-8">
                            {lead.status === "done" ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            ) : lead.status === "failed" ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-error shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Signal Heatmap */}
              <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                  Submission Heatmap
                </h3>
                <div className="h-64 w-full">
                  {analytics && analytics.signalHeatmap.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.signalHeatmap}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => val.slice(0,3)} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-on-surface-variant">Insufficient data</div>
                  )}
                </div>
              </div>
            </div>
            
          </div>
        </main>
      </div>

      {/* Modal is kept exactly the same for functionality but omitted for brevity in this replace block if desired, but I will include the functional parts */}
      {selectedLead && (
        <>
          <div className="fixed inset-0 bg-surface-container-highest/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setSelectedLead(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-[500px] bg-surface shadow-2xl z-[51] flex flex-col">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{selectedLead.industry}</div>
                <h2 className="text-xl font-bold text-on-surface">{selectedLead.companyName}</h2>
              </div>
              <button onClick={() => setSelectedLead(null)} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="flex gap-2 mb-8">
                {selectedLead.status === "done" && selectedLead.hasPdf ? (
                  <a href={`/api/leads/${selectedLead.id}/download`} download className="flex-1 text-center py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Download Report</a>
                ) : selectedLead.status === "failed" ? (
                  <button onClick={() => setIsRetrying(true) /* Mock for now */} className="flex-1 py-2 bg-error text-on-error rounded-lg text-sm font-bold">Retry Pipeline</button>
                ) : (
                  <button disabled className="flex-1 py-2 bg-surface-container-high text-on-surface-variant rounded-lg text-sm font-bold opacity-70">Processing...</button>
                )}
              </div>
              
              <div className="space-y-4 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/60">
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Contact Name</div>
                  <div className="text-sm font-bold text-on-surface">{selectedLead.fullName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Email</div>
                  <div className="text-sm font-bold text-on-surface">{selectedLead.email}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Website</div>
                  <a href={selectedLead.website} target="_blank" className="text-sm font-bold text-primary hover:underline">{selectedLead.website}</a>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Stated Challenge</div>
                  <p className="text-sm text-on-surface-variant leading-relaxed p-3 bg-surface rounded border border-outline-variant/40 mt-1">{selectedLead.painPoints}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
