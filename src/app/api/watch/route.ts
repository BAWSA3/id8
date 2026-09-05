import { NextResponse } from "next/server";
import { z } from "zod";
import { getNansenAdapter, NANSEN_SECTORS, type TokenMarket } from "@/lib/nansen/adapter";
import { pairContext } from "@/lib/dexscreener";
import { nativePrice } from "@/lib/dexscreener";
import { rateLimited } from "@/lib/rate-limit";
import { parseClause, splitClauses, type SectorRead, type TokenRead, type WatchCheck, type WatchRead, type WatchStatus } from "@/lib/watch";

/* The watch: read the tape for a play and check its invalidation. Nansen
   only, no model in the loop. Cached an hour per play on this instance. */

const Body = z.object({
  playId: z.string().min(1).max(80),
  ticker: z.string().regex(/^[A-Za-z0-9$._-]{1,15}$/).nullable(),
  sector: z.string().max(60).nullable(),
  invalidation: z.string().max(400),
});

const cache = new Map<string, { at: number; read: WatchRead }>();
const TTL_MS = 60 * 60 * 1000;
const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;

function worst(checks: WatchCheck[]): WatchStatus {
  if (checks.some((c) => c.status === "breached")) return "breached";
  if (checks.some((c) => c.status === "holding")) return "holding";
  return "unwatched";
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited("watch", ip, { maxPerWindow: 30, dailyCap: 3000 })) {
    return NextResponse.json({ error: "rate_limited", message: "The tape needs a breather. Try again in a minute." }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "Malformed request." }, { status: 400 });
  }
  const key = `${body.playId}|${body.ticker ?? ""}|${body.sector ?? ""}|${body.invalidation}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ read: hit.read, cached: true });

  const adapter = getNansenAdapter();
  const symbol = body.ticker?.replace(/^\$/, "").toUpperCase() ?? null;
  const resolved = new Map<string, TokenMarket | null>();
  /* a level for a chain-native coin (ETH, SOL, BTC) is read from its wrapped
     pool on Dexscreener, never from the spot screener where copycats live */
  const NATIVE = new Set(["ETH", "SOL", "BTC", "BNB", "AVAX", "HYPE"]);
  const levelOf = async (sym: string): Promise<{ symbol: string; priceUsd: number; via: string } | null> => {
    if (NATIVE.has(sym)) {
      const n = await nativePrice(sym);
      return n ? { symbol: sym, priceUsd: n.priceUsd, via: n.via } : null;
    }
    const t = await resolve(sym);
    return t ? { symbol: t.symbol, priceUsd: t.priceUsd, via: `${t.chain} spot` } : null;
  };
  const resolve = async (sym: string) => {
    if (!resolved.has(sym)) {
      try {
        resolved.set(sym, await adapter.resolveToken(sym));
      } catch {
        resolved.set(sym, null);
      }
    }
    return resolved.get(sym) ?? null;
  };

  /* the vehicle, live */
  let token: TokenRead | null = null;
  if (symbol) {
    const t = await resolve(symbol);
    if (t) {
      const [flows, pool] = await Promise.all([
        adapter.tokenSegmentFlows(t).catch(() => null),
        adapter.isMock ? Promise.resolve({ pools: [], poolCount: 0 }) : pairContext(t.chain, t.address, 1),
      ]);
      const p = pool.pools[0];
      token = {
        symbol: t.symbol,
        chain: t.chain,
        priceUsd: t.priceUsd,
        priceChangePct: t.priceChangePct,
        marketCapUsd: t.marketCapUsd,
        liquidityUsd: t.liquidityUsd,
        volumeUsd7d: t.volumeUsd7d,
        netflowUsd7d: t.netflowUsd7d,
        flows: flows
          ? {
              smartTraderNetFlowUsd: flows.smartTraderNetFlowUsd,
              smartTraderWalletCount: flows.smartTraderWalletCount,
              whaleNetFlowUsd: flows.whaleNetFlowUsd,
              topPnlNetFlowUsd: flows.topPnlNetFlowUsd,
              publicFigureNetFlowUsd: flows.publicFigureNetFlowUsd,
              freshWalletsNetFlowUsd: flows.freshWalletsNetFlowUsd,
              exchangeNetFlowUsd: flows.exchangeNetFlowUsd,
            }
          : null,
        pool: p ? { pair: `${p.base}/${p.quote}`, dex: p.dex, version: p.version, liquidityUsd: p.liquidityUsd, volume24hUsd: p.volume24hUsd } : null,
      };
    }
  }

  /* the sector, live (narrative plays, or a sector the invalidation names) */
  const clauses = splitClauses(body.invalidation).map((c) => parseClause(c, NANSEN_SECTORS));
  const sectorName = body.sector ?? clauses.find((c) => c.sector)?.sector ?? null;
  let sector: SectorRead | null = null;
  if (sectorName) {
    try {
      const [acc, dist] = await Promise.all([
        adapter.smartMoneyNetflows({ sectors: [sectorName], direction: "accumulating", limit: 5 }),
        adapter.smartMoneyNetflows({ sectors: [sectorName], direction: "distributing", limit: 5 }),
      ]);
      const rows = [...acc, ...dist];
      const seen = new Set<string>();
      let sum = 0;
      for (const r of rows) {
        const k = `${r.tokenSymbol}|${r.chain}`;
        if (seen.has(k)) continue;
        seen.add(k);
        sum += r.netflow7dUsd;
      }
      sector = {
        sector: sectorName,
        accumulating: acc.map((r) => ({ symbol: r.tokenSymbol, chain: r.chain, netflow7dUsd: r.netflow7dUsd })),
        distributing: dist.map((r) => ({ symbol: r.tokenSymbol, chain: r.chain, netflow7dUsd: r.netflow7dUsd })),
        netflow7dUsd: Math.round(sum),
      };
    } catch {
      sector = null;
    }
  }

  /* the checks */
  const checks: WatchCheck[] = [];
  for (const c of clauses) {
    if (c.kind === "netflow") {
      /* a sector named in the clause wins; a narrative play's own sector is the fallback when there is no vehicle */
      if ((c.sector && sector) || (!token && sector)) {
        const neg = sector.netflow7dUsd < 0;
        const hit = c.direction === "negative" ? neg : !neg;
        checks.push({ clause: c.text, kind: "netflow", status: hit ? "breached" : "holding", figure: usd(sector.netflow7dUsd), detail: `${sector.sector} smart money 7d netflow reads ${usd(sector.netflow7dUsd)} across the names on the tape.` });
      } else if (token?.flows) {
        const v = token.flows.smartTraderNetFlowUsd;
        const neg = v < 0;
        const hit = c.direction === "negative" ? neg : !neg;
        checks.push({ clause: c.text, kind: "netflow", status: hit ? "breached" : "holding", figure: usd(v), detail: `${token.symbol} smart trader 7d netflow reads ${usd(v)} across ${token.flows.smartTraderWalletCount} wallets.` });
      } else {
        checks.push({ clause: c.text, kind: "unobservable", status: "unwatched", figure: null, detail: "no cohort flow on the tape for this clause." });
      }
    } else if (c.kind === "volume") {
      const t = c.symbol && c.symbol !== symbol ? await resolve(c.symbol) : null;
      const read = t ?? (token ? { volumeUsd7d: token.volumeUsd7d, symbol: token.symbol } : null);
      if (!read || c.threshold === undefined) {
        checks.push({ clause: c.text, kind: "unobservable", status: "unwatched", figure: null, detail: "no volume figure on the tape for this clause." });
        continue;
      }
      const v = c.window === "24h" && token?.pool && !t ? token.pool.volume24hUsd : read.volumeUsd7d / (c.window === "24h" ? 7 : 1);
      const hit = c.comparator === "under" ? v < c.threshold : v > c.threshold;
      checks.push({ clause: c.text, kind: "volume", status: hit ? "breached" : "holding", figure: usd(v), detail: `${read.symbol} ${c.window} volume reads ${usd(v)}${c.window === "24h" && !(token?.pool && !t) ? " (7d averaged)" : ""} against ${usd(c.threshold)}.` });
    } else if (c.kind === "price") {
      const sym = c.symbol && c.symbol !== symbol ? c.symbol : symbol;
      const lv = sym ? await levelOf(sym) : null;
      if (!lv || c.threshold === undefined) {
        checks.push({ clause: c.text, kind: "unobservable", status: "unwatched", figure: null, detail: sym ? `${sym} is not on the tape. this level stays your call.` : "no level on the tape for this clause." });
        continue;
      }
      const hit = c.comparator === "under" ? lv.priceUsd < c.threshold : lv.priceUsd > c.threshold;
      const p = `$${lv.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 4 })}`;
      checks.push({ clause: c.text, kind: "price", status: hit ? "breached" : "holding", figure: p, detail: `${lv.symbol} reads ${p} (${lv.via}) against ${usd(c.threshold)}.` });
    } else {
      checks.push({ clause: c.text, kind: "unobservable", status: "unwatched", figure: null, detail: "not on the tape. this one stays your call." });
    }
  }

  const read: WatchRead = { playId: body.playId, readAt: new Date().toISOString(), live: !adapter.isMock, token, sector, status: worst(checks), checks };
  cache.set(key, { at: Date.now(), read });
  return NextResponse.json({ read, cached: false });
}
