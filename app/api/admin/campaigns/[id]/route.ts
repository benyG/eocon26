import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const campaign = await prisma.campaign.findUnique({ where: { id: parseInt(params.id) } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Recent per-recipient logs for the history detail view.
  const logs = await prisma.emailLog.findMany({
    where: { campaignId: campaign.id },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ ...campaign, logs });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // A campaign that has already been sent is locked (history integrity).
  if (existing.status === "sent" || existing.status === "sending") {
    return NextResponse.json({ error: "Campagne déjà envoyée — non modifiable" }, { status: 409 });
  }
  const { name, subject, htmlBody, segment } = await req.json();
  return NextResponse.json(
    await prisma.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(subject !== undefined && { subject: subject.trim() }),
        ...(htmlBody !== undefined && { htmlBody }),
        ...(segment !== undefined && { segment: typeof segment === "string" ? segment : JSON.stringify(segment) }),
      },
    })
  );
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.campaign.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
