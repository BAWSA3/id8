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
  { agent: "clarifier", text: "When you say “early” — early relative to what? Attention, price, or usage? They diverge here." },
  { agent: "analyst", text: "EV-01 in. Sector netflow −$41.7M over 30d. The rotation you predicted has not started." },
  { agent: "skeptic", text: "Smart money has been the seller for 30 days. Why is your thesis more than hope with a dashboard?" },
];

export const nodeById = Object.fromEntries(NODES.map((n) => [n.id, n]));

/* Inject the user's typed thesis into the session graph. Everything else
   stays mock until the agents are wired — the core is always theirs. */
export function makeSessionNodes(thesis: string): IdeaNode[] {
  return NODES.map((n) =>
    n.kind === "core"
      ? {
          ...n,
          sub: sessionSlug(thesis),
          dossier: {
            ...n.dossier,
            body: [`“${thesis.trim()}”`],
          },
        }
      : n
  );
}
