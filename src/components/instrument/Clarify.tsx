"use client";

/* CLARIFY — the first real agent conversation. Calm like Present: one column,
   the thesis locked at top, the Clarifier asking one question at a time.
   Ends with an extraction review: "structured from your words — nothing added." */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Extraction, QA } from "@/lib/session";
import TypeLine from "@/components/hud/TypeLine";
import DeskCaption from "@/components/hud/DeskCaption";

interface Props {
  thesis: string;
  qa: QA[];
  extraction: Extraction | null;
  onQA: (qa: QA[]) => void;
  onExtracted: (ex: Extraction) => void;
  onContinue: () => void;
  tour?: boolean;
  onSkipTour?: () => void;
}

/* Desk captions for the first-visit tour */
const DESK_C1 = "the clarifier goes first. answer plainly, in your own words — ⌘↵ sends.";
const DESK_C2 = "structured from your words, nothing added. read it like a contract, then take it to the board.";

type Status = "asking" | "thinking" | "extracting" | "review" | "error";

async function callClarify(op: "question" | "extract", thesis: string, qa: QA[]) {
  const res = await fetch("/api/clarify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, thesis, qa }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.message ?? "The clarifier hit a snag.");
  return data;
}

export default function Clarify({ thesis, qa, extraction, onQA, onExtracted, onContinue, tour = false, onSkipTour }: Props) {
  const [status, setStatus] = useState<Status>(extraction ? "review" : "thinking");
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const busy = useRef(false);

  const advance = useCallback(
    async (currentQA: QA[]) => {
      if (busy.current) return;
      busy.current = true;
      setStatus("thinking");
      try {
        const next = await callClarify("question", thesis, currentQA);
        if (!next.done) {
          setQuestion(next.question);
          setStatus("asking");
        } else {
          setStatus("extracting");
          const { extraction: ex } = await callClarify("extract", thesis, currentQA);
          onExtracted(ex);
          setStatus("review");
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "The clarifier hit a snag.");
        setStatus("error");
      } finally {
        busy.current = false;
      }
    },
    [thesis, onExtracted]
  );

  useEffect(() => {
    if (!extraction && status === "thinking" && !busy.current && question === null) {
      void advance(qa);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () => {
    if (!question || answer.trim().length === 0) return;
    const nextQA = [...qa, { q: question, a: answer.trim() }];
    onQA(nextQA);
    setAnswer("");
    setQuestion(null);
    void advance(nextQA);
  };

  return (
    <main className="mx-auto flex w-full max-w-[660px] flex-col px-8 pb-16 pt-[9vh]">
      <p className="m-0 mb-[26px] font-mono text-[10px] uppercase tracking-[.22em] text-muted">
        <span className="seed mr-2.5 align-[1px]" />
        clarify — the interrogation begins
      </p>

      {/* the thesis, locked */}
      <blockquote className="m-0 mb-8 border-l border-line pl-4 text-[15px] leading-relaxed text-muted">
        “{thesis}”
        <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-[.16em] text-faint">
          your thesis · locked
        </span>
      </blockquote>

      {/* the conversation so far */}
      {qa.length > 0 && (
        <div className="mb-7 flex flex-col gap-5">
          {qa.map((t, i) => (
            <div key={t.q.slice(0, 40) + i}>
              <p className="m-0 font-mono text-[12.5px] leading-relaxed text-muted">
                <span className="text-lock-deep">clarifier ›</span> {t.q}
              </p>
              <p className="m-0 mt-1.5 text-[15px] leading-relaxed">{t.a}</p>
            </div>
          ))}
        </div>
      )}

      {/* current state */}
      {status === "thinking" && (
        <p className="m-0 font-mono text-[12.5px] text-muted">
          <span className="text-lock-deep">clarifier ›</span> <span className="blink" />
        </p>
      )}

      {status === "extracting" && (
        <p className="m-0 font-mono text-[12.5px] text-muted">
          <span className="text-lock-deep">clarifier ›</span> structuring your words — nothing added
          <span className="blink ml-1" />
        </p>
      )}

      {status === "asking" && question && (
        <div>
          <TypeLine key={question} prefix="clarifier" prefixClass="text-lock-deep" text={question} />
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            autoFocus
            spellCheck={false}
            placeholder="answer in your own words…"
            className="mt-3 w-full resize-none border-0 border-b border-line bg-transparent pb-2 text-[16px] leading-relaxed text-ink outline-none [caret-color:var(--lock)] placeholder:text-faint focus:border-lock-deep"
            style={{ fontFamily: "var(--grot)" }}
            aria-label="Your answer"
          />
          <div className="mt-3 flex items-center gap-4">
            <span className="font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
              question {String(qa.length + 1).padStart(2, "0")} · ⌘↵ to answer
            </span>
            <button
              onClick={submit}
              disabled={answer.trim().length === 0}
              className={`ml-auto border px-4 py-2 font-mono text-[10.5px] uppercase tracking-[.18em] transition-colors ${
                answer.trim().length > 0
                  ? "border-lock-deep text-lock-deep hover:bg-lock-deep hover:text-bg"
                  : "cursor-not-allowed border-line text-faint"
              }`}
            >
              [ answer ]
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div>
          <p className="m-0 font-mono text-[12.5px] leading-relaxed text-bad">
            <span>clarifier ›</span> {errorMsg}
          </p>
          <button
            onClick={() => { setStatus("thinking"); void advance(qa); }}
            className="mt-3 border border-line px-4 py-2 font-mono text-[10.5px] uppercase tracking-[.18em] text-muted hover:border-ink hover:text-ink"
          >
            [ retry ]
          </button>
        </div>
      )}

      {status === "review" && extraction && (
        <div className="mt-2">
          <p className="m-0 mb-5 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
            structured from your words — <b className="font-normal text-lock-deep">nothing added</b>
          </p>

          <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">claim</p>
          <p className="m-0 mb-5 text-[17px] font-medium leading-relaxed">“{extraction.claim}”</p>

          <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">narrative</p>
          <p className="m-0 mb-5 text-[15px] leading-relaxed">{extraction.audience}</p>

          <p className="m-0 mb-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">assumptions</p>
          <div className="mb-5 flex flex-col">
            {extraction.assumptions.map((a, i) => (
              <div key={a.basis} className="border-t border-line py-3">
                <p className="m-0 text-[14.5px] leading-relaxed">
                  <span className="mr-2 font-mono text-[10px] text-faint">A{i + 1}</span>
                  {a.text}
                </p>
                <p className="m-0 mt-1 font-mono text-[10.5px] text-muted">from your words: “{a.basis}”</p>
              </div>
            ))}
          </div>

          <p className="m-0 mb-2 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">open questions</p>
          <div className="mb-8 flex flex-col">
            {extraction.openQuestions.map((q) => (
              <p key={q} className="m-0 border-t border-line py-2.5 text-[14px] leading-relaxed text-bad">
                {q}
              </p>
            ))}
          </div>

          <button
            onClick={onContinue}
            className="border border-lock-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[.2em] text-lock-deep transition-colors hover:bg-lock-deep hover:text-bg"
          >
            [ take it to the board ]
          </button>
        </div>
      )}

      {tour && onSkipTour && (
        <DeskCaption text={status === "review" ? DESK_C2 : DESK_C1} onSkip={onSkipTour} />
      )}
    </main>
  );
}
