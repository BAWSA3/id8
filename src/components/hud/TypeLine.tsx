"use client";

import { useEffect, useState } from "react";

/* Typewriter for a single line. To retype on a new message, key the
   component by its text: <TypeLine key={text} text={text} />. */
export default function TypeLine({
  prefix,
  prefixClass = "text-lock",
  text,
}: {
  prefix: string;
  prefixClass?: string;
  text: string;
}) {
  const [chars, setChars] = useState(0);

  /* Elapsed-time based (not per-tick increments) so browser timer throttling
     in background tabs can't stall the line — on return it's simply caught up. */
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const msPerChar = 22;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const n = reduced ? text.length : Math.min(text.length, Math.floor((now - start) / msPerChar));
      setChars(n);
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <p className="m-0 min-h-[42px] font-mono text-[12.5px] leading-relaxed" aria-live="polite">
      <span className={prefixClass}>{prefix} ›</span> {text.slice(0, chars)}
      <span className="blink" />
    </p>
  );
}
