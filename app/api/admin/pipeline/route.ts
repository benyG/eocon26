import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendCFPDecision } from "@/lib/email";

// Valid pipeline stages in order
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

// Move a CFP card to a new pipeline stage — triggers side effects
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, stage, notes } = await req.json() as { id: number; stage: Stage; notes?: string };

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
    sendCFPDecision(cfp.email, cfp.name, cfp.talkTitle, "accepted").catch(e =>
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
    },
    include: { speaker: true },
  });

  return NextResponse.json(updated);
}

// Reject a CFP (separate from pipeline stages)
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, notes } = await req.json() as { id: number; notes?: string };

  const cfp = await prisma.cFPSubmission.findUnique({ where: { id } });
  if (!cfp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.cFPSubmission.update({
    where: { id },
    data: { status: "rejected", pipelineStage: "submitted", notes: notes ?? undefined, decisionSentAt: new Date() },
  });

  sendCFPDecision(cfp.email, cfp.name, cfp.talkTitle, "rejected").catch(e =>
    console.error("[CFP reject email]", e),
  );

  return NextResponse.json(updated);
}
