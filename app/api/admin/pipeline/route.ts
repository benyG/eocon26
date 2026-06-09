import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendCFPDecision } from "@/lib/email";
import { getEventSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const STAGES = ["submitted", "reviewing", "accepted", "onboarding", "confirmed", "scheduled"] as const;
type Stage = (typeof STAGES)[number];

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfps = await prisma.cFPSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: { speaker: { select: { id: true, photoUrl: true, onboardingStatus: true, isVisible: true } } },
  });
  return NextResponse.json(cfps);
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, stage, notes } = await req.json() as { id: number; stage: Stage; notes?: string };
  if (!STAGES.includes(stage)) return NextResponse.json({ error: "Invalid stage" }, { status: 400 });

  const cfp = await prisma.cFPSubmission.findUnique({ where: { id }, include: { speaker: true } });
  if (!cfp) return NextResponse.json({ error: "CFP not found" }, { status: 404 });

  const statusMap: Record<Stage, string> = {
    submitted: "pending", reviewing: "pending", accepted: "accepted",
    onboarding: "accepted", confirmed: "accepted", scheduled: "accepted",
  };

  // ── accepted (first time) → create Speaker only, NO session yet ──────────
  if (stage === "accepted" && !cfp.speakerId) {
    const speaker = await prisma.speaker.create({
      data: {
        name: cfp.name,
        title: cfp.org || "Speaker",
        company: cfp.org || undefined,
        country: cfp.country || undefined,
        bio: cfp.bio || "",
        talkTitle: cfp.talkTitle,
        talkAbstract: cfp.abstract,
        talkFormat: cfp.format || undefined,
        edition: "2026",
        isVisible: false,
        onboardingStatus: "pending",
      },
    });

    sendCFPDecision(cfp.email, cfp.name, cfp.talkTitle, "accepted", cfp.langPresentation === "en" ? "en" : "fr").catch(e =>
      console.error("[CFP accept email]", e),
    );

    const updated = await prisma.cFPSubmission.update({
      where: { id },
      data: {
        pipelineStage: stage, status: "accepted",
        notes: notes ?? cfp.notes ?? undefined,
        decisionSentAt: new Date(), speakerId: speaker.id,
      },
      include: { speaker: true },
    });
    return NextResponse.json(updated);
  }

  // ── onboarding → mark onboarding sent on Speaker ─────────────────────────
  if (stage === "onboarding" && cfp.speakerId) {
    await prisma.speaker.update({ where: { id: cfp.speakerId }, data: { onboardingStatus: "sent" } });
  }

  // ── confirmed → Speaker visible + CREATE Session from CFP data ───────────
  if (stage === "confirmed" && cfp.speakerId) {
    await prisma.speaker.update({
      where: { id: cfp.speakerId },
      data: { onboardingStatus: "completed", isVisible: true },
    });

    // Create session only once (idempotent)
    const existing = await prisma.conferenceSession.findFirst({ where: { speakerId: cfp.speakerId } });
    if (!existing) {
      const isWorkshop = cfp.format === "workshop";

      // A workshop CFP → also create a Workshop record (visible in Ateliers tab)
      let workshopId: number | undefined = undefined;
      if (isWorkshop) {
        const workshop = await prisma.workshop.create({
          data: {
            title: cfp.talkTitle,
            description: cfp.abstract,
            instructor: cfp.name,
            level: "intermediate", // default — editable after
            duration: "3h",         // default — editable after
            isVisible: false,
            sortOrder: 999,
          },
        });
        workshopId = workshop.id;
      }

      await prisma.conferenceSession.create({
        data: {
          title: cfp.talkTitle,
          type: isWorkshop ? "workshop" : cfp.format === "keynote" ? "keynote" : "talk",
          speakerName: cfp.name,
          speakerId: cfp.speakerId,
          workshopId: workshopId ?? null,
          description: cfp.abstract,
          time: "TBD",
          isVisible: false,
          sortOrder: 999,
        },
      });
    }

    // Schedule announcement posts
    const speaker = await prisma.speaker.findUnique({ where: { id: cfp.speakerId } });
    if (speaker) {
      const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
      const dateFr = settings.event_date_display_fr || "28 novembre 2026";
      const venue = settings.event_venue || "Hotel Onomo";
      const city = settings.event_city || "Douala";
      const urlInscription = settings.url_inscription || "https://eyesopensecurity.com/#inscription";
      const urlProgramme = settings.url_programme || "https://eyesopensecurity.com/#programme";

      const SLOT_MINUTES = [9*60, 10*60+30, 12*60, 13*60+30, 15*60, 16*60+30];
      const announcementDate = await nextFreeAnnouncementSlot(SLOT_MINUTES, 20 * 60_000);
      const imageUrl = speaker.visualUrl || speaker.photoUrl || null;

      await prisma.socialPost.createMany({
        data: [
          {
            brief: `Annonce speaker confirmé: ${speaker.name}`,
            platform: "linkedin", lang: "fr",
            content: `🎤 [EOCON 2026 · Speaker Annonce]\n\nNous avons le plaisir d'accueillir ${speaker.name}${speaker.title ? `, ${speaker.title}` : ""}${speaker.company ? ` @ ${speaker.company}` : ""}${speaker.country ? ` (${speaker.country})` : ""} !\n\n📋 Talk : "${speaker.talkTitle}"\n\n📅 ${dateFr} · ${venue}, ${city}\n\n👉 Voir le programme : ${urlProgramme}\n🎫 Inscriptions : ${urlInscription}\n\n#EOCON2026 #Cybersécurité #Afrique #EyesOpen`,
            imageUrl, scheduledAt: announcementDate, status: "scheduled",
            contentType: "speaker_announcement", speakerId: speaker.id,
          },
          {
            brief: `Annonce speaker confirmé: ${speaker.name}`,
            platform: "twitter", lang: "fr",
            content: `🎤 Speaker EOCON 2026 !\n\n${speaker.name}${speaker.company ? ` @ ${speaker.company}` : ""} : "${speaker.talkTitle?.slice(0, 60)}${(speaker.talkTitle?.length ?? 0) > 60 ? "…" : ""}"\n\n📅 ${dateFr} · ${city}\n🔗 ${urlProgramme}\n\n#EOCON2026 #Cybersécurité`.slice(0, 280),
            imageUrl, scheduledAt: new Date(announcementDate.getTime() + 30 * 60_000),
            status: "scheduled", contentType: "speaker_announcement", speakerId: speaker.id,
          },
        ],
      });
    }
  }

  // ── demotion from confirmed → delete unscheduled session + workshop, hide speaker ──
  if (cfp.pipelineStage === "confirmed" && stage !== "confirmed" && stage !== "scheduled" && cfp.speakerId) {
    // Find unscheduled sessions for this speaker (may have workshopId)
    const unscheduled = await prisma.conferenceSession.findMany({ where: { speakerId: cfp.speakerId, date: null } });
    for (const sess of unscheduled) {
      if (sess.workshopId) await prisma.workshop.delete({ where: { id: sess.workshopId } }).catch(() => {});
    }
    await prisma.conferenceSession.deleteMany({ where: { speakerId: cfp.speakerId, date: null } });
    await prisma.speaker.update({
      where: { id: cfp.speakerId },
      data: { isVisible: false, onboardingStatus: "sent" },
    });
  }

  const updated = await prisma.cFPSubmission.update({
    where: { id },
    data: { pipelineStage: stage, status: statusMap[stage], notes: notes ?? cfp.notes ?? undefined },
    include: { speaker: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, notes } = await req.json() as { id: number; notes?: string };

  const cfp = await prisma.cFPSubmission.findUnique({ where: { id } });
  if (!cfp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.cFPSubmission.update({
    where: { id },
    data: { status: "rejected", pipelineStage: "submitted", notes: notes ?? undefined, decisionSentAt: new Date() },
  });

  sendCFPDecision(cfp.email, cfp.name, cfp.talkTitle, "rejected", cfp.langPresentation === "en" ? "en" : "fr").catch(e =>
    console.error("[CFP reject email]", e),
  );

  return NextResponse.json(updated);
}

async function nextFreeAnnouncementSlot(slotMinutes: number[], toleranceMs: number): Promise<Date> {
  const future = await prisma.socialPost.findMany({
    where: { status: "scheduled", scheduledAt: { gte: new Date() } },
    select: { scheduledAt: true },
  });
  const takenMs = future.map(p => p.scheduledAt!.getTime());
  for (let day = 1; day <= 60; day++) {
    const base = new Date();
    base.setDate(new Date().getDate() + day);
    if (base.getDay() === 0) continue;
    for (const minutes of slotMinutes) {
      const slot = new Date(base);
      slot.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      if (!takenMs.some(t => Math.abs(t - slot.getTime()) < toleranceMs)) return slot;
    }
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}
