import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as {
    name?: string;
    type?: string;
    guestLink?: string | null;
    jaasRoom?: string | null;
    sortOrder?: number;
  };

  const updated = await prisma.streamingRoom.update({
    where: { id },
    data: {
      ...(body.name      !== undefined ? { name:      body.name      } : {}),
      ...(body.type      !== undefined ? { type:      body.type      } : {}),
      ...(body.guestLink !== undefined ? { guestLink: body.guestLink } : {}),
      ...(body.jaasRoom  !== undefined ? { jaasRoom:  body.jaasRoom  } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  logAction(req, "update", "streaming_room", id, { name: updated.name });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.streamingRoom.delete({ where: { id } });

  logAction(req, "delete", "streaming_room", id);
  return NextResponse.json({ ok: true });
}
