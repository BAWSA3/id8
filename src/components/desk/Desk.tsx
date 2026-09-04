"use client";

/* THE DESK. Home once the first play is on the book: the book of plays,
   the play's breakdown, the token live, the invalidation watched. Still,
   darkroom, the orb breathing behind the panels. */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { currentUser, listPlays, savePlay, signOut, updatePlayPins, type Play, type PlaySession } from "@/lib/desk";
import type { Pin } from "@/lib/pins";
import Wall from "./Wall";
import { supabaseConfigured } from "@/lib/supabase/client";
import { listLocalPlays, removeLocalPlay, updateLocalPlay } from "@/lib/book";
import { buildDoc, encodeDoc, ledgerLine } from "@/lib/doc";
import { SESSION_STORE_KEY } from "@/lib/session";
import Panel from "@/components/hud/Panel";
import DocView from "./DocView";
import DeskAsk from "./DeskAsk";
import Orb from "./Orb";

type State = "loading" | "ask" | "room";

/* plays booked in this browser before sign-in join the desk on arrival */
async function adoptLocalPlay(): Promise<void> {
  for (const p of listLocalPlays()) {
    try {
      const saved = await savePlay(p.session, { chain: p.chain, sector: p.sector });
      if (saved) removeLocalPlay(p.id);
    } catch {
      /* stays local, tried again next visit */
    }
  }
  try {
    const raw = localStorage.getItem(SESSION_STORE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as Partial<PlaySession> & { stage?: string };
    if (s.stage !== "commit" || !s.extraction || !s.structure || typeof s.thesis !== "string") return;
    await savePlay({
      thesis: s.thesis,
      ticker: s.ticker ?? null,
      qa: s.qa ?? [],
      extraction: s.extraction,
      challenge: s.challenge ?? null,
      structure: s.structure,
    });
  } catch {
    /* the local play stays local; the desk still opens */
  }
}

export default function Desk() {
  const [state, setState] = useState<State>("loading");
  const [plays, setPlays] = useState<Play[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /* browser-only: no store wired, the local book is the desk */
  const [local, setLocal] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!supabaseConfigured()) {
      const list = listLocalPlays();
      setLocal(true);
      setPlays(list);
      setSelected((cur) => cur ?? list[0]?.id ?? null);
      setState("room");
      return;
    }
    const user = await currentUser();
    if (!user) {
      setState("ask");
      return;
    }
    await adoptLocalPlay();
    const list = await listPlays();
    setPlays(list);
    setSelected((cur) => cur ?? list[0]?.id ?? null);
    setState("room");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const play = plays.find((p) => p.id === selected) ?? null;
  const doc = useMemo(
    () => (play ? buildDoc(play.session.ticker, play.session.extraction, play.session.challenge, play.session.structure) : null),
    [play]
  );

  const newPlay = () => {
    try {
      localStorage.removeItem(SESSION_STORE_KEY);
    } catch {}
    router.push("/");
  };

  /* the wall: pins live on the play, in the book or the store */
  const setPins = async (playId: string, pins: Pin[]) => {
    setPlays((cur) => cur.map((p) => (p.id === playId ? { ...p, pins } : p)));
    if (local) updateLocalPlay(playId, { pins });
    else {
      try {
        await updatePlayPins(playId, pins);
      } catch {}
    }
  };
  const pinPost = (playId: string, pin: Omit<Pin, "id" | "pinnedAt">) => {
    const cur = plays.find((p) => p.id === playId)?.pins ?? [];
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pin-${Date.now()}`;
    void setPins(playId, [{ ...pin, id, pinnedAt: new Date().toISOString() }, ...cur]);
  };
  const unpinPost = (playId: string, pinId: string) => {
    const cur = plays.find((p) => p.id === playId)?.pins ?? [];
    void setPins(playId, cur.filter((p) => p.id !== pinId));
  };

  const copyLink = async () => {
    if (!doc) return;
    try {
      const d = await encodeDoc(doc);
      await navigator.clipboard.writeText(`${location.origin}/s?d=${d}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {}
  };

  if (state === "loading") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[660px] flex-col justify-center px-8">
        <p className="m-0 font-mono text-[12.5px] text-muted">
          <span className="font-pixel text-[10px]">the desk ›</span> opening<span className="blink ml-1" />
        </p>
      </main>
    );
  }

  if (state === "ask") {
    return (
      <main className="relative mx-auto flex min-h-[70vh] w-full max-w-[560px] flex-col justify-center px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Orb size={420} className="-right-40 -top-24" />
        </div>
        <p className="relative m-0 mb-6 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
          <span className="seed mr-2.5 align-[1px]" />
          the desk
        </p>
        <div className="relative">
          <DeskAsk />
        </div>
        <Link href="/" className="relative mt-8 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint hover:text-muted">
          [ back to the door ]
        </Link>
      </main>
    );
  }

  return (
    <main className="relative mx-auto w-full max-w-[1280px] px-6 pb-16 pt-6 md:px-10">
      {/* the character, behind everything, clipped to the room */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Orb size={640} className="-right-40 -top-24 hidden md:block" />
      </div>

      {/* top bar */}
      <div className="relative z-10 mb-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <h1 className="m-0 text-xl font-bold leading-none tracking-[-.02em]">
          id<i className="font-light italic">8</i>
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-[.16em] text-faint">
          the desk · {String(plays.length).padStart(2, "0")} {plays.length === 1 ? "play" : "plays"}
          {local && " · in this browser"}
        </span>
        <button onClick={newPlay} className="ml-auto border border-lock-deep px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[.16em] text-lock-deep transition-colors hover:bg-lock-deep hover:text-bg">
          [ new play ]
        </button>
        {!local && (
          <button
            onClick={() => void signOut().then(() => router.push("/"))}
            className="border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted"
          >
            [ sign out ]
          </button>
        )}
      </div>

      <div className="relative z-10 grid gap-6 md:grid-cols-[240px_minmax(0,1fr)_260px]">
        {/* the book */}
        <Panel label="the book" labelRight={String(plays.length).padStart(2, "0")} className="!static">
          {plays.length === 0 ? (
            <p className="m-0 font-mono text-[11px] text-faint">nothing on the book yet.</p>
          ) : (
            <div className="flex flex-col">
              {plays.map((p) => {
                const d = buildDoc(p.session.ticker, p.session.extraction, p.session.challenge, p.session.structure);
                const on = p.id === selected;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`border-t border-line py-3 text-left transition-colors first:border-t-0 ${on ? "" : "opacity-70 hover:opacity-100"}`}
                  >
                    <p className={`m-0 font-mono text-[12px] ${on ? "text-lock" : "text-ink"}`}>{p.ticker ? `$${p.ticker}` : p.slug}</p>
                    <p className="m-0 mt-1 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">
                      booked {p.booked_at.slice(0, 10)}
                    </p>
                    <p className="m-0 mt-1 font-mono text-[9.5px] uppercase tracking-[.12em] text-muted">{ledgerLine(d).split(" · ").slice(1, 4).join(" · ")}</p>
                    <p className="m-0 mt-1 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">
                      watch · not read yet{(p.pins?.length ?? 0) > 0 && ` · ${String(p.pins!.length).padStart(2, "0")} pinned`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        {/* the breakdown */}
        <section className="min-w-0">
          {play && doc ? (
            <>
              <div className="mb-6 flex flex-wrap items-baseline gap-4">
                <p className="m-0 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
                  <span className="seed mr-2.5 align-[1px]" />
                  {play.ticker ? `$${play.ticker}` : play.slug} · on the book
                </p>
                <button onClick={() => void copyLink()} className="ml-auto border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-ink">
                  {copied ? "[ copied ]" : "[ copy a link ]"}
                </button>
              </div>
              <DocView doc={doc} />
            </>
          ) : (
            <p className="m-0 font-mono text-[12.5px] text-muted">
              <span className="font-pixel text-[10px]">the desk ›</span> nothing on the book yet. <button onClick={newPlay} className="border-0 bg-transparent p-0 font-mono text-[10.5px] uppercase tracking-[.16em] text-lock-deep hover:text-lock">[ new play ]</button>
            </p>
          )}
        </section>

        {/* the token + the watch */}
        <div className="flex flex-col gap-6">
          <Panel label="the token" labelRight={play?.chain ?? ""} className="!static">
            {play ? (
              <>
                <p className="m-0 font-mono text-[15px] text-ink">{play.ticker ? `$${play.ticker}` : "a narrative, not a name"}</p>
                <p className="m-0 mt-2 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">the tape · reads when the desk opens</p>
              </>
            ) : (
              <p className="m-0 font-mono text-[11px] text-faint">no vehicle on the book.</p>
            )}
          </Panel>
          <Panel label="the watch" className="!static">
            <p className="m-0 font-mono text-[9.5px] uppercase tracking-[.12em] text-faint">not read yet</p>
            {doc?.invalidation && <p className="m-0 mt-2 text-[13px] leading-relaxed text-muted">{doc.invalidation}</p>}
          </Panel>
        </div>
      </div>

      {/* the wall, full width under the room */}
      {play && (
        <div className="relative z-10 mt-6">
          <Wall pins={play.pins ?? []} onPin={(p) => pinPost(play.id, p)} onUnpin={(id) => unpinPost(play.id, id)} />
        </div>
      )}
    </main>
  );
}
