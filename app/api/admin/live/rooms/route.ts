import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rooms = await prisma.streamingRoom.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    name?: string;
    type?: string;
    guestLink?: string;
    jaasRoom?: string;
    sortOrder?: number;
  };

  if (!body.name || !body.type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  // Auto-set jaasRoom for workshop rooms when not provided
  let jaasRoom = body.jaasRoom || null;
  if (body.type === "workshop" && !jaasRoom) {
    jaasRoom = "EOCON-" + body.name.replace(/\s+/g, "-").toUpperCase();
  }

  const room = await prisma.streamingRoom.create({
    data: {
      name: body.name,
      type: body.type,
      guestLink: body.guestLink || null,
      jaasRoom,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  logAction(req, "create", "streaming_room", room.id, { name: room.name, type: room.type });
  return NextResponse.json(room, { status: 201 });
}
