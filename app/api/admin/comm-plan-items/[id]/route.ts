import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Generic status changes (e.g. marking an item "skipped" or "done" by hand) are
// gated on the communication permission — the calendar itself lives under
// Communication, and this only ever touches the soft planning row, never the
// underlying resource (which stays governed by its own module's permission).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const { status } = await req.json();
  if (!["pending_setup", "scheduled", "done", "skipped"].includes(status)) {
    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  }
  const updated = await prisma.commPlanItem.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  await prisma.commPlanItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
