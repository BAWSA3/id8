"use client";

/* PRESENT — the blank page. Gallery calm: one column, generous air,
   a hairline gate, the Clarifier as a margin voice. No instrument chrome —
   that energy is earned in later phases. */

import { useMemo } from "react";
import { MAX_THESIS_CHARS, MIN_WORDS, countWords } from "@/lib/session";
import TypeLine from "@/components/hud/TypeLine";
import DeskCaption from "@/components/hud/DeskCaption";
import Horizon from "@/components/hud/Horizon";

const CLARIFIER_TIERS = [
  "Present your play. Raw is fine — polished is not required. I ask questions after, not before.",
  "That's a ticker, not a thesis yet. Keep going — what's the narrative, and why now?",
  "Getting somewhere. Why this vehicle, and what would prove you wrong?",
  "That's presentable. Lock it in when you're ready — then the interrogation starts.",
];

function gateTier(words: number): number {
  if (words === 0) return 0;
  if (words <= 10) return 1;
  if (words < MIN_WORDS) return 2;
  return 3;
}

/* Desk captions for the first-visit tour — the page assembles as you write */
const DESK_P1 = "this is the desk. one page, one thesis. the agents wake when you write.";
const DESK_P2 = "twenty-five words is the floor. half-formed is fine — vague is not.";
const DESK_P3 = "the gate is open. everything on this page stays yours — id8 never writes the thesis.";

export default function Present({
  value,
  onChange,
  onCommit,
  ticker = null,
  onChangeVehicle,
  tour = false,
  onSkipTour,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  ticker?: string | null;
  /* reopen the window — name a ticker, or change the one named */
  onChangeVehicle?: () => void;
  tour?: boolean;
  onSkipTour?: () => void;
}) {
  const words = countWords(value);
  const gateOpen = words >= MIN_WORDS;
  const tier = gateTier(words);
  const line = useMemo(() => CLARIFIER_TIERS[tier], [tier]);

  /* tour build: the gate row appears at the first word, the authorship line
     when the gate opens; outside the tour everything is furnished at once */
  const showGate = !tour || words > 0;
  const showAuthorship = !tour || gateOpen;
  const caption = words === 0 ? DESK_P1 : gateOpen ? DESK_P3 : DESK_P2;

  return (
    <>
      <Horizon fixed />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[660px] flex-col px-8 pt-[13vh]">
        <p className="m-0 mb-[30px] font-mono text-[10px] uppercase tracking-[.22em] text-muted">
          <span id="id8-seed" className="seed mr-2.5 align-[1px]" />
          present — the part we can&apos;t do for you
        </p>
        <h2 className="m-0 mb-[38px] max-w-[20em] text-[26px] font-medium leading-[1.45] tracking-[-.01em] [text-wrap:balance]">
          {ticker ? (
            <>
              What&apos;s the play on <span className="font-mono text-lock-deep">${ticker}</span>? The narrative, the
              timing, why now —{" "}
            </>
          ) : (
            <>What&apos;s the play? The narrative, the vehicle, why now — </>
          )}
          <em className="not-italic text-lock-deep">we&apos;ll ask the hard questions after.</em>
        </h2>

        {onChangeVehicle && (
          <p className="m-0 -mt-[22px] mb-[26px] font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
            <span className="text-faint">vehicle</span>{" "}
            <span className="text-muted">{ticker ? `$${ticker}` : "a narrative, not a name"}</span>
            <button
              onClick={onChangeVehicle}
              className="ml-3 whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
            >
              {ticker ? "[ change ]" : "[ name a ticker ]"}
            </button>
          </p>
        )}

        <textarea
          id="id8-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          maxLength={MAX_THESIS_CHARS}
          spellCheck={false}
          placeholder="the desk is yours…"
          className="min-h-[150px] w-full resize-none border-0 bg-transparent text-[18px] leading-[1.75] text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint"
          style={{ fontFamily: "var(--grot)" }}
          aria-label="Your play"
        />

        <div
          className={`flex flex-wrap items-center gap-5 border-t border-line pt-4 transition-opacity duration-700 ${showGate ? "opacity-100" : "opacity-0"}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">
            words{" "}
            <b className={`font-semibold tabular-nums ${gateOpen ? "text-good" : "text-ink"}`}>
              {String(words).padStart(3, "0")}
            </b>
            {" / "}
            {String(MIN_WORDS).padStart(3, "0")}
            {value.length > MAX_THESIS_CHARS * 0.8 && (
              <span className={value.length >= MAX_THESIS_CHARS ? "text-bad" : "text-faint"}>
                {" · "}
                {value.length.toLocaleString("en-US")} / {MAX_THESIS_CHARS.toLocaleString("en-US")} characters
              </span>
            )}
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
            [ present the play ]
          </button>
        </div>
        <p
          className={`m-0 mt-3.5 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-opacity duration-700 ${showAuthorship ? "opacity-100" : "opacity-0"}`}
        >
          authorship: <b className="font-normal text-muted">100% human</b> — id8 never writes your thesis
        </p>
      </main>

      {(!tour || words > 0) && (
        <div className="mx-auto w-full max-w-[660px] px-8 pt-6">
          <TypeLine key={line} prefix="clarifier" prefixClass="text-lock-deep" text={line} />
        </div>
      )}

      {tour && onSkipTour && <DeskCaption text={caption} onSkip={onSkipTour} />}
    </>
  );
}
