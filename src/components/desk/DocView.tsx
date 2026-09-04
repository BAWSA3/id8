import type { Doc } from "@/lib/doc";
import { ledgerLine, STATUS_TEXT } from "@/lib/doc";

/* The doc as a place. Used by the share page and by the desk's breakdown.
   Plain component, no server or browser dependencies. */

const LABEL = "m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint";
const STATUS_CLS: Record<string, string> = {
  held: "text-muted",
  "held-supported": "text-good",
  "held-against": "text-lock-deep",
  revised: "text-lock-deep",
  cut: "text-bad",
};

export default function DocView({ doc }: { doc: Doc }) {
  return (
    <>
      <p className={LABEL}>the thesis, after the tape</p>
      <p className="m-0 mb-2 text-[20px] font-medium leading-relaxed">“{doc.claim}”</p>
      {doc.claimBefore && <p className="m-0 mb-2 font-mono text-[10.5px] text-faint">as written before the tape: “{doc.claimBefore}”</p>}
      <p className="m-0 mb-8 font-mono text-[10.5px] uppercase tracking-[.12em] text-muted">
        <span className="text-faint">vehicle</span> {doc.ticker ? `$${doc.ticker}` : "a narrative, not a name"}
        <span className="text-faint"> · narrative</span> {doc.narrative}
      </p>

      <p className={LABEL}>the ledger</p>
      <p className="m-0 mb-8 font-mono text-[12.5px] leading-relaxed text-ink">{ledgerLine(doc)}</p>

      <p className={`${LABEL} mb-2`}>the lines</p>
      <div className="mb-8 flex flex-col">
        {doc.lines.map((l) => (
          <div key={l.n} className={`border-t border-line py-3 ${l.status === "cut" ? "opacity-45" : ""}`}>
            <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.14em]">
              <span className="text-faint">A{l.n} · </span>
              <span className={STATUS_CLS[l.status]}>{STATUS_TEXT[l.status]}</span>
            </p>
            <p className={`m-0 text-[14.5px] leading-relaxed ${l.status === "cut" ? "line-through decoration-bad decoration-1" : ""}`}>{l.text}</p>
            {l.reason && <p className="m-0 mt-1 font-mono text-[10.5px] text-muted">held because: “{l.reason}”</p>}
            {l.before && <p className="m-0 mt-1 font-mono text-[10.5px] text-faint">as written before the tape: “{l.before}”</p>}
            {l.receipts.map((r, k) => (
              <div key={k} className="mt-2 border-l border-line pl-3">
                <p className="m-0 font-mono text-[10px] uppercase tracking-[.1em] text-muted">
                  <span className={r.verdict === "contradicts" ? "text-bad" : "text-good"}>{r.verdict}</span> · {r.source}
                </p>
                {r.rows.length > 0 && (
                  <p className="m-0 mt-1 font-mono text-[11px] tabular-nums text-muted">
                    {r.rows.map((row, j) => (
                      <span key={row.k}>
                        {j > 0 && <span className="text-faint"> · </span>}
                        {row.k} <b className={`font-bold ${row.dir === "neg" ? "text-bad" : row.dir === "pos" ? "text-good" : "text-ink"}`}>{row.v}</b>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
        {doc.questions.map((q, i) => (
          <div key={i} className="border-t border-line py-3">
            <p className="m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.14em]">
              <span className="text-faint">Q{i + 1} · </span>
              <span className={q.a ? "text-muted" : "text-bad"}>{q.a ? "answered · unverified" : "open"}</span>
            </p>
            <p className={`m-0 text-[14.5px] leading-relaxed ${q.a ? "" : "text-bad"}`}>{q.a ?? q.q}</p>
            {q.a && <p className="m-0 mt-1 font-mono text-[10.5px] text-faint">the question: {q.q}</p>}
          </div>
        ))}
      </div>

      <p className={LABEL}>off the book if</p>
      <p className="m-0 mb-10 text-[15px] leading-relaxed">{doc.invalidation}</p>

      {(doc.analyst || doc.skeptic) && (
        <div className="mb-10 flex flex-col gap-2">
          {doc.analyst && (
            <p className="m-0 font-mono text-[12px] leading-relaxed text-muted">
              <span className="text-good">analyst ›</span> {doc.analyst}
            </p>
          )}
          {doc.skeptic && (
            <p className="m-0 font-mono text-[12px] leading-relaxed text-muted">
              <span className="text-bad">skeptic ›</span> {doc.skeptic}
            </p>
          )}
        </div>
      )}

    </>
  );
}
