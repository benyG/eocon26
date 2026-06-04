import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { rateLimit, getIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function verifyPassword(hash: string, password: string): boolean {
  const [salt, stored] = hash.split(":");
  const computed = createHash("sha256").update(password + salt).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(stored, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signMfaPending(userId: number): string {
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
    // Token valid for 5 minutes
    if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return null;
    const payload = `${userId}:${timestamp}`;
    const expected = createHmac("sha256", process.env.ADMIN_SECRET || "fallback")
      .update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return parseInt(userId);
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (!rateLimit(`user-login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive || !verifyPassword(user.passwordHash, password)) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  // Check if MFA required (global setting)
  const mfaSetting = await prisma.eventSetting.findUnique({ where: { key: "mfa_required" } });
  const mfaRequired = mfaSetting?.value === "true";

  if (user.mfaEnabled) {
    // MFA enabled — return a pending token, client must verify TOTP
    const mfaPendingToken = signMfaPending(user.id);
    return NextResponse.json({ mfaRequired: true, mfaPendingToken });
  }

  if (mfaRequired && !user.mfaEnabled) {
    // MFA required globally but user hasn't enrolled — force enrollment
    const mfaPendingToken = signMfaPending(user.id);
    return NextResponse.json({ mfaRequired: true, mfaEnrollmentRequired: true, mfaPendingToken });
  }

  // No MFA — create session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = createHmac("sha256", process.env.ADMIN_SECRET || "fallback")
    .update(`${user.id}:${Date.now()}:${Math.random()}`).digest("hex");
  await prisma.adminSession.create({ data: { token: sessionToken, userId: user.id, expiresAt } });

  const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set("admin_user_token", sessionToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
