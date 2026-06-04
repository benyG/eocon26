import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const session = await prisma.conferenceSession.update({ where: { id: Number(params.id) }, data });

  // If session date was just set and has a speaker, auto-schedule J-1 reminder
  const { date, speakerId } = data as { date?: string; speakerId?: number };
  if (date && speakerId) {
    const sessionDate = new Date(date);
    const reminderDate = new Date(sessionDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(9, 0, 0, 0);

    // Only create if no existing J-1 reminder for this speaker
    const existing = await prisma.socialPost.findFirst({
      where: { speakerId, contentType: "speaker_reminder" },
    });

    if (!existing && reminderDate > new Date()) {
      const speaker = await prisma.speaker.findUnique({ where: { id: speakerId } });
      if (speaker) {
        const content = `⏰ Demain à EOCON 2026 !\n\n🎤 ${speaker.name} présentera "${speaker.talkTitle}" — ne manquez pas ce talk !\n\n📅 ${date} · Hotel Onomo, Douala\n🎫 Dernières places : https://eyesopensecurity.com/#inscription\n\n#EOCON2026 #Cybersécurité`;
        await prisma.socialPost.create({
          data: {
            brief: `Rappel J-1 : ${speaker.name}`,
            platform: "linkedin",
            lang: "fr",
            content,
            imageUrl: speaker.photoUrl || null,
            scheduledAt: reminderDate,
            status: "scheduled",
            contentType: "speaker_reminder",
            speakerId,
          },
        });
      }
    }
  }

  return NextResponse.json(session);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.conferenceSession.delete({ where: { id: Number(params.id) } });
  return NextResponse.json({ success: true });
}
