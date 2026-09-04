"use client";

/* STRUCTURE — the ruling. The tape is in; the trader rules on every line of
   the contract in their own words: hold, revise, or cut. No agent speaks
   here. The board sits beside the column and settles as the rulings land.
   The only gate into Commit: contested lines ruled, an invalidation named. */

import { useMemo, useState } from "react";
import {
  lineVerdict,
  nodesFromExtraction,
  structureGate,
  type Challenge,
  type Extraction,
  type Ruling,
  type StructureState,
} from "@/lib/session";
import Constellation from "./Constellation";
import Horizon from "@/components/hud/Horizon";

interface Props {
  thesis: string;
  ticker: string | null;
  extraction: Extraction;
  challenge: Challenge | null;
  structure: StructureState;
  onChange: (next: StructureState) => void;
  onCommit: () => void;
  onBack: () => void;
}

const LABEL = "m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint";
const VERB = "whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock";
const AREA =
  "mt-2 w-full resize-none border-0 border-b border-line bg-transparent pb-2 text-[15px] leading-relaxed text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint focus:border-lock-deep";
const grot = { fontFamily: "var(--grot)" } as const;

const VERDICT_TAG: Record<"supported" | "contested" | "unverified", { text: string; cls: string }> = {
  supported: { text: "supported by the tape", cls: "text-good" },
  contested: { text: "contested by the tape", cls: "text-bad" },
  unverified: { text: "unverified", cls: "text-muted" },
};

export default function Structure({ thesis, ticker, extraction, challenge, structure, onChange, onCommit, onBack }: Props) {
  const [locked, setLocked] = useState<string>("thesis");
  const [editingClaim, setEditingClaim] = useState(structure.claimAfter !== null);

  const graph = useMemo(
    () => nodesFromExtraction(thesis, extraction, challenge, structure),
    [thesis, extraction, challenge, structure]
  );
  const gate = structureGate(extraction, challenge, structure);

  const setRuling = (i: number, r: Ruling | null) => {
    const rulings = { ...structure.rulings };
    if (r) rulings[i] = r;
    else delete rulings[i];
    onChange({ ...structure, rulings });
  };
  const setAnswer = (i: number, a: string | null) => {
    const answers = { ...structure.answers };
    if (a === null) delete answers[i];
    else answers[i] = a;
    onChange({ ...structure, answers });
  };

  const counts = extraction.assumptions.reduce(
    (acc, _, i) => {
      const r = structure.rulings[i];
      const { verdict } = lineVerdict(challenge, i);
      if (r?.kind === "cut") acc.cut++;
      else if (r?.kind === "revise") acc.revised++;
      else if (r?.kind === "hold" && verdict === "contested") acc.heldAgainst++;
      else acc.held++;
      return acc;
    },
    { held: 0, heldAgainst: 0, revised: 0, cut: 0 }
  );

  return (
    <main className="relative mx-auto w-full max-w-[1200px] px-8 pb-16 pt-[7vh] md:grid md:grid-cols-[minmax(0,620px)_1fr] md:gap-10">
      <Horizon fixed />

      {/* ---------- the column ---------- */}
      <div className="min-w-0">
        <p className="m-0 mb-[22px] flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
          <span className="whitespace-nowrap">
            <span className="seed mr-2.5 align-[1px]" />
            structure · the ruling
          </span>
          <button onClick={onBack} className={`${VERB} ml-auto whitespace-nowrap text-faint hover:text-muted`}>[ back to the board ]</button>
        </p>

        <div className="pixel-box mb-7 border border-line px-4 py-3" style={{ background: "var(--bg)" }}>
          <p className="m-0 font-mono text-[12.5px] leading-relaxed">
            <span className="font-pixel text-[10px] text-muted">the desk ›</span>{" "}
            <span className="text-ink">the tape&rsquo;s in. rule on each line. hold it, rewrite it, or cut it. your words only.</span>
          </p>
        </div>

        {challenge && (
          <p className="m-0 mb-8 font-mono text-[12.5px] leading-relaxed text-muted">
            <span className="text-bad">skeptic ›</span> {challenge.skepticLine}
          </p>
        )}

        {/* the thesis */}
        <section className="mb-8" onMouseEnter={() => setLocked("thesis")}>
          <p className={LABEL}>thesis {structure.claimAfter !== null && <span className="text-lock-deep">· revised</span>}</p>
          {editingClaim ? (
            <>
              <textarea
                value={structure.claimAfter ?? extraction.claim}
                onChange={(e) => onChange({ ...structure, claimAfter: e.target.value })}
                rows={3}
                spellCheck={false}
                autoFocus
                aria-label="The thesis, revised"
                className={`${AREA} text-[17px] font-medium`}
                style={grot}
              />
              <button
                onClick={() => { setEditingClaim(false); onChange({ ...structure, claimAfter: null }); }}
                className={`${VERB} mt-2 text-faint hover:text-muted`}
              >
                [ keep it as written ]
              </button>
            </>
          ) : (
            <>
              <p className="m-0 text-[17px] font-medium leading-relaxed">“{structure.claimAfter ?? extraction.claim}”</p>
              <button
                onClick={() => { setEditingClaim(true); onChange({ ...structure, claimAfter: extraction.claim }); }}
                className={`${VERB} mt-2 text-faint hover:text-ink`}
              >
                [ revise the thesis ]
              </button>
            </>
          )}
          <p className="m-0 mt-4 font-mono text-[10.5px] uppercase tracking-[.12em] text-muted">
            <span className="text-faint">vehicle</span> {ticker ? `$${ticker}` : "a narrative, not a name"}
            <span className="text-faint"> · narrative</span> {extraction.audience}
          </p>
        </section>

        {/* the lines */}
        <p className={`${LABEL} mb-2`}>
          the lines · {String(extraction.assumptions.length).padStart(2, "0")}
          <span className="text-faint"> · {counts.held + counts.heldAgainst} held · {counts.revised} revised · {counts.cut} cut</span>
        </p>
        <div className="mb-8 flex flex-col">
          {extraction.assumptions.map((a, i) => {
            const r = structure.rulings[i];
            const { verdict, cards } = lineVerdict(challenge, i);
            const tag = VERDICT_TAG[verdict];
            const isCut = r?.kind === "cut";
            return (
              <div
                key={a.basis}
                onMouseEnter={() => setLocked(`a${i + 1}`)}
                className={`group border-t border-line py-4 transition-opacity duration-300 ${isCut ? "opacity-40" : ""}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] text-faint">A{i + 1}</span>
                  <span className={`whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.14em] ${tag.cls}`}>{tag.text}</span>
                  {r?.kind === "hold" && verdict === "contested" && (
                    <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.14em] text-lock-deep">· held against the tape</span>
                  )}
                  {r?.kind === "revise" && <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.14em] text-lock-deep">· revised</span>}
                </div>

                {r?.kind === "revise" ? (
                  <textarea
                    value={r.text ?? ""}
                    onChange={(e) => setRuling(i, { kind: "revise", text: e.target.value })}
                    rows={2}
                    spellCheck={false}
                    autoFocus
                    aria-label={`A${i + 1}, rewritten`}
                    className={AREA}
                    style={grot}
                  />
                ) : (
                  <p className={`m-0 mt-1.5 text-[14.5px] leading-relaxed ${isCut ? "line-through decoration-bad decoration-1" : ""}`}>{a.text}</p>
                )}
                {r?.kind === "revise" && (
                  <p className="m-0 mt-1.5 font-mono text-[10.5px] text-faint">as written before the tape: “{a.text}”</p>
                )}

                {/* what the tape found — contested lines carry their evidence */}
                {verdict === "contested" && !isCut && (
                  <div className="mt-3 flex flex-col gap-2">
                    {cards.filter((c) => c.verdict !== "inconclusive").map((c) => (
                      <div key={c.title} className="border-l border-line pl-3">
                        <p className="m-0 font-mono text-[10px] uppercase tracking-[.1em] text-muted">
                          <span className={c.verdict === "contradicts" ? "text-bad" : "text-good"}>{c.verdict}</span> · {c.source}
                        </p>
                        {c.rows.length > 0 && (
                          <p className="m-0 mt-1 font-mono text-[11px] tabular-nums text-muted">
                            {c.rows.map((row, k) => (
                              <span key={row.k}>
                                {k > 0 && <span className="text-faint"> · </span>}
                                {row.k}{" "}
                                <b className={`font-bold ${row.dir === "neg" ? "text-bad" : row.dir === "pos" ? "text-good" : "text-ink"}`}>{row.v}</b>
                              </span>
                            ))}
                          </p>
                        )}
                        <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-muted">{c.note}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* the ruling */}
                {r?.kind === "hold" && verdict === "contested" && (
                  <textarea
                    value={r.reason ?? ""}
                    onChange={(e) => setRuling(i, { kind: "hold", reason: e.target.value })}
                    rows={2}
                    spellCheck={false}
                    autoFocus
                    placeholder="why you hold it against the tape…"
                    aria-label={`Why you hold A${i + 1}`}
                    className={`${AREA} text-[14px]`}
                    style={grot}
                  />
                )}

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {isCut ? (
                    <button onClick={() => setRuling(i, null)} className={`${VERB} text-muted hover:text-ink`}>[ restore ]</button>
                  ) : r ? (
                    <button onClick={() => setRuling(i, null)} className={`${VERB} text-faint hover:text-muted`}>[ undo ]</button>
                  ) : verdict === "contested" ? (
                    <>
                      <button onClick={() => setRuling(i, { kind: "hold", reason: "" })} className={`${VERB} text-lock-deep hover:text-lock`}>[ hold ]</button>
                      <button onClick={() => setRuling(i, { kind: "revise", text: a.text })} className={`${VERB} text-muted hover:text-ink`}>[ revise ]</button>
                      <button onClick={() => setRuling(i, { kind: "cut" })} className={`${VERB} text-muted hover:text-bad`}>[ cut ]</button>
                    </>
                  ) : (
                    <span className="flex gap-4 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                      <button onClick={() => setRuling(i, { kind: "revise", text: a.text })} className={`${VERB} text-faint hover:text-ink`}>[ revise ]</button>
                      <button onClick={() => setRuling(i, { kind: "cut" })} className={`${VERB} text-faint hover:text-bad`}>[ cut ]</button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* open questions */}
        {extraction.openQuestions.length > 0 && (
          <>
            <p className={`${LABEL} mb-2`}>open questions · {String(extraction.openQuestions.length).padStart(2, "0")}</p>
            <div className="mb-8 flex flex-col">
              {extraction.openQuestions.map((q, i) => {
                const answered = structure.answers[i] !== undefined;
                return (
                  <div key={q} onMouseEnter={() => setLocked(`risk${i + 1}`)} className="border-t border-line py-3">
                    <p className={`m-0 text-[14px] leading-relaxed ${answered ? "text-muted" : "text-bad"}`}>{q}</p>
                    {answered ? (
                      <>
                        <textarea
                          value={structure.answers[i]}
                          onChange={(e) => setAnswer(i, e.target.value)}
                          rows={2}
                          spellCheck={false}
                          autoFocus
                          placeholder="your answer, in your words…"
                          aria-label={`Answer to open question ${i + 1}`}
                          className={`${AREA} text-[14px]`}
                          style={grot}
                        />
                        <p className="m-0 mt-2 font-mono text-[9.5px] uppercase tracking-[.14em] text-faint">joins the book as a line · unverified</p>
                        <button onClick={() => setAnswer(i, null)} className={`${VERB} mt-2 text-faint hover:text-muted`}>[ leave it open ]</button>
                      </>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <button onClick={() => setAnswer(i, "")} className={`${VERB} whitespace-nowrap text-muted hover:text-ink`}>[ answer ]</button>
                        <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-faint">open · stays on the board as risk</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* invalidation — the gate */}
        <section className="mb-10" onMouseEnter={() => setLocked("thesis")}>
          <p className={LABEL}>
            invalidation · what takes this off the book{" "}
            {structure.invalidation.trim().split(/\s+/).filter(Boolean).length >= 3 ? (
              <span className="text-lock-deep">· set</span>
            ) : (
              <span className="text-bad">· required</span>
            )}
          </p>
          <textarea
            value={structure.invalidation}
            onChange={(e) => onChange({ ...structure, invalidation: e.target.value })}
            rows={2}
            spellCheck={false}
            placeholder="a level, a flow, or an event…"
            aria-label="Invalidation"
            className={`${AREA} mt-0`}
            style={grot}
          />
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onCommit}
            disabled={!gate.ok}
            className={`border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[.2em] transition-colors ${
              gate.ok ? "border-lock-deep text-lock-deep hover:bg-lock-deep hover:text-bg" : "cursor-not-allowed border-line text-faint"
            }`}
          >
            [ put it on the book ]
          </button>
          <span className="font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
            {gate.ok ? "every line ruled. invalidation set." : `before that: ${gate.missing.join(" · ")}`}
          </span>
        </div>
      </div>

      {/* ---------- the board, settling ---------- */}
      <div className="hidden md:block">
        <div className="sticky top-[88px] h-[calc(100vh-140px)] max-h-[720px]">
          <Constellation nodes={graph.nodes} edges={graph.edges} lockedId={locked} onLock={setLocked} initialZoom={0.72} />
          <p className="pointer-events-none absolute bottom-2 left-1/2 m-0 -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[.18em] text-faint">
            the board · settling as you rule
          </p>
        </div>
      </div>
    </main>
  );
}
