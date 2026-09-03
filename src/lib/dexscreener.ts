import "server-only";

/* Dexscreener — pair context for the desk. Public, keyless API.
   Role split: Nansen says WHO is moving (labeled cohorts); Dexscreener says
   WHERE it trades (pool, DEX, liquidity). Never a verdict source — the analyst
   reads Nansen. Best-effort: any failure returns [] and the window carries on. */

const BASE = "https://api.dexscreener.com";

/* Nansen chain name → Dexscreener chainId (identical unless listed) */
const CHAIN_IDS: Record<string, string> = {
  bnb: "bsc",
};

export interface Pool {
  dex: string;          // "uniswap"
  version: string | null; // "v3" | "v4" | null
  base: string;         // "NVDA"
  quote: string;        // "USDG"
  liquidityUsd: number;
  volume24hUsd: number;
  pairAddress: string;
  url: string;
}

export interface PairContext {
  pools: Pool[];       // top pools by liquidity, deepest first
  poolCount: number;   // every pool Dexscreener lists for the token on that chain
}

interface RawPair {
  chainId?: string;
  dexId?: string;
  labels?: string[];
  pairAddress?: string;
  url?: string;
  baseToken?: { address?: string; symbol?: string };
  quoteToken?: { symbol?: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
}

const cache = new Map<string, { at: number; ctx: PairContext }>();
const TTL_MS = 60_000;

export async function pairContext(chain: string, tokenAddress: string, top = 3): Promise<PairContext> {
  const chainId = CHAIN_IDS[chain] ?? chain;
  const key = `${chainId}:${tokenAddress.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ctx;

  try {
    const res = await fetch(`${BASE}/token-pairs/v1/${chainId}/${tokenAddress}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { pools: [], poolCount: 0 };
    const raw = (await res.json()) as RawPair[];
    const addr = tokenAddress.toLowerCase();
    const pools = raw
      .filter((p) => (p.liquidity?.usd ?? 0) > 0)
      /* orient every pool so the named token is the base */
      .map((p) => {
        const flipped = p.baseToken?.address?.toLowerCase() !== addr;
        return {
          dex: p.dexId ?? "",
          version: p.labels?.[0] ?? null,
          base: (flipped ? p.quoteToken?.symbol : p.baseToken?.symbol) ?? "",
          quote: (flipped ? p.baseToken?.symbol : p.quoteToken?.symbol) ?? "",
          liquidityUsd: Math.round(p.liquidity?.usd ?? 0),
          volume24hUsd: Math.round(p.volume?.h24 ?? 0),
          pairAddress: p.pairAddress ?? "",
          url: p.url ?? "",
        };
      })
      .sort((a, b) => b.liquidityUsd - a.liquidityUsd);
    const ctx = { pools: pools.slice(0, top), poolCount: pools.length };
    cache.set(key, { at: Date.now(), ctx });
    return ctx;
  } catch {
    return { pools: [], poolCount: 0 };
  }
}
