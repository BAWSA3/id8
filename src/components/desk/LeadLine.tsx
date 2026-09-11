"use client";

/* The record line: one field at the book, skippable, asked once per browser.
   Shows only when the store is wired; the desk never shows a form it can't keep. */

import { useEffect, useState } from "react";

const LEAD_KEY = "id8.lead.v1";
type State = "hidden" | "ask" | "sending" | "done" | "error";

export default function LeadLine({
  source,
  ticker,
  className = "",
}: {
  source: "commit" | "desk";
  ticker?: string | null;
  className?: string;
}) {
  const [state, setState] = useState<State>("hidden");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let answered = false;
    try {
      answered = Boolean(localStorage.getItem(LEAD_KEY));
    } catch {}
    if (answered) return;
    const ctl = new AbortController();
    fetch("/api/lead", { signal: ctl.signal })
      .then((r) => r.json())
      .then((d: { wired?: boolean }) => {
        if (d.wired) setState("ask");
      })
      .catch(() => {});
    return () => ctl.abort();
  }, []);

  const remember = (v: string) => {
    try {
      localStorage.setItem(LEAD_KEY, v);
    } catch {}
  };

  const send = async () => {
    if (state === "sending" || !email.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source, ...(ticker ? { ticker } : {}) }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "That did not take.");
      remember("done");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "That did not take. Try again in a moment.");
      setState("error");
    }
  };

  const skip = () => {
    remember("skipped");
    setState("hidden");
  };

  if (state === "hidden") return null;

  return (
    <div className={`door-in ${className}`}>
      <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">the record</p>
      {state === "done" ? (
        <p className="m-0 font-mono text-[11px] text-muted">noted. the desk will write when accounts land.</p>
      ) : (
        <>
          <p className="m-0 mb-3 font-mono text-[11px] leading-relaxed text-muted">
            accounts are coming. leave an email and this book follows you.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="you@wherever"
              aria-label="Email"
              autoComplete="email"
              spellCheck={false}
              className="w-[min(260px,100%)] border-0 border-b border-line bg-transparent pb-1.5 font-mono text-[12px] text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint focus:border-lock-deep"
            />
            <button
              onClick={() => void send()}
              disabled={state === "sending" || !email.trim()}
              className="border border-lock-deep px-4 py-2 font-mono text-[10.5px] uppercase tracking-[.18em] text-lock-deep transition-colors hover:bg-lock-deep hover:text-bg disabled:cursor-not-allowed disabled:border-line disabled:text-faint"
            >
              {state === "sending" ? "[ noting ]" : "[ keep me posted ]"}
            </button>
            <button
              onClick={skip}
              className="border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted"
            >
              [ not now ]
            </button>
          </div>
          {state === "error" && <p className="m-0 mt-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-bad">{message}</p>}
        </>
      )}
    </div>
  );
}
