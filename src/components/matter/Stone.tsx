"use client";

/* The eclipse as a body. Rendered once per size; the anchor may put it off frame.
   Portrait screens get their own composition. */

import { useEffect, useRef } from "react";
import { renderStone } from "@/lib/matter";

export type StonePose = { anchor: [number, number]; radius: number };

export default function Stone({ pose, portrait, className = "" }: { pose: StonePose; portrait?: StonePose; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let t = 0;
    const draw = () => {
      const p = portrait && innerHeight > innerWidth ? portrait : pose;
      renderStone(c, p.anchor, p.radius, innerWidth < 640 ? 480 : 960);
    };
    draw();
    const onResize = () => { clearTimeout(t); t = window.setTimeout(draw, 200); };
    addEventListener("resize", onResize);
    return () => { removeEventListener("resize", onResize); clearTimeout(t); };
  }, [pose, portrait]);
  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
