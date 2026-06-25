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

// PATCH /api/moderateur/questions/[id]?token=xxx
// body: { approved?, answered?, hidden? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get("token");
  const sess = await validateToken(token);
  if (!sess) return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as { approved?: boolean; answered?: boolean; hidden?: boolean };

  const updated = await prisma.sessionQuestion.update({
    where: { id },
    data: {
      ...(body.approved !== undefined ? { approved: body.approved } : {}),
      ...(body.answered !== undefined ? { answered: body.answered } : {}),
      ...(body.hidden   !== undefined ? { hidden:   body.hidden   } : {}),
    },
    select: { id: true, approved: true, answered: true, hidden: true },
  });

  return NextResponse.json({ ok: true, question: updated });
}
