"use client";

import ReactMarkdown from "react-markdown";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";

const prompts = [
  "What should I prioritize first?",
  "What evidence supports the top recommendation?",
  "Which questions still need research?",
];

export default function LeadChatUI({ reportId, companyName }: { reportId: string; companyName: string }) {
  const [input, setInput] = useState("");
  const thread = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: `/api/reports/${reportId}/chat` }), [reportId]);
  const { messages, sendMessage, status, setMessages, error } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reports/${reportId}/chat`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(history => {
        if (!controller.signal.aborted && Array.isArray(history)) {
          setMessages(current => current.length ? current : history);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [reportId, setMessages]);

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [messages, busy]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    void sendMessage({ text: input.trim() });
    setInput("");
  }

  return (
    <div className="ui-chat">
      {messages.length === 0 && (
        <>
          <p className="ui-intro">Ask a follow-up about the findings for {companyName}.</p>
          <div className="ui-options">{prompts.map(prompt => (
            <button key={prompt} className="ui-choice" type="button" onClick={() => setInput(prompt)}>{prompt}</button>
          ))}</div>
        </>
      )}
      {messages.length > 0 && <div className="ui-chat-thread" ref={thread} aria-label="Conversation">
        {messages.map(message => (
          <article className="ui-chat-message" data-role={message.role} key={message.id}>
            <p className="ui-label">{message.role === "user" ? "You" : "ArthAI"}</p>
            <ReactMarkdown>{message.parts.filter(part => part.type === "text").map(part => part.text).join("")}</ReactMarkdown>
          </article>
        ))}
      </div>}
      {busy && <p role="status" className="ui-label">Checking the report…</p>}
      {error && <p role="alert" className="ui-error">The response could not be completed. Try again.</p>}
      <form className="ui-chat-form" onSubmit={submit}>
        <label htmlFor="report-question" className="sr-only">Ask a question about this report</label>
        <input className="ui-input" id="report-question" type="text" placeholder="Ask about the evidence or recommendations"
          value={input} onChange={event => setInput(event.target.value)} />
        <button className="ui-button" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
