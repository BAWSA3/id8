"use client";

/* The board, reopened from the book. The play's map exactly as it settled at
   the ruling: the thesis at the center, its lines around it in their verdict
   tints, a cut line gone. Click a line and its evidence fans out; click the
   thesis for the open questions. Still until dragged. The target lock sits
   under the board here, not over it: the desk is a reading room. */

import { useMemo, useState } from "react";
import { nodesFromExtraction, progressiveBoard } from "@/lib/session";
import type { PlaySession } from "@/lib/desk";
import Constellation from "@/components/instrument/Constellation";
import Dossier from "@/components/hud/Dossier";

export default function PlayBoard({ session }: { session: PlaySession }) {
  const [lockedId, setLockedId] = useState<string>("thesis");
  /* which line is open on the board (thesis = the open questions) */
  const [openId, setOpenId] = useState<string | null>(null);

  const graph = useMemo(
    () => nodesFromExtraction(session.thesis, session.extraction, session.challenge, session.structure),
    [session]
  );
  const board = useMemo(() => progressiveBoard(graph.nodes, graph.edges, openId), [graph, openId]);
  const locked = graph.nodes.find((n) => n.id === lockedId);
  const evCount = graph.nodes.filter((n) => n.kind === "evidence").length;
  const lineCount = graph.nodes.filter((n) => n.kind === "assumption").length;

  const handleLock = (id: string) => {
    setLockedId(id);
    const n = graph.nodes.find((x) => x.id === id);
    /* a line or the thesis opens (and folds whatever was open); evidence keeps its parent open */
    if (n && (n.kind === "assumption" || n.kind === "core")) setOpenId((cur) => (cur === id ? null : id));
  };

  return (
    <div>
      <div className="stage relative h-[520px] min-h-[420px]">
        <Constellation nodes={board.nodes} edges={board.edges} lockedId={lockedId} onLock={handleLock} initialZoom={1} />
        <span className="stage-hint pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">
          the board · as it settled · drag to turn it · click a line to open its evidence
        </span>
      </div>
      <p className="m-0 mt-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
        lines {String(lineCount).padStart(2, "0")} · ev {String(evCount).padStart(2, "0")}
        {openId && <span className="text-muted"> · {openId === "thesis" ? "open questions out" : `${openId.toUpperCase()} open`}</span>}
      </p>
      {locked && <Dossier data={locked.dossier} className="!static mt-5 w-full" />}
    </div>
  );
}
