import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const speakers = await prisma.speaker.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(speakers);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const speaker = await prisma.speaker.create({ data });

  // Always create a linked session when a speaker is created manually
  const existing = await prisma.conferenceSession.findFirst({ where: { speakerId: speaker.id } });
  if (!existing && speaker.talkTitle) {
    await prisma.conferenceSession.create({
      data: {
        title: speaker.talkTitle,
        type: speaker.talkFormat === "keynote" ? "keynote" : speaker.talkFormat === "workshop" ? "workshop" : "talk",
        speakerName: speaker.name,
        speakerId: speaker.id,
        description: speaker.talkAbstract || undefined,
        time: "TBD",
        isVisible: false,
        sortOrder: 999,
      },
    });
  }

  logAction(req, "CREATE", "speaker", speaker.id, { name: speaker.name });
  return NextResponse.json(speaker, { status: 201 });
}
