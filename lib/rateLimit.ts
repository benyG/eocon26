interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  // Lazy sweep: drop expired windows so the map can't grow unbounded over the
  // container's lifetime (one entry per unique IP×route otherwise stays forever).
  if (store.size > 5000) {
    store.forEach((v, k) => { if (now > v.resetAt) store.delete(k); });
  }
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= max) return false; // blocked
  entry.count++;
  return true;
}

export function getIp(req: { headers: { get(h: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Pluggable async limiter: uses Upstash Redis (REST) when configured so the
// quota is shared across instances; otherwise falls back to the in-memory
// limiter above. Returns true when the request is allowed.
export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimit(key, max, windowMs);

  try {
    const seconds = Math.max(1, Math.ceil(windowMs / 1000));
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["EXPIRE", `rl:${key}`, seconds, "NX"],
      ]),
      // Never let the limiter hang a request.
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return rateLimit(key, max, windowMs);
    const data = await res.json();
    const count = Number(Array.isArray(data) ? data[0]?.result : (data as { result?: unknown })?.result);
    if (!Number.isFinite(count)) return rateLimit(key, max, windowMs);
    return count <= max;
  } catch {
    // On any Redis/network error, degrade gracefully to in-memory.
    return rateLimit(key, max, windowMs);
  }
}

