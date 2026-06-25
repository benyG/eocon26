import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function makeToken() {
  return randomBytes(32).toString("hex"); // 64-char hex token
}

function expiresAt48h() {
  const d = new Date();
  d.setHours(d.getHours() + 48);
  return d;
}

// POST /api/admin/sessions/moderator-token
// body: { sessionId: number }
// Génère (ou régénère) un token modérateur valide 48 h pour la session donnée.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sessionId } = await req.json() as { sessionId: number };
  if (!sessionId) return NextResponse.json({ error: "sessionId requis" }, { status: 400 });

  const token = makeToken();
  const expires = expiresAt48h();

  const session = await prisma.conferenceSession.update({
    where: { id: Number(sessionId) },
    data: { moderatorToken: token, moderatorTokenExpiresAt: expires },
    select: { id: true, title: true, moderatorToken: true, moderatorTokenExpiresAt: true },
  });

  logAction(req, "CREATE", "moderator_token", session.id, { title: session.title });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  return NextResponse.json({
    token: session.moderatorToken,
    expiresAt: session.moderatorTokenExpiresAt,
    url: `${base}/moderateur/${session.moderatorToken}`,
  });
}
