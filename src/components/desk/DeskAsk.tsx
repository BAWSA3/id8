"use client";

import { useState } from "react";
import { sendMagicLink } from "@/lib/desk";

/* The one ask. No password, no wall: the session is already theirs. */
export default function DeskAsk({ onSkip, compact = false }: { onSkip?: () => void; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    if (!valid || state === "sending") return;
    setState("sending");
    const r = await sendMagicLink(email.trim());
    if (r.ok) setState("sent");
    else {
      setState("error");
      setMessage(r.message ?? "the link did not send.");
    }
  };

  if (state === "sent") {
    return (
      <p className="m-0 font-mono text-[12.5px] leading-relaxed text-muted">
        <span className="font-pixel text-[10px]">the desk ›</span> the link is in your inbox. open it and the desk is yours.
      </p>
    );
  }

  return (
    <div className={compact ? "" : "pixel-box border border-line px-5 py-4"} style={compact ? undefined : { background: "var(--bg)" }}>
      <p className="m-0 mb-3 font-mono text-[12.5px] leading-relaxed">
        <span className="font-pixel text-[10px] text-muted">the desk ›</span>{" "}
        <span className="text-ink">keep the desk. one email, one link, no password.</span>
      </p>
      <div className="flex items-baseline gap-3 border-b border-line pb-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="you@wherever"
          aria-label="Email"
          className="w-full border-0 bg-transparent font-mono text-[14px] text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint"
        />
        <button
          onClick={() => void send()}
          disabled={!valid || state === "sending"}
          className="shrink-0 whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[.16em] text-lock-deep transition-colors hover:text-lock disabled:cursor-not-allowed disabled:text-faint"
        >
          {state === "sending" ? "[ sending ]" : "[ send the link ]"}
        </button>
      </div>
      <p className="m-0 mt-2 min-h-[16px] font-mono text-[9.5px] uppercase tracking-[.14em] text-faint">
        {state === "error" ? <span className="text-bad">{message}</span> : "the play stays in this browser until you open the link."}
      </p>
      {onSkip && (
        <button onClick={onSkip} className="mt-3 border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted">
          [ not now ]
        </button>
      )}
    </div>
  );
}
