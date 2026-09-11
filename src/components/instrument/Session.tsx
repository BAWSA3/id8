"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  emptyStructure,
  isFreshStored,
  nodesFromExtraction,
  sessionSlug,
  statedInvalidation,
  tapeWaitText,
  SESSION_STORE_KEY as STORE_KEY,
  TOUR_SEEN_KEY,
  type Challenge,
  type ChallengeProgress,
  type Extraction,
  type FeedLine,
  type QA,
  type StructureState,
  type Vehicle,
} from "@/lib/session";
import TopBar from "@/components/hud/TopBar";
import FrontDoor from "./FrontDoor";
import TickerGate from "./TickerGate";
import Present from "./Present";
import Clarify from "./Clarify";
import Cockpit from "./Cockpit";
import Structure from "./Structure";
import Commit from "./Commit";

/* Session orchestration: door → present → clarify → cockpit (challenge) → structure (the ruling) → commit.
   Persistence is localStorage until Supabase sessions arrive. */


type Stage = "present" | "clarify" | "cockpit" | "structure" | "commit";
type View = Stage | "gate";
type ChallengeStatus = "idle" | "loading" | "ready" | "error";
/* one line of the tape's stream */
type TapeEvent =
  | ChallengeProgress
  | { stage: "done"; challenge: Challenge }
  | { stage: "error"; error: string; message: string };
const PHASE_INDEX: Record<Stage, number> = { present: 0, clarify: 1, cockpit: 2, structure: 3, commit: 4 };

interface Stored {
  thesis: string;
  stage: Stage;
  qa: QA[];
  extraction: Extraction | null;
  challenge: Challenge | null;
  /* the named vehicle: string = ticker, null = narrative play, absent = not asked */
  ticker?: string | null;
  /* the same vehicle by contract address, when the trader pasted one */
  vehicle?: Vehicle | null;
  /* the ruling (structure) — absent on sessions that never got there */
  structure?: StructureState;
}

export default function Session() {
  const [door, setDoor] = useState(true);
  const [stage, setStage] = useState<Stage>("present");
  const [thesis, setThesis] = useState("");
  const [ticker, setTicker] = useState<string | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [qa, setQA] = useState<QA[]>([]);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle");
  /* where the tape is while it runs, and when it started (the desk keeps the clock) */
  const [tapeProgress, setTapeProgress] = useState<ChallengeProgress | null>(null);
  const [tapeStartedAt, setTapeStartedAt] = useState(0);
  const [structure, setStructure] = useState<StructureState>(emptyStructure);
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
        const s: Stored | null = raw ? (JSON.parse(raw) as Stored) : null;
        /* first visit = nothing on the desk yet. an empty blob left behind still reads as fresh */
        if (!seen && (!s || isFreshStored(s))) setTour(true);
        if (s) {
          if (typeof s.thesis === "string") setThesis(s.thesis);
          if (typeof s.ticker === "string" || s.ticker === null) setTicker(s.ticker);
          else if (typeof s.thesis === "string" && s.thesis.trim()) setTicker(null); // pre-gate session: don't re-ask
          if (s.vehicle && typeof s.vehicle.address === "string") setVehicle({ chain: String(s.vehicle.chain ?? ""), address: s.vehicle.address });
          if (Array.isArray(s.qa)) setQA(s.qa);
          if (s.extraction) setExtraction(s.extraction);
          if (s.challenge) {
            setChallenge(s.challenge);
            setChallengeStatus("ready");
          }
          if (s.structure) setStructure({ ...emptyStructure(), ...s.structure });
          if (s.stage === "clarify" || s.stage === "cockpit") {
            setStage(s.thesis.trim() ? s.stage : "present");
          } else if (s.stage === "structure" || s.stage === "commit") {
            /* the ruling needs the tape; without it, back to the board */
            setStage(s.thesis.trim() ? (s.challenge ? s.stage : "cockpit") : "present");
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
    const stored = { thesis, stage, qa, extraction, challenge, ticker, vehicle, structure } satisfies Stored;
    /* an empty desk leaves nothing behind, so the next visit still reads as the first */
    if (isFreshStored(stored)) {
      localStorage.removeItem(STORE_KEY);
      return;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(stored));
  }, [thesis, stage, qa, extraction, challenge, ticker, vehicle, structure, hydrated]);

  const fetchChallenge = useCallback(async () => {
    if (fetching.current || !extraction) return;
    fetching.current = true;
    setTapeProgress(null);
    setTapeStartedAt(Date.now());
    setChallengeStatus("loading");
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesis, extraction, ...(ticker ? { ticker } : {}), ...(ticker && vehicle ? { vehicle } : {}) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "analyst error");
      }
      /* the tape streams: one JSON event per line, progress as it moves, the challenge last */
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const landed: { challenge: Challenge | null } = { challenge: null };
      let buf = "";
      const take = (line: string) => {
        const ev = JSON.parse(line) as TapeEvent;
        if (ev.stage === "done") landed.challenge = ev.challenge;
        else if (ev.stage === "error") throw new Error(ev.message);
        else setTapeProgress(ev);
      };
      for (;;) {
        const { done, value } = await reader.read();
        buf += decoder.decode(value, { stream: !done });
        let nl = buf.indexOf("\n");
        while (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) take(line);
          nl = buf.indexOf("\n");
        }
        if (done) break;
      }
      if (buf.trim()) take(buf.trim());
      if (!landed.challenge) throw new Error("the tape ended early");
      setChallenge(landed.challenge);
      setChallengeStatus("ready");
    } catch {
      setChallengeStatus("error");
    } finally {
      setTapeProgress(null);
      fetching.current = false;
    }
  }, [thesis, extraction, ticker, vehicle]);

  /* the desk's waiting line under the feed, only while the tape runs */
  const tapeWait = useMemo(
    () => (challengeStatus === "loading" ? { text: tapeWaitText(tapeProgress), startedAt: tapeStartedAt } : undefined),
    [challengeStatus, tapeProgress, tapeStartedAt]
  );

  useEffect(() => {
    if (stage === "cockpit" && hydrated && extraction && !challenge && challengeStatus === "idle") {
      const t = setTimeout(() => void fetchChallenge(), 0);
      return () => clearTimeout(t);
    }
  }, [stage, hydrated, extraction, challenge, challengeStatus, fetchChallenge]);

  const graph = useMemo(
    () => (extraction ? nodesFromExtraction(thesis, extraction, challenge, structure) : null),
    [thesis, extraction, challenge, structure]
  );

  const feed = useMemo<FeedLine[]>(() => {
    if (challengeStatus === "ready" && challenge) {
      return [
        { agent: "analyst", text: challenge.analystLine + (challenge.fixture ? " (fixture tape, live feed pending)" : "") },
        { agent: "skeptic", text: challenge.skepticLine },
      ];
    }
    if (challengeStatus === "error") {
      return [{ agent: "analyst", text: "The tape hiccupped. Retry when you're ready." }];
    }
    return [
      { agent: "analyst", text: "On the tape." },
      { agent: "skeptic", text: "Every assumption up there is a target." },
    ];
  }, [challenge, challengeStatus]);

  const reset = () => {
    setStage("present");
    setThesis("");
    setTicker(undefined);
    setVehicle(null);
    setQA([]);
    setExtraction(null);
    setChallenge(null);
    setChallengeStatus("idle");
    setStructure(emptyStructure());
    localStorage.removeItem(STORE_KEY);
  };

  const enter = () => {
    setDoor(false);
    if (stage === "present") {
      setTimeout(() => document.getElementById("id8-input")?.focus(), 60);
    }
  };

  const label = ticker
    ? `session 001 · $${ticker}${vehicle?.chain ? ` · ${vehicle.chain}` : ""}`
    : stage === "present"
      ? "session 001 · new play"
      : `session 001 · ${sessionSlug(thesis)}`;

  const gate = stage === "present" && ticker === undefined;
  const view: View = gate ? "gate" : stage;

  /* soft phase transitions: the outgoing view exhales, then the next fades in */
  const [shownView, setShownView] = useState<View>(view);
  const [phaseOut, setPhaseOut] = useState(false);
  useEffect(() => {
    if (view === shownView) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = setTimeout(() => setPhaseOut(!reduced), 0);
    const swap = setTimeout(
      () => {
        setShownView(view);
        setPhaseOut(false);
        window.scrollTo(0, 0);
      },
      reduced ? 0 : 280
    );
    return () => {
      clearTimeout(start);
      clearTimeout(swap);
    };
  }, [view, shownView]);

  return (
    <>
      <TopBar
        session={label}
        phase={PHASE_INDEX[stage]}
        onReset={stage !== "present" ? reset : undefined}
      />
      <div key={shownView} className={phaseOut ? "phase-out" : "phase-in"}>
        {shownView === "gate" && (
          <TickerGate
            onDone={(t, hint) => {
              setTicker(t ?? null);
              setVehicle(hint ?? null);
              setTimeout(() => document.getElementById("id8-input")?.focus(), 520);
            }}
            tour={tour}
            onSkipTour={endTour}
          />
        )}
        {shownView === "present" && (
          <Present
            value={thesis}
            onChange={setThesis}
            onCommit={() => setStage("clarify")}
            ticker={ticker ?? null}
            chain={vehicle?.chain ?? null}
            onChangeVehicle={() => {
              setTicker(undefined);
              setVehicle(null);
            }}
            tour={tour}
            onSkipTour={endTour}
          />
        )}
        {shownView === "clarify" && (
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
        {shownView === "cockpit" && graph && (
          <Cockpit
            nodes={graph.nodes}
            edges={graph.edges}
            activePhase={2}
            feed={feed}
            wait={tapeWait}
            challengeError={challengeStatus === "error"}
            onRetryChallenge={fetchChallenge}
            onRule={
              challengeStatus === "ready"
                ? () => {
                    const stated = statedInvalidation(extraction);
                    if (stated && !structure.invalidation.trim()) setStructure({ ...structure, invalidation: stated });
                    setStage("structure");
                  }
                : undefined
            }
            tour={tour}
            onTourDone={endTour}
          />
        )}
        {shownView === "structure" && extraction && (
          <Structure
            thesis={thesis}
            ticker={ticker ?? null}
            extraction={extraction}
            challenge={challenge}
            structure={structure}
            onChange={setStructure}
            onCommit={() => setStage("commit")}
            onBack={() => setStage("cockpit")}
          />
        )}
        {shownView === "commit" && extraction && (
          <Commit
            thesis={thesis}
            qa={qa}
            ticker={ticker ?? null}
            vehicle={vehicle}
            extraction={extraction}
            challenge={challenge}
            structure={structure}
            onBack={() => setStage("structure")}
          />
        )}
      </div>
      {door && <FrontDoor onDone={enter} />}
    </>
  );
}
