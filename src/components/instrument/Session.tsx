"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  nodesFromExtraction,
  sessionSlug,
  type Challenge,
  type Extraction,
  type FeedLine,
  type QA,
} from "@/lib/session";
import TopBar from "@/components/hud/TopBar";
import FrontDoor from "./FrontDoor";
import Present from "./Present";
import Clarify from "./Clarify";
import Cockpit from "./Cockpit";

/* Session orchestration: door → present → clarify → cockpit (challenge).
   Persistence is localStorage until Supabase sessions arrive. */

const STORE_KEY = "id8.session.v3";

type Stage = "present" | "clarify" | "cockpit";
type ChallengeStatus = "idle" | "loading" | "ready" | "error";
const PHASE_INDEX: Record<Stage, number> = { present: 0, clarify: 1, cockpit: 2 };

interface Stored {
  thesis: string;
  stage: Stage;
  qa: QA[];
  extraction: Extraction | null;
  challenge: Challenge | null;
}

export default function Session() {
  const [door, setDoor] = useState(true);
  const [stage, setStage] = useState<Stage>("present");
  const [thesis, setThesis] = useState("");
  const [qa, setQA] = useState<QA[]>([]);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const [hydrated, setHydrated] = useState(false);
  const fetching = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
          const s: Stored = JSON.parse(raw);
          if (typeof s.thesis === "string") setThesis(s.thesis);
          if (Array.isArray(s.qa)) setQA(s.qa);
          if (s.extraction) setExtraction(s.extraction);
          if (s.challenge) {
            setChallenge(s.challenge);
            setChallengeStatus("ready");
          }
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
      JSON.stringify({ thesis, stage, qa, extraction, challenge } satisfies Stored)
    );
  }, [thesis, stage, qa, extraction, challenge, hydrated]);

  const fetchChallenge = useCallback(async () => {
    if (fetching.current || !extraction) return;
    fetching.current = true;
    setChallengeStatus("loading");
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis, extraction }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.message ?? "analyst error");
      setChallenge(data.challenge);
      setChallengeStatus("ready");
    } catch {
      setChallengeStatus("error");
    } finally {
      fetching.current = false;
    }
  }, [thesis, extraction]);

  useEffect(() => {
    if (stage === "cockpit" && hydrated && extraction && !challenge && challengeStatus === "idle") {
      const t = setTimeout(() => void fetchChallenge(), 0);
      return () => clearTimeout(t);
    }
  }, [stage, hydrated, extraction, challenge, challengeStatus, fetchChallenge]);

  const graph = useMemo(
    () => (extraction ? nodesFromExtraction(thesis, extraction, challenge) : null),
    [thesis, extraction, challenge]
  );

  const feed = useMemo<FeedLine[]>(() => {
    if (challengeStatus === "ready" && challenge) {
      return [
        { agent: "analyst", text: challenge.analystLine + (challenge.fixture ? " (fixture feed — live Nansen pending)" : "") },
        { agent: "skeptic", text: challenge.skepticLine },
        { agent: "clarifier", text: "Click any node to inspect it. Evidence cards show exactly which assumption they test." },
      ];
    }
    if (challengeStatus === "error") {
      return [{ agent: "analyst", text: "The chain feed hit a snag — use retry below." }];
    }
    return [
      { agent: "analyst", text: "Querying the chain — evidence cards incoming…" },
      { agent: "skeptic", text: "Warming up. Every assumption up there is a target." },
    ];
  }, [challenge, challengeStatus]);

  const reset = () => {
    setStage("present");
    setThesis("");
    setQA([]);
    setExtraction(null);
    setChallenge(null);
    setChallengeStatus("idle");
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
        <Present value={thesis} onChange={setThesis} onCommit={() => setStage("clarify")} />
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
        <Cockpit
          nodes={graph.nodes}
          edges={graph.edges}
          activePhase={2}
          feed={feed}
          challengeError={challengeStatus === "error"}
          onRetryChallenge={fetchChallenge}
        />
      )}
      {door && <FrontDoor onDone={enter} />}
    </>
  );
}
