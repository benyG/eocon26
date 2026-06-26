import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const plannings = await prisma.sessionPlanning.findMany({
    include: {
      session: {
        select: {
          id: true,
          title: true,
          date: true,
          time: true,
          type: true,
          speakerName: true,
        },
      },
      room: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(plannings);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    sessionId?: number;
    roomId?: number | null;
    lienWebinaire?: string | null;
    lienLive?: string | null;
    restreamEventId?: string | null;
    technicienIds?: number[];
    moderateurIds?: number[];
    panelistesExtra?: unknown[];
  };

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const planning = await prisma.sessionPlanning.upsert({
    where: { sessionId: body.sessionId },
    create: {
      sessionId: body.sessionId,
      roomId: body.roomId ?? null,
      lienWebinaire: body.lienWebinaire ?? null,
      lienLive: body.lienLive ?? null,
      restreamEventId: body.restreamEventId ?? null,
      technicienIds: body.technicienIds ?? [],
      moderateurIds: body.moderateurIds ?? [],
      panelistesExtra: body.panelistesExtra ?? [],
    },
    update: {
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

  logAction(req, "upsert", "session_planning", planning.id, { sessionId: body.sessionId });
  return NextResponse.json(planning);
}
