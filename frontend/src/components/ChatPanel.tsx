import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ChatMessage } from "../types/api";

interface Props {
  open: boolean;
  prefill: string | null;
  onClose: () => void;
}

export function ChatPanel({ open, prefill, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendM = useMutation({
    mutationFn: (text: string) => api.chat(text, messages),
    onSuccess: (res, text) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: res.reply },
      ]);
    },
  });

  useEffect(() => {
    if (open && prefill && draft === "") {
      setDraft(prefill);
    }
    if (open) inputRef.current?.focus();
  }, [open, prefill, draft]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sendM.isPending]);

  const errorMessage = useMemo(() => {
    if (!sendM.isError) return null;
    const msg = (sendM.error as Error)?.message || "Unknown error";
    if (msg.includes("503")) {
      return "Tariff advisor is offline. Start `ollama serve` and pull a Gemma model.";
    }
    if (msg.includes("429")) {
      return "Slow down — limit is 10 messages per minute.";
    }
    return "Couldn't reach the advisor. Try again in a moment.";
  }, [sendM.isError, sendM.error]);

  const submit = () => {
    const text = draft.trim();
    if (!text || sendM.isPending) return;
    setDraft("");
    sendM.mutate(text);
  };

  if (!open) return null;

  return (
    <aside className="chat-panel" aria-label="Tariff advisor chat">
      <header className="chat-panel-head">
        <div>
          <p className="eyebrow">Advisor</p>
          <h2>Tariff</h2>
        </div>
        <button
          type="button"
          className="button button-quiet"
          aria-label="Close advisor"
          onClick={onClose}
        >
          Close
        </button>
      </header>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && !sendM.isPending && (
          <div className="chat-empty">
            <p>
              Ask about your active alert, your household budget, or what to do
              next.
            </p>
          </div>
        )}
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-message chat-${m.role}`}>
            <span className="chat-role">{m.role === "user" ? "You" : "Tariff"}</span>
            <p>{m.content}</p>
          </div>
        ))}
        {sendM.isPending && (
          <div className="chat-message chat-assistant chat-pending">
            <span className="chat-role">Tariff</span>
            <p>Thinking…</p>
          </div>
        )}
        {errorMessage && (
          <div className="chat-error" role="alert">
            {errorMessage}
          </div>
        )}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={2}
          placeholder="Ask about your dashboard..."
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={sendM.isPending || draft.trim().length === 0}
        >
          Send
        </button>
      </form>
    </aside>
  );
}
