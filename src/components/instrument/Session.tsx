"use client";

import { useEffect, useMemo, useState } from "react";
import { EDGES, makeSessionNodes, sessionSlug } from "@/lib/session";
import TopBar from "@/components/hud/TopBar";
import FrontDoor from "./FrontDoor";
import Present from "./Present";
import Cockpit from "./Cockpit";

/* Client-side session orchestration: front door → present → cockpit.
   Persistence is localStorage until Supabase sessions arrive. */

const STORE_KEY = "id8.session.v1";

interface Stored {
  thesis: string;
  presented: boolean;
}

export default function Session() {
  const [door, setDoor] = useState(true);
  const [thesis, setThesis] = useState("");
  const [presented, setPresented] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const s: Stored = JSON.parse(raw);
          if (typeof s.thesis === "string") setThesis(s.thesis);
          if (s.presented && s.thesis.trim()) setPresented(true);
        }
      } catch {
        /* corrupt store — start fresh */
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORE_KEY, JSON.stringify({ thesis, presented } satisfies Stored));
  }, [thesis, presented, hydrated]);

  const nodes = useMemo(() => makeSessionNodes(thesis), [thesis]);

  const reset = () => {
    setPresented(false);
    setThesis("");
    localStorage.removeItem(STORE_KEY);
  };

  const enter = () => {
    setDoor(false);
    setTimeout(() => document.getElementById("id8-input")?.focus(), 60);
  };

  const label = presented ? `session 001 · ${sessionSlug(thesis)}` : "session 001 · new idea";

  return (
    <>
      <TopBar session={label} phase={presented ? 2 : 0} onReset={presented ? reset : undefined} />
      {presented ? (
        <Cockpit nodes={nodes} edges={EDGES} activePhase={2} />
      ) : (
        <Present value={thesis} onChange={setThesis} onCommit={() => setPresented(true)} />
      )}
      {door && <FrontDoor onDone={enter} />}
    </>
  );
}
