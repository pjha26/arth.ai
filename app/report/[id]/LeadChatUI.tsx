"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";

export default function LeadChatUI({ reportId, companyName }: { reportId: string, companyName: string }) {
  const { messages, input, handleInputChange, handleSubmit, append, isLoading, setMessages } = useChat({
    api: `/api/report/${reportId}/chat`,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial chat history
  useEffect(() => {
    fetch(`/api/report/${reportId}/chat`)
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

  const suggestedPrompts = [
    "What should I prioritize first?",
    "How do I implement the top recommendation?",
    "Compare my automation score to industry average",
    "Where is our biggest conversion gap?"
  ];

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center opacity-90">
            <div className="w-16 h-16 rounded-full bg-[#FAFAF8] border border-[#E8E6E1] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl text-[#18181B]">smart_toy</span>
            </div>
            <h2 className="text-lg font-bold text-[#18181B] mb-2">ArthAI is ready.</h2>
            <p className="text-sm text-[#71717A] max-w-sm mb-8 leading-relaxed">
              I've fully analyzed the intelligence report for {companyName}. What would you like to know?
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => append({ role: "user", content: prompt })}
                  className="text-sm px-4 py-3 rounded-xl border border-[#E8E6E1] text-left hover:border-[#18181B] hover:shadow-sm transition-all duration-200 text-[#3F3F46] hover:text-[#18181B] bg-white flex items-center justify-between group"
                >
                  <span>{prompt}</span>
                  <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'rounded-br-sm bg-[#18181B] text-white' 
                    : 'rounded-bl-sm bg-[#FAFAF8] border border-[#E8E6E1] text-[#18181B]'
                }`}
              >
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                ))}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-5 py-4 text-[15px] rounded-bl-sm bg-[#FAFAF8] border border-[#E8E6E1] text-[#71717A] flex items-center gap-3 shadow-sm">
              <span className="material-symbols-outlined animate-spin text-[#18181B]">progress_activity</span>
              Analyzing intelligence...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-[#E8E6E1]">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center">
          <input
            type="text"
            className="w-full pl-5 pr-14 py-4 rounded-2xl border border-[#E8E6E1] focus:outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-all text-[15px] text-[#18181B] placeholder-[#A1A1AA] shadow-sm"
            placeholder={`Ask anything about ${companyName}'s report...`}
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !(input?.trim())}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{ 
              background: (isLoading || !(input?.trim())) ? "#F4F4F5" : "#18181B", 
              color: (isLoading || !(input?.trim())) ? "#A1A1AA" : "#ffffff",
              boxShadow: (isLoading || !(input?.trim())) ? "none" : "0 2px 8px rgba(24,24,27,0.2)"
            }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
        </form>
        <div className="text-center mt-3">
          <p className="text-[11px] text-[#A1A1AA]">
            Powered by ArthAI Intelligence. Chat history is saved to enhance future recommendations.
          </p>
        </div>
      </div>
      
    </div>
  );
}
