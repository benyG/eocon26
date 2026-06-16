import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("communication", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [speakers, sessions, workshops, sponsors, stats] = await Promise.all([
    prisma.speaker.findMany({
      where: { edition: "2026", isVisible: true },
      select: { id: true, name: true, title: true, company: true, country: true, talkTitle: true, talkAbstract: true, isKeynote: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.conferenceSession.findMany({
      where: { isVisible: true },
      select: { id: true, title: true, type: true, speakerName: true, date: true, time: true, description: true },
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.workshop.findMany({
      where: { isVisible: true },
      select: { id: true, title: true, description: true, level: true, duration: true, instructor: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.sponsor.findMany({
      where: { isVisible: true },
      select: { id: true, name: true, tier: true, website: true },
      orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.registration.count(),
  ]);

  // Calculate days until event
  const eventDate = new Date("2026-11-28");
  const today = new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return NextResponse.json({ speakers, sessions, workshops, sponsors, registrationCount: stats, daysUntil });
}
