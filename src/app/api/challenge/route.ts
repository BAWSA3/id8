import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { AnalystRefusal, runChallenge } from "@/lib/agents/analyst";
import { rateLimited } from "@/lib/rate-limit";

/* Same security posture as /api/clarify: zod-validated + capped inputs,
   untrusted-wrapping in the agent layer, bounded structured output,
   per-IP + global daily rate limits. Anonymous by design (no auth/DB yet). */

const BodySchema = z.object({
  thesis: z.string().min(10).max(2000),
  ticker: z
    .string()
    .regex(/^[A-Za-z0-9$._-]{1,15}$/)
    .optional(),
  extraction: z.object({
    claim: z.string().min(1).max(600),
    audience: z.string().max(300),
    assumptions: z
      .array(z.object({ text: z.string().min(1).max(300), basis: z.string().max(160) }))
      .min(1)
      .max(5),
    openQuestions: z.array(z.string().max(300)).max(3),
    invalidation: z.string().max(300).optional(),
  }),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited("challenge", ip, { maxPerWindow: 6, dailyCap: 300 })) {
    return NextResponse.json(
      { error: "rate_limited", message: "The analyst needs a breather. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "invalid_request", message: "Malformed request." },
      { status: 400 }
    );
  }

  try {
    const extraction = { ...body.extraction, invalidation: body.extraction.invalidation ?? "unstated" };
    const challenge = await runChallenge(body.thesis, extraction, body.ticker);
    return NextResponse.json({ challenge });
  } catch (err) {
    if (err instanceof AnalystRefusal) {
      return NextResponse.json(
        { error: "refused", message: "The analyst declined to engage with this idea." },
        { status: 200 }
      );
    }
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return NextResponse.json(
        { error: "upstream_busy", message: "The analyst is overloaded. Try again shortly." },
        { status: 503 }
      );
    }
    console.error("challenge route error:", err);
    return NextResponse.json(
      { error: "analyst_error", message: "The analyst hit a snag. Try again." },
      { status: 500 }
    );
  }
}
