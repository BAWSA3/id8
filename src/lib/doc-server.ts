import "server-only";

/* Decode a share link's doc on the server (zlib inflateRaw ↔ browser deflate-raw). */

import { inflateRawSync } from "node:zlib";
import type { Doc } from "./doc";

const MAX_ENCODED = 12_000; // a doc is ~1–3 KB encoded; anything larger isn't ours

export function decodeDoc(d: string | undefined): Doc | null {
  if (!d || d.length > MAX_ENCODED || !/^[A-Za-z0-9_-]+$/.test(d)) return null;
  try {
    const b64 = d.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Buffer.from(b64 + "=".repeat((4 - (b64.length % 4)) % 4), "base64");
    const json = inflateRawSync(bytes, { maxOutputLength: 64_000 }).toString("utf8");
    const doc = JSON.parse(json) as Doc;
    if (doc?.v !== 1 || typeof doc.claim !== "string" || !Array.isArray(doc.lines)) return null;
    return doc;
  } catch {
    return null;
  }
}
