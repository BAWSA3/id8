/* The watch: the invalidation, read against today's tape. Client-safe types
   and the rule parser. Only what the tape can observe gets checked; anything
   else is listed as "not on the tape" and stays the trader's call. */

export type WatchStatus = "holding" | "breached" | "unwatched";

export interface WatchCheck {
  clause: string; // the trader's words for this condition
  kind: "netflow" | "volume" | "price" | "unobservable";
  status: WatchStatus;
  figure: string | null; // today's reading, exact, or null
  detail: string; // one plain sentence
}

export interface TokenRead {
  symbol: string;
  chain: string;
  priceUsd: number;
  priceChangePct: number;
  marketCapUsd: number;
  liquidityUsd: number;
  volumeUsd7d: number;
  netflowUsd7d: number;
  flows: {
    smartTraderNetFlowUsd: number;
    smartTraderWalletCount: number;
    whaleNetFlowUsd: number;
    topPnlNetFlowUsd: number;
    publicFigureNetFlowUsd: number;
    freshWalletsNetFlowUsd: number;
    exchangeNetFlowUsd: number;
  } | null;
  pool: { pair: string; dex: string; version: string | null; liquidityUsd: number; volume24hUsd: number } | null;
}

export interface SectorRead {
  sector: string;
  accumulating: { symbol: string; chain: string; netflow7dUsd: number }[];
  distributing: { symbol: string; chain: string; netflow7dUsd: number }[];
  netflow7dUsd: number; // sum over the rows read
}

export interface WatchRead {
  playId: string;
  readAt: string;
  live: boolean;
  token: TokenRead | null;
  sector: SectorRead | null;
  status: WatchStatus;
  checks: WatchCheck[];
}

/* ---- the rule parser ---- */

export interface Clause {
  text: string;
  kind: WatchCheck["kind"];
  sector?: string; // netflow: a sector named in the clause
  symbol?: string; // price/volume: a ticker named in the clause ($ETH, ETH)
  direction?: "negative" | "positive";
  comparator?: "under" | "over";
  threshold?: number; // volume floor / price level, in USD
  window?: "24h" | "7d";
}

const NUM = /\$?\s?([\d][\d,]*(?:\.\d+)?)\s*(k|m|b|thousand|million|billion)?\b/i;
function money(m: RegExpExecArray | null): number | undefined {
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return undefined;
  const u = (m[2] ?? "").toLowerCase();
  const mult = u.startsWith("k") || u === "thousand" ? 1e3 : u.startsWith("m") ? 1e6 : u.startsWith("b") ? 1e9 : 1;
  return n * mult;
}

export function splitClauses(invalidation: string): string[] {
  return invalidation
    .split(/(?:[.;]|\bor\b|\balso\b|\band if\b)/i)
    .map((s) => s.trim().replace(/^(if|out if|when|,)\s*/i, "").trim())
    .filter((s) => s.length > 8);
}

/* how traders say a sector vs how the tape names it */
const SECTOR_ALIASES: [RegExp, string][] = [
  [/\bperps?\b|\bperpetuals?\b|\bderivatives\b/, "Perps, Options and Derivatives"],
  [/\bai agents?\b|\bagent meta\b/, "AI Agents"],
  [/\bai memes?\b/, "AI Meme"],
  [/\bmemes?\b|\bmemecoins?\b/, "Memecoins"],
  [/\brestaking\b/, "Restaking"],
  [/\bdepin\b/, "DePIN"],
  [/\brwas?\b|\breal.world\b/, "RWAs"],
  [/\btokenized (stocks|equities)\b|\bstocks? on.?chain\b/, "Tokenized Stocks"],
  [/\bstablecoins?\b/, "Stablecoin Issuers"],
  [/\bgamefi\b|\bgaming\b/, "GameFi"],
  [/\bdexe?s?\b|\bdecentrali[sz]ed exchanges?\b/, "Decentralised Exchanges"],
  [/\blending\b|\bmoney markets?\b/, "DeFi Lending (Money Markets)"],
  [/\bl1s?\b|\bl2s?\b|\blayer.?(1|2)s?\b/, "L1/L2 Token & Derivatives"],
  [/\bsocial.?fi\b/, "Social Fi"],
  [/\bpayments?\b/, "Crypto Payments"],
  [/\boracles?\b/, "Data source and Oracle"],
];

export function sectorIn(text: string, sectors: readonly string[]): string | undefined {
  const t = text.toLowerCase();
  const exact = sectors.find((s) => t.includes(s.toLowerCase()));
  if (exact) return exact;
  const hit = SECTOR_ALIASES.find(([re]) => re.test(t));
  return hit && sectors.includes(hit[1]) ? hit[1] : undefined;
}

export function parseClause(text: string, sectors: readonly string[]): Clause {
  const t = text.toLowerCase();
  const sector = sectorIn(text, sectors);
  const tickerMatch = /\$?\b([A-Z]{2,10})\b/.exec(text.replace(/\b(ETH|BTC|SOL|USD|CT|TVL|PNL|DEX|AI|IF|OR|AND|THE)\b/g, (w) => (["ETH", "BTC", "SOL"].includes(w) ? w : w.toLowerCase())));
  const symbol = tickerMatch?.[1];

  if (/net\s*-?flow|net (selling|buying)|accumulat|distribut/.test(t)) {
    const direction: Clause["direction"] = /negative|net selling|selling|distribut|outflow/.test(t) ? "negative" : "positive";
    return { text, kind: "netflow", sector, symbol, direction };
  }
  if (/volume/.test(t)) {
    const m = NUM.exec(t.replace(/24h|7d/g, ""));
    return {
      text,
      kind: "volume",
      symbol,
      comparator: /under|below|less than|beneath/.test(t) ? "under" : "over",
      threshold: money(m),
      window: /24h|24 hour|daily/.test(t) ? "24h" : "7d",
    };
  }
  if (/close|price|level|reclaim|loses|lose|hold(s|ing)? (above|below)|above|below|under|over/.test(t)) {
    const m = NUM.exec(t);
    const threshold = money(m);
    if (threshold !== undefined && threshold > 0) {
      return { text, kind: "price", symbol, comparator: /under|below|loses|lose|beneath/.test(t) ? "under" : "over", threshold };
    }
  }
  return { text, kind: "unobservable" };
}
