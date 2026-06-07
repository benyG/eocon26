import { NextRequest, NextResponse } from "next/server";
import { signToken, signUserToken } from "@/lib/adminAuth";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { prisma } from "@/lib/db";
import { createHash, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function verifyPassword(stored: string, input: string): boolean {
  // Format: "salt:hash"  (sha256)  or  "salt:hash"  (legacy hotesse prefix)
  const parts = stored.split(":");
  if (parts.length < 2) return false;
  const salt = parts[0];
  const storedHash = parts.slice(1).join(":");
  const inputHash = createHash("sha256").update(input + salt).digest("hex");
  try {
    const a = Buffer.from(storedHash.padEnd(64, "0").slice(0, 64), "hex");
    const b = Buffer.from(inputHash.padEnd(64, "0").slice(0, 64), "hex");
    return timingSafeEqual(a, b) && storedHash === inputHash;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans 15 minutes." }, { status: 429 });
  }

  const { email, password } = await req.json();

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };

  // 1. Super-admin fallback: no email, just ADMIN_PASSWORD
  if (!email) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || password !== expected) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }
    const res = NextResponse.json({ success: true, role: "super_admin" });
    res.cookies.set("admin_token", signToken(password), cookieOpts);
    return res;
  }

  // 2. DB user login
  const user = await prisma.adminUser.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  if (!verifyPassword(user.passwordHash, password)) {
    return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
  }

  // 3. MFA check — if enabled, require TOTP before issuing full token
  if (user.mfaEnabled) {
    return NextResponse.json({ mfaRequired: true, userId: user.id }, { status: 200 });
  }

  const res = NextResponse.json({ success: true, role: user.profile?.slug ?? "admin" });
  res.cookies.set("admin_token", signUserToken(user.id, user.passwordHash), cookieOpts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_token");
  return res;
}
