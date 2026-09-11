"use client";

/* The front door: the eclipse as a body, off frame to the right, the wordmark
   small in the corner, one line and one [ open the desk ] low left, the index
   band along the bottom. On begin, the body's core travels into the page and
   lands as the idea seed (#id8-seed, rendered beneath this overlay). */

import { useEffect, useRef, useState } from "react";
import { SESSION_STORE_KEY, isFreshStored, sessionSlug } from "@/lib/session";
import { localBookCount } from "@/lib/book";
import Stone, { type StonePose } from "@/components/matter/Stone";
import Grain from "@/components/matter/Grain";
import IndexBand from "@/components/hud/IndexBand";

const POSE: StonePose = { anchor: [1.0, 0.5], radius: 0.46 };
const PORTRAIT: StonePose = { anchor: [0.5, 0.3], radius: 0.58 };

export default function FrontDoor({ onDone }: { onDone: () => void }) {
  const coreRef = useRef<HTMLSpanElement>(null);
  const travelerRef = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [portrait, setPortrait] = useState(false);
  /* one door: the button acknowledges a session in progress and resumes it */
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  const [bookCount, setBookCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const mq = matchMedia("(orientation: portrait)");
    const apply = () => setPortrait(mq.matches);
    const t = setTimeout(() => {
      apply();
      setBookCount(localBookCount());
      try {
        const raw = localStorage.getItem(SESSION_STORE_KEY);
        if (raw) {
          const s = JSON.parse(raw) as { thesis?: string; ticker?: string | null; vehicle?: { chain?: string } | null };
          /* same definition of a new visitor as the tour: an empty desk is not a session to resume */
          if (!isFreshStored(s)) {
            if (s?.ticker) setResumeSlug(`$${s.ticker}${s.vehicle?.chain ? ` · ${s.vehicle.chain}` : ""}`);
            else if (s?.thesis?.trim()) setResumeSlug(sessionSlug(s.thesis));
          }
        }
      } catch {
        /* no storage — fresh visit */
      }
    }, 0);
    mq.addEventListener("change", apply);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", apply);
    };
  }, []);

  function begin() {
    if (started.current) return;
    started.current = true;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const core = coreRef.current;
    const traveler = travelerRef.current;
    const seed = document.getElementById("id8-seed");

    if (reduced || !core || !traveler || !seed) {
      onDone();
      return;
    }

    const a = core.getBoundingClientRect();
    const b = seed.getBoundingClientRect();
    const scale = b.width / a.width;

    traveler.style.opacity = "1";
    traveler.style.transform = `translate(${a.left}px, ${a.top}px) scale(1)`;
    setLeaving(true);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        traveler.classList.add("flying");
        traveler.style.transform = `translate(${b.left}px, ${b.top}px) scale(${scale})`;
      })
    );

    setTimeout(onDone, 950);
  }

  const pose = portrait ? PORTRAIT : POSE;

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] overflow-hidden bg-bg transition-opacity duration-700 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <Stone pose={POSE} portrait={PORTRAIT} />
        {/* the body's core: where the traveler takes off from */}
        <span
          ref={coreRef}
          aria-hidden="true"
          className="absolute size-[76px] -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pose.anchor[0] * 100}%`, top: `${pose.anchor[1] * 100}%` }}
        />

        <div className="door-in absolute left-[5vw] top-[5vh] flex items-baseline gap-4" style={{ animationDelay: "0.05s" }}>
          <h1 className="m-0 text-[clamp(22px,2.4vw,34px)] font-bold leading-none tracking-[-.03em]">
            id<i className="font-light italic">8</i>
          </h1>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[.26em] text-muted">a canvas for your thesis</p>
        </div>

        <div className="absolute bottom-[18vh] left-[5vw] flex max-w-[min(50vw,560px)] flex-col gap-6 portrait:bottom-[15vh] portrait:max-w-[88vw]">
          <p className="door-in m-0 text-[clamp(18px,1.9vw,28px)] font-medium leading-[1.25] tracking-[-.01em] [text-wrap:balance]" style={{ animationDelay: "0.24s" }}>
            Present the play. <span className="text-muted">The desk asks the hard questions, then the tape weighs in.</span>
          </p>
          <div className="door-in flex flex-wrap items-baseline gap-x-5 gap-y-3" style={{ animationDelay: "0.42s" }}>
            <button
              onClick={begin}
              className="border border-line bg-transparent px-[30px] py-[12px] font-mono text-[11px] uppercase tracking-[.22em] text-ink transition-colors hover:border-lock-deep hover:text-lock-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
            >
              {resumeSlug ? "[ back to the desk ]" : "[ open the desk ]"}
            </button>
            {resumeSlug && (
              <span className="font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">session 001 · {resumeSlug}</span>
            )}
            {bookCount > 0 && (
              <a
                href="/desk"
                className="border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.18em] text-faint transition-colors hover:text-muted focus-visible:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
              >
                [ the book · {String(bookCount).padStart(2, "0")} {bookCount === 1 ? "play" : "plays"} ]
              </a>
            )}
          </div>
        </div>

        <IndexBand
          className="door-in absolute inset-x-[5vw] bottom-[5vh]"
          left={["thesis desk", "plate zero zero one"]}
          right={["nansen smart money", "live · 29 sectors · 26 chains"]}
          tail="©2026"
        />
        <Grain strength={0.7} />
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
