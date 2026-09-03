"use client";

/* COMMIT — on the book. Full circle: the thesis after the tape on a quiet
   page, with the ledger of what survived. The doc leaves the desk two ways:
   as markdown, or as a link that carries the whole doc (nothing stored). */

import { useState } from "react";
import { lineAfter, lineVerdict, type Challenge, type Extraction, type StructureState } from "@/lib/session";
import { buildDoc, buildMarkdown, encodeDoc } from "@/lib/doc";
import Horizon from "@/components/hud/Horizon";

interface Props {
  ticker: string | null;
  extraction: Extraction;
  challenge: Challenge | null;
  structure: StructureState;
  onBack: () => void;
}

const LABEL = "m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint";

type Copied = "doc" | "link" | "denied" | null;

export default function Commit({ ticker, extraction, challenge, structure, onBack }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<Copied>(null);
  const [busy, setBusy] = useState(false);

  const makeLink = async () => {
    if (link) return link;
    const d = await encodeDoc(buildDoc(ticker, extraction, challenge, structure));
    const url = `${location.origin}/s?d=${d}`;
    setLink(url);
    return url;
  };
  const copy = async (what: Exclude<Copied, null>) => {
    if (busy) return;
    setBusy(true);
    try {
      const url = await makeLink();
      const text = what === "link" ? url : buildMarkdown(buildDoc(ticker, extraction, challenge, structure), url);
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      /* clipboard refused (no focus, no permission): hand the link over in the open */
      setCopied("denied");
    } finally {
      setBusy(false);
    }
  };

  const lines = extraction.assumptions.map((a, i) => {
    const r = structure.rulings[i];
    const { verdict } = lineVerdict(challenge, i);
    const after = lineAfter(extraction, structure, i);
    const status =
      r?.kind === "cut"
        ? { text: "cut", cls: "text-bad" }
        : r?.kind === "revise"
          ? { text: "revised after the tape", cls: "text-lock-deep" }
          : r?.kind === "hold" && verdict === "contested"
            ? { text: "held against the tape", cls: "text-lock-deep" }
            : verdict === "supported"
              ? { text: "held · supported by the tape", cls: "text-good" }
              : { text: "held · unverified", cls: "text-muted" };
    return { a, i, r, after, status };
  });
  const held = lines.filter((l) => l.after !== null && l.r?.kind !== "revise").length;
  const revised = lines.filter((l) => l.r?.kind === "revise").length;
  const cut = lines.filter((l) => l.after === null).length;
  const heldAgainst = lines.filter((l) => l.status.text === "held against the tape").length;
  const answered = Object.values(structure.answers).filter((a) => a.trim()).length;
  const open = extraction.openQuestions.length - answered;

  return (
    <main className="mx-auto flex w-full max-w-[660px] flex-col px-8 pb-16 pt-[9vh]">
      <Horizon fixed />
      <p className="m-0 mb-[26px] font-mono text-[10px] uppercase tracking-[.22em] text-muted">
        <span className="seed mr-2.5 align-[1px]" />
        commit — on the book
      </p>

      <div className="door-in">
        <p className={LABEL}>the thesis, after the tape</p>
        <p className="m-0 mb-2 text-[20px] font-medium leading-relaxed">“{structure.claimAfter?.trim() || extraction.claim}”</p>
        <p className="m-0 mb-8 font-mono text-[10.5px] uppercase tracking-[.12em] text-muted">
          <span className="text-faint">vehicle</span> {ticker ? `$${ticker}` : "a narrative, not a name"}
          <span className="text-faint"> · narrative</span> {extraction.audience}
        </p>
      </div>

      <div className="door-in" style={{ animationDelay: "0.3s" }}>
        <p className={LABEL}>the ledger</p>
        <p className="m-0 mb-8 font-mono text-[12.5px] leading-relaxed text-muted">
          {String(lines.length).padStart(2, "0")} lines in · <span className="text-ink">{String(held).padStart(2, "0")} held</span>
          {heldAgainst > 0 && <span className="text-lock-deep"> ({heldAgainst} against the tape)</span>} ·{" "}
          <span className="text-ink">{String(revised).padStart(2, "0")} revised</span> · <span className="text-ink">{String(cut).padStart(2, "0")} cut</span>
          {extraction.openQuestions.length > 0 && (
            <> · {String(answered).padStart(2, "0")} answered · {String(open).padStart(2, "0")} open</>
          )}
        </p>
      </div>

      <p className={`${LABEL} door-in mb-2`} style={{ animationDelay: "0.5s" }}>the lines</p>
      <div className="mb-8 flex flex-col">
        {lines.map(({ a, i, r, after, status }) => (
          <div key={a.basis} className={`door-in border-t border-line py-3 ${after === null ? "opacity-45" : ""}`} style={{ animationDelay: `${0.6 + i * 0.15}s` }}>
            <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.14em]">
              <span className="text-faint">A{i + 1} · </span>
              <span className={status.cls}>{status.text}</span>
            </p>
            <p className={`m-0 text-[14.5px] leading-relaxed ${after === null ? "line-through decoration-bad decoration-1" : ""}`}>{after ?? a.text}</p>
            {r?.kind === "hold" && r.reason?.trim() && (
              <p className="m-0 mt-1 font-mono text-[10.5px] text-muted">held because: “{r.reason.trim()}”</p>
            )}
            {r?.kind === "revise" && <p className="m-0 mt-1 font-mono text-[10.5px] text-faint">as written before the tape: “{a.text}”</p>}
          </div>
        ))}
        {extraction.openQuestions.map((q, i) => {
          const ans = structure.answers[i]?.trim();
          return (
            <div key={q} className="door-in border-t border-line py-3" style={{ animationDelay: `${0.6 + (lines.length + i) * 0.15}s` }}>
              <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.14em]">
                <span className="text-faint">Q{i + 1} · </span>
                <span className={ans ? "text-muted" : "text-bad"}>{ans ? "answered · unverified" : "open"}</span>
              </p>
              <p className={`m-0 text-[14.5px] leading-relaxed ${ans ? "" : "text-bad"}`}>{ans ?? q}</p>
              {ans && <p className="m-0 mt-1 font-mono text-[10.5px] text-faint">the question: {q}</p>}
            </div>
          );
        })}
      </div>

      <div className="door-in mb-10" style={{ animationDelay: `${0.8 + (lines.length + extraction.openQuestions.length) * 0.15}s` }}>
        <p className={LABEL}>off the book if</p>
        <p className="m-0 text-[15px] leading-relaxed">{structure.invalidation.trim()}</p>
      </div>

      <div className="door-in" style={{ animationDelay: `${1 + (lines.length + extraction.openQuestions.length) * 0.15}s` }}>
        <p className={LABEL}>the doc</p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => copy("link")}
            disabled={busy}
            className="border border-lock-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[.2em] text-lock-deep transition-colors hover:bg-lock-deep hover:text-bg disabled:opacity-60"
          >
            [ copy a link ]
          </button>
          <button
            onClick={() => copy("doc")}
            disabled={busy}
            className="border border-line px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[.18em] text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
          >
            [ copy as markdown ]
          </button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener"
              className="font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted"
            >
              [ open the doc ]
            </a>
          )}
        </div>
        <p className="m-0 mt-3 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint" aria-live="polite">
          {copied === "link"
            ? "copied · the link carries the whole doc — nothing is stored"
            : copied === "doc"
              ? "copied · markdown, receipts included"
              : copied === "denied"
                ? "the clipboard said no — the link is right here"
                : "the link is the doc. nothing is stored anywhere."}
        </p>
        {copied === "denied" && link && (
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Share link"
            className="mt-2 w-full border-0 border-b border-line bg-transparent pb-1.5 font-mono text-[11px] text-muted outline-none focus:border-lock-deep"
          />
        )}
        <button
          onClick={onBack}
          className="mt-8 border-0 bg-transparent p-0 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint transition-colors hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lock"
        >
          [ back to the ruling ]
        </button>
      </div>
    </main>
  );
}
