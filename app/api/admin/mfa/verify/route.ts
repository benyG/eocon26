import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signUserToken } from "@/lib/adminAuth";
import { verify } from "otplib";

export const dynamic = "force-dynamic";

function xorBuf(input: Buffer, key: Buffer): Buffer {
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ key[i % key.length];
  return out;
}

function decryptSecret(encrypted: string): string {
  const key = Buffer.from(process.env.ADMIN_SECRET || "fallback");
  return xorBuf(Buffer.from(encrypted, "base64"), key).toString("utf-8");
}

export async function POST(req: NextRequest) {
  const { userId, code } = await req.json();
  if (!userId || !code) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({
    where: { id: Number(userId) },
    select: { id: true, isActive: true, mfaEnabled: true, mfaSecret: true, passwordHash: true },
  });
  if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }

  const secret = decryptSecret(user.mfaSecret);
  const result = await verify({ secret, token: String(code), window: 1 });
  if (!result.valid) return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", signUserToken(user.id, user.passwordHash), {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
