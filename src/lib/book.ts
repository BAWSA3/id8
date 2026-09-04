"use client";

/* The local book: plays kept in this browser. The desk runs on it with no
   account at all; when a store arrives, the local book is adopted into it. */

import { sessionSlug } from "@/lib/session";
import type { Play, PlaySession } from "@/lib/desk";

export const BOOK_KEY = "id8.book.v1";

function read(): Play[] {
  try {
    const raw = localStorage.getItem(BOOK_KEY);
    const list = raw ? (JSON.parse(raw) as Play[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: Play[]) {
  try {
    localStorage.setItem(BOOK_KEY, JSON.stringify(list));
  } catch {}
}

export function listLocalPlays(): Play[] {
  return read().sort((a, b) => (a.booked_at < b.booked_at ? 1 : -1));
}

export function localBookCount(): number {
  return read().length;
}

/* idempotent on slug + thesis, like the store */
export function saveLocalPlay(session: PlaySession, meta: { chain?: string | null; sector?: string | null } = {}): Play {
  const list = read();
  const slug = session.ticker ? `$${session.ticker}` : sessionSlug(session.thesis);
  const dup = list.find((p) => p.slug === slug && p.session.thesis === session.thesis);
  if (dup) return dup;
  const play: Play = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `local-${Date.now()}`,
    ticker: session.ticker,
    chain: meta.chain ?? null,
    sector: meta.sector ?? null,
    slug,
    session,
    booked_at: new Date().toISOString(),
  };
  write([play, ...list]);
  return play;
}

export function removeLocalPlay(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function updateLocalPlay(id: string, patch: Partial<Play>): Play | null {
  const list = read();
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  write(list);
  return list[i];
}
