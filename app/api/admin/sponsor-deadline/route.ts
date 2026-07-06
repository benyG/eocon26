import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getSponsorDeadlines, getNextSponsorDeadline } from "@/lib/sponsorBilling";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = (await hasPermission("sponsor-pipeline", "read")) || (await hasPermission("prospection", "read"));
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const next = await getNextSponsorDeadline();
  const all = await getSponsorDeadlines();
  return NextResponse.json({
    next: next ? { key: next.key, labelFr: next.labelFr, labelEn: next.labelEn, date: next.date.toISOString(), daysLeft: next.daysLeft } : null,
    all: all.map(d => ({ key: d.key, labelFr: d.labelFr, labelEn: d.labelEn, date: d.date.toISOString() })),
  });
}
