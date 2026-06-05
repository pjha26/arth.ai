"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function LeadChatUI({ reportId, companyName }: { reportId: string, companyName: string }) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: `/api/reports/${reportId}/chat` }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-full w-full bg-transparent relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="h-full flex flex-col justify-center items-center text-center opacity-90"
          >
            <div className="w-16 h-16 rounded-full bg-[#fcf9f8] border border-[#d5c3b3]/50 flex items-center justify-center mb-6 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#fbba6f]/20 to-transparent" />
              <span className="w-4 h-4 rounded-full bg-[#fbba6f] animate-pulse"></span>
            </div>
            <h2 className="text-2xl font-['Newsreader',_serif] text-[#1b1b1b] mb-3">ArthAI is ready.</h2>
            <p className="text-[15px] text-[#514538] max-w-sm mb-8 leading-relaxed">
              I've fully analyzed the intelligence report for <strong className="text-[#845411]">{companyName}</strong>. What would you like to explore?
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
              {suggestedPrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  onClick={() => sendMessage({ text: prompt })}
                  className="text-[13px] px-5 py-4 rounded-xl border border-[#d5c3b3]/50 text-left transition-all duration-300 text-[#514538] hover:text-[#845411] bg-white/50 backdrop-blur-sm hover:bg-white flex items-center justify-between group shadow-sm hover:shadow-md"
                >
                  <span>{prompt}</span>
                  <span className="material-symbols-outlined text-[16px] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#fbba6f]">arrow_forward</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          messages.map((m, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={m.id || idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-6 py-4 text-[15px] leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'rounded-br-sm bg-[#514538] text-white shadow-[#514538]/10' 
                    : 'rounded-bl-sm bg-[#fcf9f8] border border-[#d5c3b3]/40 text-[#1b1b1b]'
                }`}
              >
                {(m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '').split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#845411]">$1</strong>') }} />
                ))}
              </div>
            </motion.div>
          ))
        )}
        
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-6 py-4 text-[14px] rounded-bl-sm bg-[#fcf9f8] border border-[#d5c3b3]/40 text-[#514538] flex items-center gap-3 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#fbba6f] animate-ping" />
              <span className="italic">Synthesizing...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 md:p-6 bg-white/40 backdrop-blur-xl border-t border-[#d5c3b3]/30">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center">
          <input
            type="text"
            className="w-full pl-6 pr-16 py-4 rounded-full border border-[#d5c3b3]/50 focus:outline-none focus:border-[#fbba6f] focus:ring-2 focus:ring-[#fbba6f]/20 transition-all text-[15px] text-[#1b1b1b] placeholder-[#a1a1a1] shadow-sm bg-white/80"
            placeholder={`Ask anything about ${companyName}...`}
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !(input?.trim())}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
            style={{ 
              background: (isLoading || !(input?.trim())) ? "#f0eded" : "#845411", 
              color: (isLoading || !(input?.trim())) ? "#d5c3b3" : "#ffffff",
              boxShadow: (isLoading || !(input?.trim())) ? "none" : "0 4px 12px rgba(132, 84, 17, 0.25)"
            }}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
          </button>
        </form>
        <div className="text-center mt-4">
          <p className="text-[11px] text-[#837567] font-medium tracking-wide">
            Powered by ArthAI. Intent is monitored to enhance adaptations.
          </p>
        </div>
      </div>
    </div>
  );
}
