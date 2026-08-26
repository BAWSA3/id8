"use client";

/* PRESENT — the blank page. Gallery calm: one column, generous air,
   a hairline gate, the Clarifier as a margin voice. No instrument chrome —
   that energy is earned in later phases. */

import { useMemo } from "react";
import { MIN_WORDS, countWords } from "@/lib/session";
import TypeLine from "@/components/hud/TypeLine";

const CLARIFIER_TIERS = [
  "Present your idea. Raw is fine — polished is not required. I ask questions after, not before.",
  "That's a headline, not an idea yet. Keep going — what's the actual claim?",
  "Getting somewhere. Who is this for, and what would make it false?",
  "That's presentable. Lock it in when you're ready — then the interrogation starts.",
];

function gateTier(words: number): number {
  if (words === 0) return 0;
  if (words <= 10) return 1;
  if (words < MIN_WORDS) return 2;
  return 3;
}

export default function Present({
  value,
  onChange,
  onCommit,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  const words = countWords(value);
  const gateOpen = words >= MIN_WORDS;
  const tier = gateTier(words);
  const line = useMemo(() => CLARIFIER_TIERS[tier], [tier]);

  return (
    <>
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[660px] flex-col px-8 pt-[13vh]">
        <p className="m-0 mb-[30px] font-mono text-[10px] uppercase tracking-[.22em] text-muted">
          <span id="id8-seed" className="seed mr-2.5 align-[1px]" />
          present — the part we can&apos;t do for you
        </p>
        <h2 className="m-0 mb-[38px] max-w-[20em] text-[26px] font-medium leading-[1.45] tracking-[-.01em] [text-wrap:balance]">
          What&apos;s the idea? Say it like you&apos;d say it out loud —{" "}
          <em className="not-italic text-lock-deep">we&apos;ll ask the hard questions after.</em>
        </h2>

        <textarea
          id="id8-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="the page is yours…"
          className="min-h-[150px] w-full resize-none border-0 bg-transparent text-[18px] leading-[1.75] text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint"
          style={{ fontFamily: "var(--grot)" }}
          aria-label="Your idea"
        />

        <div className="flex flex-wrap items-center gap-5 border-t border-line pt-4">
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">
            words{" "}
            <b className={`font-semibold tabular-nums ${gateOpen ? "text-good" : "text-ink"}`}>
              {String(words).padStart(3, "0")}
            </b>
            {" / "}
            {String(MIN_WORDS).padStart(3, "0")}
          </span>
          <span className="relative h-px w-[110px] bg-line" aria-hidden="true">
            <span
              className="absolute left-0 top-0 h-px bg-lock"
              style={{ width: `${Math.min(100, (words / MIN_WORDS) * 100)}%` }}
            />
          </span>
          <button
            onClick={onCommit}
            disabled={!gateOpen}
            className={`ml-auto border px-[18px] py-[9px] font-mono text-[10.5px] uppercase tracking-[.18em] transition-colors
              ${gateOpen
                ? "border-lock-deep text-lock-deep hover:bg-lock-deep hover:text-bg"
                : "cursor-not-allowed border-line text-faint"}`}
          >
            [ present idea ]
          </button>
        </div>
        <p className="m-0 mt-3.5 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
          authorship: <b className="font-normal text-muted">100% human</b> — id8 never writes your idea
        </p>
      </main>

      <div className="mx-auto w-full max-w-[660px] px-8 pt-6">
        <TypeLine key={line} prefix="clarifier" prefixClass="text-lock-deep" text={line} />
      </div>
    </>
  );
}
