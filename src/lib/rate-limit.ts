import "server-only";

/* Best-effort in-memory limits (per warm instance). Durable limits come
   with Supabase; the Anthropic workspace spend cap is the hard backstop. */

interface Bucket {
  count: number;
  reset: number;
}

const scopes = new Map<string, { ips: Map<string, Bucket>; daily: Bucket }>();
const MAX_IPS = 5000;

/* The client's address as the platform reports it. Vercel sets x-real-ip and
   x-vercel-forwarded-for itself; x-forwarded-for is the fallback. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-real-ip")?.trim() ||
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/* A browser's cross-site POST carries an Origin; the desk's own calls carry its own.
   No Origin (curl, server to server) passes; a foreign Origin does not. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return true;
  try {
    return new URL(origin).host === host.split(",")[0].trim();
  } catch {
    return false;
  }
}

export function rateLimited(
  scope: string,
  ip: string,
  { windowMs = 60_000, maxPerWindow = 10, dailyCap = 500 } = {}
): boolean {
  const now = Date.now();
  let s = scopes.get(scope);
  if (!s) {
    s = { ips: new Map(), daily: { count: 0, reset: now + 86_400_000 } };
    scopes.set(scope, s);
  }
  if (now > s.daily.reset) s.daily = { count: 0, reset: now + 86_400_000 };

  /* the per-address window first: a rejected request never counts against everyone */
  const entry = s.ips.get(ip);
  if (!entry || now > entry.reset) {
    if (s.ips.size >= MAX_IPS) {
      for (const [k, b] of s.ips) if (now > b.reset) s.ips.delete(k);
      /* still full of live windows: drop the oldest few, never the whole map */
      let drop = Math.max(0, s.ips.size - MAX_IPS + 100);
      for (const k of s.ips.keys()) {
        if (drop-- <= 0) break;
        s.ips.delete(k);
      }
    }
    s.ips.set(ip, { count: 1, reset: now + windowMs });
  } else {
    entry.count += 1;
    if (entry.count > maxPerWindow) return true;
  }

  /* only admitted requests spend the day's budget */
  return ++s.daily.count > dailyCap;
}
