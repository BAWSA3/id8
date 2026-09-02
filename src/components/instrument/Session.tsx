"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  nodesFromExtraction,
  sessionSlug,
  SESSION_STORE_KEY as STORE_KEY,
  TOUR_SEEN_KEY,
  type Challenge,
  type Extraction,
  type FeedLine,
  type QA,
} from "@/lib/session";
import TopBar from "@/components/hud/TopBar";
import FrontDoor from "./FrontDoor";
import TickerGate from "./TickerGate";
import Present from "./Present";
import Clarify from "./Clarify";
import Cockpit from "./Cockpit";

/* Session orchestration: door → present → clarify → cockpit (challenge).
   Persistence is localStorage until Supabase sessions arrive. */


type Stage = "present" | "clarify" | "cockpit";
type ChallengeStatus = "idle" | "loading" | "ready" | "error";
const PHASE_INDEX: Record<Stage, number> = { present: 0, clarify: 1, cockpit: 2 };

interface Stored {
  thesis: string;
  stage: Stage;
  qa: QA[];
  extraction: Extraction | null;
  challenge: Challenge | null;
  /* the named vehicle: string = ticker, null = narrative play, absent = not asked */
  ticker?: string | null;
}

export default function Session() {
  const [door, setDoor] = useState(true);
  const [stage, setStage] = useState<Stage>("present");
  const [thesis, setThesis] = useState("");
  const [ticker, setTicker] = useState<string | null | undefined>(undefined);
  const [qa, setQA] = useState<QA[]>([]);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  const [hydrated, setHydrated] = useState(false);
  /* first visit only: the desk teaches while it builds itself */
  const [tour, setTour] = useState(false);
  const fetching = useRef(false);

  const endTour = useCallback(() => {
    setTour(false);
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const seen = !!localStorage.getItem(TOUR_SEEN_KEY);
        const raw = localStorage.getItem(STORE_KEY);
        if (!seen && !raw) setTour(true);
        if (raw) {
          const s: Stored = JSON.parse(raw);
          if (typeof s.thesis === "string") setThesis(s.thesis);
          if (typeof s.ticker === "string" || s.ticker === null) setTicker(s.ticker);
          else if (typeof s.thesis === "string" && s.thesis.trim()) setTicker(null); // pre-gate session: don't re-ask
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
      JSON.stringify({ thesis, stage, qa, extraction, challenge, ticker } satisfies Stored)
    );
  }, [thesis, stage, qa, extraction, challenge, ticker, hydrated]);

  const fetchChallenge = useCallback(async () => {
    if (fetching.current || !extraction) return;
    fetching.current = true;
    setChallengeStatus("loading");
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis, extraction, ...(ticker ? { ticker } : {}) }),
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
  }, [thesis, extraction, ticker]);

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
    setTicker(undefined);
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

  const label = ticker
    ? `session 001 · $${ticker}`
    : stage === "present"
      ? "session 001 · new play"
      : `session 001 · ${sessionSlug(thesis)}`;

  const gate = stage === "present" && ticker === undefined;

  return (
    <>
      <TopBar
        session={label}
        phase={PHASE_INDEX[stage]}
        onReset={stage !== "present" ? reset : undefined}
      />
      {gate && (
        <TickerGate
          onDone={(t) => {
            setTicker(t ?? null);
            setTimeout(() => document.getElementById("id8-input")?.focus(), 80);
          }}
        />
      )}
      {stage === "present" && !gate && (
        <Present
          value={thesis}
          onChange={setThesis}
          onCommit={() => setStage("clarify")}
          ticker={ticker ?? null}
          tour={tour}
          onSkipTour={endTour}
        />
      )}
      {stage === "clarify" && (
        <Clarify
          thesis={thesis}
          ticker={ticker ?? null}
          qa={qa}
          extraction={extraction}
          onQA={setQA}
          onExtracted={setExtraction}
          onContinue={() => setStage("cockpit")}
          tour={tour}
          onSkipTour={endTour}
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
          tour={tour}
          onTourDone={endTour}
        />
      )}
      {door && <FrontDoor onDone={enter} />}
    </>
  );
}
