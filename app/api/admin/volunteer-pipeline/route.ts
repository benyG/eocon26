import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendVolunteerShortlisted, sendVolunteerAccepted, sendVolunteerOnboarding, sendVolunteerRejected } from "@/lib/email";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

type VolStage = "submitted" | "reviewing" | "shortlisted" | "accepted" | "onboarding" | "confirmed" | "rejected";

const EDITABLE_FIELDS = ["name", "email", "phone", "city", "role", "experience", "motivation", "linkedin", "twitter", "whatsapp", "hoursPerWeek", "langExpression"] as const;

export async function GET(req: NextRequest) {
  if (!(await hasPermission("volunteers", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const vols = await prisma.volunteerApplication.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(vols);
}

// Handles two independent things on the same record:
//  - a stage change (kanban drag/drop or action buttons) — triggers the status
//    recalculation and the stage-transition email, exactly as before;
//  - a plain profile edit (name/phone/city/experience/…) — when `stage` is NOT
//    provided, only the whitelisted fields are updated: no status recalculation,
//    no email sent. Both can be combined in a single call.
export async function PATCH(req: NextRequest) {
  if (!(await hasPermission("volunteers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { id, stage, assignedRole }: { id: number; stage?: VolStage; assignedRole?: string } = body;

  const vol = await prisma.volunteerApplication.findUnique({ where: { id } });
  if (!vol) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) updateData[key] = body[key];
  }

  if (stage !== undefined) {
    updateData.volunteerStage = stage;
    if (assignedRole !== undefined) updateData.assignedRole = assignedRole;
    // Map stage to legacy status field
    if (stage === "accepted" || stage === "onboarding" || stage === "confirmed") updateData.status = "accepted";
    else if (stage === "rejected") updateData.status = "rejected";
    else updateData.status = "pending";
  } else if (assignedRole !== undefined) {
    updateData.assignedRole = assignedRole;
  }

  const updated = await prisma.volunteerApplication.update({ where: { id }, data: updateData });
  logAction(req, "UPDATE", "volunteer", id, stage !== undefined ? { stage } : { edited: Object.keys(updateData).join(",") });

  const lang = vol.langExpression === "en" ? "en" : "fr";
  const prevStage = (vol as Record<string, unknown>).volunteerStage as string | undefined;

  if (stage !== undefined && stage !== prevStage) {
    if (stage === "shortlisted") sendVolunteerShortlisted(vol.email, vol.name, lang).catch(e => console.error("[vol shortlisted email]", e));
    if (stage === "accepted") sendVolunteerAccepted(vol.email, vol.name, assignedRole || vol.assignedRole || "À confirmer", lang).catch(e => console.error("[vol accepted email]", e));
    if (stage === "onboarding") sendVolunteerOnboarding(vol.email, vol.name, assignedRole || vol.assignedRole || "À confirmer", lang).catch(e => console.error("[vol onboarding email]", e));
    if (stage === "rejected") sendVolunteerRejected(vol.email, vol.name, lang).catch(e => console.error("[vol rejected email]", e));
  }

  return NextResponse.json(updated);
}
