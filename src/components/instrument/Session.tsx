"use client";

import { useEffect, useMemo, useState } from "react";
import {
  nodesFromExtraction,
  sessionSlug,
  type Extraction,
  type QA,
} from "@/lib/session";
import TopBar from "@/components/hud/TopBar";
import FrontDoor from "./FrontDoor";
import Present from "./Present";
import Clarify from "./Clarify";
import Cockpit from "./Cockpit";

/* Session orchestration: door → present → clarify → cockpit.
   Persistence is localStorage until Supabase sessions arrive. */

const STORE_KEY = "id8.session.v3";

type Stage = "present" | "clarify" | "cockpit";
const PHASE_INDEX: Record<Stage, number> = { present: 0, clarify: 1, cockpit: 2 };

interface Stored {
  thesis: string;
  stage: Stage;
  qa: QA[];
  extraction: Extraction | null;
}

export default function Session() {
  const [door, setDoor] = useState(true);
  const [stage, setStage] = useState<Stage>("present");
  const [thesis, setThesis] = useState("");
  const [qa, setQA] = useState<QA[]>([]);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const s: Stored = JSON.parse(raw);
          if (typeof s.thesis === "string") setThesis(s.thesis);
          if (Array.isArray(s.qa)) setQA(s.qa);
          if (s.extraction) setExtraction(s.extraction);
          if (s.stage === "clarify" || s.stage === "cockpit") {
            setStage(s.thesis.trim() ? s.stage : "present");
          }
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
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ thesis, stage, qa, extraction } satisfies Stored)
    );
  }, [thesis, stage, qa, extraction, hydrated]);

  const graph = useMemo(
    () => (extraction ? nodesFromExtraction(thesis, extraction) : null),
    [thesis, extraction]
  );

  const reset = () => {
    setStage("present");
    setThesis("");
    setQA([]);
    setExtraction(null);
    localStorage.removeItem(STORE_KEY);
  };

  const enter = () => {
    setDoor(false);
    if (stage === "present") {
      setTimeout(() => document.getElementById("id8-input")?.focus(), 60);
    }
  };

  const label =
    stage === "present" ? "session 001 · new idea" : `session 001 · ${sessionSlug(thesis)}`;

  return (
    <>
      <TopBar
        session={label}
        phase={PHASE_INDEX[stage]}
        onReset={stage !== "present" ? reset : undefined}
      />
      {stage === "present" && (
        <Present
          value={thesis}
          onChange={setThesis}
          onCommit={() => setStage("clarify")}
        />
      )}
      {stage === "clarify" && (
        <Clarify
          thesis={thesis}
          qa={qa}
          extraction={extraction}
          onQA={setQA}
          onExtracted={setExtraction}
          onContinue={() => setStage("cockpit")}
        />
      )}
      {stage === "cockpit" && graph && (
        <Cockpit nodes={graph.nodes} edges={graph.edges} activePhase={2} />
      )}
      {door && <FrontDoor onDone={enter} />}
    </>
  );
}
