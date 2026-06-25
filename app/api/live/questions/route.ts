import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getOnlineSession, ONLINE_SESSION_COOKIE } from "@/lib/onlineAuth";

export const dynamic = "force-dynamic";

const MAX_BODY = 500;
const COOLDOWN_MS = 30_000; // 30 seconds between questions

export async function POST(req: NextRequest) {
  const session = await getOnlineSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = cookies();
  const sessionToken = cookieStore.get(ONLINE_SESSION_COOKIE)?.value ?? null;

  const body = await req.json() as { body?: string; displayName?: string };
  const text = (body.body ?? "").trim().slice(0, MAX_BODY);
  if (!text) return NextResponse.json({ error: "Empty question" }, { status: 400 });

  // Cooldown: one question per token per 30s
  if (sessionToken) {
    const recent = await prisma.sessionQuestion.findFirst({
      where: {
        sessionToken,
        askedAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
      },
    });
    if (recent) return NextResponse.json({ error: "Cooldown — attendez 30 secondes entre chaque question." }, { status: 429 });
  }

  const displayName = (body.displayName ?? "").trim().slice(0, 80) || null;

  const question = await prisma.sessionQuestion.create({
    data: {
      body: text,
      displayName,
      sessionToken,
      approved: false,
    },
  });

  return NextResponse.json({ ok: true, id: question.id }, { status: 201 });
}
