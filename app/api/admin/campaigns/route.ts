import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });

  // Aggregate per-campaign delivery/click metrics from the email log, counting
  // distinct recipients so resends don't double-count.
  const logs = await prisma.emailLog.findMany({
    where: { campaignId: { not: null } },
    select: { campaignId: true, recipient: true, deliveredAt: true, clickedAt: true },
  });
  const metrics = new Map<number, { delivered: Set<string>; clicked: Set<string> }>();
  for (const l of logs) {
    if (l.campaignId == null) continue;
    let m = metrics.get(l.campaignId);
    if (!m) { m = { delivered: new Set(), clicked: new Set() }; metrics.set(l.campaignId, m); }
    const r = l.recipient.toLowerCase();
    if (l.deliveredAt) m.delivered.add(r);
    if (l.clickedAt) m.clicked.add(r);
  }

  return NextResponse.json(campaigns.map(c => {
    const m = metrics.get(c.id);
    return { ...c, deliveredCount: m ? m.delivered.size : 0, clickedCount: m ? m.clicked.size : 0 };
  }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, subject, htmlBody, segment } = await req.json();
  if (!name?.trim() || !subject?.trim()) return NextResponse.json({ error: "name and subject are required" }, { status: 400 });
  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      subject: subject.trim(),
      htmlBody: htmlBody || "",
      segment: typeof segment === "string" ? segment : JSON.stringify(segment ?? { audience: "registrations" }),
      status: "draft",
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
