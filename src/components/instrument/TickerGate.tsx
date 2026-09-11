"use client";

/* The desk's opening window — "what are we looking at?"
   One pixel-box dialog after the door. Two ways to name the vehicle: a ticker,
   or the contract address. A ticker is a search across every chain the tape
   covers; when more than one token carries the name, the desk lists them and
   the trader picks. An address names the coin exactly. Either way the session
   keeps chain + address, so the tape, the ruling and the desk read the same
   coin. Narrative and sector plays take the quiet hatch below. The eclipse's
   travel lands on the seed in this dialog (#id8-seed). */

import { useEffect, useRef, useState } from "react";
import Horizon from "@/components/hud/Horizon";
import DeskCaption from "@/components/hud/DeskCaption";
import { CURATED_CHAINS, OTHER_CHAINS } from "@/lib/chains";
import type { TickerCandidate, Vehicle } from "@/lib/session";

/* Desk caption for the first-visit tour: the window is the first thing a new visitor sees */
const DESK_G1 = "first, the vehicle. name the token you're looking at, or paste its contract. nothing to name yet, take the hatch below and play the narrative.";

type Mode = "ticker" | "contract";
type Status = "asking" | "checking" | "choosing" | "found" | "missing" | "error";

interface Pool {
  dex: string;
  version: string | null;
  base: string;
  quote: string;
  liquidityUsd: number;
  volume24hUsd: number;
}

interface Resolved {
  symbol: string; // what the tape calls it (WHYPE)
  typed: string; // what the trader called it (HYPE), the name the session keeps
  chain: string;
  address: string;
  exact: boolean; // named by address or picked from the list: the found line shows the address
  marketCapUsd: number | null;
  pools: Pool[];
  poolCount: number;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

const TICKER_RE = /^[A-Za-z0-9$._-]{1,15}$/;
/* a contract address: 0x + 40 hex (evm), or 32 to 44 base58 (solana) */
const ADDRESS_RE = /^(0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const ADVANCE_MS = 1700;
const ADVANCE_WITH_POOL_MS = 2600; // two lines to read — hold the acknowledgment a beat longer

const VERB =
  "whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock";

export default function TickerGate({
  onDone,
  tour = false,
  onSkipTour,
}: {
  /* ticker (uppercased, $-less) or null for a narrative play; the vehicle by chain + address whenever the tape named one */
  onDone: (ticker: string | null, hint?: Vehicle) => void;
  tour?: boolean;
  onSkipTour?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("ticker");
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("asking");
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [candidates, setCandidates] = useState<TickerCandidate[]>([]);
  const [chainFilter, setChainFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  /* the acknowledgment is the moment — hold it a beat, then proceed */
  useEffect(() => {
    if (status !== "found" || !resolved) return;
    const t = setTimeout(
      () => onDone(resolved.typed, resolved.address ? { chain: resolved.chain, address: resolved.address } : undefined),
      resolved.pools.length ? ADVANCE_WITH_POOL_MS : ADVANCE_MS
    );
    return () => clearTimeout(t);
  }, [status, resolved, onDone]);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setValue("");
    setCandidates([]);
    setChainFilter("");
    setStatus("asking");
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const symbolOf = (raw: string) => raw.replace(/^\$/, "").toUpperCase();
  const accepts = (raw: string) => (mode === "contract" ? ADDRESS_RE.test(raw) : TICKER_RE.test(symbolOf(raw)));

  async function ask(body: Record<string, string>, typed: string, exact: boolean) {
    if (busy.current) return;
    busy.current = true;
    setStatus("checking");
    try {
      const res = await fetch("/api/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error();
      if (data.found) {
        setResolved({
          symbol: data.symbol,
          /* an address names the coin exactly; the session keeps the tape's symbol for it */
          typed: exact && mode === "contract" ? String(data.symbol).toUpperCase() : typed,
          chain: data.chain,
          address: data.address ?? "",
          exact,
          marketCapUsd: data.marketCapUsd,
          pools: Array.isArray(data.pools) ? data.pools : [],
          poolCount: typeof data.poolCount === "number" ? data.poolCount : 0,
        });
        setStatus("found");
      } else if (data.ambiguous && Array.isArray(data.candidates) && data.candidates.length > 1) {
        setCandidates(data.candidates as TickerCandidate[]);
        setChainFilter("");
        setStatus("choosing");
      } else {
        setStatus("missing");
      }
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }

  const check = () => {
    const raw = value.trim();
    if (!accepts(raw)) return;
    if (mode === "contract") void ask({ address: raw }, "", true);
    else void ask({ symbol: symbolOf(raw) }, symbolOf(raw), false);
  };

  /* picking a row re-checks that exact address on that chain: one pool lookup, no search */
  const pick = (c: TickerCandidate) => {
    const typed = mode === "contract" ? c.symbol : symbolOf(value.trim());
    void ask({ address: c.address, chain: c.chain }, typed, true);
  };

  const shown = chainFilter ? candidates.filter((c) => c.chain === chainFilter) : candidates;
  const chainsPresent = new Set(candidates.map((c) => c.chain));

  const tapeLine =
    status === "checking" ? (
      <span className="text-muted">checking the tape…</span>
    ) : status === "found" && resolved ? (
      <span className="text-muted">
        found · {resolved.chain}
        {resolved.exact
          ? ` · $${resolved.symbol} · ${short(resolved.address)}`
          : resolved.symbol.toUpperCase() !== resolved.typed.toUpperCase()
            ? ` · as ${resolved.symbol}`
            : ""}
        {resolved.marketCapUsd !== null && ` · mcap ${usd(resolved.marketCapUsd)}`} ·{" "}
        <span className="text-lock">
          <span className="seed mr-1 inline-block align-[1px]" style={{ width: 5, height: 5 }} />
          live
        </span>
      </span>
    ) : status === "choosing" ? (
      <span className="text-muted">
        {mode === "contract"
          ? `that address trades on ${candidates.length} chains. which one?`
          : `${candidates.length} on the tape under $${symbolOf(value.trim())}. which one?`}
      </span>
    ) : status === "missing" ? (
      <span className="text-bad">
        {mode === "contract"
          ? "nothing trades at that address yet. check it, or trade the narrative."
          : "not on the tape. spell it like the chain does, paste the contract address, or trade the narrative."}
      </span>
    ) : status === "error" ? (
      <span className="text-bad">the tape hiccupped. try again.</span>
    ) : null;

  const locked = status === "found" || status === "checking";

  return (
    <>
    {/* on the tour the caption sits fixed at the bottom; the room leaves it space */}
    <main className={`relative flex min-h-[calc(100vh-140px)] items-center justify-center px-6 ${tour ? "pb-28" : ""}`}>
      <Horizon fixed />
      <div className="pixel-box w-[min(92vw,460px)] border border-line px-6 py-6" style={{ background: "var(--bg)" }}>
        <p className="m-0 mb-4 font-mono text-[12.5px] leading-relaxed">
          <span id="id8-seed" className="seed mr-2.5 align-[1px]" />
          <span className="font-pixel text-[10px] text-muted">the desk ›</span>{" "}
          <span className="text-ink">what are we looking at?</span>
        </p>

        {/* the two ways to name it */}
        <div className="mb-3 flex items-center gap-4">
          {(["ticker", "contract"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              disabled={locked}
              className={`${VERB} ${mode === m ? "text-ink" : "text-faint hover:text-muted"} disabled:cursor-default`}
            >
              [ {m} ]
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-baseline gap-2 border-b border-line pb-2">
          <span className="font-mono text-[15px] text-muted">{mode === "contract" ? "ca" : "$"}</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              const v = e.target.value.trim();
              /* an address pasted in ticker mode flips the window; addresses keep their case (solana is case sensitive) */
              if (mode === "ticker" && ADDRESS_RE.test(v)) {
                setMode("contract");
                setValue(v);
              } else {
                setValue(mode === "contract" ? v : v.toUpperCase());
              }
              if (status === "missing" || status === "error" || status === "choosing") {
                setStatus("asking");
                setCandidates([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") check();
            }}
            maxLength={44}
            spellCheck={false}
            autoComplete="off"
            placeholder={mode === "contract" ? "CONTRACT ADDRESS" : "TICKER"}
            aria-label={mode === "contract" ? "Contract address" : "Ticker"}
            disabled={status === "found"}
            className={`w-full border-0 bg-transparent font-mono text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint ${mode === "contract" ? "text-[12.5px] tracking-[.02em]" : "text-[15px] uppercase tracking-[.08em]"}`}
          />
          <button
            onClick={check}
            disabled={!accepts(value.trim()) || locked}
            className="shrink-0 border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[.16em] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-faint"
          >
            [ check ]
          </button>
        </div>

        <p className="m-0 min-h-[18px] font-mono text-[10px] uppercase tracking-[.1em]">{tapeLine}</p>
        {status === "found" && resolved && resolved.pools[0] && (
          <p className="door-in m-0 mt-1.5 font-mono text-[10px] uppercase tracking-[.1em] text-muted" style={{ animationDelay: "0.35s" }}>
            <span className="text-faint">deepest pool</span> {resolved.pools[0].base}/{resolved.pools[0].quote} ·{" "}
            {resolved.pools[0].dex}
            {resolved.pools[0].version ? ` ${resolved.pools[0].version}` : ""} · {usd(resolved.pools[0].liquidityUsd)} liq ·{" "}
            {usd(resolved.pools[0].volume24hUsd)} 24h
            {resolved.poolCount > 1 && <span className="text-faint"> · {resolved.poolCount} pools</span>}
          </p>
        )}

        {/* the list: every token under that name, largest market first; a chain narrows it */}
        {status === "choosing" && (
          <div className="door-in mt-3">
            <label className="mb-2 flex items-baseline gap-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
              <span>on</span>
              <select
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                aria-label="Chain"
                className="cursor-pointer appearance-none border-0 border-b border-line bg-transparent pb-0.5 font-mono text-[9.5px] uppercase tracking-[.16em] text-muted outline-none focus:border-lock-deep"
              >
                <option value="">any chain</option>
                {CURATED_CHAINS.map((c) => (
                  <option key={c} value={c} disabled={!chainsPresent.has(c)}>
                    {c}
                  </option>
                ))}
                <optgroup label="other chains">
                  {OTHER_CHAINS.map((c) => (
                    <option key={c} value={c} disabled={!chainsPresent.has(c)}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              </select>
              <span className="ml-auto">
                {shown.length} of {candidates.length}
              </span>
            </label>
            <div className="flex flex-col">
              {shown.map((c, i) => (
                <button
                  key={`${c.chain}:${c.address}`}
                  onClick={() => pick(c)}
                  autoFocus={i === 0}
                  className="group border-t border-line py-2.5 text-left transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lock"
                >
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted group-hover:text-ink">
                    <span className="text-ink">{c.chain}</span>
                    <span>${c.symbol}</span>
                    <span className="text-faint">{short(c.address)}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">
                    <span>mcap {c.marketCapUsd !== null ? usd(c.marketCapUsd) : "not on the feed"}</span>
                    <span>liq {usd(c.liquidityUsd)}</span>
                    {c.tokenAgeDays !== null && <span>{c.tokenAgeDays}d</span>}
                  </span>
                </button>
              ))}
              {shown.length === 0 && <p className="m-0 border-t border-line py-2.5 font-mono text-[10px] text-faint">none on that chain.</p>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {mode === "ticker" && (
                <button onClick={() => switchMode("contract")} className={`${VERB} text-faint hover:text-muted`}>
                  [ paste the contract instead ]
                </button>
              )}
              <button
                onClick={() => {
                  setCandidates([]);
                  setStatus("asking");
                  setTimeout(() => inputRef.current?.focus(), 30);
                }}
                className={`${VERB} text-faint hover:text-muted`}
              >
                [ back ]
              </button>
            </div>
          </div>
        )}

        {/* the hatch is for a trader with nothing to name — once there's a ticker in
            the field it steps aside, so it can't be hit by accident (it returns if the
            tape can't find the name) */}
        {status !== "found" && status !== "choosing" && (value.trim().length === 0 || status === "missing") && (
          <button
            onClick={() => onDone(null)}
            className="mt-5 border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted focus-visible:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
          >
            [ trading a narrative, not a name ]
          </button>
        )}
      </div>
    </main>
    {tour && onSkipTour && <DeskCaption text={DESK_G1} onSkip={onSkipTour} />}
    </>
  );
}
