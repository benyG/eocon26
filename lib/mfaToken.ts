import { createHmac, timingSafeEqual } from "crypto";

export function signMfaPending(userId: number): string {
  const payload = `${userId}:${Date.now()}`;
  const sig = createHmac("sha256", process.env.ADMIN_SECRET || "fallback")
    .update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifyMfaPending(token: string): number | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [userId, timestamp, sig] = parts;
    if (Date.now() - parseInt(timestamp) > 10 * 60 * 1000) return null;
    const payload = `${userId}:${timestamp}`;
    const expected = createHmac("sha256", process.env.ADMIN_SECRET || "fallback")
      .update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return parseInt(userId);
  } catch { return null; }
}
