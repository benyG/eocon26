import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendRegistrationTicketTracked } from "@/lib/payment";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("transactions", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const transactions = await prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 500 });

  // Join the registrant name + current ticket-email state for display.
  const regIds = Array.from(new Set(transactions.map(t => t.registrationId).filter((v): v is number => v != null)));
  const regs = regIds.length
    ? await prisma.registration.findMany({ where: { id: { in: regIds } }, select: { id: true, fname: true, lname: true, status: true } })
    : [];
  const regMap = new Map(regs.map(r => [r.id, r]));

  return NextResponse.json(transactions.map(t => {
    const reg = t.registrationId != null ? regMap.get(t.registrationId) : undefined;
    return { ...t, registrantName: reg ? `${reg.fname} ${reg.lname}` : null, registrationStatus: reg?.status ?? null };
  }));
}

// POST { action: "resend", registrationId } — resend the ticket email in one click.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("transactions", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { action, registrationId } = await req.json();

  if (action === "resend") {
    if (!registrationId) return NextResponse.json({ error: "registrationId requis" }, { status: 400 });
    const sent = await sendRegistrationTicketTracked(Number(registrationId));
    if (!sent) return NextResponse.json({ error: "Échec de l'envoi" }, { status: 500 });
    logAction(req, "UPDATE", "registration", registrationId, { action: "resend_ticket" });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
