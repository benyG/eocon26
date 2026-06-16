import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { signMfaPending } from "@/lib/mfaToken";
import { signUserSession } from "@/lib/adminAuth";
import { verifyPassword, needsRehash, hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

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

  // Transparently upgrade legacy (sha256) hashes to scrypt on successful login.
  if (needsRehash(user.passwordHash)) {
    await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } }).catch(() => {});
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
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.adminSession.create({ data: { token: sessionToken, userId: user.id, expiresAt } });

  const cookieValue = signUserSession(user.id, sessionToken);
  const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set("admin_user_token", cookieValue, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
