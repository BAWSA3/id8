"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedLine } from "@/lib/session";
import Panel from "./Panel";

const AGENT_COLOR: Record<FeedLine["agent"], string> = {
  clarifier: "text-lock",
  analyst: "text-good",
  skeptic: "text-bad",
  system: "text-muted",
};

/* The feed — a transcript. Each line types once, in order, and stays on the
   board; nothing loops. New lines (the tape landing) append and type in. */
export default function AgentFeed({
  lines,
  extra,
}: {
  lines: FeedLine[];
  extra?: React.ReactNode;
}) {
  const [li, setLi] = useState(0);
  const [chars, setChars] = useState(0);
  const key = lines.map((l) => l.agent + l.text).join("|");
  /* the transcript scrolls inside the panel — the feed never grows into the phases above it */
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chars, li]);

  /* a new transcript starts from its first line (derived reset during render) */
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setLi(0);
    setChars(0);
  }

  /* elapsed-time typing: background tabs throttle timers to ~1/s, so the
     visible length is derived from the clock, never from tick count */
  useEffect(() => {
    if (li >= lines.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const text = lines[li].text;
    if (reduced) {
      const show = setTimeout(() => setChars(text.length), 0);
      const t = setTimeout(() => { setLi(li + 1); setChars(0); }, 900);
      return () => { clearTimeout(show); clearTimeout(t); };
    }
    const CPS = 42, HOLD_MS = 700;
    const start = performance.now();
    let raf = 0;
    let advanced = false;
    const tick = () => {
      const n = Math.min(text.length, Math.floor(((performance.now() - start) / 1000) * CPS));
      setChars(n);
      if (n >= text.length) {
        if (!advanced && performance.now() - start >= (text.length / CPS) * 1000 + HOLD_MS) {
          advanced = true;
          setLi(li + 1);
          setChars(0);
        }
      }
    };
    const loop = () => { tick(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const iv = setInterval(tick, 300); // rAF pauses entirely in background tabs
    return () => { cancelAnimationFrame(raf); clearInterval(iv); };
  }, [li, lines]);

  return (
    <Panel label="the feed" className="bottom-[92px] left-10 top-[296px] flex w-[min(440px,calc(100%-80px))] flex-col">
      <div
        ref={scroller}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]"
        aria-live="polite"
      >
        {lines.slice(0, Math.min(li + 1, lines.length)).map((line, i) => (
          <p key={line.agent + i} className="m-0 font-mono text-[12.5px] leading-relaxed">
            <span className={AGENT_COLOR[line.agent]}>{line.agent} ›</span>{" "}
            {i < li ? line.text : line.text.slice(0, chars)}
            {i === li && <span className="blink" />}
          </p>
        ))}
      </div>
      <p className="m-0 mt-3 shrink-0 border-t border-line pt-2.5 font-mono text-[10px] uppercase tracking-[.16em] text-muted">
        what the tape found · what the skeptic doubts. <b className="font-normal text-lock">id8 will not write this for you.</b>
      </p>
      {extra}
    </Panel>
  );
}
