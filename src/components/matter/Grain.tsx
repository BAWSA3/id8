"use client";

/* Live film grain over a poster surface. Eight frames a second, still when the
   tab is hidden or motion is reduced. Blends over what's beneath it. */

import { useEffect, useRef } from "react";
import { grainFrame, reducedMotion } from "@/lib/matter";

export default function Grain({ strength = 0.7, blend = "overlay", className = "" }: { strength?: number; blend?: "overlay" | "soft-light"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    grainFrame(c, strength);
    if (reducedMotion()) return;
    let raf = 0, last = 0;
    const tick = (t: number) => {
      if (!document.hidden && t - last > 125) { last = t; grainFrame(c, strength); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [strength]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ mixBlendMode: blend, opacity: blend === "overlay" ? 0.9 : 1 }}
    />
  );
}
