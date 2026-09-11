import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimited, sameOrigin } from "@/lib/rate-limit";

/* The record: an email left at the book, for the day accounts land.
   Server-side insert through PostgREST with the public key; the table is
   insert-only under RLS, so the key can add a row and never read one.
   Unwired (no env) means the line simply never shows. */

const url = () => process.env.LEADS_SUPABASE_URL?.replace(/\/+$/, "");
const key = () => process.env.LEADS_SUPABASE_KEY;
const wired = () => Boolean(url() && key());

export async function GET() {
  return NextResponse.json({ wired: wired() }, { headers: { "Cache-Control": "no-store" } });
}

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  source: z.enum(["commit", "desk"]).default("desk"),
  ticker: z.string().regex(/^[A-Za-z0-9$._-]{1,15}$/).optional(),
});

export async function POST(req: Request) {
  if (!wired()) return NextResponse.json({ error: "unwired", message: "The record is not open yet." }, { status: 503 });
  const ip = clientIp(req);
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden", message: "Wrong door." }, { status: 403 });
  if (rateLimited("lead", ip, { maxPerWindow: 5, dailyCap: 3000 })) {
    return NextResponse.json({ error: "rate_limited", message: "Give it a minute." }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "That does not read as an email." }, { status: 400 });
  }
  const res = await fetch(`${url()}/rest/v1/id8_leads`, {
    method: "POST",
    headers: {
      apikey: key()!,
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ email: body.email, source: body.source, ticker: body.ticker ?? null }),
  }).catch(() => null);
  /* 409 = already on the list, which is the same outcome for the trader */
  if (res && (res.ok || res.status === 409)) return NextResponse.json({ ok: true });
  console.error("lead insert failed:", res?.status ?? "no response");
  return NextResponse.json({ error: "store_error", message: "That did not take. Try again in a moment." }, { status: 502 });
}
