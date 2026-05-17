"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type Lead = {
  id: string;
  companyName: string;
  industry: string;
  status: string;
  createdAt: string;
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        
        if (data.success) {
          setLeads(data.leads);
        } else {
          setError(data.message || "Failed to load reports");
        }
      } catch (err) {
        setError("Network error while fetching reports.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--ivory)] text-[var(--charcoal-900)] selection:bg-[var(--saffron-light)] selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[var(--charcoal-900)]/10 bg-[var(--ivory)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-newsreader text-2xl font-medium tracking-tight">
            ArthAI
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <Link href="/" className="hover:text-[var(--charcoal-900)] transition-colors">Home</Link>
            <div className="w-px h-4 bg-[var(--charcoal-900)]/10"></div>
            <span className="text-[var(--saffron-dark)] font-semibold">Dashboard</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-12">
          <h1 className="font-newsreader text-4xl md:text-5xl font-medium tracking-tight mb-4 text-[var(--charcoal-900)]">
            Your Intelligence Reports
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
            Access all generated AI readiness reports and opportunities for your leads.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-[var(--cream)] rounded-2xl border border-[var(--charcoal-900)]/5"></div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 flex items-center gap-4">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-24 bg-[var(--cream)] rounded-3xl border border-[var(--charcoal-900)]/10 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-[var(--saffron-light)] mb-4">description</span>
            <h3 className="font-newsreader text-2xl font-medium text-[var(--charcoal-900)] mb-2">No reports yet</h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md">
              Generate your first AI intelligence report by submitting a lead profile.
            </p>
            <Link href="/form" className="px-6 py-3 bg-[var(--charcoal-900)] text-[var(--ivory)] rounded-full text-sm font-medium hover:bg-black transition-colors">
              Create a Report
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => (
              <div 
                key={lead.id} 
                className="group relative bg-[var(--cream)] rounded-2xl border border-[var(--charcoal-900)]/10 p-8 hover:border-[var(--saffron-main)]/30 hover:shadow-xl hover:shadow-[var(--saffron-main)]/5 transition-all duration-300 flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-xs font-semibold text-[var(--saffron-dark)] uppercase tracking-wider mb-2">
                      {lead.industry}
                    </div>
                    <h3 className="font-newsreader text-2xl font-medium text-[var(--charcoal-900)] leading-tight">
                      {lead.companyName}
                    </h3>
                  </div>
                  
                  {lead.status === "done" ? (
                    <div className="h-8 w-8 rounded-full bg-[var(--saffron-main)]/10 text-[var(--saffron-main)] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[var(--charcoal-900)]/5 text-[var(--text-muted)] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-8 flex items-center justify-between border-t border-[var(--charcoal-900)]/5">
                  <div className="text-xs text-[var(--text-muted)] font-medium">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </div>
                  
                  {lead.status === "done" ? (
                    <a
                      href={`/api/leads/${lead.id}/download`}
                      download={`${lead.companyName.replace(/\s+/g, '_')}_Report.pdf`}
                      className="text-sm font-semibold text-[var(--saffron-main)] hover:text-[var(--saffron-dark)] flex items-center gap-1 transition-colors"
                    >
                      Download PDF
                      <span className="material-symbols-outlined text-base">download</span>
                    </a>
                  ) : (
                    <Link
                      href={`/success?company=${encodeURIComponent(lead.companyName)}&jobId=${lead.id}`}
                      className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--charcoal-900)] flex items-center gap-1 transition-colors"
                    >
                      View Status
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
