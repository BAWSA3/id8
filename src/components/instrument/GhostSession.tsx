"use client";

/* Ghost session — the door's payoff preview. Replays a REAL interrogation
   (the DePIN/HONEY run, live Nansen data, 2026-09-02) as a ~30s canned
   script: agent lines typewrite, the trader's answers land as instant
   blocks, evidence cards drop in with the actual figures. No API calls,
   labeled as a replay throughout. id8 never writes the viewer's thesis —
   this is someone else's, shown so the ask on Present has a visible payoff. */

import { useEffect, useRef, useState } from "react";
import TypeLine from "@/components/hud/TypeLine";

type Step =
  | { at: number; kind: "user"; text: string }
  | { at: number; kind: "agent"; prefix: string; cls: string; text: string }
  | { at: number; kind: "note"; text: string }
  | {
      at: number;
      kind: "card";
      title: string;
      verdict: string;
      rows: { k: string; v: string; neg: boolean }[];
    };

const SCRIPT: Step[] = [
  {
    at: 500,
    kind: "user",
    text: "“DePIN is quietly becoming the next meta while everyone is distracted by AI agents. I want to rotate into HONEY and a couple of smaller DePIN names over the next two weeks before the narrative gets crowded.”",
  },
  {
    at: 2200,
    kind: "agent",
    prefix: "clarifier",
    cls: "text-lock",
    text: "What specifically tells you DePIN is forming rather than already picked over — flows, listings, funding, something you're seeing in the tape?",
  },
  {
    at: 6400,
    kind: "user",
    text: "Mostly a few CT threads and two DePIN raises last week — HONEY holding up while AI agent tokens chop. I haven't checked flow data yet, that's my gap.",
  },
  {
    at: 8600,
    kind: "agent",
    prefix: "clarifier",
    cls: "text-lock",
    text: "What invalidates the play?",
  },
  {
    at: 10400,
    kind: "user",
    text: "If DePIN flows stay flat for two more weeks while AI keeps absorbing inflows, I'm wrong and I cut.",
  },
  { at: 12400, kind: "note", text: "structured from the trader's words — 5 assumptions · 3 open questions" },
  {
    at: 14000,
    kind: "agent",
    prefix: "analyst",
    cls: "text-lock",
    text: "Querying the chain — live nansen smart money feed.",
  },
  {
    at: 16200,
    kind: "card",
    title: "DePIN vs AI Agents flow scale",
    verdict: "contradicts",
    rows: [
      { k: "DePIN top 7d inflow (DARKSOL)", v: "$2,624", neg: true },
      { k: "AI Agents top 7d inflow (VIRTUAL)", v: "$67,715", neg: false },
    ],
  },
  {
    at: 18800,
    kind: "card",
    title: "HONEY cohort participation · 7d",
    verdict: "contradicts",
    rows: [
      { k: "Smart trader netflow", v: "$0", neg: true },
      { k: "Fresh wallet netflow", v: "+$1,689,548", neg: true },
    ],
  },
  {
    at: 21200,
    kind: "agent",
    prefix: "analyst",
    cls: "text-lock",
    text: "Smart money flow sits in DeFi, memecoins and AI Agent names; DePIN's largest 7d inflow is $2,624.",
  },
  {
    at: 24600,
    kind: "agent",
    prefix: "skeptic",
    cls: "text-bad",
    text: "Your lead vehicle has $44,008 of liquidity, money leaving for exchanges, and the only buyers are fresh wallets. What observation in two weeks tells you the meta isn't coming, rather than just being early?",
  },
];
const END_AT = 31500;

export default function GhostSession({
  onClose,
  onBegin,
}: {
  onClose: () => void;
  onBegin: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const t = setInterval(
      () => setElapsed(reduced ? END_AT : performance.now() - start),
      120
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps = SCRIPT.filter((s) => s.at <= elapsed);
  const done = elapsed >= END_AT;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [steps.length, done]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-bg">
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-8 py-4">
        <p className="m-0 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted">
          ghost session <span className="text-faint">— a real interrogation, replayed · not your session · nansen data · sep 2026</span>
        </p>
        <button
          onClick={onClose}
          className="border-0 bg-transparent font-mono text-[9.5px] uppercase tracking-[.18em] text-faint transition-colors hover:text-ink"
        >
          [ skip ]
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-[22px] px-8 py-12">
          {steps.map((s) => {
            if (s.kind === "user")
              return (
                <p key={s.at} className="m-0 text-[15.5px] leading-[1.7] text-ink" style={{ fontFamily: "var(--grot)" }}>
                  {s.text}
                </p>
              );
            if (s.kind === "agent")
              return <TypeLine key={s.at} prefix={s.prefix} prefixClass={s.cls} text={s.text} />;
            if (s.kind === "note")
              return (
                <p key={s.at} className="m-0 border-t border-line pt-4 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
                  {s.text}
                </p>
              );
            return (
              <div key={s.at} className="border border-line px-4 py-3.5">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <p className="m-0 font-mono text-[10px] uppercase tracking-[.14em] text-ink">{s.title}</p>
                  <span className="border border-current px-[6px] py-[1px] font-mono text-[8.5px] uppercase tracking-[.14em] text-bad">
                    {s.verdict}
                  </span>
                </div>
                {s.rows.map((r) => (
                  <div key={r.k} className="flex items-baseline gap-2.5 border-t border-line py-[6px]">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.1em] text-muted">{r.k}</span>
                    <span className={`ml-auto font-mono text-[12.5px] font-bold tabular-nums ${r.neg ? "text-bad" : "text-good"}`}>
                      {r.v}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {done && (
            <div className="mt-4 flex flex-col items-start gap-5 border-t border-line pt-7">
              <p className="m-0 font-mono text-[10.5px] uppercase tracking-[.18em] text-muted">
                that was someone else&apos;s thesis. bring yours.
              </p>
              <button
                onClick={onBegin}
                className="border border-lock px-[30px] py-[12px] font-mono text-[11px] uppercase tracking-[.22em] text-lock transition-colors hover:bg-lock hover:text-lock-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
              >
                [ begin ]
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
