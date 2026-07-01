import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("prospection", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.prospectLead.findMany({ orderBy: [{ aiScore: "desc" }, { createdAt: "desc" }] }));
}

export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, addedToPipeline, assigneeId, ...editableFields } = body;

  const updateData: Record<string, unknown> = { ...editableFields };
  if (addedToPipeline !== undefined) updateData.addedToPipeline = addedToPipeline;

  const existing = await prisma.prospectLead.findUnique({ where: { id } });
  const lead = await prisma.prospectLead.update({ where: { id }, data: updateData });

  // Only create SponsorProspect when transitioning to addedToPipeline=true for the first time
  if (addedToPipeline === true && !existing?.addedToPipeline) {
    const alreadyExists = await prisma.sponsorProspect.findFirst({
      where: { org: lead.org }, // MySQL collation is case-insensitive by default
    });
    if (!alreadyExists) {
      await prisma.sponsorProspect.create({
        data: {
          org: lead.org,
          contact: lead.contactName || undefined,
          email: lead.contactEmail || undefined,
          phone: lead.phone || undefined,
          package: lead.recommendedPackage || undefined,
          status: "prospect",
          notes: lead.aiScoreReason || undefined,
          ...(assigneeId ? { assigneeId: parseInt(String(assigneeId), 10) } : {}),
        },
      });
    }
  }

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest) {
  if (!(await hasPermission("prospection", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  const lead = await prisma.prospectLead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lead.addedToPipeline) return NextResponse.json({ error: "Cannot delete a lead already in the pipeline" }, { status: 409 });
  await prisma.prospectLead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
