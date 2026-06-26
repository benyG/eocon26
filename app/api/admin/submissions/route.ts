import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendCFPDecision, sendRegistrationTicket, sendVolunteerAccepted, sendRegistrationPending } from "@/lib/email";
import { generateQrPayload } from "@/lib/qr";
import { formatTicketRef } from "@/lib/ticketRef";
import { logAction } from "@/lib/auditLog";
import { getEventSettings } from "@/lib/settings";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await hasPermission("cfp", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  if (!(await hasPermission("cfp", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  // QA-only: manual validate (requires isRoot + currencySelectorEnabled on the frontend).
  // Does NOT send online access link — that fires only on real payment via finalizeRegistrationPaid().
  if (type === "registration" && action === "validate") {
    const reg = await prisma.registration.findUnique({ where: { id } });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const qrCode = reg.qrCode || generateQrPayload(reg.id);
    const liveToken = reg.liveToken || crypto.randomUUID();
    const updated = await prisma.registration.update({
      where: { id },
      data: { status: "validated", qrCode, liveToken },
    });
    // Create LivePresence record if it doesn't exist yet
    await prisma.livePresence.upsert({
      where: { registrationId: id },
      create: { liveToken, registrationId: id },
      update: {},
    });
    logAction(req, "VALIDATE", "registration", id, { email: reg.email, ticketType: reg.ticketType });
    const ticketRef = formatTicketRef(reg.ticketRef || String(reg.id).padStart(5, "0"));
    sendRegistrationTicket(reg.email, reg.fname, reg.lname, reg.ticketType, reg.id, ticketRef, (reg.langExpression === "en" ? "en" : "fr"), liveToken).catch(e =>
      console.error("[Registration ticket email]", e),
    );
    return NextResponse.json(updated);
  }

  // Relance : renvoie un email rappelant au participant de finaliser son paiement.
  if (type === "registration" && action === "remind") {
    const reg = await prisma.registration.findUnique({ where: { id } });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
    const paymentUrl = settings.url_inscription || "https://eyesopensecurity.com/#inscription";
    const ticketRef = formatTicketRef(reg.ticketRef || String(reg.id).padStart(5, "0"));
    sendRegistrationPending(reg.email, reg.fname, reg.lname, reg.ticketType, ticketRef, paymentUrl, (reg.langExpression === "en" ? "en" : "fr")).catch(e =>
      console.error("[Registration reminder email]", e),
    );
    logAction(req, "UPDATE", "registration", id, { action: "remind", email: reg.email });
    return NextResponse.json({ ok: true });
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
