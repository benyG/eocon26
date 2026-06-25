import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function validateToken(token: string | null) {
  if (!token) return null;
  const session = await prisma.conferenceSession.findUnique({
    where: { moderatorToken: token },
    select: { id: true, moderatorTokenExpiresAt: true },
  });
  if (!session) return null;
  if (session.moderatorTokenExpiresAt && session.moderatorTokenExpiresAt < new Date()) return null;
  return session;
}

// GET /api/moderateur/questions?token=xxx
// Retourne les questions du jour (non cachées), pour la page cockpit
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const sess = await validateToken(token);
  if (!sess) return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const questions = await prisma.sessionQuestion.findMany({
    where: { hidden: false, askedAt: { gte: startOfToday } },
    orderBy: [{ approved: "asc" }, { upvotes: "desc" }, { askedAt: "asc" }],
    select: { id: true, body: true, displayName: true, approved: true, answered: true, upvotes: true, adminNote: true, askedAt: true },
  });

  return NextResponse.json(questions);
}
