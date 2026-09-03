/* id8 session model — types + constellation building from agent output.
   Client-safe: no server imports. DB-backed sessions land with Supabase. */

export type NodeKind = "core" | "assumption" | "evidence" | "risk";
export type EdgeKind = "neutral" | "supports" | "contradicts" | "risk";
export type TagTone = "lock" | "ok" | "contested" | "neutral";

export interface DossierRow {
  k: string;
  v: string;
  dir: "neg" | "pos" | "neutral";
}

export interface Dossier {
  title: string;
  sub: string;
  tag: { label: string; tone: TagTone };
  body: string[];
  rows?: DossierRow[];
}

export interface IdeaNode {
  id: string;
  label: string;
  sub: string;
  pos: [number, number, number];
  kind: NodeKind;
  dossier: Dossier;
}

export interface IdeaEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

export interface FeedLine {
  agent: "clarifier" | "analyst" | "skeptic" | "system";
  text: string;
}

export const PHASES = ["Present", "Clarify", "Challenge", "Structure", "Commit"] as const;

/* Minimum-effort gate: id8 won't accept a headline as an idea. */
export const MIN_WORDS = 25;
/* Room to write — the desk holds a long thesis and long answers; the routes enforce the same caps */
export const MAX_THESIS_CHARS = 4000;
export const MAX_ANSWER_CHARS = 3000;

/* localStorage keys — shared by Session (persistence) and FrontDoor (resume detection) */
export const SESSION_STORE_KEY = "id8.session.v3";
export const TOUR_SEEN_KEY = "id8.tour.v1";

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sessionSlug(thesis: string): string {
  const s = thesis.trim().split(/\s+/).slice(0, 4).join(" ").toLowerCase();
  return s.length > 28 ? s.slice(0, 28) + "…" : s || "untitled";
}


/* ---------- real sessions: clarifier output → constellation ---------- */

export interface QA {
  q: string;
  a: string;
}

export interface Extraction {
  claim: string;
  audience: string;
  assumptions: { text: string; basis: string }[];
  openQuestions: string[];
  /* what the trader said takes them out, in their words; "unstated" if never given (absent on older sessions) */
  invalidation?: string;
}
export const statedInvalidation = (ex: Extraction | null | undefined): string | null =>
  ex?.invalidation && ex.invalidation.trim().toLowerCase() !== "unstated" ? ex.invalidation.trim() : null;

/* Client-safe mirror of the analyst's output shape (the agent module is
   server-only and can't be imported here). */
export interface EvidenceCard {
  assumptionIndex: number; // 1-based; 0 = tests the thesis as a whole
  title: string;
  source: string;
  rows: { k: string; v: string; dir: "neg" | "pos" | "neutral" }[];
  verdict: "supports" | "contradicts" | "inconclusive";
  note: string;
}

export interface Challenge {
  cards: EvidenceCard[];
  analystLine: string;
  skepticLine: string;
  fixture: boolean;
}

/* ---------- STRUCTURE: the ruling ---------- */

export type RulingKind = "hold" | "revise" | "cut";
export interface Ruling {
  kind: RulingKind;
  text?: string; // revise: the line, rewritten by the trader
  reason?: string; // hold against the tape: why
}
export interface StructureState {
  rulings: Record<number, Ruling>; // by assumption index (0-based)
  answers: Record<number, string>; // by open-question index; absent = left open
  invalidation: string; // what takes this off the book
  claimAfter: string | null; // the thesis, revised after the tape (null = as written)
}
export const emptyStructure = (): StructureState => ({ rulings: {}, answers: {}, invalidation: "", claimAfter: null });

export type LineVerdict = "supported" | "contested" | "unverified";
export function lineVerdict(challenge: Challenge | null | undefined, i0: number): { verdict: LineVerdict; cards: EvidenceCard[] } {
  const cards = challenge?.cards.filter((c) => c.assumptionIndex === i0 + 1) ?? [];
  if (cards.some((c) => c.verdict === "contradicts")) return { verdict: "contested", cards };
  if (cards.some((c) => c.verdict === "supports")) return { verdict: "supported", cards };
  return { verdict: "unverified", cards };
}

const words = (t: string | undefined) => (t ?? "").trim().split(/\s+/).filter(Boolean).length;

/* The gate into Commit: every contested line ruled (with its reason or its
   rewrite), and an invalidation on the book. Nothing else is required. */
export function structureGate(ex: Extraction, challenge: Challenge | null | undefined, st: StructureState): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  ex.assumptions.forEach((_, i) => {
    const r = st.rulings[i];
    const { verdict } = lineVerdict(challenge, i);
    if (verdict === "contested" && !r) missing.push(`rule on A${i + 1}`);
    if (r?.kind === "hold" && verdict === "contested" && words(r.reason) < 2) missing.push(`why you hold A${i + 1}`);
    if (r?.kind === "revise" && words(r.text) < 3) missing.push(`rewrite A${i + 1}`);
  });
  if (words(st.invalidation) < 3) missing.push("name the invalidation");
  if (st.claimAfter !== null && words(st.claimAfter) < 5) missing.push("finish the thesis");
  return { ok: missing.length === 0, missing };
}

/* Final text of a line after the ruling (null = cut) */
export function lineAfter(ex: Extraction, st: StructureState, i: number): string | null {
  const r = st.rulings[i];
  if (r?.kind === "cut") return null;
  if (r?.kind === "revise" && r.text?.trim()) return r.text.trim();
  return ex.assumptions[i].text;
}

function shortLabel(text: string, words = 3): string {
  return text.trim().split(/\s+/).slice(0, words).join(" ").toLowerCase();
}

/* Build the constellation: the Clarifier's extraction (every node the user's
   own words), plus — once the Analyst has run — evidence cards attached to
   the assumptions they test. */
export function nodesFromExtraction(
  thesis: string,
  ex: Extraction,
  challenge?: Challenge | null,
  structure?: StructureState | null
): {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
} {
  const nodes: IdeaNode[] = [
    {
      id: "thesis",
      label: "THESIS",
      sub: sessionSlug(thesis),
      pos: [0, 0, 0],
      kind: "core",
      dossier: {
        title: "Thesis",
        sub: structure?.claimAfter ? "typed by hand · revised after the tape" : "typed by hand · authorship 100% human",
        tag: { label: "core", tone: "lock" },
        body: [
          `“${structure?.claimAfter?.trim() || ex.claim}”`,
          ex.audience !== "unstated" ? `rides: ${ex.audience}` : "narrative: unstated — worth knowing",
          ...(structure?.invalidation.trim() ? [`off the book if: ${structure.invalidation.trim()}`] : []),
        ],
      },
    },
  ];
  const edges: IdeaEdge[] = [];

  const n = ex.assumptions.length;
  const verdictFor = (i1: number): "supports" | "contradicts" | null => {
    const cards = challenge?.cards.filter((c) => c.assumptionIndex === i1) ?? [];
    if (cards.some((c) => c.verdict === "contradicts")) return "contradicts";
    if (cards.some((c) => c.verdict === "supports")) return "supports";
    return null;
  };

  const cut = (i: number) => structure?.rulings[i]?.kind === "cut";

  ex.assumptions.forEach((a, i) => {
    if (cut(i)) return; // a cut line leaves the board
    const angle = (i / n) * Math.PI * 2 + 0.5;
    const id = `a${i + 1}`;
    const verdict = verdictFor(i + 1);
    const r = structure?.rulings[i];
    const text = r?.kind === "revise" && r.text?.trim() ? r.text.trim() : a.text;
    const tag: Dossier["tag"] =
      r?.kind === "revise"
        ? { label: "revised after the tape", tone: "lock" }
        : r?.kind === "hold" && verdict === "contradicts"
          ? { label: "held against the tape", tone: "lock" }
          : verdict === "contradicts"
            ? { label: "contested by the tape", tone: "contested" }
            : verdict === "supports"
              ? { label: "supported by the tape", tone: "ok" }
              : { label: "unverified", tone: "neutral" };
    const body = [text, `from your words: “${a.basis}”`];
    if (r?.kind === "hold" && r.reason?.trim()) body.push(`held because: ${r.reason.trim()}`);
    if (r?.kind === "revise") body.push(`as written before the tape: “${a.text}”`);
    nodes.push({
      id,
      label: `A${i + 1}`,
      sub: shortLabel(text),
      pos: [Math.cos(angle) * 200, (i % 2 === 0 ? -1 : 1) * 38, Math.sin(angle) * 200],
      kind: "assumption",
      dossier: {
        title: `A${i + 1} — ${text.slice(0, 48)}${text.length > 48 ? "…" : ""}`,
        sub: "assumption · extracted from your words",
        tag,
        body,
      },
    });
    edges.push({ from: "thesis", to: id, kind: "neutral" });
  });

  challenge?.cards.forEach((c, i) => {
    if (c.assumptionIndex >= 1 && c.assumptionIndex <= n && cut(c.assumptionIndex - 1)) return; // tested a line that left the board
    const id = `ev${i + 1}`;
    const targetId = c.assumptionIndex >= 1 && c.assumptionIndex <= n ? `a${c.assumptionIndex}` : "thesis";
    const baseAngle =
      c.assumptionIndex >= 1 && c.assumptionIndex <= n
        ? ((c.assumptionIndex - 1) / n) * Math.PI * 2 + 0.5
        : 0;
    const angle = baseAngle + 0.38 + i * 0.07;
    nodes.push({
      id,
      label: `EV-${String(i + 1).padStart(2, "0")}`,
      sub: shortLabel(c.title),
      pos: [Math.cos(angle) * 272, (c.assumptionIndex % 2 === 0 ? -1 : 1) * (88 + i * 26), Math.sin(angle) * 272],
      kind: "evidence",
      dossier: {
        title: `EV-${String(i + 1).padStart(2, "0")} — ${c.title}`,
        sub: `${c.source}${challenge.fixture ? " · FIXTURE DATA" : " · LIVE"}`,
        tag:
          c.verdict === "contradicts"
            ? { label: `contradicts ${targetId === "thesis" ? "thesis" : targetId.toUpperCase()}`, tone: "contested" }
            : c.verdict === "supports"
              ? { label: `supports ${targetId === "thesis" ? "thesis" : targetId.toUpperCase()}`, tone: "ok" }
              : { label: "inconclusive", tone: "neutral" },
        body: [c.note],
        rows: c.rows,
      },
    });
    edges.push({
      from: id,
      to: targetId,
      kind: c.verdict === "contradicts" ? "contradicts" : c.verdict === "supports" ? "supports" : "neutral",
    });
  });

  ex.openQuestions.forEach((q, i) => {
    const angle = ((i + 0.5) / ex.openQuestions.length) * Math.PI * 2 + 2.1;
    const id = `risk${i + 1}`;
    const answer = structure?.answers[i]?.trim();
    if (answer) {
      /* answered in the ruling: it joins the book as a line, unverified */
      nodes.push({
        id,
        label: `Q${i + 1}`,
        sub: shortLabel(answer),
        pos: [Math.cos(angle) * 335, 96 + i * 34, Math.sin(angle) * 335],
        kind: "assumption",
        dossier: {
          title: `Q${i + 1} — answered in the ruling`,
          sub: "from an open question · unverified",
          tag: { label: "answered · unverified", tone: "neutral" },
          body: [answer, `the question: ${q}`],
        },
      });
      edges.push({ from: "thesis", to: id, kind: "neutral" });
      return;
    }
    nodes.push({
      id,
      label: `RISK-${i + 1}`,
      sub: shortLabel(q),
      pos: [Math.cos(angle) * 335, 96 + i * 34, Math.sin(angle) * 335],
      kind: "risk",
      dossier: {
        title: `RISK — open question`,
        sub: "raised by the clarifier · unresolved",
        tag: { label: "unverified", tone: "contested" },
        body: [q],
      },
    });
    edges.push({ from: id, to: "thesis", kind: "risk" });
  });

  return { nodes, edges };
}
