import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const planning = await prisma.sessionPlanning.findUnique({
    where: { id },
    include: {
      session: { select: { id: true, title: true, date: true, time: true, type: true, speakerName: true } },
      room: true,
    },
  });

  if (!planning) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(planning);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as {
    roomId?: number | null;
    lienWebinaire?: string | null;
    lienLive?: string | null;
    restreamEventId?: string | null;
    technicienIds?: number[];
    moderateurIds?: number[];
    panelistesExtra?: unknown[];
  };

  const data: Prisma.SessionPlanningUncheckedUpdateInput = {};
  if (body.roomId          !== undefined) data.roomId          = body.roomId;
  if (body.lienWebinaire   !== undefined) data.lienWebinaire   = body.lienWebinaire;
  if (body.lienLive        !== undefined) data.lienLive        = body.lienLive;
  if (body.restreamEventId !== undefined) data.restreamEventId = body.restreamEventId;
  if (body.technicienIds   !== undefined) data.technicienIds   = body.technicienIds;
  if (body.moderateurIds   !== undefined) data.moderateurIds   = body.moderateurIds;
  if (body.panelistesExtra !== undefined) data.panelistesExtra = body.panelistesExtra as Prisma.InputJsonValue[];

  const updated = await prisma.sessionPlanning.update({
    where: { id },
    data,
    include: {
      session: { select: { id: true, title: true, date: true, time: true, type: true, speakerName: true } },
      room: true,
    },
  });

  logAction(req, "update", "session_planning", id);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.sessionPlanning.delete({ where: { id } });

  logAction(req, "delete", "session_planning", id);
  return NextResponse.json({ ok: true });
}
