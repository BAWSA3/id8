/* id8 session model — mock CHALLENGE-phase session used across the instrument.
   Replace with DB-backed sessions once auth + persistence land. */

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

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function sessionSlug(thesis: string): string {
  const s = thesis.trim().split(/\s+/).slice(0, 4).join(" ").toLowerCase();
  return s.length > 28 ? s.slice(0, 28) + "…" : s || "untitled";
}

export const NODES: IdeaNode[] = [
  {
    id: "thesis", label: "THESIS", sub: "agent tokens are early",
    pos: [0, 0, 0], kind: "core",
    dossier: {
      title: "Thesis",
      sub: "typed by hand · authorship 100% human",
      tag: { label: "core", tone: "lock" },
      body: [
        "“AI-agent tokens are still early. Usage is real, the Q1 blow-up scared retail off, and smart money will rotate back before the timeline notices.”",
      ],
    },
  },
  {
    id: "a1", label: "A1", sub: "SM accumulating",
    pos: [-150, -15, -60], kind: "assumption",
    dossier: {
      title: "A1 — Smart money accumulating",
      sub: "assumption · extracted by clarifier",
      tag: { label: "contested by EV-01", tone: "contested" },
      body: ["Sector-level flows contradict this. A narrower infra-only version survives."],
      rows: [{ k: "Sector netflow 30d", v: "−$41.7M", dir: "neg" }],
    },
  },
  {
    id: "a2", label: "A2", sub: "retail gone",
    pos: [30, -70, 150], kind: "assumption",
    dossier: {
      title: "A2 — Retail attention gone",
      sub: "assumption · extracted by clarifier",
      tag: { label: "supported", tone: "ok" },
      body: ["Social volume −71% from Q1 peak. The crowd has left the sector."],
      rows: [{ k: "Social volume", v: "−71%", dir: "neg" }],
    },
  },
  {
    id: "a3", label: "A3", sub: "revised → infra",
    pos: [155, -25, -45], kind: "assumption",
    dossier: {
      title: "A3 — Sector recovers together",
      sub: "assumption · revised by you",
      tag: { label: "superseded", tone: "neutral" },
      body: ["Conceded after EV-01. Narrowed to: infra is early; agent memecoins are exit liquidity."],
    },
  },
  {
    id: "ev1", label: "EV-01", sub: "nansen netflow",
    pos: [-235, 55, 60], kind: "evidence",
    dossier: {
      title: "EV-01 — Smart money netflow",
      sub: "nansen smart money · 30d · 14:32 UTC",
      tag: { label: "contradicts A1", tone: "contested" },
      body: ["Smart money has been the seller, not the buyer."],
      rows: [
        { k: "Sector netflow", v: "−$41.7M", dir: "neg" },
        { k: "Top-100 wallets", v: "62 ↓", dir: "neg" },
        { k: "Infra subset", v: "+$8.2M", dir: "pos" },
      ],
    },
  },
  {
    id: "ev2", label: "EV-02", sub: "social volume",
    pos: [-40, 95, 225], kind: "evidence",
    dossier: {
      title: "EV-02 — Social volume",
      sub: "30d vs Q1 peak",
      tag: { label: "supports A2", tone: "ok" },
      body: [],
      rows: [{ k: "Mentions", v: "−71%", dir: "neg" }],
    },
  },
  {
    id: "risk", label: "RISK", sub: "one-fund flow",
    pos: [225, 75, 110], kind: "risk",
    dossier: {
      title: "RISK — One-fund flow",
      sub: "open question · raised by skeptic",
      tag: { label: "unverified", tone: "contested" },
      body: ["The +$8.2M infra inflow could be a single fund rebalancing. Verify wallet diversity before leaning on it."],
    },
  },
];

export const EDGES: IdeaEdge[] = [
  { from: "thesis", to: "a1", kind: "neutral" },
  { from: "thesis", to: "a2", kind: "neutral" },
  { from: "thesis", to: "a3", kind: "neutral" },
  { from: "ev1", to: "a1", kind: "contradicts" },
  { from: "ev2", to: "a2", kind: "supports" },
  { from: "ev1", to: "a3", kind: "contradicts" },
  { from: "risk", to: "a3", kind: "contradicts" },
];

export const FEED: FeedLine[] = [
  { agent: "clarifier", text: "Your assumptions are on the board. Click one to inspect what it rests on." },
  { agent: "analyst", text: "Standing by. Evidence cards arrive when the Nansen feed goes live — then your assumptions get tested against the chain." },
  { agent: "skeptic", text: "Every assumption up there is unverified. Which one would hurt most if it broke?" },
];

export const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]));

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

function shortLabel(text: string, words = 3): string {
  return text.trim().split(/\s+/).slice(0, words).join(" ").toLowerCase();
}

/* Build the constellation from what the Clarifier extracted — every node is
   the user's own words. Evidence nodes arrive later, with Nansen. */
export function nodesFromExtraction(thesis: string, ex: Extraction): {
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
          ex.audience !== "unstated" ? `for: ${ex.audience}` : "audience: unstated — worth knowing",
        ],
      },
    },
  ];
  const edges: IdeaEdge[] = [];

  const n = ex.assumptions.length;
  ex.assumptions.forEach((a, i) => {
    const angle = (i / n) * Math.PI * 2 + 0.5;
    const id = `a${i + 1}`;
    nodes.push({
      id,
      label: `A${i + 1}`,
      sub: shortLabel(a.text),
      pos: [Math.cos(angle) * 200, (i % 2 === 0 ? -1 : 1) * 38, Math.sin(angle) * 200],
      kind: "assumption",
      dossier: {
        title: `A${i + 1} — ${a.text.slice(0, 48)}${a.text.length > 48 ? "…" : ""}`,
        sub: "assumption · extracted from your words",
        tag: { label: "unverified", tone: "neutral" },
        body: [a.text, `from your words: “${a.basis}”`],
      },
    });
    edges.push({ from: "thesis", to: id, kind: "neutral" });
  });

  ex.openQuestions.forEach((q, i) => {
    const angle = ((i + 0.5) / ex.openQuestions.length) * Math.PI * 2 + 2.1;
    const id = `risk${i + 1}`;
    nodes.push({
      id,
      label: `RISK-${i + 1}`,
      sub: shortLabel(q),
      pos: [Math.cos(angle) * 265, 72, Math.sin(angle) * 265],
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
