"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeedLine, IdeaEdge, IdeaNode } from "@/lib/session";
import Constellation from "./Constellation";
import Panel from "@/components/hud/Panel";
import PhaseMenu from "@/components/hud/PhaseMenu";
import Dossier from "@/components/hud/Dossier";
import AgentFeed from "@/components/hud/AgentFeed";
import DeskCaption from "@/components/hud/DeskCaption";

/* The flagship composition: the board center stage, HUD floating around it.
   The board is progressive: the thesis and its lines show first; lock a line
   and its evidence fans out, lock the thesis and the open questions do.
   Locking another line folds the last one back. Still until dragged.
   On the first-visit tour the desk builds itself panel by panel — board,
   phases, target lock, feed — each introduced by the desk's caption.
   Any interaction fast-forwards the assembly. */

const DESK_B1 = "the board. your thesis at the center, its lines around it. drag to turn it.";
const DESK_B2 = "five phases. you're in challenge. the tape weighs in here.";
const DESK_B3 = "click a line to open what the tape found on it. click the thesis for the open questions.";
const DESK_B4 = "the feed: the analyst reports what the tape found, the skeptic attacks. neither writes your trade.";
const DESK_B5 = "that's the desk. it's yours.";

const BUILD_STEP_MS = 3600;
const CLOSE_AFTER_MS = 9000;
const DONE_AFTER_MS = 4200;

export default function Cockpit({
  nodes,
  edges,
  activePhase,
  feed,
  challengeError = false,
  onRetryChallenge,
  onRule,
  tour = false,
  onTourDone,
}: {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  activePhase: number;
  feed: FeedLine[];
  challengeError?: boolean;
  onRetryChallenge?: () => void;
  /* the tape is in — the trader can go rule on it */
  onRule?: () => void;
  tour?: boolean;
  onTourDone?: () => void;
}) {
  const [lockedId, setLockedId] = useState<string>("thesis");
  /* which line is open on the board (thesis = the open questions) */
  const [openId, setOpenId] = useState<string | null>(null);
  const [yawDeg, setYawDeg] = useState(35);
  const [build, setBuild] = useState(tour ? 1 : 4);
  const [closing, setClosing] = useState(false);
  const startedClose = useRef(false);
  const locked = nodes.find((n) => n.id === lockedId);

  /* the progressive board: what's on it right now, with counts on the folded lines */
  const board = useMemo(() => {
    const parentOf = (id: string) => edges.find((e) => e.from === id)?.to ?? null; // ev → a#/thesis, risk → thesis
    const childCount = new Map<string, { ev: number; risk: number }>();
    for (const n of nodes) {
      if (n.kind !== "evidence" && n.kind !== "risk") continue;
      const p = parentOf(n.id);
      if (!p) continue;
      const c = childCount.get(p) ?? { ev: 0, risk: 0 };
      if (n.kind === "evidence") c.ev++;
      else c.risk++;
      childCount.set(p, c);
    }
    const shown = nodes.filter((n) => {
      if (n.kind === "core" || n.kind === "assumption") return true;
      return openId !== null && parentOf(n.id) === openId;
    });
    const withCounts = shown.map((n) => {
      const c = childCount.get(n.id);
      if (!c || n.id === openId) return n;
      const parts = [c.ev ? `${c.ev} ev` : "", c.risk ? `${c.risk} open` : ""].filter(Boolean);
      return parts.length ? { ...n, sub: `${n.sub} · ${parts.join(" · ")}` } : n;
    });
    const ids = new Set(withCounts.map((n) => n.id));
    return { nodes: withCounts, edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
  }, [nodes, edges, openId]);

  /* assembly timer — each panel earns a beat */
  useEffect(() => {
    if (!tour || build >= 4) return;
    const t = setTimeout(() => setBuild((b) => Math.min(4, b + 1)), BUILD_STEP_MS);
    return () => clearTimeout(t);
  }, [tour, build]);

  /* once fully built: close the tour after the first target-lock, or a beat */
  useEffect(() => {
    if (!tour || build < 4 || closing) return;
    const t = setTimeout(() => setClosing(true), CLOSE_AFTER_MS);
    return () => clearTimeout(t);
  }, [tour, build, closing]);

  useEffect(() => {
    if (!tour || !closing || startedClose.current) return;
    startedClose.current = true;
    const t = setTimeout(() => onTourDone?.(), DONE_AFTER_MS);
    return () => clearTimeout(t);
  }, [tour, closing, onTourDone]);

  const handleLock = (id: string) => {
    setLockedId(id);
    const n = nodes.find((x) => x.id === id);
    /* a line or the thesis opens (and folds whatever was open); evidence keeps its parent open */
    if (n && (n.kind === "assumption" || n.kind === "core")) setOpenId((cur) => (cur === id ? null : id));
    if (tour && build < 4) setBuild(4);
    else if (tour && id !== "thesis") setClosing(true);
  };

  const caption = closing
    ? DESK_B5
    : build === 1
      ? DESK_B1
      : build === 2
        ? DESK_B2
        : build === 3
          ? DESK_B3
          : DESK_B4;

  const reveal = (visible: boolean) =>
    `transition-opacity duration-700 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`;

  return (
    <div className="stage relative z-10 h-[calc(100vh-88px)] max-h-[880px] min-h-[540px]">
      <Constellation
        nodes={board.nodes}
        edges={board.edges}
        lockedId={lockedId}
        onLock={handleLock}
        onYaw={setYawDeg}
        initialZoom={1.3}
      />
      <div className={reveal(build >= 2)}>
        <PhaseMenu activePhase={activePhase} />
      </div>
      <div className={reveal(build >= 3)}>
        {locked && <Dossier data={locked.dossier} />}
        <Panel className="hud-readout bottom-[92px] right-10 flex items-baseline gap-4 !py-[11px] font-mono text-[11px] tracking-[.1em] text-muted">
          <span>YAW <span className="text-xl font-bold tabular-nums text-ink">{String(yawDeg).padStart(3, "0")}°</span></span>
          <span>NODES {String(nodes.length).padStart(2, "0")}</span>
          <span>EV {String(nodes.filter((n) => n.kind === "evidence").length).padStart(2, "0")}</span>
        </Panel>
      </div>
      <div className={reveal(build >= 4)}>
        <AgentFeed
          lines={feed}
          extra={
            challengeError && onRetryChallenge ? (
              <button
                onClick={onRetryChallenge}
                className="mt-2 border border-line px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[.16em] text-muted transition-colors hover:border-ink hover:text-ink"
              >
                [ read the tape again ]
              </button>
            ) : onRule && !tour ? (
              <button
                onClick={onRule}
                className="mt-3 border border-lock-deep px-4 py-2 font-mono text-[10.5px] uppercase tracking-[.18em] text-lock-deep transition-colors hover:bg-lock-deep hover:text-bg"
              >
                [ make the ruling ]
              </button>
            ) : null
          }
        />
      </div>
      {!tour && (
        <span className="stage-hint absolute bottom-3 left-1/2 z-[15] -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">
          drag to rotate · scroll to zoom · click a line to open its evidence
        </span>
      )}
      {tour && onTourDone && <DeskCaption text={caption} onSkip={onTourDone} />}
    </div>
  );
}
