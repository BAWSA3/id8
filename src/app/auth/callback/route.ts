import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/* The magic link lands here. Exchange the code for a session, then to the desk. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/desk";
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/desk?link=stale", url.origin));
}
