import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { CHAT_SUGGESTIONS, VIEW_TITLES, type ViewKey } from "../data/mocks";
import type { ChatMessage } from "../types/api";

interface Props {
  view: ViewKey;
}

export function InlineChat({ view }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
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
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sendM.isPending]);

  const errorMessage = useMemo(() => {
    if (!sendM.isError) return null;
    const msg = (sendM.error as Error)?.message || "";
    if (msg.includes("503")) return "Advisor is offline. Start `ollama serve` and pull a Gemma model.";
    if (msg.includes("429")) return "Slow down — limit is 10 messages per minute.";
    return "Couldn't reach the advisor. Try again.";
  }, [sendM.isError, sendM.error]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sendM.isPending) return;
    setDraft("");
    sendM.mutate(trimmed);
  };

  const isEmpty = messages.length === 0 && !sendM.isPending;

  return (
    <>
      {!isEmpty && (
        <div className="chat-messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <div className="chat-msg-bubble">{m.content}</div>
            </div>
          ))}
          {sendM.isPending && (
            <div className="chat-msg assistant pending">
              <div className="chat-msg-bubble">Thinking…</div>
            </div>
          )}
        </div>
      )}

      {errorMessage && <div className="chat-error">{errorMessage}</div>}

      <div className="chat-section">
        {isEmpty && (
          <div className="chat-suggestions">
            {CHAT_SUGGESTIONS[view].map((s) => (
              <button
                key={s}
                type="button"
                className="chat-suggestion"
                onClick={() => submit(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
        >
          <input
            type="text"
            value={draft}
            placeholder={`Ask about ${VIEW_TITLES[view]}…`}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Chat with Tariff advisor"
          />
          <button
            type="submit"
            disabled={sendM.isPending || draft.trim().length === 0}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m22 2-7 20-4-9-9-4z" />
            </svg>
          </button>
        </form>
        <span className="chat-foot">Advisory only · alerts, budgets, FX, subs, audit</span>
      </div>
    </>
  );
}
