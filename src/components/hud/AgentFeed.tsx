"use client";

import { useEffect, useState } from "react";
import type { FeedLine } from "@/lib/session";
import Panel from "./Panel";

const AGENT_COLOR: Record<FeedLine["agent"], string> = {
  clarifier: "text-lock",
  analyst: "text-good",
  skeptic: "text-bad",
  system: "text-muted",
};

/* Typewriter agent feed — the JARVIS presence, text only. */
export default function AgentFeed({ lines }: { lines: FeedLine[] }) {
  const [li, setLi] = useState(0);
  const [chars, setChars] = useState(0);
  const line = lines[li];

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = chars >= line.text.length;
    const delay = done ? (reduced ? 6000 : 5200) : reduced ? 0 : 16 + Math.random() * 20;
    const t = setTimeout(() => {
      if (!done) setChars(reduced ? line.text.length : chars + 1);
      else {
        setLi((i) => (i + 1) % lines.length);
        setChars(0);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [chars, li, line.text.length, lines.length]);

  return (
    <Panel label="agent feed" className="bottom-[92px] left-10 w-[min(440px,calc(100%-80px))]">
      <p className="m-0 min-h-[62px] font-mono text-[12.5px] leading-relaxed" aria-live="polite">
        <span className={AGENT_COLOR[line.agent]}>{line.agent} ›</span>{" "}
        {line.text.slice(0, chars)}
        <span className="blink" />
      </p>
      <p className="m-0 mt-3 border-t border-line pt-2.5 font-mono text-[10px] uppercase tracking-[.16em] text-muted">
        your move — defend, revise, or concede. <b className="font-normal text-lock">id8 will not write this for you.</b>
      </p>
    </Panel>
  );
}
