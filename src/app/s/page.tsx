import type { Metadata } from "next";
import Link from "next/link";
import { decodeDoc } from "@/lib/doc-server";
import { ledgerLine, STATUS_TEXT } from "@/lib/doc";

/* The doc, shared. A quiet page: the thesis after the tape, the ledger,
   every line with its status and its receipts. Readable on a phone,
   readable without JS. The link carries the whole doc — nothing stored. */

export const dynamic = "force-dynamic";

type Search = Promise<{ d?: string }>;

const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { d } = await searchParams;
  const doc = decodeDoc(d);
  if (!doc) return { title: "id8 · nothing on the book at this link" };
  const title = `${doc.ticker ? `$${doc.ticker} · ` : ""}${trim(doc.claim, 80)}`;
  const description = `${ledgerLine(doc)} · off the book if: ${trim(doc.invalidation, 90)} · pressure-tested on id8`;
  const og = `/api/og?d=${encodeURIComponent(d!)}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

const LABEL = "m-0 mb-1 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint";
const STATUS_CLS: Record<string, string> = {
  held: "text-muted",
  "held-supported": "text-good",
  "held-against": "text-lock-deep",
  revised: "text-lock-deep",
  cut: "text-bad",
};

export default async function SharePage({ searchParams }: { searchParams: Search }) {
  const { d } = await searchParams;
  const doc = decodeDoc(d);

  if (!doc) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[660px] flex-col justify-center px-8">
        <p className="m-0 font-mono text-[12.5px] text-muted">
          <span className="font-pixel text-[10px]">the desk ›</span> nothing on the book at this link.
        </p>
        <Link href="/" className="mt-6 font-mono text-[10.5px] uppercase tracking-[.18em] text-lock-deep hover:text-lock">
          [ open the desk ]
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[660px] flex-col px-6 pb-16 pt-[8vh] sm:px-8">
      <p className="m-0 mb-[26px] flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
        <span>
          <span className="seed mr-2.5 align-[1px]" />
          on the book{doc.ticker ? ` · $${doc.ticker}` : ""}
        </span>
        <span className="text-faint">{doc.at}</span>
      </p>

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

      <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-5 font-mono text-[9.5px] uppercase tracking-[.16em] text-faint">
        <span>
          pressure-tested on id<i className="font-light italic">8</i> · {doc.live ? "live nansen tape" : "fixture tape"} · writes your trade: never
        </span>
        <Link href="/" className="text-lock-deep transition-colors hover:text-lock">
          [ open the desk ]
        </Link>
      </div>
    </main>
  );
}
