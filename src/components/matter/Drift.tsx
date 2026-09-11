"use client";

/* A blurred form crossing the frame. Slow, eight frames a second, still under reduced motion. */

import { useEffect, useRef } from "react";
import { drawDrift, reducedMotion } from "@/lib/matter";

export default function Drift({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    drawDrift(c, 0);
    if (reducedMotion()) return;
    let raf = 0, last = 0;
    const tick = (t: number) => {
      if (!document.hidden && t - last > 125) { last = t; drawDrift(c, t); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
