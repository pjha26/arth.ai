"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ReportChatUI({ report }: { report: any }) {
  const [restored, setRestored] = useState(false);
  const [isHoveredClose, setIsHoveredClose] = useState(false);
  
  const { id: reportId } = report;
  const companyName = report.company?.name || "the company";
  
  // Try to load initial messages from local storage
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`chat_${reportId}`);
      if (saved) {
        setInitialMessages(JSON.parse(saved));
        setRestored(true);
      }
    } catch (e) {
      console.warn("Failed to parse local storage chat history", e);
    }
  }, [reportId]);

  const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages } = useChat({
    api: `/api/reports/${reportId}/chat`,
    initialMessages,
    onFinish: () => {
      // Intentionally left blank, we sync on messages change
    }
  });

  // Sync to local storage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${reportId}`, JSON.stringify(messages));
    }
  }, [messages, reportId]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestedPrompts = [
    "What's the biggest risk?",
    "Write a cold email using these insights",
    "How do they compare to competitors?",
    "What should I prioritize first?",
    "Summarize this report in 3 bullets"
  ];

  const handleChipClick = (prompt: string) => {
    append({ role: "user", content: prompt });
  };

  const clearConversation = () => {
    setMessages([]);
    localStorage.removeItem(`chat_${reportId}`);
    setRestored(false);
  };

  // Safe extract for context pills
  const score = report.score || "N/A";
  const industry = report.company?.industry || "Software";
  const topSignal = "Automation Potential 8/10"; // Hardcoded default based on UI requirement, ideally derived from insights

  return (
    <div className="flex flex-col h-full w-full relative bg-[#FDFAF4]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#E8E0D0" }}>
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-display, Fraunces, serif)", color: "#2C1A0E" }}>
            <span style={{ color: "#C4922A" }}>✦</span> Chat with Report
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#9C845F" }}>Ask anything about {companyName}'s intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={clearConversation}
              className="text-[10px] uppercase tracking-wider font-bold opacity-0 hover:opacity-100 transition-opacity absolute right-12"
              style={{ color: "#9C845F" }}
            >
              Clear
            </button>
          )}
          <button 
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#9C845F", background: isHoveredClose ? "#F5F0E6" : "transparent" }}
            onMouseEnter={() => setIsHoveredClose(true)}
            onMouseLeave={() => setIsHoveredClose(false)}
          >
            ×
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 relative">
        {restored && messages.length > 0 && (
          <div className="text-center mb-6">
            <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: "#F5F0E6", color: "#9C845F" }}>
              Conversation restored
            </span>
          </div>
        )}

        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="h-full flex flex-col justify-center max-w-sm mx-auto"
          >
            <div className="flex flex-col mb-8">
              <div className="w-10 h-10 mb-4 rounded-xl flex items-center justify-center" style={{ background: "rgba(196, 146, 42, 0.1)" }}>
                <span style={{ color: "#C4922A", fontSize: 20 }}>✦</span>
              </div>
              <h3 className="text-lg mb-1 leading-snug" style={{ fontFamily: "var(--font-display, Fraunces, serif)", color: "#2C1A0E" }}>
                I've analyzed {companyName}'s report
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: "#9C845F" }}>
                Ask me anything about their intelligence, market position, or AI opportunities.
              </p>
            </div>

            {/* Context Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { icon: "📊", text: `Overall Score: ${score}/10` },
                { icon: "🏭", text: `Industry: ${industry}` },
                { icon: "⚡", text: `Top Signal: ${topSignal}` }
              ].map((pill, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleChipClick(`Tell me more about the ${pill.text.toLowerCase()}`)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={{ background: "#F5F0E6", color: "#2C1A0E", border: "1px solid #E8E0D0" }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "#C4922A" }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E8E0D0" }}
                >
                  <span>{pill.icon}</span>
                  {pill.text}
                </button>
              ))}
            </div>
            
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#9C845F" }}>
                ─── Suggested questions ───
              </p>
              <div className="grid grid-cols-2 gap-2">
                {suggestedPrompts.map((prompt, i) => (
                  <motion.button
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    key={i}
                    onClick={() => handleChipClick(prompt)}
                    className="text-[13px] text-left px-3 py-2.5 rounded-xl transition-all duration-200"
                    style={{ background: "#FDFAF4", border: "1px solid #E8E0D0", color: "#2C1A0E" }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#C4922A"; e.currentTarget.style.background = "#FDF8F0" }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "#E8E0D0"; e.currentTarget.style.background = "#FDFAF4" }}
                  >
                    {prompt}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {messages.map((m) => (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  key={m.id} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className="px-4 py-3 shadow-sm text-sm"
                    style={{
                      background: m.role === 'user' ? "#C4922A" : "#FDFAF4",
                      color: m.role === 'user' ? "#FDFAF4" : "#2C1A0E",
                      border: m.role === 'user' ? "none" : "1px solid #E8E0D0",
                      borderRadius: m.role === 'user' ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      maxWidth: m.role === 'user' ? "80%" : "85%",
                      lineHeight: 1.6
                    }}
                  >
                    {m.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-2 opacity-80">
                        <span style={{ color: "#C4922A", fontSize: 10 }}>✦</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C845F]">ArthAI</span>
                      </div>
                    )}
                    
                    {m.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <div className="prose prose-sm prose-p:my-1 prose-headings:font-serif prose-headings:text-[#2C1A0E] prose-strong:text-[#2C1A0E] max-w-none">
                        <style>{`
                          .prose ul li::marker { color: #C4922A; font-size: 1.2em; }
                          .prose code { background: #F5F0E6; padding: 2px 4px; border-radius: 4px; font-weight: normal; }
                          .prose pre code { background: transparent; }
                          .prose pre { background: #F5F0E6; padding: 8px; border-radius: 8px; border: 1px solid #E8E0D0; }
                        `}</style>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div 
                  className="px-5 py-3 shadow-sm flex items-center gap-2"
                  style={{ background: "#FDFAF4", border: "1px solid #E8E0D0", borderRadius: "18px 18px 18px 4px" }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#C4922A" }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 ml-2">
                <button 
                  onClick={() => handleChipClick("What should I prioritize first?")}
                  className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                  style={{ background: "transparent", color: "#9C845F", border: "1px dashed #E8E0D0" }}
                  onMouseOver={(e) => { e.currentTarget.style.color = "#C4922A"; e.currentTarget.style.borderColor = "#C4922A" }}
                  onMouseOut={(e) => { e.currentTarget.style.color = "#9C845F"; e.currentTarget.style.borderColor = "#E8E0D0" }}
                >
                  <span style={{ color: "#C4922A" }}>✦</span> Suggested: What should I prioritize first?
                </button>
              </motion.div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#FDFAF4] border-t" style={{ borderColor: "#E8E0D0" }}>
        <form onSubmit={handleSubmit} className="relative w-full">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3.5 transition-all text-[14px] outline-none"
            style={{ 
              background: "#FDFAF4", 
              border: "1px solid #E8E0D0", 
              borderRadius: "12px",
              color: "#2C1A0E",
              boxShadow: "0 1px 2px rgba(44, 26, 14, 0.05)"
            }}
            placeholder={isLoading ? "Thinking..." : "Ask anything about this report..."}
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            onFocus={(e) => { e.target.style.borderColor = "#C4922A"; e.target.style.boxShadow = "0 0 0 1px rgba(196, 146, 42, 0.2)" }}
            onBlur={(e) => { e.target.style.borderColor = "#E8E0D0"; e.target.style.boxShadow = "0 1px 2px rgba(44, 26, 14, 0.05)" }}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input?.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
            style={{ 
              background: "#C4922A", 
              color: "#FDFAF4",
              opacity: (isLoading || !input?.trim()) ? 0.3 : 1
            }}
          >
            <span className="material-symbols-outlined text-sm font-bold">arrow_upward</span>
          </button>
        </form>
        <div className="flex items-center gap-1.5 mt-2.5 ml-1 opacity-70">
          <span className="material-symbols-outlined text-[10px]" style={{ color: "#9C845F" }}>lock</span>
          <p className="text-[10px] m-0" style={{ color: "#9C845F" }}>
            Responses are based on this report's intelligence data
          </p>
          <span className="text-[10px] ml-auto" style={{ color: "#9C845F" }}>
            {input.length}/500
          </span>
        </div>
      </div>
      
    </div>
  );
}
