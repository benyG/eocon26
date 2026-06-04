import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.prospectLead.findMany({ orderBy: [{ aiScore: "desc" }, { createdAt: "desc" }] }));
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
