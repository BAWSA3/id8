"use client";

/* The wall: X posts pinned to a play, in X's own embed, dark. Paste a link,
   the desk fetches it once and keeps it. What the timeline said, kept next
   to what the tape said. */

import { useEffect, useRef, useState } from "react";
import type { Pin } from "@/lib/pins";
import { canonicalStatusUrl } from "@/lib/pins";
import Panel from "@/components/hud/Panel";

declare global {
  interface Window {
    twttr?: { widgets: { load: (el?: HTMLElement) => void } };
  }
}

let widgetsLoading: Promise<void> | null = null;
function loadWidgets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve();
  if (!widgetsLoading) {
    widgetsLoading = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://platform.twitter.com/widgets.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }
  return widgetsLoading;
}

export default function Wall({ pins, onPin, onUnpin }: { pins: Pin[]; onPin: (p: Omit<Pin, "id" | "pinnedAt">) => void; onUnpin: (id: string) => void }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "fetching" | "error">("idle");
  const [message, setMessage] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const valid = canonicalStatusUrl(url) !== null;

  /* render X's blockquotes into widgets whenever the wall changes */
  useEffect(() => {
    let alive = true;
    void loadWidgets().then(() => {
      if (alive && grid.current) window.twttr?.widgets.load(grid.current);
    });
    return () => {
      alive = false;
    };
  }, [pins]);

  const pin = async () => {
    const canon = canonicalStatusUrl(url);
    if (!canon || state === "fetching") return;
    if (pins.some((p) => p.url === canon)) {
      setState("error");
      setMessage("already on the wall.");
      return;
    }
    setState("fetching");
    try {
      const res = await fetch("/api/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: canon }) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message ?? "X hiccupped.");
      onPin(data.pin);
      setUrl("");
      setState("idle");
      setMessage("");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "X hiccupped.");
    }
  };

  return (
    <Panel label="the wall" labelRight={String(pins.length).padStart(2, "0")} className="!static">
      <div className="mb-4 flex items-baseline gap-3 border-b border-line pb-2">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (state === "error") setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void pin();
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder="paste a post from x.com"
          aria-label="Post URL"
          className="w-full border-0 bg-transparent font-mono text-[12px] text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint"
        />
        <button
          onClick={() => void pin()}
          disabled={!valid || state === "fetching"}
          className="shrink-0 whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[.16em] text-lock-deep transition-colors hover:text-lock disabled:cursor-not-allowed disabled:text-faint"
        >
          {state === "fetching" ? "[ pinning ]" : "[ pin it ]"}
        </button>
      </div>
      <p className="m-0 mb-4 min-h-[14px] font-mono text-[9.5px] uppercase tracking-[.14em] text-faint">
        {state === "error" ? <span className="text-bad">{message}</span> : pins.length === 0 ? "what the timeline said, kept next to what the tape said." : ""}
      </p>
      {pins.length > 0 && (
        <div ref={grid} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pins.map((p) => (
            <div key={p.id} className="min-w-0">
              <div className="[&_.twitter-tweet]:!m-0" dangerouslySetInnerHTML={{ __html: p.html }} />
              <div className="mt-1 flex items-baseline gap-3 font-mono text-[9px] uppercase tracking-[.14em] text-faint">
                <span className="truncate">{p.handle || p.author}</span>
                <button onClick={() => onUnpin(p.id)} className="ml-auto whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[9px] uppercase tracking-[.14em] text-faint transition-colors hover:text-bad">
                  [ unpin ]
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
