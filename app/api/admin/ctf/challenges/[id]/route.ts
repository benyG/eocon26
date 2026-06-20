import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendCTFChallengeAssigned } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("ctf", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const existing = await prisma.cTFChallenge.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await req.json();
  const updated = await prisma.cTFChallenge.update({ where: { id }, data });

  // Notify the assignee when the challenge is (re)assigned to a new person.
  if (updated.assigneeEmail && updated.assigneeEmail !== existing.assigneeEmail) {
    sendCTFChallengeAssigned(updated.assigneeEmail, updated.assigneeName || "", updated)
      .catch(e => console.error("[ctf assigned email]", e));
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("ctf", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.cTFChallenge.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}
