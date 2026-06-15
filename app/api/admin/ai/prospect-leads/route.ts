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
  const { id, addedToPipeline, pitchJson, emailJson } = await req.json();
  const data: Record<string, unknown> = {};
  if (addedToPipeline !== undefined) data.addedToPipeline = addedToPipeline;
  if (pitchJson !== undefined) data.pitchJson = pitchJson;
  if (emailJson !== undefined) data.emailJson = emailJson;
  const lead = await prisma.prospectLead.update({ where: { id }, data });
  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.prospectLead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
