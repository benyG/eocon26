/// <reference types="node" />
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function xorBuf(input: Buffer, key: Buffer): Buffer {
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ key[i % key.length];
  return out;
}

function encryptSecret(secret: string): string {
  const key = Buffer.from(process.env.ADMIN_SECRET || "fallback");
  return xorBuf(Buffer.from(secret, "utf-8"), key).toString("base64");
}

function decryptSecret(encrypted: string): string {
  const key = Buffer.from(process.env.ADMIN_SECRET || "fallback");
  return xorBuf(Buffer.from(encrypted, "base64"), key).toString("utf-8");
}

// GET: Generate a new TOTP secret and return QR code for the current user
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(req.nextUrl.searchParams.get("userId") || "0");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Refuse to overwrite an active MFA secret — admin must disable it first.
  // This prevents accidentally invalidating an enrolled user's authenticator app.
  if (user.mfaEnabled && user.mfaSecret) {
    return NextResponse.json({ error: "MFA déjà actif pour cet utilisateur. Désactivez-le d'abord avant de re-configurer." }, { status: 409 });
  }

  const secret = generateSecret();
  const otpauth = generateURI({
    issuer: "EOCON 2026 Admin",
    label: user.email,
    secret,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 256, margin: 2 });

  // Store the pending secret (not yet activated — user must verify first)
  await prisma.adminUser.update({
    where: { id: userId },
    data: { mfaSecret: encryptSecret(secret) },
  });

  return NextResponse.json({ qrDataUrl, secret });
}

// POST: Verify the TOTP code and activate MFA
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, totp } = await req.json();
  if (!userId || !totp) return NextResponse.json({ error: "userId et totp requis" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user || !user.mfaSecret) return NextResponse.json({ error: "Setup MFA d'abord" }, { status: 400 });

  const secret = decryptSecret(user.mfaSecret);
  const result = await verify({ secret, token: totp, epochTolerance: 30 });
  if (!result.valid) return NextResponse.json({ error: "Code incorrect — réessayez" }, { status: 400 });

  await prisma.adminUser.update({
    where: { id: userId },
    data: { mfaEnabled: true, mfaEnrolledAt: new Date() },
  });

  return NextResponse.json({ success: true });
}

// DELETE: Disable MFA
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await prisma.adminUser.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: null, mfaEnrolledAt: null },
  });
  return NextResponse.json({ success: true });
}
