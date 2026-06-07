import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendVolunteerShortlisted, sendVolunteerAccepted, sendVolunteerOnboarding, sendVolunteerRejected } from "@/lib/email";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

type VolStage = "submitted" | "reviewing" | "shortlisted" | "accepted" | "onboarding" | "confirmed" | "rejected";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vols = await prisma.volunteerApplication.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(vols);
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, stage, assignedRole }: { id: number; stage: VolStage; assignedRole?: string } = body;

  const vol = await prisma.volunteerApplication.findUnique({ where: { id } });
  if (!vol) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { volunteerStage: stage };
  if (assignedRole !== undefined) updateData.assignedRole = assignedRole;

  // Map stage to legacy status field
  if (stage === "accepted" || stage === "onboarding" || stage === "confirmed") updateData.status = "accepted";
  else if (stage === "rejected") updateData.status = "rejected";
  else updateData.status = "pending";

  const updated = await prisma.volunteerApplication.update({ where: { id }, data: updateData });
  logAction(req, "UPDATE", "volunteer", id, { stage });

  const lang = vol.langExpression === "en" ? "en" : "fr";
  const prevStage = (vol as Record<string, unknown>).volunteerStage as string | undefined;

  if (stage !== prevStage) {
    if (stage === "shortlisted") sendVolunteerShortlisted(vol.email, vol.name, lang).catch(e => console.error("[vol shortlisted email]", e));
    if (stage === "accepted") sendVolunteerAccepted(vol.email, vol.name, assignedRole || vol.assignedRole || "À confirmer", lang).catch(e => console.error("[vol accepted email]", e));
    if (stage === "onboarding") sendVolunteerOnboarding(vol.email, vol.name, assignedRole || vol.assignedRole || "À confirmer", lang).catch(e => console.error("[vol onboarding email]", e));
    if (stage === "rejected") sendVolunteerRejected(vol.email, vol.name, lang).catch(e => console.error("[vol rejected email]", e));
  }

  return NextResponse.json(updated);
}
