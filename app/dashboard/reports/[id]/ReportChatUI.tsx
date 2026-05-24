"use client";

import { useChat } from "ai/react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportChatUI({ reportId, companyName, personaType }: { reportId: string, companyName: string, personaType: string }) {
  const { messages, input, handleInputChange, handleSubmit, setInput, isLoading, setMessages } = useChat({
    api: `/api/reports/${reportId}/chat`,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial chat history
  useEffect(() => {
    fetch(`/api/reports/${reportId}/chat`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        }
      })
      .catch(console.error);
  }, [reportId, setMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Suggested Prompts based on persona + general
  const getSuggestedPrompts = () => {
    const prompts = [
      "What's the biggest risk?",
      "Write a cold email using these insights",
      "How do they compare to competitors?",
      "What should I say in the first call?"
    ];

    if (personaType === "founder") {
      prompts.unshift("What's the market opportunity here?");
    } else if (personaType === "cto") {
      prompts.unshift("What's their tech stack weakness?");
    } else if (personaType === "marketer") {
      prompts.unshift("Draft a positioning statement for them");
    }

    return prompts;
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "var(--c-border, #EAE2D2)", background: "var(--c-surface, #FDFAF4)" }}>
        <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "var(--c-heading, #1C0F05)" }}>
          <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "var(--c-accent, #C4922A)", color: "#fff" }}>
            <span className="material-symbols-outlined text-sm">robot_2</span>
          </span>
          Chat with Report
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--c-muted, #9C845F)" }}>Ask anything about {companyName}’s intelligence</p>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center opacity-70">
            <span className="material-symbols-outlined text-4xl mb-3" style={{ color: "var(--c-accent, #C4922A)" }}>forum</span>
            <p className="text-sm font-medium" style={{ color: "var(--c-heading, #1C0F05)" }}>I've analyzed the report.</p>
            <p className="text-xs mt-1" style={{ color: "var(--c-muted, #9C845F)" }}>What would you like to know?</p>
            
            {/* Chips for empty state */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[90%]">
              {getSuggestedPrompts().slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(prompt)}
                  className="text-xs px-3 py-2 rounded-full border text-left hover:bg-white transition-colors"
                  style={{ 
                    borderColor: "var(--c-border-strong, #D4C8B0)", 
                    color: "var(--c-text, #3D2B1A)",
                    background: "transparent"
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                style={{
                  background: m.role === 'user' ? "var(--c-accent, #C4922A)" : "#fff",
                  color: m.role === 'user' ? "#fff" : "var(--c-text, #3D2B1A)",
                  border: m.role === 'user' ? "none" : "1px solid var(--c-border, #EAE2D2)",
                  boxShadow: "0 2px 8px rgba(60,30,10,0.03)"
                }}
              >
                {/* Render simple markdown (bolding and linebreaks) */}
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm rounded-bl-sm flex items-center gap-2" style={{ background: "#fff", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
              <span className="material-symbols-outlined animate-spin text-sm" style={{ color: "var(--c-accent)" }}>progress_activity</span>
              Generating...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t" style={{ borderColor: "var(--c-border, #EAE2D2)" }}>
        
        {/* Suggested Prompts (Scrollable row above input if there are messages) */}
        {messages.length > 0 && (
          <div className="flex overflow-x-auto gap-2 pb-3 mb-1 no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {getSuggestedPrompts().map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleChipClick(prompt)}
                className="whitespace-nowrap flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-colors"
                style={{ 
                  borderColor: "var(--c-border-strong, #D4C8B0)", 
                  color: "var(--c-text, #3D2B1A)",
                  background: "var(--c-surface, #FDFAF4)"
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3 rounded-xl border focus:outline-none text-sm"
            style={{ 
              borderColor: "var(--c-border-strong, #D4C8B0)", 
              background: "var(--c-surface, #FDFAF4)",
              color: "var(--c-heading, #1C0F05)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)"
            }}
            placeholder="Ask anything about this report..."
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
            style={{ 
              background: "var(--c-accent, #C4922A)", 
              color: "#fff",
              opacity: (isLoading || !input.trim()) ? 0.5 : 1
            }}
          >
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
          </button>
        </form>
      </div>
      
    </div>
  );
}
