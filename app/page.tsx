"use client";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh" }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: "58px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2.5rem",
        background: "rgba(250,250,248,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #E8E6E1",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.55rem", textDecoration: "none" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "white", fontFamily: "var(--font-heading)" }}>a</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.03em", color: "#18181B" }}>arth.ai</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          {[["Product", "#product"], ["How It Works", "#how-it-works"], ["About", "#about"]].map(([l, h]) => (
            <a key={l} href={h} style={{ fontFamily: "var(--font-heading)", fontSize: "0.85rem", fontWeight: 500, color: "#52525B", textDecoration: "none" }}>{l}</a>
          ))}
        </div>
        <Link href="/form" style={{ fontFamily: "var(--font-heading)", fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem 1.1rem", borderRadius: "100px", background: "#18181B", color: "white", textDecoration: "none", letterSpacing: "-0.01em" }}>
          Get your report
        </Link>
      </nav>

      {/* ── SECTION 1: What is this? ── */}
      <section style={{ paddingTop: "148px", paddingBottom: "100px", textAlign: "center" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 2rem" }}>

          <div className="animate-fade-up" style={{ marginBottom: "1.75rem" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.3rem 0.9rem", borderRadius: "100px",
              border: "1.5px solid #E0DDD8", background: "white",
              fontFamily: "var(--font-heading)", fontSize: "0.75rem", fontWeight: 600,
              color: "#71717A", letterSpacing: "0.01em",
            }}>
              Inbound Intelligence Infrastructure
            </span>
          </div>

          <h1 className="animate-fade-up delay-100" style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2.6rem, 6vw, 4.5rem)",
            fontWeight: 800, lineHeight: 1.05,
            letterSpacing: "-0.035em", color: "#18181B",
            marginBottom: "1.5rem",
          }}>
            Every inbound lead,<br />personally welcomed.
          </h1>

          <p className="animate-fade-up delay-200" style={{
            fontFamily: "var(--font-body)", fontSize: "1.05rem",
            color: "#52525B", lineHeight: 1.75,
            maxWidth: "460px", margin: "0 auto 2.5rem",
          }}>
            arth.ai researches your prospect, writes their audit report, and emails it — before you open your laptop.
          </p>

          <div className="animate-fade-up delay-300" style={{ marginBottom: "4.5rem" }}>
            <Link href="/form" style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              padding: "0.85rem 2rem", borderRadius: "100px",
              background: "#C58B45", color: "white",
              fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700,
              textDecoration: "none", letterSpacing: "-0.01em",
              boxShadow: "0 4px 20px rgba(197,139,69,0.25)",
              transition: "all 0.18s ease",
            }}>
              See arth.ai in action →
            </Link>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", color: "#A1A1AA", marginTop: "0.85rem" }}>
              No account needed · Delivered in 3 minutes
            </p>
          </div>

          {/* Stats */}
          <div className="animate-fade-up delay-400" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", flexWrap: "wrap" }}>
            {[
              "Under 60s delivery",
              "10,000+ reports sent",
              "No credit card needed",
            ].map((s, i, arr) => (
              <>
                <span key={s} style={{ fontFamily: "var(--font-heading)", fontSize: "0.85rem", fontWeight: 500, color: "#71717A" }}>{s}</span>
                {i < arr.length - 1 && <div style={{ width: 1, height: 13, background: "#D4D2CE", margin: "0 1.75rem", flexShrink: 0 }} />}
              </>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1", margin: "0 2.5rem" }} />

      {/* ── SECTION 2: Why should I care? ── */}
      <section style={{ padding: "8rem 2rem" }}>
        <div style={{ maxWidth: "620px", margin: "0 auto" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C58B45", marginBottom: "1.25rem" }}>
            The Problem
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.15, marginBottom: "1.5rem" }}>
            Warm leads go cold<br />while you write the follow-up.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "#52525B", lineHeight: 1.85, marginBottom: "1rem" }}>
            When someone fills your inbound form, they're interested right now. Most teams take hours to respond. By then, the moment has passed.
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "#52525B", lineHeight: 1.85 }}>
            arth.ai delivers a hyper-personalized audit to their inbox in under 3 minutes — so your first impression is always your best one.
          </p>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1", margin: "0 2.5rem" }} />

      {/* ── SECTION 3: How does it work? ── */}
      <section id="how-it-works" style={{ padding: "8rem 2rem" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C58B45", marginBottom: "1.25rem" }}>
            How It Works
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.15, marginBottom: "3.5rem" }}>
            Four things happen the moment<br />they hit submit.
          </h2>

          {[
            { n: "01", title: "They fill your form", body: "Name, company, website, and their biggest challenge. 60 seconds of their time." },
            { n: "02", title: "We research their company", body: "Clearbit, Wikipedia, DuckDuckGo, and their own website — four sources, running in parallel." },
            { n: "03", title: "AI writes a personalized report", body: "Gemini 1.5 Flash generates a scored, specific audit referenced to their industry and challenge." },
            { n: "04", title: "Report lands in their inbox", body: "A branded PDF arrives within 3 minutes. Zero humans involved." },
          ].map((s, i) => (
            <div key={s.n} style={{
              display: "grid", gridTemplateColumns: "52px 1fr", gap: "1.75rem",
              padding: "2rem 0",
              borderBottom: i < 3 ? "1px solid #E8E6E1" : "none",
            }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 800, color: "#D4D2CE", letterSpacing: "-0.04em", paddingTop: 2 }}>{s.n}</div>
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1rem", color: "#18181B", marginBottom: "0.45rem" }}>{s.title}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#71717A", lineHeight: 1.75 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1", margin: "0 2.5rem" }} />

      {/* ── SECTION 3.5: Live Demo ── */}
      <section id="product" style={{ padding: "8rem 2rem", background: "white" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C58B45", marginBottom: "1.25rem", textAlign: "center" }}>
            See It In Action
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.15, marginBottom: "1rem", textAlign: "center" }}>
            This page knows who you're visiting for.
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", color: "#71717A", lineHeight: 1.8, textAlign: "center", marginBottom: "3rem", maxWidth: "520px", margin: "0 auto 3rem" }}>
            Every company gets its own personalized arth.ai experience. Try one below — generated fresh, every time.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {[
              { slug: "stripe",   label: "Stripe",   tag: "FinTech · Payments",    desc: "See how a FinTech report looks" },
              { slug: "notion",   label: "Notion",   tag: "SaaS · Productivity",   desc: "See how a SaaS report looks" },
              { slug: "zomato",   label: "Zomato",   tag: "Consumer · Food Tech",  desc: "See how a consumer tech report looks" },
            ].map(c => (
              <Link key={c.slug} href={`/${c.slug}`} style={{
                display: "block", textDecoration: "none",
                padding: "1.5rem",
                background: "#FAFAF8",
                border: "1px solid #E8E6E1",
                borderRadius: "14px",
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(24,24,27,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 600, color: "#C58B45", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>{c.tag}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.1rem", color: "#18181B", marginBottom: "0.4rem" }}>{c.label}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "#A1A1AA", marginBottom: "1rem" }}>{c.desc}</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.82rem", fontWeight: 600, color: "#C58B45" }}>View page →</div>
              </Link>
            ))}
          </div>

          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "#A1A1AA", textAlign: "center", marginTop: "1.5rem" }}>
            Try any company: arth.ai/<strong style={{ color: "#71717A" }}>yourcompany</strong>
          </p>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1", margin: "0 2.5rem" }} />

      {/* ── SECTION 4: Proof ── */}
      <section style={{ padding: "8rem 2rem" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#C58B45", marginBottom: "1.25rem", textAlign: "center" }}>
            Real Feedback
          </p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "#18181B", lineHeight: 1.15, marginBottom: "3.5rem", textAlign: "center" }}>
            What teams actually said.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {[
              { quote: "The prospect replied within 10 minutes. They said it was the most thoughtful first-touch they'd ever received.", name: "Priya S.", role: "Head of Sales", company: "B2B SaaS, Mumbai" },
              { quote: "We replaced a two-hour manual research process. First-touch quality went up, not down.", name: "Rahul M.", role: "Founder", company: "Consulting Firm, Bengaluru" },
              { quote: "It doesn't feel like AI. It reads like someone actually sat down and wrote it for that specific company.", name: "Aisha K.", role: "Growth Lead", company: "FinTech Startup, Hyderabad" },
            ].map(t => (
              <div key={t.name} style={{ background: "white", border: "1px solid #E8E6E1", borderRadius: "16px", padding: "1.75rem" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "#3F3F46", lineHeight: 1.8, marginBottom: "1.5rem" }}>"{t.quote}"</p>
                <div style={{ borderTop: "1px solid #E8E6E1", paddingTop: "1rem" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.875rem", color: "#18181B" }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "#A1A1AA", marginTop: "0.2rem" }}>{t.role} · {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ borderTop: "1px solid #E8E6E1" }} />

      {/* ── SECTION 5: CTA ── */}
      <section id="about" style={{ padding: "8rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", color: "#18181B", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Ready to try it?
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", color: "#71717A", lineHeight: 1.8, marginBottom: "2.5rem" }}>
            Submit your company details and get a personalized AI audit in your inbox. No account. No credit card.
          </p>
          <Link href="/form" style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            padding: "0.85rem 2rem", borderRadius: "100px",
            background: "#18181B", color: "white",
            fontFamily: "var(--font-heading)", fontSize: "0.95rem", fontWeight: 700,
            textDecoration: "none", letterSpacing: "-0.01em",
          }}>
            Get your free audit →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #E8E6E1", padding: "1.75rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "#18181B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "white", fontFamily: "var(--font-heading)" }}>a</div>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.875rem", letterSpacing: "-0.03em", color: "#18181B" }}>arth.ai</span>
        </div>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.78rem", color: "#A1A1AA" }}>
          Inbound Intelligence Infrastructure · {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
