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
  const { id, addedToPipeline } = await req.json();

  const lead = await prisma.prospectLead.update({
    where: { id },
    data: { addedToPipeline },
  });

  // If adding to pipeline, create a SponsorProspect
  if (addedToPipeline) {
    await prisma.sponsorProspect.create({
      data: {
        org: lead.org,
        contact: lead.contactName || undefined,
        email: lead.contactEmail || undefined,
        phone: lead.phone || undefined,
        package: lead.recommendedPackage || undefined,
        status: "contacted",
        notes: lead.aiScoreReason || undefined,
      },
    });
  }

  return NextResponse.json(lead);
}
