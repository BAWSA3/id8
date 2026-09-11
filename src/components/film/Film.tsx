"use client";

/* /film: the product, driven by a scripted cursor over a frozen take.
   Space rolls, R reloads. ?auto=1 rolls on its own after a beat, so the first
   recorded frame is clean. Not linked from anywhere and off in production. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Session from "@/components/instrument/Session";
import Desk from "@/components/desk/Desk";
import { Camera } from "./Camera";
import EndCard from "./EndCard";
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

export default function Film({ auto = false, end = false }: { auto?: boolean; end?: boolean }) {
  const [ready, setReady] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [ended, setEnded] = useState(false);
  const [beats, setBeats] = useState<string[]>([]);
  const boardScreen = useRef(new Map<string, { x: number; y: number }>());
  const [typeSpeed, setTypeSpeed] = useState(TYPE_SPEED);
  const stage = useMemo<Stage>(() => ({ typeSpeed, boardScreen }), [typeSpeed]);
  const puppet = useRef<Puppet | null>(null);
  const cameraEl = useRef<HTMLDivElement>(null);
  const scrollEl = useRef<HTMLDivElement>(null);
  /* the session until the play is booked; then the desk */
  const [view, setView] = useState<"session" | "desk">("session");

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
      camera: new Camera(cameraEl.current!),
      scroller: scrollEl.current!,
      openDesk: () => setView("desk"),
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

  /* the commit page's [ open the desk ] is a link to /desk; in the film the desk opens in place */
  useEffect(() => {
    if (!rolling) return;
    const h = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="/desk"]');
      if (a) {
        e.preventDefault();
        e.stopPropagation();
        setView("desk");
      }
    };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, [rolling]);

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
      {/* the stage: a viewport-sized box the camera scales; the product scrolls inside it */}
      <div ref={cameraEl} className="fixed inset-0 overflow-hidden bg-bg">
        <div ref={scrollEl} className="absolute inset-0 overflow-x-hidden overflow-y-auto">
          {ready && view === "session" && <Session />}
          {ready && view === "desk" && <Desk />}
        </div>
      </div>

      <EndCard show={ended || end} site={SITE} />

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
