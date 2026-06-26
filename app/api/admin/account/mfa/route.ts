/// <reference types="node" />
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { getAuthenticatedUserId } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function xorBuf(input: Buffer, key: Buffer): Buffer {
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ key[i % key.length];
  return out;
}
function encryptSecret(secret: string): string {
  return xorBuf(Buffer.from(secret, "utf-8"), Buffer.from(process.env.ADMIN_SECRET || "fallback")).toString("base64");
}
function decryptSecret(encrypted: string): string {
  return xorBuf(Buffer.from(encrypted, "base64"), Buffer.from(process.env.ADMIN_SECRET || "fallback")).toString("utf-8");
}

// GET — start enrollment for the CURRENT user: generate secret + QR.
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Connexion utilisateur requise" }, { status: 401 });
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const secret = generateSecret();
  const otpauth = generateURI({ issuer: "EOCON 2026 Admin", label: user.email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 256, margin: 2 });
  // Store as pending (not enabled until verified).
  await prisma.adminUser.update({ where: { id: userId }, data: { mfaSecret: encryptSecret(secret) } });
  return NextResponse.json({ qrDataUrl, secret });
}

// POST — verify the TOTP code and enable MFA for the current user.
export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Connexion utilisateur requise" }, { status: 401 });
  const { totp } = await req.json();
  if (!totp) return NextResponse.json({ error: "Code requis" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user?.mfaSecret) return NextResponse.json({ error: "Démarrez la configuration MFA d'abord" }, { status: 400 });

  const result = await verify({ secret: decryptSecret(user.mfaSecret), token: String(totp), epochTolerance: 30 });
  if (!result.valid) return NextResponse.json({ error: "Code incorrect — réessayez" }, { status: 400 });

  await prisma.adminUser.update({ where: { id: userId }, data: { mfaEnabled: true, mfaEnrolledAt: new Date() } });
  return NextResponse.json({ success: true });
}

// DELETE — disable own MFA (blocked when MFA is globally required).
export async function DELETE() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Connexion utilisateur requise" }, { status: 401 });
  const mfaSetting = await prisma.eventSetting.findUnique({ where: { key: "mfa_required" } });
  if (mfaSetting?.value === "true") {
    return NextResponse.json({ error: "Le MFA est obligatoire pour tous les comptes — désactivation impossible." }, { status: 403 });
  }
  await prisma.adminUser.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null, mfaEnrolledAt: null } });
  return NextResponse.json({ success: true });
}
