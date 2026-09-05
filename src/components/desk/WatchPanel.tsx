"use client";

import type { Play } from "@/lib/desk";
import type { WatchRead } from "@/lib/watch";
import Panel from "@/components/hud/Panel";

const CLS: Record<string, string> = { holding: "text-good", breached: "text-bad", unwatched: "text-faint" };

/* The watch: the invalidation against today's tape. Holding, breached, or
   not on the tape. The ledger over time is the list of reads. */
export default function WatchPanel({ play, read, state }: { play: Play | null; read: WatchRead | null; state?: "reading" | "done" | "error" }) {
  if (!play) return null;
  const inv = play.session.structure.invalidation.trim();
  return (
    <Panel label="the watch" labelRight={read ? `read ${read.readAt.slice(11, 16)} utc` : ""} className="!static">
      {!read && (
        <p className="m-0 mb-3 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">
          {state === "error" ? "the tape hiccupped. the watch stands as last read." : "reading the tape"}
          {state !== "error" && <span className="blink ml-1" />}
        </p>
      )}
      {read && (
        <p className={`m-0 mb-3 font-mono text-[12px] uppercase tracking-[.14em] ${CLS[read.status]}`}>
          {read.status === "holding" ? "holding" : read.status === "breached" ? "breached" : "not on the tape"}
        </p>
      )}
      <p className="m-0 mb-3 text-[13px] leading-relaxed text-muted">{inv}</p>
      {read?.checks.map((c, i) => (
        <div key={i} className="border-t border-line py-2">
          <p className="m-0 font-mono text-[9.5px] uppercase tracking-[.12em]">
            <span className={CLS[c.status]}>{c.status === "unwatched" ? "not on the tape" : c.status}</span>
            {c.figure && <span className="text-ink"> · {c.figure}</span>}
          </p>
          <p className="m-0 mt-1 text-[12px] leading-relaxed text-muted">{c.detail}</p>
        </div>
      ))}
      {(play.watches?.length ?? 0) > 1 && (
        <p className="m-0 mt-3 font-mono text-[9px] uppercase tracking-[.12em] text-faint">
          {play.watches!.slice(1, 6).map((w) => `${w.readAt.slice(5, 10)} ${w.status === "unwatched" ? "n/a" : w.status}`).join(" · ")}
        </p>
      )}
    </Panel>
  );
}
