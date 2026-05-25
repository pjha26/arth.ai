"use client";

import { UIMessage, DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatTime(date: Date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="cr-typing">
      <div className="cr-dot" />
      <div className="cr-dot" />
      <div className="cr-dot" />
    </div>
  );
}

function MessageBubble({ msg }: { msg: any }) {
  const isUser = msg.role === "user";
  const textContent = msg.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';
  
  return (
    <div className={`cr-msg-row cr-msg-row--${isUser ? "user" : "ai"}`}>
      {!isUser && (
        <div className="cr-ai-label">
          <span>✦</span> ArthAI
        </div>
      )}
      <div className={`cr-msg-bubble cr-msg-bubble--${isUser ? "user" : "ai"}`}>
        {isUser ? (
          textContent
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {textContent}
          </ReactMarkdown>
        )}
      </div>
      <div className="cr-msg-time">{formatTime(msg.createdAt || new Date())}</div>
    </div>
  );
}

export default function ReportChatUI({ report, onClose }: { report: any, onClose?: () => void }) {
  const [restored, setRestored] = useState(false);
  
  const { id: reportId } = report;
  const companyName = report.company?.name || "the company";
  
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

  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: `/api/reports/${reportId}/chat` }),
    messages: initialMessages,
    onFinish: () => {
      // Intentionally left blank, we sync on messages change
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const showFollowup = !isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  const MAX_CHARS = 500;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const CHIPS = [
    { text: "What's the biggest risk?",             full: false },
    { text: "Write a cold email using these insights", full: false },
    { text: "How do they compare to competitors?",  full: false },
    { text: "What should I prioritize first?",      full: false },
    { text: "Summarize this report in 3 bullets",   full: true  },
  ];

  const FOLLOWUP = "What should I prioritize first?";

  const score = report.score || null;
  const industry = report.company?.industry || "Software";
  const topSignal = "Automation Potential 8/10"; // Default based on UI requirement

  const PILLS = [
    { icon: "📊", label: `Overall Score: ${score ? `${score}/10` : "N/A"}` },
    { icon: "🏭", label: `Industry: ${industry}` },
    { icon: "⚡", label: `Top Signal: ${topSignal}` },
  ];

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value.slice(0, MAX_CHARS));
    const ta = textareaRef.current;
    if (ta) { 
      ta.style.height = "auto"; 
      ta.style.height = ta.scrollHeight + "px"; 
    }
  }

  function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    sendMessage({ text: msg });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${reportId}`, JSON.stringify(messages));
    }
  }, [messages, reportId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="cr-chat-panel">
      {/* Header */}
      <div className="cr-chat-header">
        <div className="cr-chat-header-top">
          <div className="cr-chat-title">
            <div className="cr-chat-sparkle">✦</div>
            Chat with Report
          </div>
          <button className="cr-close-btn" title="Close chat" onClick={onClose}>×</button>
        </div>
        <div className="cr-chat-subtitle">
          Ask anything about {companyName}'s intelligence
        </div>
      </div>

      {/* Context pills */}
      <div className="cr-context-pills">
        {PILLS.map((p, i) => (
          <button
            key={i}
            className="cr-pill"
            onClick={() => handleSend(`Tell me more about: ${p.label}`)}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="cr-messages">
        {messages.length === 0 ? (
          <div className="cr-empty-state">
            <div className="cr-empty-icon">✦</div>
            <div className="cr-empty-heading">
              I've analyzed {companyName}'s report
            </div>
            <div className="cr-empty-sub">
              Ask me anything about their intelligence, market position, or AI opportunities.
            </div>
            <div className="cr-suggestions-label">
              <span>Suggested questions</span>
            </div>
            <div className="cr-chips-grid">
              {CHIPS.map((c, i) => (
                <button
                  key={i}
                  className={`cr-chip${c.full ? " cr-chip-full" : ""}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => handleSend(c.text)}
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {restored && (
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 500, padding: "4px 12px", borderRadius: "100px", background: "var(--bg)", color: "var(--muted)" }}>
                  Conversation restored
                </span>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            {showFollowup && (
              <button
                className="cr-followup"
                onClick={() => handleSend(FOLLOWUP)}
              >
                ↩ {FOLLOWUP}
              </button>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="cr-input-area">
        <div className="cr-input-row">
          <textarea
            ref={textareaRef}
            className="cr-textarea"
            placeholder="Ask anything about this report..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="cr-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            ↑
          </button>
        </div>
        <div className="cr-input-meta">
          <span>🔒</span>
          <span>Based on this report's intelligence data</span>
          {input.length > 400 && (
            <span className={`cr-char-count${input.length > 480 ? " warn" : ""}`}>
              {input.length}/{MAX_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
