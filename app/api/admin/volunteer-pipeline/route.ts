import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { sendVolunteerAccepted } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const volunteers = await prisma.volunteerApplication.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(volunteers);
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, volunteerStage, assignedRole } = await req.json();
  if (!id || !volunteerStage) {
    return NextResponse.json({ error: "id and volunteerStage required" }, { status: 400 });
  }

  const update: Record<string, unknown> = { volunteerStage };
  if (assignedRole !== undefined) update.assignedRole = assignedRole;

  const volunteer = await prisma.volunteerApplication.update({
    where: { id: Number(id) },
    data: update,
  });

  // Auto-notify on key stage transitions
  if (volunteerStage === "accepted" && volunteer.email) {
    try {
      await sendVolunteerAccepted(volunteer.email, volunteer.name, volunteer.assignedRole || "À confirmer");
    } catch (e) {
      console.warn("sendVolunteerAccepted failed:", e);
    }
  }

  return NextResponse.json(volunteer);
}
