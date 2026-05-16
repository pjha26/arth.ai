"use client";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <span className="logo-dot" />
          arth<span style={{ color: "var(--accent-violet)" }}>.ai</span>
        </a>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <a
            href="#how-it-works"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            How it works
          </a>
          <Link href="/form" className="btn btn-primary btn-sm">
            Get Free Audit →
          </Link>
        </div>
      </nav>

      <div className="page-wrapper">
        {/* ── Hero ── */}
        <section className="hero-section">
          <div
            className="badge badge-indigo animate-fade-up"
            style={{ marginBottom: "1.5rem" }}
          >
            <span className="badge-dot" />
            AI-Powered Inbound Personalization
          </div>

          <h1
            className="heading-xl animate-fade-up delay-100"
            style={{ marginBottom: "1.5rem" }}
          >
            Your prospect reaches out.
            <br />
            <span className="text-gradient">
              We deliver the insight.
            </span>
          </h1>

          <p
            className="animate-fade-up delay-200"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "var(--text-secondary)",
              maxWidth: "620px",
              lineHeight: "1.7",
              marginBottom: "2.5rem",
            }}
          >
            Clay enriches your list. Apollo fires cold emails.{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              arth.ai does something different.
            </strong>{" "}
            The moment a prospect fills your form, we research their company,
            generate a hyper-personalized AI audit, and deliver it to their
            inbox — before a single human gets involved.
          </p>

          <div
            className="animate-fade-up delay-300"
            style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            <Link href="/form" className="btn btn-primary btn-lg">
              Get Your Free AI Audit →
            </Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              See How It Works
            </a>
          </div>

          {/* Floating visual */}
          <div
            className="animate-fade-up delay-500"
            style={{
              marginTop: "4rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              { label: "Avg. Delivery Time", value: "< 3 min" },
              { label: "Data Sources Checked", value: "4+" },
              { label: "Report Pages", value: "8–10" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass-card"
                style={{
                  padding: "1.25rem 2rem",
                  textAlign: "center",
                  minWidth: "150px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    background:
                      "linear-gradient(135deg, var(--accent-indigo), var(--accent-violet))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginTop: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Inbound vs Outbound ── */}
        <section className="section container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--accent-indigo)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              The Differentiator
            </p>
            <h2 className="heading-lg">
              Not <span className="text-gradient">outbound</span>.
              <br />
              <span className="text-gradient-cyan">Inbound intelligence.</span>
            </h2>
          </div>

          <div className="vs-grid">
            {/* Outbound */}
            <div className="vs-card outbound">
              <div className="vs-label red">Outbound Tools</div>
              <p
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                }}
              >
                Clay, Apollo, Hunter
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  "You have a list of leads",
                  "You push enrichment manually",
                  "Cold outreach at scale",
                  "Prospect doesn't know you yet",
                  "Low first-touch personalization",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      fontSize: "0.88rem",
                      color: "var(--text-secondary)",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: "#f87171", flexShrink: 0 }}>✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* VS */}
            <div className="vs-divider">VS</div>

            {/* Inbound */}
            <div className="vs-card inbound">
              <div className="vs-label indigo">arth.ai (Inbound)</div>
              <p
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                }}
              >
                Prospect comes to you
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  "Prospect fills your form",
                  "Enrichment triggers automatically",
                  "AI report generated in minutes",
                  "Personalized value before first call",
                  "Hyper-relevant, zero manual effort",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      gap: "0.6rem",
                      fontSize: "0.88rem",
                      color: "var(--text-secondary)",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: "var(--success)", flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="section container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--accent-indigo)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              The Pipeline
            </p>
            <h2 className="heading-lg">
              From form to inbox{" "}
              <span className="text-gradient">in under 3 minutes</span>
            </h2>
          </div>

          <div className="pipeline-grid">
            {[
              {
                icon: "📝",
                num: "01",
                title: "Prospect Submits Form",
                desc: "They fill in their company details and biggest challenge. Takes 60 seconds.",
              },
              {
                icon: "🔍",
                num: "02",
                title: "Autonomous Enrichment",
                desc: "arth.ai queries Clearbit, Wikipedia, DuckDuckGo, and scrapes their website in parallel.",
              },
              {
                icon: "🧠",
                num: "03",
                title: "Gemini AI Analysis",
                desc: "All context fed to Gemini 1.5 Flash. Generates scored insights, opportunities, and next steps.",
              },
              {
                icon: "📄",
                num: "04",
                title: "PDF Report Compiled",
                desc: "A branded, 8-10 page audit report rendered with Puppeteer. Pixel-perfect and professional.",
              },
              {
                icon: "📬",
                num: "05",
                title: "Delivered to Inbox",
                desc: "Resend delivers the report via email with a branded preview of key findings — attached as PDF.",
              },
              {
                icon: "🗃️",
                num: "06",
                title: "Logged & Archived",
                desc: "Lead data logged to Google Sheets. PDF backed up to Google Drive with a shareable link.",
              },
            ].map((step) => (
              <div key={step.num} className="pipeline-step">
                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
                >
                  <div className="step-icon">{step.icon}</div>
                  <span className="step-number">{step.num}</span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.05rem",
                    fontWeight: 700,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    lineHeight: "1.6",
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          className="section container"
          style={{ textAlign: "center" }}
        >
          <div
            className="glass-card"
            style={{
              padding: "4rem 2rem",
              background:
                "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(99,102,241,0.12) 0%, rgba(7,7,15,0.3) 100%)",
              borderColor: "rgba(99,102,241,0.3)",
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            <h2
              className="heading-md"
              style={{ marginBottom: "1rem" }}
            >
              Ready to see it in action?
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                marginBottom: "2rem",
                fontSize: "1rem",
                lineHeight: "1.7",
              }}
            >
              Submit your company details and receive a free AI intelligence
              audit in your inbox — completely automated, zero strings attached.
            </p>
            <Link href="/form" className="btn btn-primary btn-lg">
              Get My Free AI Audit →
            </Link>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                marginTop: "1rem",
              }}
            >
              No account required · Delivered in &lt; 3 minutes
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
          }}
        >
          <span>
            <strong style={{ color: "var(--text-secondary)" }}>arth.ai</strong>{" "}
            — AI-powered inbound personalization platform
          </span>
          <span style={{ margin: "0 1rem", opacity: 0.4 }}>·</span>
          <span>Built for SimplifIQ Assessment · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </>
  );
}
