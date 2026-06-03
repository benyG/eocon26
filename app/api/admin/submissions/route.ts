import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendCFPDecision } from "@/lib/email";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") || "cfp";

  if (type === "cfp") {
    return NextResponse.json(await prisma.cFPSubmission.findMany({ orderBy: { createdAt: "desc" } }));
  }
  if (type === "volunteer") {
    return NextResponse.json(await prisma.volunteerApplication.findMany({ orderBy: { createdAt: "desc" } }));
  }
  if (type === "registration") {
    return NextResponse.json(await prisma.registration.findMany({ orderBy: { createdAt: "desc" } }));
  }
  if (type === "newsletter") {
    return NextResponse.json(await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }));
  }
  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type, id, status, notes, action } = await req.json();

  // Enhanced CFP accept/reject with email
  if (type === "cfp" && (action === "accept" || action === "reject")) {
    const decision = action === "accept" ? "accepted" : "rejected";
    const submission = await prisma.cFPSubmission.update({
      where: { id },
      data: { status: decision, notes: notes ?? undefined, decisionSentAt: new Date() },
    });
    sendCFPDecision(submission.email, submission.name, submission.talkTitle, decision).catch(e =>
      console.error("[CFP decision email]", e),
    );
    return NextResponse.json(submission);
  }

  if (type === "cfp") {
    return NextResponse.json(await prisma.cFPSubmission.update({ where: { id }, data: { status, notes: notes ?? undefined } }));
  }
  if (type === "volunteer") {
    return NextResponse.json(await prisma.volunteerApplication.update({ where: { id }, data: { status } }));
  }
  if (type === "registration") {
    return NextResponse.json(await prisma.registration.update({ where: { id }, data: { status } }));
  }
  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
