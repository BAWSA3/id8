import { NextResponse } from "next/server";
import { z } from "zod";
import { ADDRESS_RE, getNansenAdapter } from "@/lib/nansen/adapter";
import { NANSEN_CHAINS } from "@/lib/chains";
import { clientIp, rateLimited, sameOrigin } from "@/lib/rate-limit";
import { pairContext, tokensByAddress } from "@/lib/dexscreener";
import type { TickerCandidate } from "@/lib/session";

/* Ticker resolve for the desk's opening window ("what are we looking at?").
   A symbol is a search: every token on the tape under that name comes back, and
   more than one means the window asks which. A contract address names the coin
   exactly. Security posture: zod + strict charsets, per-IP + daily rate limits,
   response carries only public market data, key stays server-side. No LLM. */

const BodySchema = z
  .object({
    symbol: z.string().min(1).max(15).regex(/^[A-Za-z0-9$._-]+$/).optional(),
    address: z.string().regex(ADDRESS_RE).optional(),
    chain: z.enum(NANSEN_CHAINS).optional(),
  })
  .strict()
  .refine((b) => Boolean(b.symbol || b.address), { message: "symbol or address" });

const MAX_CANDIDATES = 8;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden", message: "Wrong door." }, { status: 403 });
  if (rateLimited("ticker", ip, { maxPerWindow: 12, dailyCap: 5000 })) {
    return NextResponse.json(
      { error: "rate_limited", message: "The tape needs a breather. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "Malformed request." }, { status: 400 });
  }

  const symbol = (body.symbol ?? "").replace(/^\$/, "").toUpperCase();
  try {
    const adapter = getNansenAdapter();
    let candidates: TickerCandidate[];
    if (body.address) {
      const list = (await tokensByAddress(body.address)).filter((t) => !body.chain || t.chain === body.chain);
      candidates = list.map((t) => ({
        symbol: t.symbol,
        chain: t.chain,
        address: t.address,
        marketCapUsd: t.marketCapUsd,
        liquidityUsd: t.liquidityUsd,
        volumeUsd7d: null,
        tokenAgeDays: null,
      }));
    } else {
      const list = await adapter.resolveCandidates(symbol, body.chain);
      candidates = list.map((t) => ({
        symbol: t.symbol,
        chain: t.chain,
        address: t.address,
        marketCapUsd: t.marketCapUsd,
        liquidityUsd: t.liquidityUsd,
        volumeUsd7d: t.volumeUsd7d,
        tokenAgeDays: t.tokenAgeDays,
      }));
    }
    candidates = candidates.slice(0, MAX_CANDIDATES);
    const live = !adapter.isMock;

    if (candidates.length === 0) return NextResponse.json({ found: false, symbol: symbol || body.address, chain: body.chain ?? null });
    if (candidates.length > 1) return NextResponse.json({ found: false, ambiguous: true, symbol: symbol || candidates[0].symbol, live, candidates });

    const top = candidates[0];
    /* one token: acknowledge it with where it trades */
    const pairs = adapter.isMock || !top.address ? { pools: [], poolCount: 0 } : await pairContext(top.chain, top.address);
    return NextResponse.json({
      found: true,
      symbol: top.symbol,
      chain: top.chain,
      address: top.address,
      byAddress: Boolean(body.address),
      marketCapUsd: top.marketCapUsd,
      live,
      pools: pairs.pools,
      poolCount: pairs.poolCount,
      candidates,
    });
  } catch {
    return NextResponse.json(
      { error: "tape_error", message: "The tape hiccupped. Try again." },
      { status: 503 }
    );
  }
}
