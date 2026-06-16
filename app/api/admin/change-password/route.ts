import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/adminAuth";
import { hashPassword, verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

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
