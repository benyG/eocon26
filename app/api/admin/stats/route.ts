import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [cfp, volunteers, registrations, speakers, sponsors, subscribers, team, pastSpeakers, workshops] =
    await Promise.all([
      prisma.cFPSubmission.count(),
      prisma.volunteerApplication.count(),
      prisma.registration.count(),
      prisma.speaker.count(),
      prisma.sponsor.count(),
      prisma.newsletterSubscriber.count(),
      prisma.teamMember.count(),
      prisma.pastSpeaker.count(),
      prisma.workshop.count(),
    ]);
  return NextResponse.json({ cfp, volunteers, registrations, speakers, sponsors, subscribers, team, pastSpeakers, workshops });
}
