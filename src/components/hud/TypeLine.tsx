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

  useEffect(() => {
    if (chars >= text.length) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => setChars(reduced ? text.length : chars + 1),
      reduced ? 0 : 14 + Math.random() * 18
    );
    return () => clearTimeout(t);
  }, [chars, text]);

  return (
    <p className="m-0 min-h-[42px] font-mono text-[12.5px] leading-relaxed" aria-live="polite">
      <span className={prefixClass}>{prefix} ›</span> {text.slice(0, chars)}
      <span className="blink" />
    </p>
  );
}
