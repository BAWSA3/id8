/* The wall: X posts pinned to a play. Client-safe types and the agent-context
   serializer. Fetching goes through /api/pin (X's public oEmbed, no key). */

export interface Pin {
  id: string;
  url: string; // canonical x.com status url
  author: string; // display name
  handle: string; // @handle
  authorUrl: string;
  text: string; // the post's text, plain
  html: string; // X's blockquote markup, rendered by widgets.js
  postedAt: string | null; // from the embed, e.g. "March 21, 2006"
  pinnedAt: string; // ISO
}

/* accepted: https://x.com/<handle>/status/<id> (twitter.com too), with or without extras */
export const X_STATUS_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{1,25})(?:[/?#].*)?$/;

export function canonicalStatusUrl(input: string): string | null {
  const m = X_STATUS_RE.exec(input.trim());
  return m ? `https://x.com/${m[1]}/status/${m[2]}` : null;
}

/* what the agents see: untrusted quotes, never instructions */
export function pinsAsContext(pins: Pin[]): string {
  if (!pins.length) return "";
  const lines = pins.slice(0, 12).map((p, i) => `${i + 1}. ${p.handle}${p.postedAt ? ` (${p.postedAt})` : ""}: ${p.text.replace(/\s+/g, " ").slice(0, 400)}`);
  return `<timeline>\n${lines.join("\n")}\n</timeline>`;
}
