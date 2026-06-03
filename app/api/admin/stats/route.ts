import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [cfpTotal, cfpPending, cfpAccepted, cfpRejected, volunteers, registrations, speakers, sponsors, subscribers, team, pastSpeakers, workshops] =
    await Promise.all([
      prisma.cFPSubmission.count(),
      prisma.cFPSubmission.count({ where: { status: "pending" } }),
      prisma.cFPSubmission.count({ where: { status: "accepted" } }),
      prisma.cFPSubmission.count({ where: { status: "rejected" } }),
      prisma.volunteerApplication.count(),
      prisma.registration.count(),
      prisma.speaker.count(),
      prisma.sponsor.count(),
      prisma.newsletterSubscriber.count(),
      prisma.teamMember.count(),
      prisma.pastSpeaker.count(),
      prisma.workshop.count(),
    ]);
  return NextResponse.json({
    cfp: cfpTotal,
    cfpBreakdown: { total: cfpTotal, pending: cfpPending, accepted: cfpAccepted, rejected: cfpRejected },
    volunteers,
    registrations,
    speakers,
    sponsors,
    subscribers,
    team,
    pastSpeakers,
    workshops,
  });
}
