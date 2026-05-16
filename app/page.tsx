"use client";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="dot-bg" style={{ background: "var(--cream)", minHeight: "100vh" }}>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <div className="logo-badge">a</div>
          arth.ai
        </a>
        <div className="navbar-center">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#testimonials" className="nav-link">Testimonials</a>
          <a href="#get-started" className="nav-link">Get Started</a>
        </div>
        <Link href="/form" className="btn btn-primary btn-sm">Get your report</Link>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", zIndex: 1, paddingTop: "130px", paddingBottom: "60px", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "860px" }}>

          <div className="animate-fade-up" style={{ marginBottom: "2rem" }}>
            <span className="pill">For teams who care about first impressions</span>
          </div>

          <h1 className="display-hero animate-fade-up delay-100" style={{ marginBottom: "1.75rem" }}>
            Every lead gets a personal<br />touch before you lift a finger.
          </h1>

          <p className="animate-fade-up delay-200" style={{
            fontSize: "1.05rem",
            color: "var(--text-secondary)",
            maxWidth: "520px",
            margin: "0 auto 2.5rem",
            lineHeight: "1.8",
          }}>
            arth.ai captures a lead, researches their company, writes a tailored audit report, and emails it to them — all before you finish your chai.
          </p>

          <div className="animate-fade-up delay-300" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.75rem", flexWrap: "wrap", marginBottom: "4.5rem" }}>
            <Link href="/form" className="btn btn-text" style={{ fontSize: "1rem" }}>
              Try it free &nbsp;→
            </Link>
            <a href="#how-it-works" style={{ fontSize: "0.95rem", color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500 }}>
              See how it works
            </a>
          </div>

          {/* Stats bar */}
          <div className="animate-fade-up delay-400 stats-bar">
            <span className="stat-pipe-item">Under 60s delivery</span>
            <div className="stat-sep" />
            <span className="stat-pipe-item">10,000+ reports sent</span>
            <div className="stat-sep" />
            <span className="stat-pipe-item">No credit card needed</span>
          </div>
        </div>
      </section>

      <hr className="divider" style={{ position: "relative", zIndex: 1, margin: "0 2rem" }} />

      {/* ── Features ── */}
      <section id="features" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p className="section-label">Features</p>
            <h2 className="display-xl">
              Everything runs on its own.<br />
              <span className="italic" style={{ color: "var(--saffron)" }}>You just watch it work.</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {[
              { icon: "🔍", color: "saffron", title: "Deep company research", desc: "Pulls data from Clearbit, Wikipedia, DuckDuckGo, and the prospect's own website — in seconds." },
              { icon: "🧠", color: "sage", title: "AI-written audit reports", desc: "Gemini 1.5 Flash writes a 8–10 page, fully personalized report based on real enriched context." },
              { icon: "📬", color: "saffron", title: "Instant email delivery", desc: "The report lands in their inbox in under 3 minutes with a branded email preview." },
              { icon: "📊", color: "sage", title: "AI Readiness Score", desc: "Every report includes Digital Readiness, Automation Potential, and Growth Index scored out of 10." },
              { icon: "🗃️", color: "saffron", title: "Automatic logging", desc: "Every lead is appended to Google Sheets and the PDF is archived to Google Drive." },
              { icon: "⚡", color: "sage", title: "Built for scale", desc: "BullMQ + Upstash Redis means parallel pipelines, retries, and zero dropped leads." },
            ].map(f => (
              <div key={f.title} className="pipeline-step">
                <div className={`step-icon-wrap step-icon-${f.color}`}>{f.icon}</div>
                <h3 className="display-sm">{f.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.65" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" style={{ position: "relative", zIndex: 1, margin: "0 2rem" }} />

      {/* ── How it works ── */}
      <section id="how-it-works" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container" style={{ maxWidth: "820px" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <p className="section-label">How It Works</p>
            <h2 className="display-xl">
              Four steps.<br />
              <span className="italic" style={{ color: "var(--saffron)" }}>Three minutes.</span>
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              { num: "01", title: "Prospect fills your form", desc: "Name, company, website, industry, and their biggest operational challenge. Sixty seconds." },
              { num: "02", title: "We research their company", desc: "Four data sources run in parallel — Clearbit for the logo, Wikipedia for the story, DuckDuckGo for context, Cheerio for their website." },
              { num: "03", title: "Gemini writes the report", desc: "All enriched context becomes a structured prompt. Gemini 1.5 Flash returns a scored, personalized audit with real opportunities — not templates." },
              { num: "04", title: "Report in their inbox", desc: "Puppeteer renders a branded 8–10 page PDF. Resend delivers it with a preview email. The whole thing happens while they're still reading your landing page." },
            ].map((step, i) => (
              <div key={step.num} style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr",
                gap: "2rem",
                padding: "2rem 0",
                borderBottom: i < 3 ? "1px solid var(--warm-gray)" : "none",
              }}>
                <div style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  color: "var(--warm-gray)",
                  lineHeight: 1,
                  paddingTop: "4px",
                }}>
                  {step.num}
                </div>
                <div>
                  <h3 className="display-sm" style={{ marginBottom: "0.6rem" }}>{step.title}</h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.75" }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" style={{ position: "relative", zIndex: 1, margin: "0 2rem" }} />

      {/* ── Testimonials ── */}
      <section id="testimonials" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p className="section-label">Testimonials</p>
            <h2 className="display-xl">
              What teams are saying.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem" }}>
            {[
              { quote: "The prospect replied within 10 minutes of the report landing. They said it was the most thoughtful outreach they'd ever received.", name: "Priya S.", role: "Head of Sales, B2B SaaS" },
              { quote: "We replaced our 2-hour manual research process with arth.ai. First-touch quality actually went up.", name: "Rahul M.", role: "Founder, Consulting Firm" },
              { quote: "It doesn't feel like AI. It feels like someone actually sat down and wrote this for that specific company.", name: "Aisha K.", role: "Growth Lead, FinTech Startup" },
            ].map(t => (
              <div key={t.name} style={{
                background: "var(--ivory)",
                border: "1px solid var(--warm-gray)",
                borderRadius: "var(--radius-lg)",
                padding: "2rem",
              }}>
                <div style={{ fontSize: "1.75rem", color: "var(--saffron)", lineHeight: 1, marginBottom: "1rem", fontFamily: "serif" }}>"</div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.75", marginBottom: "1.5rem" }}>
                  {t.quote}
                </p>
                <div style={{ borderTop: "1px solid var(--warm-gray)", paddingTop: "1rem" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" style={{ position: "relative", zIndex: 1, margin: "0 2rem" }} />

      {/* ── CTA ── */}
      <section id="get-started" className="section" style={{ position: "relative", zIndex: 1 }}>
        <div className="container" style={{ maxWidth: "640px", textAlign: "center" }}>
          <div style={{
            background: "var(--charcoal)",
            borderRadius: "var(--radius-xl)",
            padding: "4.5rem 3rem",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: "500px", height: "250px",
              background: "radial-gradient(ellipse, rgba(197,139,69,0.2) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", marginBottom: "1rem", position: "relative" }}>
              Get started free
            </p>
            <h2 className="display-lg" style={{ color: "white", marginBottom: "1.1rem", position: "relative" }}>
              Your next prospect deserves<br />a personal touch.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2.5rem", fontSize: "0.95rem", lineHeight: "1.75", position: "relative" }}>
              Submit your company details and get a free AI intelligence audit — no account required, delivered in under 3 minutes.
            </p>
            <Link href="/form" className="btn btn-saffron btn-lg" style={{ position: "relative" }}>
              Get your free report →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid var(--warm-gray)", padding: "1.75rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "-0.02em" }}>
          <div className="logo-badge">a</div>
          arth.ai
        </div>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          AI-powered inbound personalization · {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
