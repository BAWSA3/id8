import "server-only";

/* Best-effort in-memory limits (per warm instance). Durable limits come
   with Supabase; the Anthropic workspace spend cap is the hard backstop. */

interface Bucket {
  count: number;
  reset: number;
}

const scopes = new Map<string, { ips: Map<string, Bucket>; daily: Bucket }>();

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

  if (now > s.daily.reset) {
    s.daily = { count: 0, reset: now + 86_400_000 };
  }
  if (++s.daily.count > dailyCap) return true;

  const entry = s.ips.get(ip);
  if (!entry || now > entry.reset) {
    if (s.ips.size > 5000) s.ips.clear();
    s.ips.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxPerWindow;
}
