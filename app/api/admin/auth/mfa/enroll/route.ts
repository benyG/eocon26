import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { verifyMfaPending } from "@/lib/mfaToken";

export const dynamic = "force-dynamic";

function xorBuf(input: Buffer, key: Buffer): Buffer {
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ key[i % key.length];
  return out;
}
function encryptSecret(secret: string): string {
  return xorBuf(Buffer.from(secret, "utf-8"), Buffer.from(process.env.ADMIN_SECRET || "fallback")).toString("base64");
}

// POST { mfaPendingToken } — used at login when MFA is required but the user has
// not enrolled yet. Generates a secret + QR scoped to the pending login token
// (no session exists yet). The user then verifies via /api/admin/auth/mfa.
export async function POST(req: NextRequest) {
  const { mfaPendingToken } = await req.json();
  const userId = mfaPendingToken ? verifyMfaPending(mfaPendingToken) : null;
  if (!userId) return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return NextResponse.json({ error: "Utilisateur invalide" }, { status: 401 });

  const secret = generateSecret();
  const otpauth = generateURI({ issuer: "EOCON 2026 Admin", label: user.email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 256, margin: 2 });
  await prisma.adminUser.update({ where: { id: userId }, data: { mfaSecret: encryptSecret(secret) } });

  return NextResponse.json({ qrDataUrl });
}
