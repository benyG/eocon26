import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { computeCPE } from "@/lib/livePresence";

type PresenceWithReg = Prisma.LivePresenceGetPayload<{
  include: {
    registration: {
      select: {
        fname: true;
        lname: true;
        email: true;
        status: true;
        checkedInAt: true;
        paidAt: true;
      };
    };
  };
}>;

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const presences = await prisma.livePresence.findMany({
    include: {
      registration: {
        select: {
          fname: true,
          lname: true,
          email: true,
          status: true,
          checkedInAt: true,
          paidAt: true,
        },
      },
    },
    orderBy: { totalMinutes: "desc" },
  });

  const result = presences.map((p: PresenceWithReg) => ({
    registrationId: p.registrationId,
    fname: p.registration.fname,
    lname: p.registration.lname,
    email: p.registration.email,
    status: p.registration.status,
    checkedInAt: p.registration.checkedInAt,
    paidAt: p.registration.paidAt,
    totalMinutes: p.totalMinutes,
    cpe: computeCPE(p.totalMinutes),
    lastHeartbeat: p.lastHeartbeat,
  }));

  return NextResponse.json(result);
}
