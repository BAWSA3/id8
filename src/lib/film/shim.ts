/* The film's tape: a frozen capture of a real session (src/lib/film/sol-take.json)
   served from a fetch shim so the take is identical every time and costs nothing.
   Nothing here is invented: every line came off the live routes on capture day. */

import type { Challenge, ChallengeProgress, Extraction, QA } from "@/lib/session";
import type { WatchRead } from "@/lib/watch";

export interface Take {
  capturedAt: string;
  thesis: string;
  ticker: string;
  /* the vehicle by chain + address when the take was named by contract */
  vehicle?: { chain: string; address: string };
  tickerCheck: unknown;
  qa: QA[];
  extraction: Extraction;
  tape: ChallengeProgress[];
  challenge: Challenge;
  /* the desk's watch read for this play, captured live */
  watch?: WatchRead;
  /* why the trader holds the first contested line at the ruling */
  holdReason?: string;
}

/* how long each shimmed call takes to answer, in ms */
export const SHIM_MS = {
  ticker: 600,
  question: 320,
  extract: 650,
  watch: 600,
  tape: [300, 480, 360, 900] as const, // planned, gathered, reading, done
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

    if (path === "/api/watch" && take.watch) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { playId?: string };
      return json({ read: { ...take.watch, playId: body.playId ?? take.watch.playId, readAt: new Date().toISOString() }, cached: false }, SHIM_MS.watch);
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
