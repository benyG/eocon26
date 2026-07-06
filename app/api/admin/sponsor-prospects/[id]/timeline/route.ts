import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

interface Event { at: string; kind: string; label: string; detail?: string; future?: boolean }

// Assemble a prospect's activity history from real records (no synthetic data):
// lifecycle timestamps, sent emails (+ open/click), follow-up reminders, documents,
// and conclusion.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = (await hasPermission("sponsor-pipeline", "read")) || (await hasPermission("prospection", "read"));
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id);
  const p = await prisma.sponsorProspect.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events: Event[] = [];
  const push = (at: Date | null | undefined, kind: string, label: string, detail?: string, future = false) => {
    if (!at) return;
    events.push({ at: new Date(at).toISOString(), kind, label, detail, future });
  };

  push(p.createdAt, "created", "Prospect créé");
  push(p.contactedAt, "contact", "Premier contact");

  // Emails actually sent to this prospect (with delivery/open/click if tracked).
  if (p.email) {
    const emails = await prisma.emailLog.findMany({ where: { recipient: p.email }, orderBy: { sentAt: "desc" }, take: 50 });
    for (const e of emails) {
      const flags = [e.openedAt ? "ouvert" : null, e.clickedAt ? "cliqué" : null, e.bouncedAt ? "rejeté" : null].filter(Boolean).join(", ");
      push(e.sentAt, "email", `Email envoyé : ${e.subject}`, flags || undefined);
    }
  }

  // Follow-up reminders sent to the assignee (J+2 / J+5 / …), dated from first contact.
  if (p.contactedAt && p.followupStage) {
    const base = new Date(p.contactedAt).getTime();
    for (const stage of p.followupStage.split(",").map(s => s.trim()).filter(Boolean)) {
      const days = parseInt(stage.replace(/[^0-9]/g, "")) || 0;
      push(new Date(base + days * 86400000), "reminder", `Rappel de relance ${stage}`, "interne");
    }
  }
  push(p.nextFollowupAt, "next", "Prochaine relance prévue", undefined, new Date(p.nextFollowupAt || 0).getTime() > Date.now());

  // Conclusion + documents issued (from the linked sponsor).
  if (p.sponsorId) {
    const sp = await prisma.sponsor.findUnique({ where: { id: p.sponsorId } });
    if (sp) {
      push(sp.createdAt, "concluded", "Sponsor conclu & publié", sp.tier);
      push(sp.proformaAt, "document", "Proforma émise", sp.proformaNumber || undefined);
      push(sp.invoiceAt, "document", "Facture émise", sp.invoiceNumber || undefined);
    }
  }

  // Non-email audit actions (e.g. conclude) for completeness.
  const audits = await prisma.auditLog.findMany({
    where: { resourceId: String(id), resource: { in: ["sponsor_prospect"] } },
    orderBy: { createdAt: "desc" }, take: 30,
  });
  for (const a of audits) {
    const d = (a.details || {}) as Record<string, unknown>;
    if (d.conclude) push(a.createdAt, "concluded", "Conclusion validée", a.actor);
  }

  const past = events.filter(e => !e.future).sort((a, b) => b.at.localeCompare(a.at));
  const upcoming = events.filter(e => e.future);
  return NextResponse.json({ upcoming, past });
}
