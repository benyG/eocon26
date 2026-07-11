import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentPermissions } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getCurrentPermissions())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [cfpTotal, cfpPending, cfpAccepted, cfpRejected, volunteers, registrations, checkedIn, speakers, sponsors, subscribers, team, pastSpeakers, workshops, ctfCompetitors] =
    await Promise.all([
      prisma.cFPSubmission.count(),
      prisma.cFPSubmission.count({ where: { status: "pending" } }),
      prisma.cFPSubmission.count({ where: { status: "accepted" } }),
      prisma.cFPSubmission.count({ where: { status: "rejected" } }),
      prisma.volunteerApplication.count(),
      prisma.registration.count(),
      prisma.registration.count({ where: { checkedInAt: { not: null } } }),
      prisma.speaker.count(),
      prisma.sponsor.count(),
      prisma.newsletterSubscriber.count(),
      prisma.teamMember.count(),
      prisma.pastSpeaker.count(),
      prisma.workshop.count(),
      // CTF competitors = registrations that provided a CTF competitor handle.
      prisma.registration.count({ where: { ctfCompetitorName: { not: null } } }),
    ]);
  return NextResponse.json({
    cfp: cfpTotal,
    cfpBreakdown: { total: cfpTotal, pending: cfpPending, accepted: cfpAccepted, rejected: cfpRejected },
    volunteers,
    registrations,
    checkedIn,
    speakers,
    sponsors,
    subscribers,
    team,
    pastSpeakers,
    workshops,
    ctfCompetitors,
  });
}
