/* The film's tape: a frozen capture of a real session (src/lib/film/sol-take.json)
   served from a fetch shim so the take is identical every time and costs nothing.
   Nothing here is invented: every line came off the live routes on capture day. */

import type { Challenge, ChallengeProgress, Extraction, QA } from "@/lib/session";

export interface Take {
  capturedAt: string;
  thesis: string;
  ticker: string;
  tickerCheck: unknown;
  qa: QA[];
  extraction: Extraction;
  tape: ChallengeProgress[];
  challenge: Challenge;
}

/* how long each shimmed call takes to answer, in ms */
export const SHIM_MS = {
  ticker: 650,
  question: 420,
  extract: 900,
  tape: [320, 520, 380, 1250] as const, // planned, gathered, reading, done
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const json = async (data: unknown, ms: number): Promise<Response> => {
  await sleep(ms);
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
};

export function installFilmFetch(take: Take): () => void {
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];

    if (path === "/api/ticker") return json(take.tickerCheck, SHIM_MS.ticker);

    if (path === "/api/clarify") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { op: "question" | "extract"; qa: QA[] };
      if (body.op === "question") {
        const i = body.qa.length;
        return i >= take.qa.length
          ? json({ done: true }, SHIM_MS.question)
          : json({ done: false, question: take.qa[i].q }, SHIM_MS.question);
      }
      return json({ extraction: take.extraction }, SHIM_MS.extract);
    }

    if (path === "/api/challenge") {
      const enc = new TextEncoder();
      const events: unknown[] = [...take.tape, { stage: "done", challenge: take.challenge }];
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (let i = 0; i < events.length; i++) {
            await sleep(SHIM_MS.tape[Math.min(i, SHIM_MS.tape.length - 1)]);
            controller.enqueue(enc.encode(JSON.stringify(events[i]) + "\n"));
          }
          controller.close();
        },
      });
      return new Response(stream, { status: 200, headers: { "Content-Type": "application/x-ndjson" } });
    }

    return real(input, init);
  };
  return () => {
    window.fetch = real;
  };
}
