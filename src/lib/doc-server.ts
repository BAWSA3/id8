import "server-only";

/* Decode a share link's doc on the server (zlib inflateRaw ↔ browser deflate-raw). */

import { inflateRawSync } from "node:zlib";
import { z } from "zod";
import type { Doc } from "./doc";

const MAX_ENCODED = 12_000; // a doc is ~1–3 KB encoded; anything larger isn't ours

/* the doc's shape, so a crafted link renders the empty page instead of a crash.
   caps are loose on purpose: every real doc fits with room, nothing else does. */
const S = (n: number) => z.string().max(n);
const Receipt = z.object({
  verdict: z.enum(["supports", "contradicts", "inconclusive"]),
  source: S(400),
  rows: z.array(z.object({ k: S(120), v: S(120), dir: z.enum(["neg", "pos", "neutral"]) })).max(12),
  note: S(1200),
});
const Line = z.object({
  n: z.number().int().min(0).max(99),
  text: S(2000),
  status: z.enum(["held", "held-supported", "held-against", "revised", "cut"]),
  before: S(2000).optional(),
  reason: S(2000).optional(),
  receipts: z.array(Receipt).max(12),
});
const DocSchema = z.object({
  v: z.literal(1),
  at: S(64),
  ticker: S(20).nullable(),
  claim: S(4000),
  claimBefore: S(4000).optional(),
  narrative: S(4000),
  lines: z.array(Line).max(24),
  questions: z.array(z.object({ q: S(2000), a: S(4000).nullable() })).max(24),
  invalidation: S(4000),
  analyst: S(2000).nullable(),
  skeptic: S(2000).nullable(),
  live: z.boolean(),
});

export function decodeDoc(d: string | undefined): Doc | null {
  if (!d || d.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(d)) return null;
  try {
    const b64 = d.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Buffer.from(b64 + "=".repeat((4 - (b64.length % 4)) % 4), "base64");
    const json = inflateRawSync(bytes, { maxOutputLength: 64_000 }).toString("utf8");
    const parsed = DocSchema.safeParse(JSON.parse(json));
    return parsed.success ? (parsed.data as Doc) : null;
  } catch {
    return null;
  }
}
