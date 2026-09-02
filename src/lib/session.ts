/* id8 session model — types + constellation building from agent output.
   Client-safe: no server imports. DB-backed sessions land with Supabase. */

export type NodeKind = "core" | "assumption" | "evidence" | "risk";
export type EdgeKind = "neutral" | "supports" | "contradicts";
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

/* localStorage keys — shared by Session (persistence) and FrontDoor (resume detection) */
export const SESSION_STORE_KEY = "id8.session.v3";
export const GHOST_SEEN_KEY = "id8.ghost.v1";

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
}

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

function shortLabel(text: string, words = 3): string {
  return text.trim().split(/\s+/).slice(0, words).join(" ").toLowerCase();
}

/* Build the constellation: the Clarifier's extraction (every node the user's
   own words), plus — once the Analyst has run — evidence cards attached to
   the assumptions they test. */
export function nodesFromExtraction(
  thesis: string,
  ex: Extraction,
  challenge?: Challenge | null
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
        sub: "typed by hand · authorship 100% human",
        tag: { label: "core", tone: "lock" },
        body: [
          `“${ex.claim}”`,
          ex.audience !== "unstated" ? `rides: ${ex.audience}` : "narrative: unstated — worth knowing",
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

  ex.assumptions.forEach((a, i) => {
    const angle = (i / n) * Math.PI * 2 + 0.5;
    const id = `a${i + 1}`;
    const verdict = verdictFor(i + 1);
    nodes.push({
      id,
      label: `A${i + 1}`,
      sub: shortLabel(a.text),
      pos: [Math.cos(angle) * 200, (i % 2 === 0 ? -1 : 1) * 38, Math.sin(angle) * 200],
      kind: "assumption",
      dossier: {
        title: `A${i + 1} — ${a.text.slice(0, 48)}${a.text.length > 48 ? "…" : ""}`,
        sub: "assumption · extracted from your words",
        tag:
          verdict === "contradicts"
            ? { label: "contested by evidence", tone: "contested" }
            : verdict === "supports"
              ? { label: "supported by evidence", tone: "ok" }
              : { label: "unverified", tone: "neutral" },
        body: [a.text, `from your words: “${a.basis}”`],
      },
    });
    edges.push({ from: "thesis", to: id, kind: "neutral" });
  });

  challenge?.cards.forEach((c, i) => {
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
    nodes.push({
      id,
      label: `RISK-${i + 1}`,
      sub: shortLabel(q),
      pos: [Math.cos(angle) * 265, 72 + i * 30, Math.sin(angle) * 265],
      kind: "risk",
      dossier: {
        title: `RISK — open question`,
        sub: "raised by the clarifier · unresolved",
        tag: { label: "unverified", tone: "contested" },
        body: [q],
      },
    });
    edges.push({ from: id, to: "thesis", kind: "contradicts" });
  });

  return { nodes, edges };
}
