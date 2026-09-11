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
const NANSEN_CHAIN: Record<string, string> = { bsc: "bnb" };

export interface AddressToken {
  chain: string; // Nansen's name for the chain
  symbol: string;
  name: string;
  address: string;
  priceUsd: number;
  marketCapUsd: number | null; // fdv when market cap is not reported
  liquidityUsd: number;
  volume24hUsd: number;
  priceChange24hPct: number | null;
  pools: Pool[];
  poolCount: number;
}

/* a contract address, on every chain Dexscreener finds it trading: one entry per chain,
   the deepest pool on that chain decides price and market cap, deepest chain first.
   Search is only ever called with an address; by symbol it returns copycats. */
export async function tokensByAddress(address: string): Promise<AddressToken[]> {
  try {
    const res = await fetch(`${BASE}/latest/dex/search?q=${encodeURIComponent(address)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as { pairs?: (RawPair & { priceUsd?: string; fdv?: number; marketCap?: number; priceChange?: { h24?: number }; baseToken?: { address?: string; symbol?: string; name?: string } })[] };
    const addr = address.toLowerCase();
    const mine = (raw.pairs ?? []).filter((p) => p.baseToken?.address?.toLowerCase() === addr && (p.liquidity?.usd ?? 0) > 0);
    const byChain = new Map<string, typeof mine>();
    for (const p of mine) {
      const id = p.chainId ?? "";
      if (!byChain.has(id)) byChain.set(id, []);
      byChain.get(id)!.push(p);
    }
    const out: AddressToken[] = [];
    for (const [chainId, pairs] of byChain) {
      const sorted = [...pairs].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      const best = sorted[0];
      const price = Number(best.priceUsd);
      out.push({
        chain: NANSEN_CHAIN[chainId] ?? chainId,
        symbol: (best.baseToken?.symbol ?? "").toUpperCase(),
        name: best.baseToken?.name ?? "",
        address: best.baseToken?.address ?? address,
        priceUsd: Number.isFinite(price) ? price : 0,
        marketCapUsd: typeof best.marketCap === "number" ? Math.round(best.marketCap) : typeof best.fdv === "number" ? Math.round(best.fdv) : null,
        liquidityUsd: Math.round(best.liquidity?.usd ?? 0),
        volume24hUsd: Math.round(sorted.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0)),
        priceChange24hPct: typeof best.priceChange?.h24 === "number" ? best.priceChange.h24 : null,
        pools: sorted
          .map((p) => ({
            dex: p.dexId ?? "",
            version: p.labels?.[0] ?? null,
            base: p.baseToken?.symbol ?? "",
            quote: p.quoteToken?.symbol ?? "",
            liquidityUsd: Math.round(p.liquidity?.usd ?? 0),
            volume24hUsd: Math.round(p.volume?.h24 ?? 0),
            pairAddress: p.pairAddress ?? "",
            url: p.url ?? "",
          }))
          .slice(0, 3),
        poolCount: sorted.length,
      });
    }
    return out.sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  } catch {
    return [];
  }
}

/* the one chain named, or the deepest */
export async function tokenByAddress(address: string, chain?: string): Promise<AddressToken | null> {
  const list = await tokensByAddress(address);
  return (chain ? list.find((t) => t.chain === chain) : list[0]) ?? null;
}

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

/* chain-native coins, priced from their deepest wrapped pool */
const NATIVE_WRAPPED: Record<string, { chain: string; address: string }> = {
  ETH: { chain: "ethereum", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }, // WETH
  BTC: { chain: "ethereum", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C44" }, // WBTC
  SOL: { chain: "solana", address: "So11111111111111111111111111111111111111112" }, // wSOL
  BNB: { chain: "bsc", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" }, // WBNB
  AVAX: { chain: "avalanche", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7" }, // WAVAX
  HYPE: { chain: "hyperevm", address: "0x5555555555555555555555555555555555555555" }, // WHYPE
};

export async function nativePrice(symbol: string): Promise<{ priceUsd: number; via: string } | null> {
  const w = NATIVE_WRAPPED[symbol.toUpperCase()];
  if (!w) return null;
  try {
    const res = await fetch(`${BASE}/token-pairs/v1/${w.chain}/${w.address}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const raw = (await res.json()) as (RawPair & { priceUsd?: string })[];
    const best = raw.filter((p) => (p.liquidity?.usd ?? 0) > 0).sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const price = best ? Number(best.priceUsd) : NaN;
    if (!Number.isFinite(price) || price <= 0) return null;
    return { priceUsd: price, via: `${best.baseToken?.symbol ?? symbol}/${best.quoteToken?.symbol ?? ""} ${best.dexId ?? ""}`.trim() };
  } catch {
    return null;
  }
}

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
    if (cache.size >= 2000) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), ctx });
    return ctx;
  } catch {
    return { pools: [], poolCount: 0 };
  }
}
