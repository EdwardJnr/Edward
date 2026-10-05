"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; text: string };

function visitorId(botId: string): string {
  const key = `ke-visitor-${botId}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function ChatWindow({ botId, name, business, welcome }: { botId: string; name: string; business: string; welcome: string }) {
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", text: welcome }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useRef("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    id.current = visitorId(botId);
  }, [botId]);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [turns, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setTurns((t) => [...t, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch(`/api/public/chat/${botId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: id.current, message }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setTurns((t) => [...t, { role: "assistant", text: data.reply ?? data.error ?? "Sorry, something went wrong." }]);
    } catch {
      setTurns((t) => [...t, { role: "assistant", text: "The connection dropped. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fff" }}>
      <div style={{ background: "var(--teal)", color: "#fff", padding: "14px 16px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--mint)" }}>{business}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {turns.map((t, i) => (
          <div
            key={i}
            style={{
              alignSelf: t.role === "user" ? "flex-end" : "flex-start",
              background: t.role === "user" ? "var(--teal)" : "var(--mint-soft)",
              color: t.role === "user" ? "#fff" : "var(--ink)",
              padding: "8px 12px",
              borderRadius: 12,
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            {t.text}
          </div>
        ))}
        {busy && <div className="muted small">Typing…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid var(--line)" }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message" maxLength={2000} aria-label="Message" />
        <button className="btn" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}
