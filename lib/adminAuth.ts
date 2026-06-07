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

// Token includes a daily nonce so it auto-rotates every 24 h
function dailyNonce(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

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

// Signs a per-user token encoding the userId and bound to the passwordHash so
// it's invalidated on password change.
export function signUserToken(userId: number, passwordHash: string): string {
  const payload = `${userId}:${passwordHash}:${dailyNonce()}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${userId}.${sig}`;
}

export async function getAuthenticatedUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const userId = Number(token.slice(0, dot));
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return userId;
}
