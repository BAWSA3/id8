import { NextResponse } from "next/server";
import { z } from "zod";
import { getNansenAdapter } from "@/lib/nansen/adapter";
import { rateLimited } from "@/lib/rate-limit";
import { pairContext } from "@/lib/dexscreener";

/* Ticker resolve for the desk's opening window ("what are we looking at?").
   Security posture: zod + strict ticker charset, per-IP + daily rate limits,
   response carries only public market data, key stays server-side.
   Cheap by design — screener fan-out + one Dexscreener pair lookup, no LLM. */

const BodySchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(15)
    .regex(/^[A-Za-z0-9$._-]+$/),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited("ticker", ip, { maxPerWindow: 12, dailyCap: 1500 })) {
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

  const symbol = body.symbol.replace(/^\$/, "").toUpperCase();
  try {
    const adapter = getNansenAdapter();
    const token = await adapter.resolveToken(symbol);
    if (!token) return NextResponse.json({ found: false, symbol });
    /* where it trades — best-effort, never blocks the acknowledgment */
    const pairs = adapter.isMock ? { pools: [], poolCount: 0 } : await pairContext(token.chain, token.address);
    return NextResponse.json({
      found: true,
      symbol: token.symbol,
      chain: token.chain,
      marketCapUsd: token.marketCapUsd,
      live: !adapter.isMock,
      pools: pairs.pools,
      poolCount: pairs.poolCount,
    });
  } catch {
    return NextResponse.json(
      { error: "tape_error", message: "The tape hiccupped. Try again." },
      { status: 503 }
    );
  }
}
