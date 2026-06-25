import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as { approved?: boolean; answered?: boolean; hidden?: boolean; adminNote?: string };

  const updated = await prisma.sessionQuestion.update({
    where: { id },
    data: {
      ...(body.approved  !== undefined ? { approved:  body.approved  } : {}),
      ...(body.answered  !== undefined ? { answered:  body.answered  } : {}),
      ...(body.hidden    !== undefined ? { hidden:    body.hidden    } : {}),
      ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}),
    },
    select: { id: true, approved: true, answered: true, hidden: true },
  });

  return NextResponse.json({ ok: true, question: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.sessionQuestion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
