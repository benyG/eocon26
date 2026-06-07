import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

function getSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s) throw new Error("ADMIN_SECRET env var is required");
  return s;
}

function getPassword(): string {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("ADMIN_PASSWORD env var is required");
  return p;
}

function dailyNonce(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

// ── Legacy shared-password token ──────────────────────────────────────────────

export function signToken(password: string): string {
  const payload = `${password}:${dailyNonce()}`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function isValidToken(token: string): boolean {
  const expected = signToken(getPassword());
  try {
    const a = Buffer.from(token.padEnd(64, "0"), "hex");
    const b = Buffer.from(expected.padEnd(64, "0"), "hex");
    return a.length === b.length && timingSafeEqual(a, b) && token.length === expected.length;
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return false;
  return isValidToken(token);
}

// ── Per-user session token (stored in AdminSession table) ────────────────────
// Cookie format: "${userId}|${sessionToken}|${hmac}"
// HMAC = SHA-256(secret, "${userId}:${sessionToken}") — verifiable without DB

export function signUserSession(userId: number, sessionToken: string): string {
  const sig = createHmac("sha256", getSecret())
    .update(`${userId}:${sessionToken}`)
    .digest("hex");
  return `${userId}|${sessionToken}|${sig}`;
}

export function verifyUserSession(cookie: string): { userId: number; sessionToken: string } | null {
  const parts = cookie.split("|");
  if (parts.length !== 3) return null;
  const [userIdStr, sessionToken, sig] = parts;
  const userId = Number(userIdStr);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  const expected = createHmac("sha256", getSecret())
    .update(`${userId}:${sessionToken}`)
    .digest("hex");
  try {
    const a = Buffer.from(sig.padEnd(64, "0"), "hex");
    const b = Buffer.from(expected.padEnd(64, "0"), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b) || sig.length !== expected.length) return null;
    return { userId, sessionToken };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("admin_user_token")?.value;
  if (!cookie) return null;
  return verifyUserSession(cookie)?.userId ?? null;
}

// Legacy signUserToken kept for backward-compat (used by mfa/verify route)
export function signUserToken(userId: number, passwordHash: string): string {
  const payload = `${userId}:${passwordHash}:${dailyNonce()}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${userId}.${sig}`;
}
