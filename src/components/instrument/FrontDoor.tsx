"use client";

/* The front door: eclipse + wordmark + one [ begin ] on a clean slate.
   On begin, the orb travels into the page and lands as the idea seed
   (element #id8-seed rendered by Present beneath this overlay). */

import { useRef, useState } from "react";

export default function FrontDoor({ onDone }: { onDone: () => void }) {
  const orbRef = useRef<HTMLSpanElement>(null);
  const travelerRef = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
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
        <span ref={orbRef} className="orb breathing mb-[34px] size-[76px]" aria-label="id8 — the eclipse">
          <span className="orb-trail" />
          <span className="orb-core" />
        </span>
        <h1 className="m-0 mb-[18px] text-[56px] font-bold leading-none tracking-[-.02em]">
          id<i className="font-light italic">8</i>
        </h1>
        <p className="m-0 mb-[52px] font-mono text-[11px] uppercase tracking-[.26em] text-muted">
          you think · we interrogate
        </p>
        <button
          onClick={begin}
          className="border border-line bg-transparent px-[34px] py-[13px] font-mono text-[11px] uppercase tracking-[.22em] text-ink transition-colors hover:border-lock-deep hover:text-lock-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
        >
          [ begin ]
        </button>
      </div>

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
