"use client";
import React, { useState } from "react";
import Link from "next/link";

const PERSONAS = {
  Founder: {
    badge: "Detected: Startup Founder",
    title: "Ship faster, learn quicker.",
    desc: "We know you're moving fast. Here's how our API integrates in under 5 minutes to help you find product-market fit without slowing down.",
    cta: "Read the Founder Guide →",
    pulse: "Analyzing founder intent...",
  },
  CTO: {
    badge: "Detected: Engineering Leader",
    title: "Infrastructure that scales with you.",
    desc: "99.9% uptime, SOC2-ready APIs, and full audit logs. ArthAI plugs into your existing stack — no re-architecture required.",
    cta: "Read the CTO Guide →",
    pulse: "Analyzing engineering intent...",
  },
  Marketer: {
    badge: "Detected: Growth Marketer",
    title: "Turn intent signals into pipeline.",
    desc: "Stop sending the same message to everyone. ArthAI reads real-time visitor signals so your campaigns land at the perfect moment.",
    cta: "Read the Marketer Guide →",
    pulse: "Analyzing growth intent...",
  },
} as const;

type PersonaKey = keyof typeof PERSONAS;

export default function LandingPage() {
  const [persona, setPersona] = useState<PersonaKey>("Founder");
  const [company, setCompany] = useState("");
  const p = PERSONAS[persona];

  return (
    <div style={{ background: "#fcf9f8", color: "#1b1b1b", minHeight: "100vh", fontFamily: "Geist, sans-serif", overflowX: "hidden" }}>

      {/* Live Intent Pulse — bottom left */}
      <div style={{
        position: "fixed", bottom: 24, left: 24, zIndex: 50,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(252,249,248,0.92)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(213,195,179,0.5)", borderRadius: 9999,
        padding: "6px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }} className="hidden-mobile">
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbba6f", display: "inline-block", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#514538" }}>{p.pulse}</span>
      </div>

      {/* Ghost Persona Toggle — bottom right */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 50,
        display: "flex", background: "rgba(240,237,237,0.92)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(213,195,179,0.5)", borderRadius: 9999,
        padding: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {(["Founder", "CTO", "Marketer"] as PersonaKey[]).map((key) => (
          <button key={key} onClick={() => setPersona(key)} style={{
            padding: "6px 16px", borderRadius: 9999, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            background: persona === key ? "#ffffff" : "transparent",
            color: persona === key ? "#1b1b1b" : "#514538",
            boxShadow: persona === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s",
          }}>{key}</button>
        ))}
      </div>

      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 80, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 64px", background: "rgba(252,249,248,0.85)",
        backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(213,195,179,0.3)",
      }}>
        <Link href="/" style={{ fontFamily: "Newsreader, serif", fontSize: 24, fontWeight: 700, color: "#1b1b1b", textDecoration: "none", letterSpacing: "-0.01em" }}>ArthAI</Link>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {["Product", "Solutions", "Philosophy", "Pricing"].map((l) => (
            <Link key={l} href="#" style={{ fontSize: 16, color: "#514538", textDecoration: "none", fontWeight: 400 }}>{l}</Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontSize: 16, color: "#514538", textDecoration: "none", fontWeight: 500, marginRight: 8 }}>Dashboard</Link>
          <button style={{ background: "transparent", border: "none", fontSize: 16, color: "#514538", cursor: "pointer" }}>Login</button>
          <Link href="/form" style={{ background: "#845411", color: "#fff", padding: "12px 24px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none", transition: "all 0.3s" }}>Book a Demo</Link>
        </div>
      </nav>

      <main style={{ paddingTop: 128 }}>

        {/* ── HERO ── */}
        <section style={{ padding: "80px 64px 120px", maxWidth: 1280, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 9999, background: "#f6f3f2", border: "1px solid rgba(213,195,179,0.5)", marginBottom: 32 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbba6f", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#514538" }}>Quiet Intelligence</span>
          </div>

          <h1 style={{ fontFamily: "Newsreader, serif", fontSize: "clamp(40px,6vw,64px)", lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: 400, color: "#1b1b1b", maxWidth: 800, marginBottom: 24 }}>
            ArthAI: The Quiet Standard for Adaptive Experiences.
          </h1>

          <p style={{ fontSize: 18, lineHeight: "28px", color: "#514538", maxWidth: 600, marginBottom: 24 }}>
            ArthAI helps you understand what your visitors need the moment they arrive, so you can give them a hand without being pushy.
          </p>

          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/form" style={{ background: "#845411", color: "#fff", padding: "16px 32px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none" }}>Experience Adaptive AI</Link>
            <Link href="/form" style={{ background: "transparent", color: "#1b1b1b", border: "1px solid #d5c3b3", padding: "16px 32px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none" }}>Book a Demo</Link>
          </div>

          {/* Company Search Card */}
          <div style={{ marginTop: 64, width: "100%", maxWidth: 700, background: "#ffffff", border: "1px solid #e5e2e1", borderRadius: 16, padding: "2rem", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontFamily: "Newsreader, serif", fontSize: 20, fontWeight: 500, color: "#1b1b1b", marginBottom: 8 }}>Try the personalization engine live</h3>
            <p style={{ fontSize: 14, color: "#514538", marginBottom: 20 }}>Type any company name (e.g. Netflix, Stripe) to see ArthAI personalize the page instantly.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (company) window.location.href = "/" + encodeURIComponent(company.toLowerCase().replace(/\s+/g, "")); }}
              style={{ display: "flex", gap: 12 }}>
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Enter a company name..." required
                style={{ flex: 1, padding: "12px 16px", border: "1.5px solid #d5c3b3", borderRadius: 8, fontSize: 16, outline: "none", fontFamily: "Geist, sans-serif", background: "#fcf9f8" }} />
              <button type="submit" style={{ background: "#845411", color: "#fff", padding: "12px 24px", borderRadius: 8, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer" }}>Generate →</button>
            </form>
          </div>

          {/* Trust signals */}
          <div style={{ marginTop: 80, width: "100%" }}>
            <p style={{ fontSize: 16, color: "#514538", marginBottom: 24 }}>Built for modern SaaS teams. Privacy-first by design.</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 48, opacity: 0.5, filter: "grayscale(1)" }}>
              {["Acme Corp", "Globex", "SOYLENT", "Initech", "Umbrella"].map((b) => (
                <span key={b} style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── QUIET INTELLIGENCE IN MOTION ── */}
        <section style={{ background: "#fcf9f8", borderTop: "1px solid rgba(213,195,179,0.3)", padding: "80px 64px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", marginBottom: 16 }}>Quiet Intelligence in Motion</h2>
            <p style={{ fontSize: 16, color: "#514538", maxWidth: 600, margin: "0 auto 40px" }}>Experience how subtle contextual shifts create a tailored journey for different personas.</p>

            {/* Inline persona tabs */}
            <div style={{ display: "inline-flex", background: "#f0eded", borderRadius: 9999, padding: 4, marginBottom: 48 }}>
              {(["Founder", "CTO", "Marketer"] as PersonaKey[]).map((key) => (
                <button key={key} onClick={() => setPersona(key)} style={{
                  padding: "8px 24px", borderRadius: 9999, border: "none", cursor: "pointer",
                  fontSize: 16, fontWeight: 500,
                  background: persona === key ? "#ffffff" : "transparent",
                  color: persona === key ? "#1b1b1b" : "#514538",
                  boxShadow: persona === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}>{key}</button>
              ))}
            </div>

            {/* Dynamic persona card */}
            <div style={{ maxWidth: 800, margin: "0 auto", background: "#f6f3f2", border: "1px solid rgba(213,195,179,0.5)", borderRadius: 16, padding: 48, textAlign: "left", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: "linear-gradient(90deg, #fbba6f, transparent)" }} />
              <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(132,84,17,0.1)", color: "#845411", borderRadius: 9999, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>{p.badge}</span>
              <h3 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", marginBottom: 16, transition: "all 0.3s" }}>{p.title}</h3>
              <p style={{ fontSize: 18, color: "#514538", lineHeight: "28px", marginBottom: 24, transition: "all 0.3s" }}>{p.desc}</p>
              <button style={{ background: "transparent", border: "none", fontSize: 16, fontWeight: 500, color: "#845411", cursor: "pointer" }}>{p.cta}</button>
            </div>
          </div>
        </section>

        {/* ── THE TRANSFORMATION ── */}
        <section style={{ background: "#f6f3f2", borderTop: "1px solid rgba(213,195,179,0.3)", padding: "80px 64px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", marginBottom: 12 }}>The Transformation</h2>
            <p style={{ fontSize: 16, color: "#514538", maxWidth: 600, margin: "0 auto 48px" }}>Move from static, one-size-fits-all pages to dynamic, breathing experiences.</p>
            <div style={{ borderRadius: 16, border: "1px solid rgba(213,195,179,0.3)", overflow: "hidden", maxWidth: 1000, margin: "0 auto", background: "#fff" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {[{ label: "Before", bg: "#f6f3f2", items: ["Generic hero headline", "Same CTA for everyone", "No visitor context", "One-size-fits-all copy"] },
                  { label: "After", bg: "#fff9f0", items: ["Persona-matched headline", "Adaptive CTAs in real-time", "Full visitor intelligence", "Hyper-personalized journey"] }].map(({ label, bg, items }) => (
                  <div key={label} style={{ padding: 40, background: bg, borderRight: label === "Before" ? "1px solid rgba(213,195,179,0.3)" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: label === "After" ? "#845411" : "#837567", marginBottom: 20 }}>{label}</div>
                    {items.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <span style={{ fontSize: 16, color: label === "After" ? "#845411" : "#837567" }}>{label === "After" ? "✓" : "✗"}</span>
                        <span style={{ fontSize: 15, color: label === "After" ? "#1b1b1b" : "#837567" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTEXTUAL ADAPTATION ── */}
        <section style={{ background: "#fcf9f8", borderTop: "1px solid rgba(213,195,179,0.3)", padding: "80px 64px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", marginBottom: 12 }}>Contextual Adaptation</h2>
              <p style={{ fontSize: 16, color: "#514538", maxWidth: 500, margin: "0 auto" }}>Watch how the interface subtly shifts to meet the distinct needs of every visitor.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24 }}>
              {[
                { icon: "rocket_launch", title: "If you're building software", desc: "A SaaS Founder enters and immediately sees startup-focused messaging, highlighting rapid integration and scalability.", intent: "Intent: High" },
                { icon: "domain", title: "If you're a big company", desc: "An Enterprise leader arrives and the interface brings SOC2 compliance, SLA guarantees, and dedicated support to the forefront.", intent: "Intent: Research" },
                { icon: "shopping_cart", title: "If you're selling online", desc: "An E-commerce director visits and the site shifts to showcase conversion rate lifts, cart abandonment recovery, and reliability.", intent: "Intent: Evaluation" },
                { icon: "person_search", title: "If you're looking for talent", desc: "A Talent Acquisition specialist explores and the narrative revolves around employer branding and seamless ATS syncing.", intent: "Intent: Discovery" },
              ].map(({ icon, title, desc, intent }) => (
                <div key={title} style={{ background: "#f6f3f2", border: "1px solid rgba(213,195,179,0.5)", borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", gap: 16, transition: "all 0.3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: "#fbba6f", fontSize: 24 }}>{icon}</span>
                    <h3 style={{ fontFamily: "Geist, sans-serif", fontSize: 18, fontWeight: 500, color: "#1b1b1b", letterSpacing: "-0.01em" }}>{title}</h3>
                  </div>
                  <p style={{ fontSize: 15, color: "#514538", lineHeight: "24px", flex: 1 }}>{desc}</p>
                  <div style={{ borderTop: "1px solid rgba(213,195,179,0.3)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#514538" }}>{intent}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#845411" }}>See how it looks →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE RIPPLE EFFECT ── */}
        <section style={{ background: "#fcf9f8", borderTop: "1px solid rgba(213,195,179,0.3)", padding: "80px 64px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", marginBottom: 12 }}>The Ripple Effect</h2>
              <p style={{ fontSize: 16, color: "#514538", maxWidth: 600, margin: "0 auto" }}>See how a single visitor action seamlessly updates your entire ecosystem in real-time.</p>
            </div>
            <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
              <img src="/ripple-effect.png" alt="The Ripple Effect Pipeline" style={{ width: "100%", height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(213,195,179,0.3)" }} />
            </div>
          </div>
        </section>

        {/* ── HOW WE HELP YOU CONNECT ── */}
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 64px", borderTop: "1px solid rgba(213,195,179,0.3)" }}>
          <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", textAlign: "center", marginBottom: 64 }}>How we help you connect</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 1, background: "rgba(213,195,179,0.3)", zIndex: 0 }} />
            {[
              { icon: "login", label: "They arrive", color: "#f0eded" },
              { icon: "search_insights", label: "We learn", color: "#f6f3f2" },
              { icon: "auto_fix_high", label: "We adapt", color: "#fff9f0" },
              { icon: "view_quilt", label: "They feel at home", color: "#f6f3f2" },
              { icon: "trending_up", label: "They join you", color: "#1b1b1b" },
            ].map(({ icon, label, color }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative", zIndex: 1, background: "#fcf9f8", padding: "0 12px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: color, border: "1px solid rgba(213,195,179,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: color === "#1b1b1b" ? "#fff" : "#514538" }}>{icon}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1b1b1b", whiteSpace: "nowrap" }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRIVACY BY DESIGN ── */}
        <section style={{ background: "#f6f3f2", borderTop: "1px solid rgba(213,195,179,0.3)", padding: "80px 64px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "#1b1b1b", marginBottom: 12 }}>Privacy by Design</h2>
              <p style={{ fontSize: 16, color: "#514538", maxWidth: 600, margin: "0 auto" }}>We believe in understanding intent without compromising identity. Here is exactly what we track and what we protect.</p>
            </div>
            <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
              <img src="/privacy-trust-map.png" alt="Interactive Trust Map" style={{ width: "100%", height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid rgba(213,195,179,0.3)" }} />
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ background: "#f0eded", borderTop: "1px solid rgba(213,195,179,0.3)", padding: "32px 64px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontFamily: "Newsreader, serif", fontSize: 22, fontWeight: 700, color: "#1b1b1b" }}>ArthAI</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {["Privacy Policy", "Terms of Service", "Security", "Contact"].map((l) => (
              <Link key={l} href="#" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "#514538", textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#514538" }}>© 2024 ArthAI. Purpose in Intelligence.</div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @media(max-width:768px){.hidden-mobile{display:none!important}}
      `}</style>
    </div>
  );
}
