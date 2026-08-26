"use client";

import { useMemo } from "react";
import { MIN_WORDS, countWords, type IdeaNode } from "@/lib/session";
import Constellation from "./Constellation";
import Panel from "@/components/hud/Panel";
import TypeLine from "@/components/hud/TypeLine";

/* PRESENT — the empty room. One waiting core, one typing surface, and a
   minimum-effort gate: id8 refuses to interrogate a headline. */

const SEED_NODES: IdeaNode[] = [
  {
    id: "seed",
    label: "IDEA",
    sub: "awaiting input",
    pos: [0, 0, 0],
    kind: "core",
    dossier: {
      title: "Idea",
      sub: "awaiting input",
      tag: { label: "empty", tone: "neutral" },
      body: [],
    },
  },
];

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
  // retypes only when crossing a tier, not on every keystroke
  const line = useMemo(() => CLARIFIER_TIERS[tier], [tier]);

  return (
    <div className="stage relative z-10 h-[calc(100vh-88px)] max-h-[880px] min-h-[540px]">
      <Constellation nodes={SEED_NODES} edges={[]} lockedId={null} onLock={() => {}} />

      <Panel
        label="present — phase 01"
        labelRight="authorship: human"
        className="left-1/2 top-[36%] w-[min(680px,92%)] -translate-x-1/2 -translate-y-1/2"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          autoFocus
          spellCheck={false}
          placeholder="type the idea as you'd say it out loud — claim, audience, hunch, all of it…"
          className="w-full resize-none border-0 bg-transparent text-[17px] leading-relaxed text-ink outline-none placeholder:text-faint"
          style={{ caretColor: "var(--lock)", fontFamily: "var(--grot)" }}
          aria-label="Your idea"
        />
        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-3">
          <span className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">
            words <b className={`tabular-nums ${gateOpen ? "text-good" : "text-ink"}`}>{String(words).padStart(3, "0")}</b>
            {" / min "}
            <b className="tabular-nums">{String(MIN_WORDS).padStart(3, "0")}</b>
          </span>
          <span className="relative h-px w-24 bg-line" aria-hidden="true">
            <span
              className={`absolute left-0 top-0 h-px ${gateOpen ? "bg-good" : "bg-lock"}`}
              style={{ width: `${Math.min(100, (words / MIN_WORDS) * 100)}%` }}
            />
          </span>
          <button
            onClick={onCommit}
            disabled={!gateOpen}
            className={`ml-auto border px-4 py-2 font-mono text-[11px] uppercase tracking-[.18em] transition-colors
              ${gateOpen
                ? "border-lock text-lock hover:bg-lock hover:text-bg"
                : "cursor-not-allowed border-line text-faint"}`}
          >
            [ present idea ]
          </button>
        </div>
        <p className="m-0 mt-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted">
          this is the part we can&apos;t do for you. <b className="font-normal text-lock">id8 never writes your idea.</b>
        </p>
      </Panel>

      <Panel label="agent feed" className="bottom-[92px] left-10 w-[min(440px,calc(100%-80px))]">
        <TypeLine key={line} prefix="clarifier" text={line} />
      </Panel>

      <span className="stage-hint absolute bottom-3 left-1/2 z-[15] -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">
        phase 01/05 · the constellation materializes when you present
      </span>
    </div>
  );
}
