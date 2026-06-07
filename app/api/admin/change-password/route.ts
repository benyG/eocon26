import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/adminAuth";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(stored: string, input: string): boolean {
  const parts = stored.split(":");
  if (parts.length < 2) return false;
  const salt = parts[0];
  const storedHash = parts.slice(1).join(":");
  return createHash("sha256").update(input + salt).digest("hex") === storedHash;
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Non autorisé — connexion en tant qu'utilisateur DB requise" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Mot de passe invalide (min 8 caractères)" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user || !verifyPassword(user.passwordHash, currentPassword)) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  await prisma.adminUser.update({ where: { id: userId }, data: { passwordHash: hashPassword(newPassword) } });
  return NextResponse.json({ success: true });
}
