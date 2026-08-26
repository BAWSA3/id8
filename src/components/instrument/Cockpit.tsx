"use client";

import { useState } from "react";
import { FEED, type IdeaEdge, type IdeaNode } from "@/lib/session";
import Constellation from "./Constellation";
import Panel from "@/components/hud/Panel";
import PhaseMenu from "@/components/hud/PhaseMenu";
import Dossier from "@/components/hud/Dossier";
import AgentFeed from "@/components/hud/AgentFeed";

/* The flagship composition: constellation center stage, HUD floating around it. */
export default function Cockpit({
  nodes,
  edges,
  activePhase,
}: {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  activePhase: number;
}) {
  const [lockedId, setLockedId] = useState<string>("thesis");
  const [yawDeg, setYawDeg] = useState(35);
  const locked = nodes.find((n) => n.id === lockedId);

  return (
    <div className="stage relative z-10 h-[calc(100vh-88px)] max-h-[880px] min-h-[540px]">
      <Constellation
        nodes={nodes}
        edges={edges}
        lockedId={lockedId}
        onLock={setLockedId}
        onYaw={setYawDeg}
      />
      <PhaseMenu activePhase={activePhase} />
      {locked && <Dossier data={locked.dossier} />}
      <Panel className="hud-readout bottom-[92px] right-10 flex items-baseline gap-4 !py-[11px] font-mono text-[11px] tracking-[.1em] text-muted">
        <span>YAW <span className="text-xl font-bold tabular-nums text-ink">{String(yawDeg).padStart(3, "0")}°</span></span>
        <span>NODES {String(nodes.length).padStart(2, "0")}</span>
        <span>EV {String(nodes.filter((n) => n.kind === "evidence").length).padStart(2, "0")}</span>
      </Panel>
      <AgentFeed lines={FEED} />
      <span className="stage-hint absolute bottom-3 left-1/2 z-[15] -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">
        drag to rotate · scroll to zoom · click a node to lock
      </span>
    </div>
  );
}
