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

// Super-admin token (based on ADMIN_PASSWORD env var)
export function signToken(password: string): string {
  const payload = `super:${password}:${dailyNonce()}`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// DB-user token (based on userId + password hash)
export function signUserToken(userId: number, passwordHash: string): string {
  const payload = `user:${userId}:${passwordHash}:${dailyNonce()}`;
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function getExpectedSuperToken(): string {
  return signToken(getPassword());
}

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a.padEnd(64, "0").slice(0, 64), "hex");
    const bufB = Buffer.from(b.padEnd(64, "0").slice(0, 64), "hex");
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB) && a === b;
  } catch {
    return false;
  }
}

export function isValidToken(token: string): boolean {
  return safeCompare(token, getExpectedSuperToken());
}

// Verify a user token against stored hash (called from isAdminAuthenticated)
export async function isValidUserToken(token: string): Promise<boolean> {
  // We need prisma here — dynamic import to avoid circular deps
  const { prisma } = await import("@/lib/db");
  const users = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, passwordHash: true },
  });
  for (const user of users) {
    const expected = signUserToken(user.id, user.passwordHash);
    if (safeCompare(token, expected)) return true;
  }
  return false;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return false;
  // Check super-admin token first (fast, no DB)
  if (isValidToken(token)) return true;
  // Check DB user token
  return isValidUserToken(token);
}

// Returns the authenticated user's id (null = super-admin or unauthenticated)
export async function getAuthenticatedUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  if (isValidToken(token)) return null; // super-admin
  const { prisma } = await import("@/lib/db");
  const users = await prisma.adminUser.findMany({
    where: { isActive: true },
    select: { id: true, passwordHash: true },
  });
  for (const user of users) {
    const expected = signUserToken(user.id, user.passwordHash);
    if (safeCompare(token, expected)) return user.id;
  }
  return null;
}
