import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verify } from "otplib";
import { createHmac } from "crypto";
import { verifyMfaPending } from "@/lib/mfaToken";
import { signUserSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function decryptSecret(encrypted: string): string {
  // Simple XOR with ADMIN_SECRET for storage obfuscation
  const key = process.env.ADMIN_SECRET || "fallback";
  const buf = Buffer.from(encrypted, "base64");
  const keyBuf = Buffer.from(key);
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  return out.toString("utf-8");
}

export async function POST(req: NextRequest) {
  const { mfaPendingToken, totp } = await req.json();
  if (!mfaPendingToken || !totp) return NextResponse.json({ error: "Token et code requis" }, { status: 400 });

  const userId = verifyMfaPending(mfaPendingToken);
  if (!userId) return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return NextResponse.json({ error: "Utilisateur invalide" }, { status: 401 });
  if (!user.mfaSecret) return NextResponse.json({ error: "MFA non configuré" }, { status: 400 });

  const secret = decryptSecret(user.mfaSecret);
  const result = await verify({ secret, token: totp });
  if (!result.valid) return NextResponse.json({ error: "Code incorrect" }, { status: 401 });

  // Create session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionToken = createHmac("sha256", process.env.ADMIN_SECRET || "fallback")
    .update(`${user.id}:${Date.now()}:${Math.random()}`).digest("hex");
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
