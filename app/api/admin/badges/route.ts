import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { generateBadgeCredential, signCredential } from "@/lib/badgeCredential";
import { sendBadgeEmail } from "@/lib/badgeEmail";
import { BadgeType } from "@/lib/badgeSvg";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") || undefined;
  const badges = await prisma.badgeCredential.findMany({
    where: type ? { badgeType: type } : undefined,
    orderBy: { issuedAt: "desc" },
    select: {
      id: true, uuid: true, badgeType: true, subtype: true,
      recipientName: true, recipientEmail: true,
      issuedAt: true, revokedAt: true, emailSentAt: true,
    },
  });
  return NextResponse.json(badges);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { action } = body;

  // Generate a single badge
  if (action === "issue") {
    const { badgeType, recipientName, recipientEmail, subtype, extraData } = body;
    if (!badgeType || !recipientName || !recipientEmail) {
      return NextResponse.json({ error: "badgeType, recipientName, recipientEmail required" }, { status: 400 });
    }
    // Create DB entry first to get UUID
    const entry = await prisma.badgeCredential.create({
      data: {
        badgeType,
        subtype: subtype || null,
        recipientName,
        recipientEmail,
        credentialJson: "{}",
      },
    });
    // Re-generate with real UUID and sign
    const finalCredObj = generateBadgeCredential(
      entry.uuid, badgeType as BadgeType, recipientName, recipientEmail, subtype, extraData
    );
    const credentialJson = signCredential(finalCredObj);
    await prisma.badgeCredential.update({
      where: { id: entry.id },
      data: { credentialJson },
    });
    logAction(req, "CREATE", "badge", entry.id, { badgeType, recipientEmail });
    return NextResponse.json({ id: entry.id, uuid: entry.uuid, badgeType, recipientName, recipientEmail }, { status: 201 });
  }

  // Bulk issue badges for all checked-in participants
  if (action === "bulk-participants") {
    const regs = await prisma.registration.findMany({ where: { checkedInAt: { not: null } } });
    let issued = 0;
    for (const r of regs) {
      const existing = await prisma.badgeCredential.findFirst({
        where: { recipientEmail: r.email, badgeType: "participant" },
      });
      if (existing) continue;
      const entry = await prisma.badgeCredential.create({
        data: { badgeType: "participant", subtype: r.ticketType, recipientName: `${r.fname} ${r.lname}`, recipientEmail: r.email, credentialJson: "{}" },
      });
      const credObj = generateBadgeCredential(entry.uuid, "participant", `${r.fname} ${r.lname}`, r.email, r.ticketType);
      await prisma.badgeCredential.update({ where: { id: entry.id }, data: { credentialJson: signCredential(credObj) } });
      issued++;
    }
    return NextResponse.json({ issued });
  }

  // Bulk issue badges for all speakers
  if (action === "bulk-speakers") {
    const speakers = await prisma.speaker.findMany({ where: { edition: "2026" } });
    let issued = 0;
    for (const s of speakers) {
      const existing = await prisma.badgeCredential.findFirst({
        where: { recipientName: s.name, badgeType: "speaker" },
      });
      if (existing) continue;
      const entry = await prisma.badgeCredential.create({
        data: { badgeType: "speaker", recipientName: s.name, recipientEmail: "", credentialJson: "{}" },
      });
      const credObj = generateBadgeCredential(
        entry.uuid, "speaker", s.name, "",
        null,
        s.talkTitle ? { talkTitle: s.talkTitle } : undefined
      );
      await prisma.badgeCredential.update({ where: { id: entry.id }, data: { credentialJson: signCredential(credObj) } });
      issued++;
    }
    return NextResponse.json({ issued });
  }

  // Send badge email
  if (action === "send") {
    const { id } = body;
    const badge = await prisma.badgeCredential.findUnique({ where: { id } });
    if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    if (!badge.recipientEmail) return NextResponse.json({ error: "No email address" }, { status: 400 });
    await sendBadgeEmail({
      to: badge.recipientEmail,
      recipientName: badge.recipientName,
      badgeType: badge.badgeType as BadgeType,
      subtype: badge.subtype,
      uuid: badge.uuid,
      credentialJson: badge.credentialJson,
    });
    await prisma.badgeCredential.update({ where: { id }, data: { emailSentAt: new Date() } });
    logAction(req, "UPDATE", "badge", id, { action: "send_email" });
    return NextResponse.json({ success: true });
  }

  // Bulk send emails for all unsent badges
  if (action === "bulk-send") {
    const { badgeType } = body;
    const badges = await prisma.badgeCredential.findMany({
      where: {
        emailSentAt: null,
        revokedAt: null,
        recipientEmail: { not: "" },
        ...(badgeType ? { badgeType } : {}),
      },
    });
    let sent = 0; let failed = 0;
    for (const badge of badges) {
      try {
        await sendBadgeEmail({
          to: badge.recipientEmail,
          recipientName: badge.recipientName,
          badgeType: badge.badgeType as BadgeType,
          subtype: badge.subtype,
          uuid: badge.uuid,
          credentialJson: badge.credentialJson,
        });
        await prisma.badgeCredential.update({ where: { id: badge.id }, data: { emailSentAt: new Date() } });
        sent++;
      } catch { failed++; }
    }
    return NextResponse.json({ sent, failed });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.badgeCredential.update({ where: { id }, data: { revokedAt: new Date() } });
  logAction(req, "DELETE", "badge", id, { action: "revoke" });
  return NextResponse.json({ success: true });
}
