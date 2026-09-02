"use client";

/* The desk's opening window — "what are we looking at?"
   One pixel-box dialog after the door: name the vehicle, the desk checks
   the tape and acknowledges it live, then the page assembles. Narrative
   and sector plays take the quiet hatch below. The eclipse's travel lands
   on the seed in this dialog (#id8-seed) — the orb arrives as the desk asks. */

import { useEffect, useRef, useState } from "react";
import Horizon from "@/components/hud/Horizon";

type Status = "asking" | "checking" | "found" | "missing" | "error";

interface Resolved {
  symbol: string;
  chain: string;
  marketCapUsd: number;
}

const TICKER_RE = /^[A-Za-z0-9$._-]{1,15}$/;
const ADVANCE_MS = 1700;

export default function TickerGate({
  onDone,
}: {
  /* ticker (uppercased, $-less) or null for a narrative play */
  onDone: (ticker: string | null) => void;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("asking");
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  /* the acknowledgment is the moment — hold it a beat, then proceed */
  useEffect(() => {
    if (status !== "found" || !resolved) return;
    const t = setTimeout(() => onDone(resolved.symbol), ADVANCE_MS);
    return () => clearTimeout(t);
  }, [status, resolved, onDone]);

  async function check() {
    const symbol = value.trim().replace(/^\$/, "").toUpperCase();
    if (!TICKER_RE.test(symbol) || busy.current) return;
    busy.current = true;
    setStatus("checking");
    try {
      const res = await fetch("/api/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error();
      if (data.found) {
        setResolved({ symbol: data.symbol, chain: data.chain, marketCapUsd: data.marketCapUsd });
        setStatus("found");
      } else {
        setStatus("missing");
      }
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }

  const tapeLine =
    status === "checking" ? (
      <span className="text-muted">checking the tape…</span>
    ) : status === "found" && resolved ? (
      <span className="text-muted">
        found · {resolved.chain} · mcap ${Math.round(resolved.marketCapUsd).toLocaleString("en-US")} ·{" "}
        <span className="text-lock">
          <span className="seed mr-1 inline-block align-[1px]" style={{ width: 5, height: 5 }} />
          live
        </span>
      </span>
    ) : status === "missing" ? (
      <span className="text-bad">not on the tape. spell it like the chain does — or trade the narrative.</span>
    ) : status === "error" ? (
      <span className="text-bad">the tape hiccupped. try again.</span>
    ) : null;

  return (
    <main className="relative flex min-h-[calc(100vh-140px)] items-center justify-center px-6">
      <Horizon fixed />
      <div className="pixel-box w-[min(92vw,460px)] border border-line px-6 py-6" style={{ background: "var(--bg)" }}>
        <p className="m-0 mb-5 font-mono text-[12.5px] leading-relaxed">
          <span id="id8-seed" className="seed mr-2.5 align-[1px]" />
          <span className="font-pixel text-[10px] text-muted">the desk ›</span>{" "}
          <span className="text-ink">what are we looking at?</span>
        </p>

        <div className="mb-4 flex items-baseline gap-2 border-b border-line pb-2">
          <span className="font-mono text-[15px] text-muted">$</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase());
              if (status === "missing" || status === "error") setStatus("asking");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") check();
            }}
            maxLength={15}
            spellCheck={false}
            autoComplete="off"
            placeholder="TICKER"
            aria-label="Ticker"
            disabled={status === "found"}
            className="w-full border-0 bg-transparent font-mono text-[15px] uppercase tracking-[.08em] text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint"
          />
          <button
            onClick={check}
            disabled={!TICKER_RE.test(value.trim().replace(/^\$/, "")) || status === "checking" || status === "found"}
            className="shrink-0 border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[.16em] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-faint"
          >
            [ check ]
          </button>
        </div>

        <p className="m-0 min-h-[18px] font-mono text-[10px] uppercase tracking-[.1em]">{tapeLine}</p>

        {status !== "found" && (
          <button
            onClick={() => onDone(null)}
            className="mt-5 border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted focus-visible:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
          >
            [ trading a narrative, not a name ]
          </button>
        )}
      </div>
    </main>
  );
}
