"use client";

/* The front door: eclipse + wordmark + one [ begin ] on a clean slate.
   On begin, the orb travels into the page and lands as the idea seed
   (element #id8-seed rendered by Present beneath this overlay). */

import { useEffect, useRef, useState } from "react";
import GhostSession from "@/components/instrument/GhostSession";

/* Boot readout — the door's whisper layer. Doubles as the only product
   explanation a cold visitor gets: live feed, real coverage, the hard rule. */
const BOOT_LINES: { k: string; v: string; live?: boolean }[] = [
  { k: "booting", v: "thesis desk" },
  { k: "nansen smart money", v: "live", live: true },
  { k: "sectors tracked", v: "29" },
  { k: "holder cohorts", v: "whales · smart · fresh" },
  { k: "writes your trade", v: "never" },
];
const BOOT_START_MS = 950; /* after the center's curtain-up settles */
const BOOT_STEP_MS = 280;

function BootReadout() {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const t = setInterval(() => {
      const n = reduced
        ? BOOT_LINES.length
        : Math.min(
            BOOT_LINES.length,
            Math.max(0, Math.floor((performance.now() - start - BOOT_START_MS) / BOOT_STEP_MS) + 1)
          );
      setShown(n);
      if (n >= BOOT_LINES.length) clearInterval(t);
    }, 90);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed bottom-10 left-10 z-[61] hidden w-[300px] flex-col gap-[7px] font-mono text-[9.5px] uppercase tracking-[.14em] sm:flex"
    >
      {BOOT_LINES.map((l, i) => (
        <div
          key={l.k}
          className={`flex items-baseline gap-2 transition-opacity duration-300 ${i < shown ? "opacity-100" : "opacity-0"}`}
        >
          <span className="text-faint">{l.k}</span>
          <span className="min-w-4 flex-1 border-b border-dotted border-line" />
          <span className={l.live ? "text-lock" : "text-muted"}>
            {l.live && <span className="seed mr-1.5 inline-block align-[1px]" style={{ width: 5, height: 5 }} />}
            {l.v}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FrontDoor({ onDone }: { onDone: () => void }) {
  const orbRef = useRef<HTMLSpanElement>(null);
  const travelerRef = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [ghost, setGhost] = useState(false);
  const [primed, setPrimed] = useState(false);
  const started = useRef(false);

  function begin() {
    if (started.current) return;
    started.current = true;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const orb = orbRef.current;
    const traveler = travelerRef.current;
    const seed = document.getElementById("id8-seed");

    if (reduced || !orb || !traveler || !seed) {
      onDone();
      return;
    }

    const a = orb.getBoundingClientRect();
    const b = seed.getBoundingClientRect();
    const scale = b.width / a.width;

    traveler.style.opacity = "1";
    traveler.style.transform = `translate(${a.left}px, ${a.top}px) scale(1)`;
    orb.style.visibility = "hidden";
    setLeaving(true);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        traveler.classList.add("flying");
        traveler.style.transform = `translate(${b.left}px, ${b.top}px) scale(${scale})`;
      })
    );

    setTimeout(onDone, 950);
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bg transition-opacity duration-700 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <span
          ref={orbRef}
          className={`orb breathing door-in mb-[34px] size-[76px] ${primed ? "primed" : ""}`}
          style={{ animationDelay: "0.05s" }}
          aria-label="id8 — the eclipse"
        >
          <span className="orb-trail" />
          <span className="orb-core" />
        </span>
        <h1 className="door-in m-0 mb-[18px] text-[56px] font-bold leading-none tracking-[-.02em]" style={{ animationDelay: "0.24s" }}>
          id<i className="font-light italic">8</i>
        </h1>
        <p className="door-in m-0 mb-[52px] font-mono text-[11px] uppercase tracking-[.26em] text-muted" style={{ animationDelay: "0.42s" }}>
          your thesis · the chain pushes back
        </p>
        <button
          onClick={begin}
          onMouseEnter={() => setPrimed(true)}
          onMouseLeave={() => setPrimed(false)}
          onFocus={() => setPrimed(true)}
          onBlur={() => setPrimed(false)}
          className="door-in border border-line bg-transparent px-[34px] py-[13px] font-mono text-[11px] uppercase tracking-[.22em] text-ink transition-colors hover:border-lock-deep hover:text-lock-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
          style={{ animationDelay: "0.6s" }}
        >
          [ begin ]
        </button>
        <button
          onClick={() => setGhost(true)}
          className="door-in mt-[18px] border-0 bg-transparent font-mono text-[9.5px] uppercase tracking-[.2em] text-faint transition-colors hover:text-muted focus-visible:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
          style={{ animationDelay: "0.74s" }}
        >
          [ watch a session ]
        </button>
        <BootReadout />
      </div>

      {ghost && (
        <GhostSession
          onClose={() => setGhost(false)}
          onBegin={() => {
            setGhost(false);
            begin();
          }}
        />
      )}

      {/* the traveling eclipse — ink at takeoff, sage on landing */}
      <span
        ref={travelerRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[70] size-[76px] rounded-full opacity-0 [transform-origin:top_left] [transition:transform_.9s_cubic-bezier(.4,.1,.2,1)]"
        style={{ background: "radial-gradient(circle at 40% 38%, var(--ink), var(--ink) 52%, transparent 74%)" }}
      >
        <span className="absolute inset-[30px] rounded-full bg-lock opacity-0 transition-opacity delay-500 duration-500 [.flying_&]:opacity-100" />
      </span>
    </>
  );
}
