import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function xorSecret(input: string, isEncrypt: boolean): string {
  const key = process.env.ADMIN_SECRET || "fallback";
  const buf = isEncrypt ? Buffer.from(input, "utf-8") : Buffer.from(input, "base64");
  const keyBuf = Buffer.from(key);
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ keyBuf[i % keyBuf.length];
  return isEncrypt ? out.toString("base64") : out.toString("utf-8");
}

function encryptSecret(secret: string): string {
  return xorSecret(secret, true);
}

function decryptSecret(encrypted: string): string {
  return xorSecret(encrypted, false);
}

// GET: Generate a new TOTP secret and return QR code for the current user
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt(req.nextUrl.searchParams.get("userId") || "0");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, "EOCON 2026 Admin", secret);
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
  const isValid = authenticator.check(totp, secret);
  if (!isValid) return NextResponse.json({ error: "Code incorrect — réessayez" }, { status: 400 });

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
