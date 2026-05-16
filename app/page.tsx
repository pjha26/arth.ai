"use client";
import Link from "next/link";

const LogoMark = () => (
  <div className="logo-mark">a</div>
);

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <LogoMark />arth.ai
        </a>
        <div className="navbar-center">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#testimonials" className="nav-link">Testimonials</a>
          <a href="#get-started" className="nav-link">Get Started</a>
        </div>
        <Link href="/form" className="btn btn-dark btn-sm">Get your report</Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: "130px", paddingBottom: "80px", textAlign: "center", position: "relative" }}>
        {/* Very subtle hero gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(197,139,69,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="container" style={{ maxWidth: "780px", position: "relative" }}>
          <div className="animate-fade-up" style={{ marginBottom: "1.75rem" }}>
            <span className="pill">For teams who care about first impressions</span>
          </div>

          <h1 className="h1 animate-fade-up delay-100" style={{ marginBottom: "1.75rem" }}>
            Every lead gets a personal<br />touch before you lift a finger.
          </h1>

          <p className="lead animate-fade-up delay-200" style={{ maxWidth: "520px", margin: "0 auto 2.75rem" }}>
            arth.ai captures a lead, researches their company, writes a tailored audit report, and emails it to them — all before you finish your chai.
          </p>

          <div className="animate-fade-up delay-300" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", flexWrap: "wrap", marginBottom: "5rem" }}>
            <Link href="/form" className="btn btn-text">
              Try it free &nbsp;→
            </Link>
            <a href="#how-it-works" style={{ fontSize: "0.9rem", color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500, fontFamily: "var(--font-heading)" }}>
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="animate-fade-up delay-400 stats-bar">
            <span className="stat-item">Under 60s delivery</span>
            <div className="stat-sep" />
            <span className="stat-item">10,000+ reports sent</span>
            <div className="stat-sep" />
            <span className="stat-item">No credit card needed</span>
          </div>
        </div>
      </section>

      <hr className="divider" style={{ margin: "0 2rem" }} />

      {/* ── Features ── */}
      <section id="features" className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p className="label" style={{ marginBottom: "0.75rem" }}>Features</p>
            <h2 className="h2" style={{ maxWidth: "520px", margin: "0 auto" }}>
              Everything runs on its own. You just watch it work.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {[
              { icon: "🔍", color: "saffron", title: "Deep company research", desc: "Clearbit, Wikipedia, DuckDuckGo, and Cheerio run in parallel — building a full company profile in seconds." },
              { icon: "🧠", color: "sage", title: "AI-written audit reports", desc: "Gemini 1.5 Flash generates a scored, fully personalized report from real enriched context — not templates." },
              { icon: "📬", color: "saffron", title: "Instant email delivery", desc: "A branded report lands in their inbox within 3 minutes of submitting your form — with PDF attached." },
              { icon: "📊", color: "sage", title: "AI Readiness Score", desc: "Every report scores Digital Readiness, Automation Potential, and Growth Index — each out of 10." },
              { icon: "🗃️", color: "saffron", title: "Automatic logging", desc: "Every lead appended to Google Sheets. Every PDF archived to Google Drive with a shareable link." },
              { icon: "⚡", color: "sage", title: "Built to scale", desc: "BullMQ + Upstash Redis handles parallel pipelines, retries, and concurrency — zero dropped leads." },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className={`icon-wrap icon-${f.color}`}>{f.icon}</div>
                <div>
                  <h3 className="h3" style={{ marginBottom: "0.45rem" }}>{f.title}</h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.7" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" style={{ margin: "0 2rem" }} />

      {/* ── How it works ── */}
      <section id="how-it-works" className="section">
        <div className="container" style={{ maxWidth: "780px" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p className="label" style={{ marginBottom: "0.75rem" }}>How It Works</p>
            <h2 className="h2">Four steps. Three minutes.</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              {
                num: "01", title: "Prospect fills your form",
                desc: "Name, company, website, industry, and their biggest operational challenge. Sixty seconds of their time.",
              },
              {
                num: "02", title: "We research their company",
                desc: "Four sources run in parallel — Clearbit for the logo, Wikipedia for context, DuckDuckGo for their story, Cheerio to scrape their own website.",
              },
              {
                num: "03", title: "Gemini writes a personalized report",
                desc: "All context becomes a structured prompt. Gemini returns a scored audit with real, specific opportunities — referenced to their industry and stated challenge.",
              },
              {
                num: "04", title: "Report delivered to their inbox",
                desc: "Puppeteer renders a branded PDF. Resend delivers it with a preview email. The whole pipeline completes while they're still reading your landing page.",
              },
            ].map((step, i, arr) => (
              <div key={step.num} style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                gap: "2rem",
                padding: "2.25rem 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "start",
              }}>
                <div style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.85rem",
                  fontWeight: 800,
                  color: "var(--border-strong)",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  paddingTop: "3px",
                }}>
                  {step.num}
                </div>
                <div>
                  <h3 className="h3" style={{ marginBottom: "0.6rem" }}>{step.title}</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.8" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" style={{ margin: "0 2rem" }} />

      {/* ── What's in the report ── */}
      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "center" }}>
            <div>
              <p className="label" style={{ marginBottom: "0.75rem" }}>The Output</p>
              <h2 className="h2" style={{ marginBottom: "1.25rem" }}>
                What the prospect actually receives.
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.85" }}>
                Not a generic brochure. A report that references their company by name, their industry by context, and their challenge by content — generated fresh, every single time.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {[
                { icon: "📊", title: "AI Readiness Score", sub: "Digital, Automation & Growth Index — each scored /10" },
                { icon: "📋", title: "Executive Summary", sub: "Company overview written specifically for their business" },
                { icon: "📈", title: "Market Position Analysis", sub: "Competitive landscape in their specific industry" },
                { icon: "🤖", title: "AI Automation Opportunities", sub: "3–5 specific opportunities with High / Medium impact ratings" },
                { icon: "✅", title: "Recommended Next Steps", sub: "Actionable, prioritized — referenced to their stated challenge" },
              ].map(item => (
                <div key={item.title} style={{
                  display: "flex", gap: "1rem", alignItems: "flex-start",
                  padding: "1rem 1.1rem",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-lg)",
                  boxShadow: "var(--shadow-xs)",
                }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{item.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" style={{ margin: "0 2rem" }} />

      {/* ── Testimonials ── */}
      <section id="testimonials" className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <p className="label" style={{ marginBottom: "0.75rem" }}>Testimonials</p>
            <h2 className="h2">What teams are saying.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {[
              { quote: "The prospect replied within 10 minutes of the report landing. They said it was the most thoughtful first-touch they'd ever received.", name: "Priya S.", role: "Head of Sales, B2B SaaS" },
              { quote: "We replaced a 2-hour manual research process with arth.ai. First-touch quality actually went up, not down.", name: "Rahul M.", role: "Founder, Consulting Firm" },
              { quote: "It doesn't feel like AI. It feels like someone actually sat down and wrote this for that specific company.", name: "Aisha K.", role: "Growth Lead, FinTech Startup" },
            ].map(t => (
              <div key={t.name} className="card" style={{ padding: "2rem" }}>
                <div style={{ fontSize: "2rem", color: "var(--saffron)", lineHeight: 1, marginBottom: "1.1rem", fontFamily: "Georgia, serif" }}>"</div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.8", marginBottom: "1.75rem" }}>
                  {t.quote}
                </p>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.1rem" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "0.875rem" }}>{t.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" style={{ margin: "0 2rem" }} />

      {/* ── CTA ── */}
      <section id="get-started" className="section">
        <div className="container" style={{ maxWidth: "620px", textAlign: "center" }}>
          <div style={{
            background: "var(--charcoal)",
            borderRadius: "var(--r-2xl)",
            padding: "4.5rem 3.5rem",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "500px", height: "200px",
              background: "radial-gradient(ellipse, rgba(197,139,69,0.18) 0%, transparent 65%)",
              pointerEvents: "none",
            }} />
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: "1rem", position: "relative" }}>
              Get started free
            </p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.025em", color: "white", marginBottom: "1.1rem", lineHeight: 1.15, position: "relative" }}>
              Your next prospect deserves<br />a personal touch.
            </h2>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", marginBottom: "2.5rem", lineHeight: "1.8", position: "relative" }}>
              Submit your company details and get a free AI intelligence audit — no account required, delivered in under 3 minutes.
            </p>
            <Link href="/form" className="btn btn-saffron btn-lg" style={{ position: "relative" }}>
              Get your free report →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)", padding: "1.75rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <LogoMark />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.03em" }}>arth.ai</span>
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-heading)" }}>
          AI-powered inbound personalization · {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
