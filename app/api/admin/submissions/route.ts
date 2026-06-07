import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendCFPDecision, sendRegistrationTicket, sendVolunteerAccepted } from "@/lib/email";
import { generateQrPayload } from "@/lib/qr";
import { formatTicketRef } from "@/lib/ticketRef";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

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
  const body = await req.json();
  const { type, id, status, notes, action, assignedRole, shiftStart, shiftEnd, ctfTeamName } = body;

  if (type === "ctf-team") {
    await prisma.registration.update({ where: { id }, data: { ctfTeamName } });
    return NextResponse.json({ ok: true });
  }

  if (type === "volunteer-assign") {
    const updateData: Record<string, unknown> = {};
    if (assignedRole !== undefined) updateData.assignedRole = assignedRole;
    if (shiftStart !== undefined) updateData.shiftStart = shiftStart ? new Date(shiftStart) : null;
    if (shiftEnd !== undefined) updateData.shiftEnd = shiftEnd ? new Date(shiftEnd) : null;
    const updated = await prisma.volunteerApplication.update({ where: { id }, data: updateData });
    logAction(req, "UPDATE", "volunteer", id, { assignedRole, shiftStart, shiftEnd });
    return NextResponse.json(updated);
  }

  // Enhanced CFP accept/reject with email
  if (type === "cfp" && (action === "accept" || action === "reject")) {
    const decision = action === "accept" ? "accepted" : "rejected";
    const submission = await prisma.cFPSubmission.update({
      where: { id },
      data: { status: decision, notes: notes ?? undefined, decisionSentAt: new Date() },
    });
    logAction(req, decision === "accepted" ? "ACCEPT" : "REJECT", "cfp", id, { email: submission.email });
    sendCFPDecision(submission.email, submission.name, submission.talkTitle, decision, (submission.langPresentation === "en" ? "en" : "fr")).catch(e =>
      console.error("[CFP decision email]", e),
    );
    return NextResponse.json(submission);
  }

  if (type === "cfp") {
    const updated = await prisma.cFPSubmission.update({ where: { id }, data: { status, notes: notes ?? undefined } });
    logAction(req, "UPDATE", "cfp", id, { status });
    return NextResponse.json(updated);
  }
  // Validate registration: set status validated + generate QR + send ticket email
  if (type === "registration" && action === "validate") {
    const reg = await prisma.registration.findUnique({ where: { id } });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const qrCode = reg.qrCode || generateQrPayload(reg.id);
    const updated = await prisma.registration.update({
      where: { id },
      data: { status: "validated", qrCode },
    });
    logAction(req, "VALIDATE", "registration", id, { email: reg.email, ticketType: reg.ticketType });
    const ticketRef = formatTicketRef(reg.ticketRef || String(reg.id).padStart(5, "0"));
    sendRegistrationTicket(reg.email, reg.fname, reg.lname, reg.ticketType, reg.id, ticketRef, (reg.langExpression === "en" ? "en" : "fr")).catch(e =>
      console.error("[Registration ticket email]", e),
    );
    return NextResponse.json(updated);
  }

  if (type === "registration") {
    const updated = await prisma.registration.update({ where: { id }, data: { status } });
    logAction(req, "UPDATE", "registration", id, { status });
    return NextResponse.json(updated);
  }

  if (type === "volunteer") {
    const vol = await prisma.volunteerApplication.findUnique({ where: { id } });
    const updated = await prisma.volunteerApplication.update({ where: { id }, data: { status } });
    logAction(req, "UPDATE", "volunteer", id, { status });
    if (status === "accepted" && vol) {
      sendVolunteerAccepted(vol.email, vol.name, vol.assignedRole || "À confirmer", (vol.langExpression === "en" ? "en" : "fr")).catch(e =>
        console.error("[Volunteer accepted email]", e),
      );
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
