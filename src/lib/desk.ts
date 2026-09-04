"use client";

/* The desk's data, from the browser with the trader's own session (RLS). */

import { supabaseBrowser } from "@/lib/supabase/client";
import { sessionSlug, type Challenge, type Extraction, type QA, type StructureState } from "@/lib/session";
import type { Pin } from "@/lib/pins";

export interface PlaySession {
  thesis: string;
  ticker: string | null;
  qa: QA[];
  extraction: Extraction;
  challenge: Challenge | null;
  structure: StructureState;
}

export interface Play {
  id: string;
  ticker: string | null;
  chain: string | null;
  sector: string | null;
  slug: string;
  session: PlaySession;
  pins?: Pin[];
  booked_at: string;
}

export async function currentUser() {
  const { data } = await supabaseBrowser().auth.getUser();
  return data.user ?? null;
}

export async function sendMagicLink(email: string): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabaseBrowser().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/auth/callback?next=/desk` },
  });
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function signOut() {
  await supabaseBrowser().auth.signOut();
}

/* the desk row for the signed-in trader, created on first use */
async function myDeskId(): Promise<string | null> {
  const sb = supabaseBrowser();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return null;
  const { data: existing } = await sb.from("desks").select("id").eq("user_id", u.user.id).maybeSingle();
  if (existing) return existing.id;
  const { data: made, error } = await sb.from("desks").insert({ user_id: u.user.id }).select("id").single();
  if (error) throw error;
  return made.id;
}

/* a play goes on the book: written once per booked session (idempotent on slug+thesis) */
export async function savePlay(session: PlaySession, meta: { chain?: string | null; sector?: string | null } = {}): Promise<Play | null> {
  const deskId = await myDeskId();
  if (!deskId) return null;
  const sb = supabaseBrowser();
  const slug = session.ticker ? `$${session.ticker}` : sessionSlug(session.thesis);
  const { data: dup } = await sb
    .from("plays")
    .select("id, ticker, chain, sector, slug, session, booked_at")
    .eq("desk_id", deskId)
    .eq("slug", slug)
    .filter("session->>thesis", "eq", session.thesis)
    .maybeSingle();
  if (dup) return dup as Play;
  const { data, error } = await sb
    .from("plays")
    .insert({ desk_id: deskId, ticker: session.ticker, chain: meta.chain ?? null, sector: meta.sector ?? null, slug, session })
    .select("id, ticker, chain, sector, slug, session, booked_at")
    .single();
  if (error) throw error;
  return data as Play;
}

export async function updatePlayPins(id: string, pins: Pin[]): Promise<void> {
  const { error } = await supabaseBrowser().from("plays").update({ pins }).eq("id", id);
  if (error) throw error;
}

export async function listPlays(): Promise<Play[]> {
  const sb = supabaseBrowser();
  const { data, error } = await sb
    .from("plays")
    .select("id, ticker, chain, sector, slug, session, pins, booked_at")
    .order("booked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Play[];
}
