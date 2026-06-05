"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import InteractiveDemo from "@/components/InteractiveDemo";
import ParticleBackground from "@/components/ParticleBackground";
import CustomCursor from "@/components/CustomCursor";
import MagneticButton from "@/components/MagneticButton";
import SpotlightCard from "@/components/SpotlightCard";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";

function AnimatedCounter({ value, duration = 2000 }: { value: number, duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number;
    let animationFrame: number;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(p * value));
      if (p < 1) animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
}

function LiveToasts() {
  const [toast, setToast] = useState<{ name: string, company: string } | null>(null);
  useEffect(() => {
    const names = ["Alex", "Sarah", "David", "Elena", "Michael", "James", "Emma", "Olivia"];
    const companies = ["TechFlow", "OmniStack", "Syncio", "Acme", "Globex", "Stripe", "Linear", "Vercel"];
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        setToast({ name: names[Math.floor(Math.random() * names.length)], company: companies[Math.floor(Math.random() * companies.length)] });
        setTimeout(() => setToast(null), 4000);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{ position: "fixed", bottom: 80, right: 24, zIndex: 100, background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 12 }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3E7A2E", animation: "pulse 2s infinite" }} />
          <div style={{ fontSize: 13, color: "var(--text-primary)" }}><strong>{toast.name}</strong> from <strong>{toast.company}</strong> just generated a report.</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
  const [navHidden, setNavHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setNavHidden(true);
    } else {
      setNavHidden(false);
    }
  });

  const p = PERSONAS[persona];

  return (
    <div style={{ color: "var(--text-primary)", minHeight: "100vh", fontFamily: "Geist, sans-serif", overflowX: "hidden" }}>
      <CustomCursor />
      <ParticleBackground />
      <LiveToasts />

      {/* Live Intent Pulse — bottom left */}
      <div style={{
        position: "fixed", bottom: 24, left: 24, zIndex: 50,
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--bg)", backdropFilter: "blur(12px)",
        border: "1px solid var(--border)", borderRadius: 9999,
        padding: "6px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }} className="hidden-mobile">
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbba6f", display: "inline-block", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>{p.pulse}</span>
      </div>

      {/* Ghost Persona Toggle — bottom right */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 50,
        display: "flex", background: "rgba(240,237,237,0.92)", backdropFilter: "blur(12px)",
        border: "1px solid var(--border)", borderRadius: 9999,
        padding: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        {(["Founder", "CTO", "Marketer"] as PersonaKey[]).map((key) => (
          <button key={key} onClick={() => setPersona(key)} style={{
            padding: "6px 16px", borderRadius: 9999, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            background: persona === key ? "#ffffff" : "transparent",
            color: persona === key ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow: persona === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.2s",
          }}>{key}</button>
        ))}
      </div>

      {/* Navbar */}
      <motion.nav
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={navHidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          height: 80, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 64px", background: "var(--bg)",
          backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/" style={{ fontFamily: "Newsreader, serif", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", textDecoration: "none", letterSpacing: "-0.01em" }}>ArthAI</Link>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <Link href="#product" style={{ fontSize: 16, color: "var(--text-secondary)", textDecoration: "none", fontWeight: 400 }}>Product</Link>
          <Link href="#solutions" style={{ fontSize: 16, color: "var(--text-secondary)", textDecoration: "none", fontWeight: 400 }}>Solutions</Link>
          <Link href="#philosophy" style={{ fontSize: 16, color: "var(--text-secondary)", textDecoration: "none", fontWeight: 400 }}>Philosophy</Link>
          <Link href="#pricing" style={{ fontSize: 16, color: "var(--text-secondary)", textDecoration: "none", fontWeight: 400 }}>Pricing</Link>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontSize: 16, color: "var(--text-secondary)", textDecoration: "none", fontWeight: 500, marginRight: 8 }}>Dashboard</Link>
          <Link href="/dashboard" style={{ background: "transparent", border: "none", fontSize: 16, color: "var(--text-secondary)", textDecoration: "none", cursor: "pointer" }}>Login</Link>
          <Link href="/form" style={{ background: "#845411", color: "#fff", padding: "12px 24px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none", transition: "all 0.3s" }}>Book a Demo</Link>
        </div>
      </motion.nav>

      <main style={{ paddingTop: 128 }}>

        {/* ── HERO ── */}
        <section style={{ padding: "80px 64px 120px", maxWidth: 1280, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.2 } }
            }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } } }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 9999, background: "var(--surface-raised)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", marginBottom: 32 }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbba6f", display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Quiet Intelligence</span>
              </motion.div>
            </motion.div>

            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } } }}
              style={{ fontFamily: "Newsreader, serif", fontSize: "clamp(40px,6vw,64px)", lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: 400, color: "var(--text-primary)", maxWidth: 800, marginBottom: 24 }}
            >
              ArthAI: The Quiet Standard for Adaptive Experiences.
            </motion.h1>

            <motion.p 
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } } }}
              style={{ fontSize: 18, lineHeight: "28px", color: "var(--text-secondary)", maxWidth: 600, marginBottom: 24 }}
            >
              ArthAI helps you understand what your visitors need the moment they arrive, so you can give them a hand without being pushy.
            </motion.p>

            <motion.div 
              variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } } }}
              style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}
            >
              <MagneticButton>
                <Link href="/form" style={{ display: "inline-block", background: "#845411", color: "#fff", padding: "16px 32px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none" }}>Experience Adaptive AI</Link>
              </MagneticButton>
              <MagneticButton>
                <Link href="/form" style={{ display: "inline-block", background: "transparent", color: "var(--text-primary)", border: "1px solid #d5c3b3", padding: "16px 32px", borderRadius: 8, fontSize: 16, fontWeight: 500, textDecoration: "none" }}>Book a Demo</Link>
              </MagneticButton>
            </motion.div>
          </motion.div>

          <div style={{ marginTop: 64, width: "100%", display: "flex", justifyContent: "center" }}>
            <InteractiveDemo />
          </div>

          {/* Trust signals */}
          <div style={{ marginTop: 80, width: "100%" }}>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3E7A2E", animation: "pulse 2s infinite" }} />
              Trusted by <strong style={{ color: "var(--text-primary)" }}><AnimatedCounter value={1204} /></strong> teams. Privacy-first by design.
            </p>
            <div className="marquee-container" style={{ overflow: "hidden", whiteSpace: "nowrap", width: "100%", position: "relative" }}>
              <div className="marquee-content" style={{ display: "inline-block", animation: "marquee 30s linear infinite" }}>
                {["Vercel", "Supabase", "Stripe", "Linear", "Raycast", "Figma", "OpenAI", "Vercel", "Supabase", "Stripe", "Linear", "Raycast", "Figma", "OpenAI"].map((b, i) => (
                  <span key={i} style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 40px", color: "var(--text-primary)", opacity: 0.6, display: "inline-block" }}>{b}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── QUIET INTELLIGENCE IN MOTION ── */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--bg)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 16 }}>Quiet Intelligence in Motion</h2>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto 40px" }}>Experience how subtle contextual shifts create a tailored journey for different personas.</p>

            {/* Inline persona tabs */}
            <div style={{ display: "inline-flex", background: "var(--surface)", borderRadius: 9999, padding: 4, marginBottom: 48 }}>
              {(["Founder", "CTO", "Marketer"] as PersonaKey[]).map((key) => (
                <button key={key} onClick={() => setPersona(key)} style={{
                  padding: "8px 24px", borderRadius: 9999, border: "none", cursor: "pointer",
                  fontSize: 16, fontWeight: 500,
                  background: persona === key ? "#ffffff" : "transparent",
                  color: persona === key ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: persona === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}>{key}</button>
              ))}
            </div>

            {/* Dynamic persona card */}
            <div style={{ maxWidth: 800, margin: "0 auto", background: "var(--surface-raised)", backdropFilter: "blur(16px)", border: "1px solid var(--border)", borderRadius: 16, padding: 48, textAlign: "left", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: "linear-gradient(90deg, #fbba6f, transparent)" }} />
              <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(132,84,17,0.1)", color: "#845411", borderRadius: 9999, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 16 }}>{p.badge}</span>
              <h3 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 16, transition: "all 0.3s" }}>{p.title}</h3>
              <p style={{ fontSize: 18, color: "var(--text-secondary)", lineHeight: "28px", marginBottom: 24, transition: "all 0.3s" }}>{p.desc}</p>
              <button style={{ background: "transparent", border: "none", fontSize: 16, fontWeight: 500, color: "#845411", cursor: "pointer" }}>{p.cta}</button>
            </div>
          </div>
        </motion.section>

        {/* ── THE TRANSFORMATION ── */}
        <motion.section 
          id="product"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--surface-raised)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>The Transformation</h2>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto 48px" }}>Move from static, one-size-fits-all pages to dynamic, breathing experiences.</p>
            <div style={{ borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", maxWidth: 1000, margin: "0 auto", background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(16px)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {[{ label: "Before", bg: "var(--surface-raised)", items: ["Generic hero headline", "Same CTA for everyone", "No visitor context", "One-size-fits-all copy"] },
                  { label: "After", bg: "rgba(255, 249, 240, 0.8)", items: ["Persona-matched headline", "Adaptive CTAs in real-time", "Full visitor intelligence", "Hyper-personalized journey"] }].map(({ label, bg, items }) => (
                  <div key={label} style={{ padding: 40, background: bg, borderRight: label === "Before" ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: label === "After" ? "#845411" : "var(--text-muted)", marginBottom: 20 }}>{label}</div>
                    {items.map((item) => (
                      <div key={item} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <span style={{ fontSize: 16, color: label === "After" ? "#845411" : "var(--text-muted)" }}>{label === "After" ? "✓" : "✗"}</span>
                        <span style={{ fontSize: 15, color: label === "After" ? "var(--text-primary)" : "var(--text-muted)" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── CONTEXTUAL ADAPTATION ── */}
        <motion.section 
          id="solutions"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--bg)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>Contextual Adaptation</h2>
              <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>Watch how the interface subtly shifts to meet the distinct needs of every visitor.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 24 }}>
              {[
                { icon: "rocket_launch", title: "If you're building software", desc: "A SaaS Founder enters and immediately sees startup-focused messaging, highlighting rapid integration and scalability.", intent: "Intent: High" },
                { icon: "domain", title: "If you're a big company", desc: "An Enterprise leader arrives and the interface brings SOC2 compliance, SLA guarantees, and dedicated support to the forefront.", intent: "Intent: Research" },
                { icon: "shopping_cart", title: "If you're selling online", desc: "An E-commerce director visits and the site shifts to showcase conversion rate lifts, cart abandonment recovery, and reliability.", intent: "Intent: Evaluation" },
                { icon: "person_search", title: "If you're looking for talent", desc: "A Talent Acquisition specialist explores and the narrative revolves around employer branding and seamless ATS syncing.", intent: "Intent: Discovery" },
              ].map(({ icon, title, desc, intent }) => (
                <SpotlightCard key={title} style={{ background: "var(--surface-raised)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, padding: 32, display: "flex", flexDirection: "column", gap: 16, transition: "all 0.3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="material-symbols-outlined" style={{ color: "#fbba6f", fontSize: 24 }}>{icon}</span>
                    <h3 style={{ fontFamily: "Geist, sans-serif", fontSize: 18, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{title}</h3>
                  </div>
                  <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: "24px", flex: 1 }}>{desc}</p>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>{intent}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#845411" }}>See how it looks →</span>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── THE RIPPLE EFFECT ── */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--bg)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>The Ripple Effect</h2>
              <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto" }}>See how a single visitor action seamlessly updates your entire ecosystem in real-time.</p>
            </div>
            <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
              <img src="/ripple-effect.png" alt="The Ripple Effect Pipeline" style={{ width: "100%", height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid var(--border)" }} />
            </div>
          </div>
        </motion.section>

        {/* ── HOW WE HELP YOU CONNECT ── */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 64px", borderTop: "1px solid var(--border)" }}
        >
          <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", textAlign: "center", marginBottom: 64 }}>How we help you connect</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: 1, background: "var(--border)", zIndex: 0 }} />
            {[
              { icon: "login", label: "They arrive", color: "var(--surface)" },
              { icon: "search_insights", label: "We learn", color: "var(--surface-raised)" },
              { icon: "auto_fix_high", label: "We adapt", color: "#fff9f0" },
              { icon: "view_quilt", label: "They feel at home", color: "var(--surface-raised)" },
              { icon: "trending_up", label: "They join you", color: "rgba(27, 27, 27, 0.9)" },
            ].map(({ icon, label, color }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "relative", zIndex: 1, background: "transparent", padding: "0 12px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: color, backdropFilter: "blur(8px)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: color === "rgba(27, 27, 27, 0.9)" ? "#fff" : "var(--text-secondary)" }}>{icon}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── PRIVACY BY DESIGN ── */}
        <motion.section 
          id="philosophy"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--surface-raised)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>Privacy by Design</h2>
              <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto" }}>We believe in understanding intent without compromising identity. Here is exactly what we track and what we protect.</p>
            </div>
            <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
              <img src="/privacy-trust-map.png" alt="Interactive Trust Map" style={{ width: "100%", height: "auto", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid var(--border)" }} />
            </div>
          </div>
        </motion.section>

        {/* ── TESTIMONIALS ── */}
        <motion.section 
          id="testimonials"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--bg)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 48 }}>Loved by Adaptive Teams</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32 }}>
              {[
                { quote: "ArthAI replaced 3 different intent tools for us. The automated personalization is literally magic. Our conversion rate jumped 40% in two weeks.", author: "Sarah Jenkins", role: "Founder & CEO, TechFlow" },
                { quote: "Finally, a tool that respects our infrastructure. The API is robust, SOC2 ready, and it hasn't added a single millisecond to our load times.", author: "David Chen", role: "CTO, OmniStack" },
                { quote: "We used to send the same email sequence to everyone. Now, ArthAI reads the exact signals and tailors the outreach. It's like having a 10x SDR.", author: "Elena Rostova", role: "VP of Growth, Syncio" },
              ].map((t, i) => (
                <div key={i} style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(16px)", border: "1px solid var(--border)", borderRadius: 16, padding: 32, textAlign: "left", position: "relative" }}>
                  <div style={{ color: "#fbba6f", fontSize: 32, fontFamily: "serif", lineHeight: 1, marginBottom: 16 }}>"</div>
                  <p style={{ fontSize: 16, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 24, fontStyle: "italic" }}>{t.quote}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--border)", overflow: "hidden" }}>
                       <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${t.author.replace(' ','')}`} alt={t.author} style={{ width: "100%", height: "100%" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{t.author}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── PRICING ── */}
        <motion.section 
          id="pricing"
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: "var(--surface-raised)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "80px 64px" }}
        >
          <div style={{ maxWidth: 1280, margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "Newsreader, serif", fontSize: 32, fontWeight: 400, color: "var(--text-primary)", marginBottom: 12 }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto 48px" }}>Start for free. Scale when you grow.</p>
            <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, width: 320, textAlign: "left" }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Starter</div>
                <div style={{ fontSize: 40, fontFamily: "Newsreader, serif", color: "var(--text-primary)", marginBottom: 24 }}>$0<span style={{ fontSize: 16, color: "var(--text-secondary)" }}>/mo</span></div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, gap: 12, display: "flex", flexDirection: "column" }}>
                  <li style={{ fontSize: 14, color: "var(--text-secondary)" }}>✓ 100 intelligence reports</li>
                  <li style={{ fontSize: 14, color: "var(--text-secondary)" }}>✓ Basic intent signals</li>
                </ul>
                <Link href="/form" style={{ display: "block", textAlign: "center", background: "var(--surface)", color: "var(--text-primary)", padding: "12px", borderRadius: 8, marginTop: 32, textDecoration: "none", fontWeight: 500 }}>Get Started</Link>
              </div>
              <div style={{ background: "#845411", color: "#fff", borderRadius: 16, padding: 40, width: 320, textAlign: "left", position: "relative" }}>
                <div style={{ position: "absolute", top: 12, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: "rgba(255,255,255,0.2)", padding: "4px 8px", borderRadius: 999 }}>Popular</div>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Pro</div>
                <div style={{ fontSize: 40, fontFamily: "Newsreader, serif", marginBottom: 24 }}>$99<span style={{ fontSize: 16, opacity: 0.8 }}>/mo</span></div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, gap: 12, display: "flex", flexDirection: "column" }}>
                  <li style={{ fontSize: 14 }}>✓ Unlimited reports</li>
                  <li style={{ fontSize: 14 }}>✓ Deep visual intelligence</li>
                  <li style={{ fontSize: 14 }}>✓ Real-time webhooks</li>
                </ul>
                <Link href="/form" style={{ display: "block", textAlign: "center", background: "#fff", color: "#845411", padding: "12px", borderRadius: 8, marginTop: 32, textDecoration: "none", fontWeight: 600 }}>Start Free Trial</Link>
              </div>
            </div>
          </div>
        </motion.section>

      </main>

      {/* Footer */}
      <footer style={{ background: "rgba(240, 237, 237, 0.6)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "32px 64px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontFamily: "Newsreader, serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>ArthAI</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {["Privacy Policy", "Terms of Service", "Security", "Contact"].map((l) => (
              <Link key={l} href="#" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-secondary)", textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>© 2024 ArthAI. Purpose in Intelligence.</div>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @media(max-width:768px){.hidden-mobile{display:none!important}}
      `}</style>
    </div>
  );
}
