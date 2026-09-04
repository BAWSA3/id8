import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimited } from "@/lib/rate-limit";
import { canonicalStatusUrl } from "@/lib/pins";

/* Pin an X post: resolve it through X's public oEmbed (no key, no auth),
   hand back the markup plus the plain text. Only status URLs are accepted;
   the markup is X's own blockquote, rendered client-side by widgets.js. */

const Body = z.object({ url: z.string().min(10).max(400) });

const strip = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&mdash;/g, ", ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited("pin", ip, { maxPerWindow: 20, dailyCap: 2000 })) {
    return NextResponse.json({ error: "rate_limited", message: "The wall needs a breather. Try again in a minute." }, { status: 429 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "Malformed request." }, { status: 400 });
  }
  const url = canonicalStatusUrl(body.url);
  if (!url) return NextResponse.json({ error: "not_a_post", message: "That is not a link to a post on X." }, { status: 400 });

  try {
    const res = await fetch(
      `https://publish.x.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&theme=dark&dnt=true&hide_thread=true`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return NextResponse.json({ error: "not_found", message: "X did not hand that post over. It may be private or gone." }, { status: 404 });
    const o = (await res.json()) as { url?: string; author_name?: string; author_url?: string; html?: string };
    const html = (o.html ?? "").slice(0, 8000);
    const handleMatch = /\(@([A-Za-z0-9_]{1,15})\)/.exec(html);
    const dateMatch = /ref_src=twsrc%5Etfw"[^>]*>([^<]+)<\/a>/.exec(html);
    const bodyMatch = /<p[^>]*>([\s\S]*?)<\/p>/.exec(html);
    return NextResponse.json({
      pin: {
        url: o.url ?? url,
        author: (o.author_name ?? "").slice(0, 80),
        handle: handleMatch ? `@${handleMatch[1]}` : "",
        authorUrl: o.author_url ?? "",
        text: strip(bodyMatch ? bodyMatch[1] : html).slice(0, 1200),
        html,
        postedAt: dateMatch ? dateMatch[1] : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "tape_error", message: "X hiccupped. Try again." }, { status: 503 });
  }
}
