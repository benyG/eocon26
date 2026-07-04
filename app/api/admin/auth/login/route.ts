import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { signMfaPending } from "@/lib/mfaToken";
import { signUserSession } from "@/lib/adminAuth";
import { verifyPassword, needsRehash, hashPassword } from "@/lib/password";
import { isUserLocked, registerUserFailure, clearUserFailures } from "@/lib/loginSecurity";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (!(await checkRateLimit(`user-login:${ip}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { email } });

  // Reject early if the account is currently locked.
  if (user && user.isActive && isUserLocked(user)) {
    return NextResponse.json({ error: "Compte temporairement verrouillé (trop de tentatives). Réessayez dans 10 minutes." }, { status: 423 });
  }

  if (!user || !user.isActive || !verifyPassword(user.passwordHash, password)) {
    // Count failures only for real, active accounts and lock after 3.
    if (user && user.isActive) {
      const locked = await registerUserFailure(user.id);
      if (locked) {
        logAction(req, "LOGIN_LOCKED", "auth", null, { email }, email);
        return NextResponse.json({ error: "Compte verrouillé pour 10 minutes après 3 tentatives échouées." }, { status: 423 });
      }
    }
    logAction(req, "LOGIN_FAILED", "auth", null, { email }, email || "unknown");
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  // Successful password → clear failure counter / lock.
  await clearUserFailures(user.id);

  // Transparently upgrade legacy (sha256) hashes to scrypt on successful login.
  if (needsRehash(user.passwordHash)) {
    await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(password) } }).catch(() => {});
  }

  // Accounts exempt from MFA (e.g. kiosk/hotesse accounts that have no TOTP device)
  const MFA_EXEMPT = new Set(["hotesse@eocon.local"]);
  const mfaExempt = MFA_EXEMPT.has(user.email.toLowerCase());

  // Check if MFA required (global setting)
  const mfaSetting = mfaExempt ? null : await prisma.eventSetting.findUnique({ where: { key: "mfa_required" } });
  const mfaRequired = mfaSetting?.value === "true";

  if (!mfaExempt && user.mfaEnabled) {
    // MFA enabled — return a pending token, client must verify TOTP
    const mfaPendingToken = signMfaPending(user.id);
    return NextResponse.json({ mfaRequired: true, mfaPendingToken });
  }

  if (!mfaExempt && mfaRequired && !user.mfaEnabled) {
    // MFA required globally but user hasn't enrolled — force enrollment
    const mfaPendingToken = signMfaPending(user.id);
    return NextResponse.json({ mfaRequired: true, mfaEnrollmentRequired: true, mfaPendingToken });
  }

  // No MFA — create session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = randomBytes(32).toString("hex");
  await prisma.adminSession.create({ data: { token: sessionToken, userId: user.id, expiresAt } });

  const cookieValue = signUserSession(user.id, sessionToken);
  logAction(req, "LOGIN", "auth", user.id, { email: user.email, name: user.name }, user.email);
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
