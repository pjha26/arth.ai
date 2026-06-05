"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LeadChatUI({ reportId, companyName }: { reportId: string, companyName: string }) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: `/api/reports/${reportId}/chat` }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

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
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center py-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: "spring" }}
              className="w-20 h-20 rounded-full bg-white/80 backdrop-blur-md border border-[#d5c3b3]/60 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#fbba6f]/30 to-transparent" />
              <span className="w-5 h-5 rounded-full bg-[#fbba6f] animate-pulse" style={{ boxShadow: '0 0 12px #fbba6f' }}></span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-['Newsreader',_serif] text-[#1b1b1b] mb-4">
              ArthAI is ready.
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-base text-[#514538] max-w-md mb-10 leading-relaxed bg-white/40 p-4 rounded-2xl border border-white/50 shadow-sm">
              I've fully analyzed the intelligence report for <strong className="text-[#845411] font-bold">{companyName}</strong>. What would you like to explore?
            </motion.p>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage({ text: prompt })}
                  className="text-[14px] px-6 py-5 rounded-2xl border border-[#d5c3b3]/50 text-left transition-all duration-300 text-[#514538] hover:text-[#845411] bg-white/60 backdrop-blur-md hover:bg-white flex items-center justify-between group shadow-sm hover:shadow-lg hover:-translate-y-1"
                >
                  <span className="font-medium">{prompt}</span>
                  <span className="material-symbols-outlined text-[18px] opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#fbba6f]">arrow_forward</span>
                </button>
              ))}
            </motion.div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((m, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                key={m.id || idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-[24px] px-7 py-5 text-[15px] leading-relaxed shadow-md backdrop-blur-md ${
                    m.role === 'user' 
                      ? 'rounded-br-sm bg-gradient-to-br from-[#845411] to-[#613d0a] text-white border border-[#845411]' 
                      : 'rounded-bl-sm bg-white/90 border border-white text-[#1b1b1b]'
                  }`}
                >
                  {(m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '').split('\n').map((line: string, i: number) => (
                    <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, m.role === 'user' ? '<strong class="font-bold text-[#fbba6f]">$1</strong>' : '<strong class="font-bold text-[#845411]">$1</strong>') }} />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="max-w-[85%] rounded-[24px] px-7 py-5 text-[14px] rounded-bl-sm bg-white/90 border border-white text-[#514538] flex items-center gap-4 shadow-md backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fbba6f] animate-ping" />
              <span className="italic font-medium">Synthesizing insights...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-6 bg-transparent">
        <form onSubmit={handleSubmit} className="relative w-full flex items-center">
          <input
            type="text"
            className="w-full pl-8 pr-16 py-5 rounded-[32px] border-[1.5px] border-white/80 focus:outline-none focus:border-[#fbba6f] focus:ring-4 focus:ring-[#fbba6f]/20 transition-all text-[16px] text-[#1b1b1b] placeholder-[#a1a1a1] bg-white/80 backdrop-blur-xl"
            style={{ boxShadow: '0 8px 24px rgba(132,84,17,0.08)' }}
            placeholder={`Ask anything about ${companyName}...`}
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !(input?.trim())}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
            style={{ 
              background: (isLoading || !(input?.trim())) ? "var(--surface)" : "linear-gradient(135deg, #fbba6f, #845411)", 
              color: (isLoading || !(input?.trim())) ? "var(--border)" : "#ffffff",
              boxShadow: (isLoading || !(input?.trim())) ? "none" : "0 4px 16px rgba(132, 84, 17, 0.4)"
            }}
          >
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_upward</span>
          </button>
        </form>
      </div>
    </div>
  );
}
