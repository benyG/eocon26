import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendCFPDecision } from "@/lib/email";
import { getEventSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Valid pipeline stages in order
const STAGES = ["submitted", "reviewing", "accepted", "onboarding", "confirmed", "scheduled"] as const;
type Stage = (typeof STAGES)[number];

export async function GET() {
  if (!(await hasPermission("sponsor-pipeline", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfps = await prisma.cFPSubmission.findMany({
    orderBy: { createdAt: "desc" },
    include: { speaker: { select: { id: true, photoUrl: true, onboardingStatus: true, isVisible: true } } },
  });

  return NextResponse.json(cfps);
}

// Move a CFP card to a new pipeline stage — triggers side effects
export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("sponsor-pipeline", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, stage, notes, deferred } = await req.json() as { id: number; stage: Stage; notes?: string; deferred?: boolean };

  if (!STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const cfp = await prisma.cFPSubmission.findUnique({
    where: { id },
    include: { speaker: true },
  });
  if (!cfp) return NextResponse.json({ error: "CFP not found" }, { status: 404 });

  // Determine legacy status field
  const statusMap: Record<Stage, string> = {
    submitted: "pending",
    reviewing: "pending",
    accepted: "accepted",
    onboarding: "accepted",
    confirmed: "accepted",
    scheduled: "accepted",
  };

  // --- Transition: accepted (first time) → create Speaker + Session stub + send email ---
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
        isVisible: false, // hidden until onboarding complete
        onboardingStatus: "pending",
      },
    });

    // Create a session stub linked to this speaker
    await prisma.conferenceSession.create({
      data: {
        title: cfp.talkTitle,
        type: cfp.format === "workshop" ? "workshop" : "talk",
        speakerName: cfp.name,
        speakerId: speaker.id,
        time: "TBD",
        description: cfp.abstract,
        isVisible: false,
        sortOrder: 999,
      },
    });

    // Send acceptance email
    sendCFPDecision(cfp.email, cfp.name, cfp.talkTitle, "accepted", cfp.langPresentation === "en" ? "en" : "fr").catch(e =>
      console.error("[CFP accept email]", e),
    );

    const updated = await prisma.cFPSubmission.update({
      where: { id },
      data: {
        pipelineStage: stage,
        status: "accepted",
        notes: notes ?? cfp.notes ?? undefined,
        decisionSentAt: new Date(),
        speakerId: speaker.id,
      },
      include: { speaker: true },
    });
    return NextResponse.json(updated);
  }

  // --- Transition: onboarding → mark onboarding sent on Speaker ---
  if (stage === "onboarding" && cfp.speakerId) {
    await prisma.speaker.update({
      where: { id: cfp.speakerId },
      data: { onboardingStatus: "sent" },
    });
  }

  // --- Transition: confirmed → Speaker visible, onboarding complete ---
  if (stage === "confirmed" && cfp.speakerId) {
    await prisma.speaker.update({
      where: { id: cfp.speakerId },
      data: { onboardingStatus: "completed" },
    });

    // Auto-schedule speaker announcement posts — uses visualUrl (infographist graphic) first
    const speaker = await prisma.speaker.findUnique({ where: { id: cfp.speakerId } });
    if (speaker) {
      const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
      const dateFr = settings.event_date_display_fr || "28 novembre 2026";
      const venue = settings.event_venue || "Hotel Onomo";
      const city = settings.event_city || "Douala";
      const urlInscription = settings.url_inscription || "";
      const urlProgramme = settings.url_programme || "";

      // Find the next free 90-min posting slot on a rolling basis.
      // Slots: 09:00, 10:30, 12:00, 13:30, 15:00, 16:30 each day (Mon–Sat).
      // We look at already-scheduled posts day by day until we find a free slot.
      const SLOT_MINUTES = [9*60, 10*60+30, 12*60, 13*60+30, 15*60, 16*60+30]; // minutes from midnight
      const TOLERANCE_MS = 20 * 60_000; // two posts within 20 min count as "same slot"

      const announcementDate = await nextFreeAnnouncementSlot(SLOT_MINUTES, TOLERANCE_MS);

      const imageUrl = speaker.visualUrl || speaker.photoUrl || null;

      const linkedinContent = `🎤 [EOCON 2026 · Speaker Annonce]\n\nNous avons le plaisir d'accueillir ${speaker.name}${speaker.title ? `, ${speaker.title}` : ""}${speaker.company ? ` @ ${speaker.company}` : ""}${speaker.country ? ` (${speaker.country})` : ""} !\n\n📋 Talk : "${speaker.talkTitle}"\n\n📅 ${dateFr} · ${venue}, ${city}\n\n👉 Voir le programme : ${urlProgramme}\n🎫 Inscriptions : ${urlInscription}\n\n#EOCON2026 #Cybersécurité #Afrique #EyesOpen`;

      const twitterContent = `🎤 Speaker EOCON 2026 !\n\n${speaker.name}${speaker.company ? ` @ ${speaker.company}` : ""} : "${speaker.talkTitle?.slice(0, 60)}${(speaker.talkTitle?.length ?? 0) > 60 ? "…" : ""}"\n\n📅 ${dateFr} · ${city}\n🔗 ${urlProgramme}\n\n#EOCON2026 #Cybersécurité`.slice(0, 280);

      await prisma.socialPost.createMany({
        data: [
          {
            brief: `Annonce speaker confirmé: ${speaker.name}`,
            platform: "linkedin",
            lang: "fr",
            content: linkedinContent,
            imageUrl,
            scheduledAt: announcementDate,
            status: "scheduled",
            contentType: "speaker_announcement",
            speakerId: speaker.id,
          },
          {
            brief: `Annonce speaker confirmé: ${speaker.name}`,
            platform: "twitter",
            lang: "fr",
            content: twitterContent,
            imageUrl,
            // Twitter 30 min after LinkedIn on the same slot
            scheduledAt: new Date(announcementDate.getTime() + 30 * 60_000),
            status: "scheduled",
            contentType: "speaker_announcement",
            speakerId: speaker.id,
          },
        ],
      });
    }
  }

  // --- Transition: rejected ---
  if (stage === "submitted" && cfp.status === "accepted") {
    // Demoting back — just update stage
  }

  const updated = await prisma.cFPSubmission.update({
    where: { id },
    data: {
      pipelineStage: stage,
      status: statusMap[stage],
      notes: notes ?? cfp.notes ?? undefined,
      ...(deferred !== undefined && { deferred }),
    },
    include: { speaker: true },
  });

  return NextResponse.json(updated);
}

// Reject a CFP (separate from pipeline stages)
export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("sponsor-pipeline", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

/**
 * Finds the next free posting slot for speaker announcements.
 * Scans days starting from tomorrow, checking each predefined slot.
 * A slot is "taken" if any scheduled post falls within toleranceMs of it.
 * Skips Sunday (0). Gives up after 60 days (returns best effort).
 */
async function nextFreeAnnouncementSlot(slotMinutes: number[], toleranceMs: number): Promise<Date> {
  // Fetch all future scheduled announcement posts
  const future = await prisma.socialPost.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { gte: new Date() },
    },
    select: { scheduledAt: true },
  });
  const takenMs = future.map(p => p.scheduledAt!.getTime());

  const candidate = new Date();
  candidate.setSeconds(0, 0);

  for (let day = 1; day <= 60; day++) {
    candidate.setDate(new Date().getDate() + day);
    // Skip Sunday
    if (candidate.getDay() === 0) continue;

    for (const minutes of slotMinutes) {
      const slotDate = new Date(candidate);
      slotDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

      // Check if any taken post is within tolerance of this slot
      const collision = takenMs.some(t => Math.abs(t - slotDate.getTime()) < toleranceMs);
      if (!collision) return slotDate;
    }
  }

  // Fallback: tomorrow 10:00
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}
