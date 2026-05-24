"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const SUGGESTIONS = ["Try: Razorpay", "Try: Zepto", "Try: Notion", "Try: Figma"];
const LOADING_MESSAGES = [
  "🔍 Locating company data...",
  "🌐 Scanning digital presence...",
  "🧠 Running intelligence analysis...",
  "✦ Generating your preview...",
];

export default function InteractiveDemo() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "rate_limited">("idle");
  
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [shake, setShake] = useState(false);

  // Cycle suggestions
  useEffect(() => {
    if (query.length > 0) return;
    const interval = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [query]);

  // Cycle loading messages
  useEffect(() => {
    if (status !== "loading") return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 800);
    return () => clearInterval(interval);
  }, [status]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Reset state before new query
    setStatus("loading");
    setLoadingMsgIdx(0);
    setData(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.substring(0, 100) })
      });
      const result = await res.json();

      if (res.status === 429) {
        setStatus("rate_limited");
        setErrorMsg(result.message);
      } else if (!result.success) {
        setStatus("error");
        setErrorMsg(result.message);
      } else {
        setData(result.data);
        setStatus("success");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("We couldn't find enough data for that company. Try a well-known company name or paste their website URL.");
    }
  };

  const handleSuggestionClick = (text: string) => {
    const company = text.replace("Try: ", "");
    setQuery(company);
    setTimeout(() => {
      handleGenerate();
    }, 100);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      
      {/* Input Card */}
      <motion.div 
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        style={{
          background: "#FDFAF4",
          border: "1px solid #E8E0D0",
          borderRadius: 16,
          padding: "32px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
        }}
      >
        <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 28, fontWeight: 700, color: "#2C1A0E", marginBottom: 12 }}>
          Try the personalization engine live
        </h2>
        <p style={{ color: "#9C845F", fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
          Type any company name or website URL to see ArthAI generate a live intelligence preview instantly.
        </p>

        <form onSubmit={handleGenerate} style={{ display: "flex", gap: 12, position: "relative" }}>
          <motion.div 
            style={{ 
              flex: "0 0 70%", 
              position: "relative",
              borderRadius: 10,
              background: "#fff",
              border: `1.5px solid ${isFocused ? "#C4922A" : "#E8E0D0"}`,
              boxShadow: isFocused ? "0 0 0 4px rgba(196,146,42,0.15)" : "none",
            }}
            animate={{ borderColor: isFocused ? "#C4922A" : "#E8E0D0" }}
            transition={{ duration: 0.2 }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.substring(0, 100))}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter a company name or URL... e.g. Notion, Stripe"
              style={{
                width: "100%", height: "100%", padding: "16px",
                border: "none", background: "transparent",
                outline: "none", fontSize: 16, color: "#2C1A0E",
                borderRadius: 10
              }}
            />
          </motion.div>

          <button
            type="submit"
            disabled={status === "loading"}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              flex: "0 0 calc(30% - 12px)",
              background: "#C4922A",
              color: "#FDFAF4",
              border: "none",
              borderRadius: 10,
              fontFamily: "var(--font-fraunces), serif",
              fontSize: 16,
              fontWeight: 600,
              cursor: status === "loading" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s",
              boxShadow: isHovered && status !== "loading" ? "0 4px 12px rgba(196,146,42,0.3)" : "none",
              opacity: status === "loading" ? 0.8 : 1
            }}
          >
            {status === "loading" ? (
              <>
                <motion.span 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(253,250,244,0.3)", borderTopColor: "#FDFAF4", borderRadius: "50%" }}
                />
                Analyzing...
              </>
            ) : "Generate Preview →"}
          </button>
        </form>

        <div style={{ height: 24, marginTop: 12, position: "relative" }}>
          <AnimatePresence>
            {query.length === 0 && (
              <motion.div
                key={suggestionIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                style={{ position: "absolute", width: "100%", textAlign: "center" }}
              >
                <button
                  onClick={() => handleSuggestionClick(SUGGESTIONS[suggestionIdx])}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#C4922A", fontSize: 13, fontWeight: 500 }}
                >
                  {SUGGESTIONS[suggestionIdx]}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Rate limit inline message */}
        {status === "rate_limited" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16, padding: 16, background: "rgba(196,146,42,0.1)", borderRadius: 10, color: "#C4922A", fontSize: 14 }}>
            {errorMsg} <a href="/form" style={{ fontWeight: 600, textDecoration: "underline" }}>Get Full Report</a>
          </motion.div>
        )}
      </motion.div>

      {/* Dynamic Results Area */}
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginTop: 24, background: "#FDFAF4", border: "1px solid #E8E0D0", borderRadius: 16, padding: 32, overflow: "hidden" }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: "linear-gradient(90deg, #E8E0D0 25%, #F5F0E6 50%, #E8E0D0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 20, width: "40%", borderRadius: 4, background: "#E8E0D0", marginBottom: 8 }} />
                <div style={{ height: 12, width: "20%", borderRadius: 4, background: "#E8E0D0" }} />
              </div>
            </div>
            <div style={{ height: 16, width: "100%", borderRadius: 4, background: "#E8E0D0", marginBottom: 12 }} />
            <div style={{ height: 16, width: "90%", borderRadius: 4, background: "#E8E0D0", marginBottom: 12 }} />
            <div style={{ height: 16, width: "95%", borderRadius: 4, background: "#E8E0D0" }} />

            <div style={{ marginTop: 32, textAlign: "center", color: "#C4922A", fontSize: 14, fontWeight: 500 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingMsgIdx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginTop: 24, padding: 24, background: "rgba(200,0,0,0.05)", border: "1px solid rgba(200,0,0,0.2)", borderRadius: 16, textAlign: "center", color: "#8a0000" }}
          >
            {errorMsg}
          </motion.div>
        )}

        {status === "success" && data && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginTop: 24, position: "relative" }}
          >
            <div style={{ background: "#FDFAF4", border: "1px solid #E8E0D0", borderRadius: 16, padding: 32, position: "relative", zIndex: 2 }}>
              
              <div style={{ position: "absolute", top: 16, right: 16, background: "#F5F0E6", color: "#C4922A", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 100, letterSpacing: "0.1em" }}>
                LIVE PREVIEW
              </div>

              {/* Header */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 32 }}>
                <img src={`https://www.google.com/s2/favicons?domain=${data.domain}&sz=64`} alt="" style={{ width: 48, height: 48, borderRadius: 8, background: "#fff", padding: 4, border: "1px solid #E8E0D0" }} />
                <div>
                  <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 24, fontWeight: 700, color: "#2C1A0E", marginBottom: 4 }}>{data.companyName}</h3>
                  <div style={{ display: "inline-block", border: "1px solid #C4922A", color: "#C4922A", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {data.industry}
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#C4922A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  Intelligence signals detected
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {data.insights.map((insight: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.15 }}
                      style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4922A", marginTop: 8, flexShrink: 0 }} />
                      <div style={{ fontSize: 15, color: "#2C1A0E", lineHeight: 1.6 }}>{insight}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Blurred Teaser */}
              <div style={{ position: "relative", background: "#fff", border: "1px solid #E8E0D0", borderRadius: 10, padding: 24, overflow: "hidden", minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                
                {/* Mock BG */}
                <div style={{ filter: "blur(6px)", opacity: 0.5, position: "absolute", top: 0, left: 0, right: 0, bottom: 0, padding: 24 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                    <div style={{ flex: 1, height: 80, background: "#E8E0D0", borderRadius: 8 }} />
                    <div style={{ flex: 1, height: 80, background: "#E8E0D0", borderRadius: 8 }} />
                    <div style={{ flex: 1, height: 80, background: "#E8E0D0", borderRadius: 8 }} />
                  </div>
                  <div style={{ height: 16, background: "#E8E0D0", width: "100%", marginBottom: 12, borderRadius: 4 }} />
                  <div style={{ height: 16, background: "#E8E0D0", width: "80%", borderRadius: 4 }} />
                </div>

                <div style={{ position: "relative", zIndex: 10, textAlign: "center" }}>
                  <p style={{ color: "#2C1A0E", fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
                    Your full report includes 5 pages of personalized intelligence
                  </p>
                  <button 
                    onClick={() => router.push(`/form?company=${encodeURIComponent(data.companyName)}`)}
                    className="shimmer-btn"
                    style={{
                      background: "#C4922A", color: "#FDFAF4", border: "none",
                      padding: "12px 24px", borderRadius: 8, fontFamily: "var(--font-fraunces), serif",
                      fontSize: 16, fontWeight: 600, cursor: "pointer",
                      position: "relative", overflow: "hidden"
                    }}
                  >
                    Get My Full Free Report →
                  </button>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#9C845F" }}>
              🔒 Preview generated in real time · No account required · Data sourced from public signals
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-btn::after {
          content: "";
          position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-20deg);
        }
        .shimmer-btn:hover::after {
          animation: shine 0.75s ease-out;
        }
        @keyframes shine {
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
