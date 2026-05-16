import { buildCompanyProfile } from "@/lib/companyProfile";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";

// ISR: regenerate every 6 hours
export const revalidate = 21600;

interface Props {
  params: { company: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.company.toLowerCase();
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);
  return {
    title: `${name} × arth.ai — Personalized Inbound Intelligence`,
    description: `See how arth.ai delivers instant, personalized AI audit reports for ${name}'s inbound leads.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = resolvedParams.company.toLowerCase();
  const profile = await buildCompanyProfile(slug);

  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2.5rem",
        background: "rgba(250,250,248,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #E8E6E1",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.55rem", textDecoration: "none" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white", fontFamily: "var(--font-heading)" }}>a</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.03em", color: "#18181B" }}>arth.ai</span>
        </Link>
        <Link href="/form" style={{ fontFamily: "var(--font-heading)", fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: "100px", background: "#18181B", color: "white", textDecoration: "none" }}>
          Get your report
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: "130px", paddingBottom: "80px", textAlign: "center" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 2rem" }}>

          {/* Company logo + name */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            {profile.logo && (
              <Image
                src={profile.logo}
                alt={`${profile.name} logo`}
                width={32}
                height={32}
                style={{ borderRadius: 8, objectFit: "contain" }}
                onError={() => {}}
              />
            )}
            <span style={{
              fontFamily: "var(--font-heading)", fontSize: "0.78rem", fontWeight: 600,
              padding: "0.3rem 0.8rem", borderRadius: "100px",
              border: "1.5px solid #E0DDD8", background: "white",
              color: "#71717A",
            }}>
              arth.ai for {profile.name} &nbsp;·&nbsp; {profile.industry}
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
            fontWeight: 800, lineHeight: 1.08,
            letterSpacing: "-0.03em", color: "#18181B",
            marginBottom: "1.5rem",
          }}>
            {profile.headline}
          </h1>

          {profile.description && (
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "0.95rem",
              color: "#71717A", lineHeight: 1.8,
              maxWidth: "520px", margin: "0 auto 2.5rem",
            }}>
              {profile.description.slice(0, 280)}
              {profile.description.length > 280 ? "…" : ""}
            </p>
          )}

          <Link href={`/form?company=${encodeURIComponent(profile.name)}&website=https://${profile.domain}`} style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.85rem 2rem", borderRadius: "100px",
            background: "#C58B45", color: "white",
            fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700,
            textDecoration: "none", letterSpacing: "-0.01em",
            boxShadow: "0 4px 20px rgba(197,139,69,0.25)",
          }}>
            Get an AI Audit for {profile.name} →
          </Link>

          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.72rem", color: "#A1A1AA", marginTop: "0.85rem" }}>
            Delivered to your inbox in 3 minutes · No account needed
          </p>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1", margin: "0 2.5rem" }} />

      {/* ── Pain Points ── */}
      <section style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "620px", margin: "0 auto" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C58B45", marginBottom: "1.25rem" }}>
            The Challenge
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.2, marginBottom: "2rem" }}>
            What {profile.name}'s inbound team<br />deals with every week.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {profile.painPoints.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1.25rem 0", borderBottom: i < profile.painPoints.length - 1 ? "1px solid #E8E6E1" : "none" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #E8E6E1", background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C58B45" }} />
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", color: "#3F3F46", lineHeight: 1.7 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1", margin: "0 2.5rem" }} />

      {/* ── AI Opportunities ── */}
      <section style={{ padding: "6rem 2rem", background: "white" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C58B45", marginBottom: "1.25rem" }}>
            AI Opportunities
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.2, marginBottom: "2rem" }}>
            How arth.ai helps {profile.name}<br />convert faster.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {profile.aiOpportunities.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1.25rem 1.5rem", background: "#FAFAF8", border: "1px solid #E8E6E1", borderRadius: "12px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.75rem", color: "#C58B45", paddingTop: 3, flexShrink: 0, minWidth: 20 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.7 }}>{o}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1" }} />

      {/* ── CTA ── */}
      <section style={{ padding: "7rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.15, marginBottom: "1.1rem" }}>
            See what {profile.name}'s<br />AI audit would look like.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#71717A", lineHeight: 1.8, marginBottom: "2.25rem" }}>
            {profile.ctaLine}
          </p>
          <Link href={`/form?company=${encodeURIComponent(profile.name)}&website=https://${profile.domain}`} style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.85rem 2rem", borderRadius: "100px",
            background: "#18181B", color: "white",
            fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700,
            textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            Get a free audit for {profile.name} →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #E8E6E1", padding: "1.75rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "white", fontFamily: "var(--font-heading)" }}>a</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.875rem", letterSpacing: "-0.03em", color: "#18181B" }}>arth.ai</span>
        </div>
        <Link href="/" style={{ fontFamily: "var(--font-heading)", fontSize: "0.78rem", color: "#A1A1AA", textDecoration: "none" }}>
          ← Back to arth.ai
        </Link>
      </footer>
    </div>
  );
}
