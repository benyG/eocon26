import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUBLIC endpoint — no auth required.
// Called by the live player every minute to record heartbeat and accumulate attendance.
export async function POST(req: NextRequest) {
  let token: string | undefined;
  try {
    const body = await req.json() as { token?: string };
    token = body.token;
  } catch {
    return NextResponse.json({ ok: false });
  }

  if (!token) return NextResponse.json({ ok: false });

  const presence = await prisma.livePresence.findUnique({ where: { liveToken: token } });
  if (!presence) return NextResponse.json({ ok: false });

  const updated = await prisma.livePresence.update({
    where: { liveToken: token },
    data: {
      lastHeartbeat: new Date(),
      totalMinutes: { increment: 1 },
    },
    select: { totalMinutes: true },
  });

  return NextResponse.json({ ok: true, totalMinutes: updated.totalMinutes });
}
