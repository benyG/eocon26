import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getEventSettings } from "@/lib/settings";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const session = await prisma.conferenceSession.update({ where: { id: Number(params.id) }, data });

  // Sync J-1 reminder post whenever date/time/speakerId changes
  const { date, time, speakerId } = data as { date?: string; time?: string; speakerId?: number };

  // Also reload full session in case only some fields were sent
  const fullSession = await prisma.conferenceSession.findUnique({ where: { id: Number(params.id) } });
  const effectiveDate = date ?? fullSession?.date;
  const effectiveSpeakerId = speakerId ?? fullSession?.speakerId;
  const effectiveTime = time ?? fullSession?.time;

  if (effectiveDate && effectiveSpeakerId) {
    await syncReminderPost(effectiveSpeakerId, effectiveDate, effectiveTime ?? null);
  } else if (data.speakerId === null || data.date === null) {
    // Speaker or date was removed — cancel any existing reminder
    await prisma.socialPost.updateMany({
      where: {
        speakerId: effectiveSpeakerId ?? undefined,
        contentType: "speaker_reminder",
        status: "scheduled",
      },
      data: { status: "cancelled" },
    });
  }

  return NextResponse.json(session);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cancel associated reminder before deleting
  const session = await prisma.conferenceSession.findUnique({ where: { id: Number(params.id) } });
  if (session?.speakerId) {
    await prisma.socialPost.updateMany({
      where: { speakerId: session.speakerId, contentType: "speaker_reminder", status: "scheduled" },
      data: { status: "cancelled" },
    });
  }

  await prisma.conferenceSession.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}

/**
 * Upserts a single J-1 reminder post for a speaker.
 * Scheduled time = session time on the day before (e.g. session at 14:00 → post at 14:00 J-1).
 * Falls back to 09:00 if session time is unavailable.
 * If a reminder already exists (any status=scheduled/draft), it is updated in place.
 */
async function syncReminderPost(speakerId: number, date: string, sessionTime: string | null) {
  const speaker = await prisma.speaker.findUnique({ where: { id: speakerId } });
  if (!speaker) return;

  // Parse session date + time → compute J-1 posting time
  const sessionDate = new Date(`${date}T${sessionTime ?? "09:00"}:00`);
  if (isNaN(sessionDate.getTime())) return;

  let reminderDate = new Date(sessionDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  // Same hour as session — natural spread across the day

  // Don't schedule in the past
  if (reminderDate <= new Date()) return;

  // Resolve collision: if another reminder (different speaker) is already at this
  // exact minute, shift by +15 min until the slot is free (max 8 shifts = +2h)
  for (let shift = 0; shift < 8; shift++) {
    const collision = await prisma.socialPost.findFirst({
      where: {
        contentType: "speaker_reminder",
        status: { in: ["scheduled", "draft"] },
        speakerId: { not: speakerId }, // other speakers
        scheduledAt: {
          gte: new Date(reminderDate.getTime() - 5 * 60_000),
          lte: new Date(reminderDate.getTime() + 5 * 60_000),
        },
      },
    });
    if (!collision) break;
    reminderDate = new Date(reminderDate.getTime() + 15 * 60_000);
  }

  const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
  const venue = settings.event_venue || "Hotel Onomo";
  const city = settings.event_city || "Douala";
  const urlInscription = settings.url_inscription || "https://eyesopensecurity.com/#inscription";

  const content = `⏰ Demain à EOCON 2026 !\n\n🎤 ${speaker.name}${speaker.title ? `, ${speaker.title}` : ""}${speaker.company ? ` @ ${speaker.company}` : ""} présentera :\n"${speaker.talkTitle || "Talk à confirmer"}"\n\n📅 ${date} · ${sessionTime ?? ""} · ${venue}, ${city}\n\n🎫 Dernières places → ${urlInscription}\n\n#EOCON2026 #Cybersécurité #Afrique`;

  // Use visualUrl (infographist visual) first, fall back to profile photo
  const imageUrl = speaker.visualUrl || speaker.photoUrl || null;

  const existing = await prisma.socialPost.findFirst({
    where: { speakerId, contentType: "speaker_reminder", status: { in: ["scheduled", "draft"] } },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.socialPost.update({
      where: { id: existing.id },
      data: { content, imageUrl, scheduledAt: reminderDate, status: "scheduled" },
    });
  } else {
    await prisma.socialPost.create({
      data: {
        brief: `Rappel J-1 : ${speaker.name}`,
        platform: "linkedin",
        lang: "fr",
        content,
        imageUrl,
        scheduledAt: reminderDate,
        status: "scheduled",
        contentType: "speaker_reminder",
        speakerId,
      },
    });
  }
}
