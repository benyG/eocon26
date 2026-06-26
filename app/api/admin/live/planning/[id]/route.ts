import { NextRequest, NextResponse } from "next/server";
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

  const updated = await prisma.sessionPlanning.update({
    where: { id },
    data: {
      ...(body.roomId          !== undefined ? { roomId:          body.roomId          } : {}),
      ...(body.lienWebinaire   !== undefined ? { lienWebinaire:   body.lienWebinaire   } : {}),
      ...(body.lienLive        !== undefined ? { lienLive:        body.lienLive        } : {}),
      ...(body.restreamEventId !== undefined ? { restreamEventId: body.restreamEventId } : {}),
      ...(body.technicienIds   !== undefined ? { technicienIds:   body.technicienIds   } : {}),
      ...(body.moderateurIds   !== undefined ? { moderateurIds:   body.moderateurIds   } : {}),
      ...(body.panelistesExtra !== undefined ? { panelistesExtra: body.panelistesExtra } : {}),
    },
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
