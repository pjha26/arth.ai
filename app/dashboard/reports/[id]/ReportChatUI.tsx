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

const MODELS = [
  { id: "gemini-1.5-flash", label: "1.5 Flash", badge: "Stable" },
  { id: "gemini-2.0-flash", label: "2.0 Flash", badge: "Fast" },
  { id: "gemini-2.5-flash", label: "2.5 Flash", badge: "Latest" },
];

// Create transport OUTSIDE the component to avoid re-creation on every render
function createTransport(reportId: string) {
  return new DefaultChatTransport({ api: `/api/reports/${reportId}/chat` });
}

export default function ReportChatUI({ report, onClose }: { report: any, onClose?: () => void }) {
  const { id: reportId } = report;
  const companyName = report.company?.name || "the company";

  // Stable transport ref — created once per reportId
  const transportRef = useRef<DefaultChatTransport<UIMessage>>(null);
  if (!transportRef.current) {
    transportRef.current = createTransport(reportId);
  }

  const [input, setInput] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [showModelPicker, setShowModelPicker] = useState(false);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `report-chat-${reportId}`,
    transport: transportRef.current,
    onError: (err) => {
      console.error("[ReportChatUI] useChat error:", err);
      setChatError(err.message || "Something went wrong");
    },
    onFinish: () => {
      setChatError(null);
    },
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
  const topSignal = "Automation Potential 8/10";

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
    setChatError(null);

    sendMessage({ text: msg }, { body: { model: selectedModel } });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_${reportId}`, JSON.stringify(messages));
    }
  }, [messages, reportId]);

  // Auto-scroll
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div className="cr-chat-subtitle" style={{ margin: 0 }}>
            Ask anything about {companyName}'s intelligence
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              style={{
                background: 'var(--cr-accent-dim, rgba(196,146,42,0.12))',
                border: '1px solid var(--cr-border, #EAE2D2)',
                borderRadius: 6, padding: '3px 10px', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, fontFamily: 'var(--cr-ff-body, sans-serif)',
                color: 'var(--cr-accent, #C4922A)', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              ⚙ {MODELS.find(m => m.id === selectedModel)?.label || '1.5 Flash'}
            </button>
            {showModelPicker && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 50,
                background: 'var(--cr-surface, #FDFAF4)', border: '1px solid var(--cr-border, #EAE2D2)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(60,30,10,0.12)',
                padding: 6, minWidth: 170,
              }}>
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', padding: '8px 12px', border: 'none', borderRadius: 7,
                      cursor: 'pointer', fontSize: 12, fontFamily: 'var(--cr-ff-body, sans-serif)',
                      background: selectedModel === m.id ? 'var(--cr-accent-dim, rgba(196,146,42,0.12))' : 'transparent',
                      color: selectedModel === m.id ? 'var(--cr-accent, #C4922A)' : 'var(--cr-text, #3D2B1A)',
                      fontWeight: selectedModel === m.id ? 600 : 400,
                      transition: 'background 0.15s',
                    }}
                  >
                    <span>{m.label}</span>
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 4,
                      background: selectedModel === m.id ? 'var(--cr-accent, #C4922A)' : 'var(--cr-border, #EAE2D2)',
                      color: selectedModel === m.id ? '#fff' : 'var(--cr-muted, #9C845F)',
                      fontWeight: 600,
                    }}>{m.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            {(chatError || error) && (
              <div style={{
                padding: '8px 14px', margin: '8px 0', borderRadius: '8px',
                background: '#FFF1F0', color: '#CF1322', fontSize: '12px',
                border: '1px solid #FFA39E'
              }}>
                ⚠ {chatError || error?.message || "An error occurred"}
                <button 
                  onClick={() => setChatError(null)} 
                  style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  ✕
                </button>
              </div>
            )}
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
