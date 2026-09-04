/* The doc — the one-pager that leaves the desk. Built from the ruling,
   receipts attached. Client-safe: encoding uses the browser's
   CompressionStream; the server decodes with zlib (doc-server.ts).
   The share link IS the doc: nothing is stored anywhere. */

import { lineAfter, lineVerdict, type Challenge, type Extraction, type StructureState } from "./session";

export interface DocReceipt {
  verdict: "supports" | "contradicts" | "inconclusive";
  source: string;
  rows: { k: string; v: string; dir: "neg" | "pos" | "neutral" }[];
  note: string;
}
export interface DocLine {
  n: number;
  text: string; // after the ruling (the original if cut)
  status: "held" | "held-supported" | "held-against" | "revised" | "cut";
  before?: string; // original text when revised
  reason?: string; // why held against the tape
  receipts: DocReceipt[];
}
export interface Doc {
  v: 1;
  at: string; // ISO date
  ticker: string | null;
  claim: string;
  claimBefore?: string; // when revised after the tape
  narrative: string;
  lines: DocLine[];
  questions: { q: string; a: string | null }[];
  invalidation: string;
  analyst: string | null;
  skeptic: string | null;
  live: boolean; // false = fixture tape
}

export function buildDoc(
  ticker: string | null,
  ex: Extraction,
  challenge: Challenge | null,
  st: StructureState
): Doc {
  const lines: DocLine[] = ex.assumptions.map((a, i) => {
    const r = st.rulings[i];
    const { verdict, cards } = lineVerdict(challenge, i);
    const after = lineAfter(ex, st, i);
    const status: DocLine["status"] =
      after === null
        ? "cut"
        : r?.kind === "revise"
          ? "revised"
          : r?.kind === "hold" && verdict === "contested"
            ? "held-against"
            : verdict === "supported"
              ? "held-supported"
              : "held";
    return {
      n: i + 1,
      text: after ?? a.text,
      status,
      ...(status === "revised" ? { before: a.text } : {}),
      ...(r?.kind === "hold" && r.reason?.trim() ? { reason: r.reason.trim() } : {}),
      receipts: cards
        .filter((c) => c.verdict !== "inconclusive")
        .map((c) => ({ verdict: c.verdict, source: c.source, rows: c.rows, note: c.note })),
    };
  });
  return {
    v: 1,
    at: new Date().toISOString().slice(0, 10),
    ticker,
    claim: st.claimAfter?.trim() || ex.claim,
    ...(st.claimAfter?.trim() && st.claimAfter.trim() !== ex.claim ? { claimBefore: ex.claim } : {}),
    narrative: ex.audience,
    lines,
    questions: ex.openQuestions.map((q, i) => ({ q, a: st.answers[i]?.trim() || null })),
    invalidation: st.invalidation.trim(),
    analyst: challenge?.analystLine ?? null,
    skeptic: challenge?.skepticLine ?? null,
    live: challenge ? !challenge.fixture : false,
  };
}

export function ledgerOf(doc: Doc) {
  const held = doc.lines.filter((l) => l.status === "held" || l.status === "held-supported" || l.status === "held-against").length;
  return {
    in: doc.lines.length,
    held,
    heldAgainst: doc.lines.filter((l) => l.status === "held-against").length,
    revised: doc.lines.filter((l) => l.status === "revised").length,
    cut: doc.lines.filter((l) => l.status === "cut").length,
    answered: doc.questions.filter((q) => q.a).length,
    open: doc.questions.filter((q) => !q.a).length,
  };
}

export const STATUS_TEXT: Record<DocLine["status"], string> = {
  held: "held · unverified",
  "held-supported": "held · supported by the tape",
  "held-against": "held against the tape",
  revised: "revised after the tape",
  cut: "cut",
};

const pad = (n: number) => String(n).padStart(2, "0");

export function ledgerLine(doc: Doc): string {
  const l = ledgerOf(doc);
  let s = `${pad(l.in)} lines in · ${pad(l.held)} held`;
  if (l.heldAgainst) s += ` (${l.heldAgainst} against the tape)`;
  s += ` · ${pad(l.revised)} revised · ${pad(l.cut)} cut`;
  if (doc.questions.length) s += ` · ${pad(l.answered)} answered · ${pad(l.open)} open`;
  return s;
}

export function buildMarkdown(doc: Doc, link?: string): string {
  const out: string[] = [];
  out.push(`# ${doc.ticker ? `$${doc.ticker} · ` : ""}the thesis, after the tape`);
  out.push("");
  out.push(`> ${doc.claim}`);
  out.push("");
  out.push(`**vehicle** ${doc.ticker ? `$${doc.ticker}` : "a narrative, not a name"} · **narrative** ${doc.narrative} · ${doc.at}`);
  if (doc.claimBefore) out.push(`\n_as written before the tape:_ ${doc.claimBefore}`);
  out.push("");
  out.push(`## the ledger`);
  out.push(ledgerLine(doc));
  out.push("");
  out.push(`## the lines`);
  for (const l of doc.lines) {
    out.push(`- **A${l.n} · ${STATUS_TEXT[l.status]}**: ${l.status === "cut" ? `~~${l.text}~~` : l.text}`);
    if (l.reason) out.push(`  - held because: ${l.reason}`);
    if (l.before) out.push(`  - as written before the tape: ${l.before}`);
    for (const r of l.receipts) {
      const rows = r.rows.map((x) => `${x.k} ${x.v}`).join(" · ");
      out.push(`  - ${r.verdict} · ${r.source}${rows ? ` · ${rows}` : ""}`);
    }
  }
  if (doc.questions.length) {
    out.push("");
    out.push(`## open questions`);
    for (const q of doc.questions) out.push(q.a ? `- ~~${q.q}~~ → ${q.a} _(unverified)_` : `- ${q.q} _(open)_`);
  }
  out.push("");
  out.push(`## off the book if`);
  out.push(doc.invalidation);
  if (doc.analyst || doc.skeptic) {
    out.push("");
    out.push(`## from the desk`);
    if (doc.analyst) out.push(`- analyst › ${doc.analyst}`);
    if (doc.skeptic) out.push(`- skeptic › ${doc.skeptic}`);
  }
  out.push("");
  out.push(`---`);
  out.push(`pressure-tested on id8${doc.live ? " · live nansen tape" : " · fixture tape"}${link ? ` · ${link}` : ""}`);
  return out.join("\n");
}

/* ---- encoding: deflate-raw → base64url. The link carries the doc. ---- */

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function encodeDoc(doc: Doc): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(doc));
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  void writer.write(json);
  void writer.close();
  const buf = await new Response(cs.readable).arrayBuffer();
  return toBase64Url(new Uint8Array(buf));
}
