import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  ClarifierRefusal,
  MAX_QUESTIONS,
  extract,
  nextQuestion,
} from "@/lib/agents/clarifier";
import { rateLimited } from "@/lib/rate-limit";

/* Security posture (anonymous-by-design demo — no auth, no DB):
   - input validation: zod + hard length/turn caps
   - injection: user content wrapped as untrusted in the agent layer
   - output validation: zod-parsed structured output, bounded server-side
   - cost abuse: shared per-IP token bucket + global daily ceiling + small max_tokens */

const BodySchema = z.object({
  op: z.enum(["question", "extract"]),
  thesis: z.string().min(10).max(2000),
  qa: z
    .array(z.object({ q: z.string().min(1).max(500), a: z.string().min(1).max(1500) }))
    .max(MAX_QUESTIONS + 1),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited("clarify", ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "The clarifier needs a breather. Try again in a minute." },
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
    if (body.op === "question") {
      const result = await nextQuestion(body.thesis, body.qa);
      return NextResponse.json(result);
    }
    const extraction = await extract(body.thesis, body.qa);
    return NextResponse.json({ extraction });
  } catch (err) {
    if (err instanceof ClarifierRefusal) {
      return NextResponse.json(
        {
          error: "refused",
          message: "The clarifier declined to engage with this idea. Try rephrasing it.",
        },
        { status: 200 }
      );
    }
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError) {
      return NextResponse.json(
        { error: "upstream_busy", message: "The clarifier is overloaded. Try again shortly." },
        { status: 503 }
      );
    }
    console.error("clarify route error:", err);
    return NextResponse.json(
      { error: "clarifier_error", message: "The clarifier hit a snag. Try again." },
      { status: 500 }
    );
  }
}
