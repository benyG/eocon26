import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/moderateur/session?token=xxx
// Valide le token, retourne session + speaker + session suivante + contact tech
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 401 });

  const session = await prisma.conferenceSession.findUnique({
    where: { moderatorToken: token },
    select: {
      id: true, title: true, date: true, time: true, endTime: true,
      type: true, room: true, description: true, mode: true, liveUrl: true,
      speakerId: true, speakerName: true,
      moderatorTokenExpiresAt: true,
    },
  });

  if (!session) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

  // Vérification expiration
  if (session.moderatorTokenExpiresAt && session.moderatorTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Token expiré — demandez un nouveau lien à l'organisateur" }, { status: 401 });
  }

  // Speaker complet
  let speaker = null;
  if (session.speakerId) {
    speaker = await prisma.speaker.findUnique({
      where: { id: session.speakerId },
      select: {
        id: true, name: true, title: true, company: true, country: true,
        bio: true, photoUrl: true, linkedin: true, twitter: true,
        talkTitle: true, talkAbstract: true, talkFormat: true,
      },
    });
  }

  // Session suivante (même date, heure > heure actuelle, tri par sortOrder/time)
  let nextSession = null;
  if (session.date) {
    const allSessions = await prisma.conferenceSession.findMany({
      where: { date: session.date, isVisible: true, NOT: { id: session.id } },
      orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
      select: { id: true, title: true, time: true, speakerName: true, type: true },
    });
    // Trouver la première session dont l'heure est > à l'heure de la session actuelle
    const currentTime = session.time ?? "00:00";
    nextSession = allSessions.find((s: { id: number; title: string; time: string | null; speakerName: string | null; type: string | null }) => (s.time ?? "00:00") > currentTime) ?? null;
  }

  // Contact tech streaming
  const techRow = await prisma.eventSetting.findUnique({ where: { key: "streaming_tech_contact" } });

  // URL admin Q&A (lecture seule pour le moderateur)
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      date: session.date,
      time: session.time,
      endTime: session.endTime,
      type: session.type,
      room: session.room,
      description: session.description,
      mode: session.mode,
      liveUrl: session.liveUrl,
    },
    speaker,
    nextSession,
    techContact: techRow?.value ?? "",
    livePageUrl: `${base}/live`,
    expiresAt: session.moderatorTokenExpiresAt,
  });
}
