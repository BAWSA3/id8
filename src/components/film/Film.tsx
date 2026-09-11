"use client";

/* /film: the product, driven by a scripted cursor over a frozen take.
   Space rolls, R reloads. ?auto=1 rolls on its own after a beat, so the first
   recorded frame is clean. Not linked from anywhere and off in production. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Session from "@/components/instrument/Session";
import Horizon from "@/components/hud/Horizon";
import { StageContext, type Stage } from "@/lib/stage";
import { SESSION_STORE_KEY, TOUR_SEEN_KEY } from "@/lib/session";
import { installFilmFetch, type Take } from "@/lib/film/shim";
import take from "@/lib/film/sol-take.json";
import { Puppet } from "./Puppet";
import { runFilm } from "./timeline";

const TYPE_SPEED = 3.2;
const SITE = "id8.markets";
const STAGE_W = 1440;
const STAGE_H = 810;

export default function Film({ auto = false }: { auto?: boolean }) {
  const [ready, setReady] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [ended, setEnded] = useState(false);
  const [beats, setBeats] = useState<string[]>([]);
  const boardScreen = useRef(new Map<string, { x: number; y: number }>());
  const [typeSpeed, setTypeSpeed] = useState(TYPE_SPEED);
  const stage = useMemo<Stage>(() => ({ typeSpeed, boardScreen }), [typeSpeed]);
  const puppet = useRef<Puppet | null>(null);

  /* a clean desk every take: no session, no tour. the book is left alone. */
  useEffect(() => {
    try {
      localStorage.removeItem(SESSION_STORE_KEY);
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {}
    const off = installFilmFetch(take as unknown as Take);
    const t = setTimeout(() => setReady(true), 0);
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);

  const roll = useCallback(() => {
    if (puppet.current) return;
    setRolling(true);
    const p = new Puppet();
    puppet.current = p;
    runFilm(p, take as unknown as Take, {
      boardScreen,
      setTypeSpeed,
      onBeat: (name, ms) => {
        console.log(`[film] ${name} · ${(ms / 1000).toFixed(1)}s`);
        setBeats((b) => [...b, `${name} ${(ms / 1000).toFixed(1)}s`]);
      },
    })
      .then(() => setEnded(true))
      .catch((e) => console.error("[film] stopped:", e));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "TEXTAREA" || (e.target as HTMLElement)?.tagName === "INPUT";
      if (e.key === " " && !typing && !puppet.current) {
        e.preventDefault();
        roll();
      }
      if ((e.key === "r" || e.key === "R") && !typing) location.reload();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [roll]);

  useEffect(() => {
    if (!auto || !ready) return;
    const t = setTimeout(roll, 1100);
    return () => clearTimeout(t);
  }, [auto, ready, roll]);

  const openStage = () => {
    window.open(`/film?auto=1`, "id8film", `popup=yes,width=${STAGE_W},height=${STAGE_H}`);
  };

  return (
    <StageContext.Provider value={stage}>
      {ready && <Session />}

      {/* the end card */}
      <div
        className={`fixed inset-0 z-[80] flex flex-col items-center justify-center bg-bg transition-opacity duration-[1200ms] ${ended ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!ended}
      >
        <Horizon />
        <span className="orb breathing mb-[34px] size-[76px]" aria-label="id8, the eclipse">
          <span className="orb-trail" />
          <span className="orb-core" />
        </span>
        <h1 className="m-0 mb-[18px] text-[56px] font-bold leading-none tracking-[-.02em]">
          id<i className="font-light italic">8</i>
        </h1>
        <p className="m-0 mb-[40px] font-mono text-[11px] uppercase tracking-[.26em] text-muted">a canvas for your thesis</p>
        <p className="m-0 font-mono text-[12px] tracking-[.2em] text-lock">{SITE}</p>
        <p className="m-0 mt-[14px] font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">
          live nansen smart money · never writes your trade
        </p>
      </div>

      {/* the booth: only before the take rolls, never on ?auto=1 */}
      {!rolling && !auto && (
        <div className="fixed bottom-6 right-6 z-[95] flex flex-col items-end gap-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
          <button onClick={openStage} className="border border-line px-3 py-1.5 text-muted transition-colors hover:border-ink hover:text-ink">
            [ open the stage · {STAGE_W}×{STAGE_H} ]
          </button>
          <button onClick={roll} className="border border-lock-deep px-3 py-1.5 text-lock-deep transition-colors hover:bg-lock-deep hover:text-bg">
            [ roll ]
          </button>
          <span>space rolls · r resets</span>
        </div>
      )}
      {rolling && !auto && beats.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[95] font-mono text-[9px] uppercase tracking-[.14em] text-faint">{beats.at(-1)}</div>
      )}
    </StageContext.Provider>
  );
}
