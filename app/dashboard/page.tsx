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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--ivory)", color: "var(--charcoal-900)" }}>
      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 80, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 64px", background: "rgba(250, 248, 245, 0.85)",
        backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(28, 25, 23, 0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link href="/" style={{ fontFamily: "Newsreader, serif", fontSize: 24, fontWeight: 700, color: "#1b1b1b", textDecoration: "none", letterSpacing: "-0.01em" }}>ArthAI</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 16, fontWeight: 500 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
            <div style={{ width: 1, height: 16, backgroundColor: "rgba(28, 25, 23, 0.1)" }}></div>
            <span style={{ color: "var(--saffron-dark)", fontWeight: 600 }}>Dashboard</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <button style={{ background: "transparent", border: "none", fontSize: 16, color: "#514538", cursor: "pointer" }}>Login</button>
          <Link href="/form" style={{ background: "var(--saffron-dark)", color: "#fff", padding: "12px 24px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none", transition: "all 0.3s" }}>Book a Demo</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "160px 40px 80px" }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontFamily: "Newsreader, serif", fontSize: 48, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--charcoal-900)", margin: "0 0 16px 0" }}>
            Your Intelligence Reports
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 18, margin: 0, maxWidth: 600 }}>
            Access all generated AI readiness reports and opportunities for your leads.
          </p>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ height: 200, backgroundColor: "var(--cream)", borderRadius: 16, border: "1px solid rgba(28, 25, 23, 0.05)", opacity: 0.7 }}></div>
            ))}
          </div>
        ) : error ? (
          <div style={{ backgroundColor: "#FEF2F2", color: "#DC2626", padding: 24, borderRadius: 16, border: "1px solid #FEE2E2", display: "flex", alignItems: "center", gap: 16 }}>
            <span className="material-symbols-outlined">error</span>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", backgroundColor: "var(--cream)", borderRadius: 24, border: "1px solid rgba(28, 25, 23, 0.1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--saffron-light)", marginBottom: 16 }}>description</span>
            <h3 style={{ fontFamily: "Newsreader, serif", fontSize: 24, fontWeight: 500, color: "var(--charcoal-900)", margin: "0 0 8px 0" }}>No reports yet</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, maxWidth: 400 }}>
              Generate your first AI intelligence report by submitting a lead profile.
            </p>
            <Link href="/form" style={{ padding: "12px 32px", backgroundColor: "var(--charcoal-900)", color: "var(--ivory)", borderRadius: 9999, fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Create a Report
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
            {leads.map((lead) => (
              <div 
                key={lead.id} 
                style={{ 
                  backgroundColor: "var(--cream)", 
                  borderRadius: 20, 
                  border: "1px solid rgba(28, 25, 23, 0.1)", 
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--saffron-main)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(217,119,87,0.1)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "rgba(28, 25, 23, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--saffron-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      {lead.industry}
                    </div>
                    <h3 style={{ fontFamily: "Newsreader, serif", fontSize: 28, fontWeight: 500, color: "var(--charcoal-900)", margin: 0, lineHeight: 1.1 }}>
                      {lead.companyName}
                    </h3>
                  </div>
                  
                  {lead.status === "done" ? (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(217,119,87,0.1)", color: "var(--saffron-main)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
                    </div>
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(28, 25, 23, 0.05)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sync</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(28, 25, 23, 0.05)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </div>
                  
                  {lead.status === "done" ? (
                    <a
                      href={`/api/leads/${lead.id}/download`}
                      download={`${lead.companyName.replace(/\s+/g, '_')}_Report.pdf`}
                      style={{ fontSize: 14, fontWeight: 600, color: "var(--saffron-main)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      Download PDF
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                    </a>
                  ) : (
                    <Link
                      href={`/success?company=${encodeURIComponent(lead.companyName)}&jobId=${lead.id}`}
                      style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      View Status
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
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
