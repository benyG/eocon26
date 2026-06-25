import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("live", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const activeThreshold = new Date(now.getTime() - 3 * 60 * 1000); // 3 min ago

  const [onlineCount, totalConnected, recentParticipants, questionCounts] = await Promise.all([
    prisma.onlineSession.count({
      where: { lastSeenAt: { gte: activeThreshold }, expiresAt: { gt: now } },
    }),
    prisma.onlineSession.count({
      where: { expiresAt: { gt: now } },
    }),
    prisma.onlineSession.findMany({
      where: { lastSeenAt: { gte: new Date(now.getTime() - 30 * 60 * 1000) } },
      orderBy: { lastSeenAt: "desc" },
      take: 50,
      include: {
        registration: { select: { fname: true, lname: true, ticketType: true } },
      },
    }),
    prisma.sessionQuestion.groupBy({
      by: ["approved", "answered", "hidden"],
      _count: { id: true },
    }),
  ]);

  let pending = 0, approved = 0, answered = 0;
  for (const g of questionCounts) {
    if (g.hidden) continue;
    if (g.answered)                    answered += g._count.id;
    else if (g.approved)               approved += g._count.id;
    else if (!g.approved && !g.answered) pending += g._count.id;
  }

  return NextResponse.json({
    onlineCount,
    totalConnected,
    participants: recentParticipants.map((s: typeof recentParticipants[0]) => ({
      id: s.id,
      name: s.registration ? `${s.registration.fname} ${s.registration.lname}` : "Participant",
      ticketType: s.registration?.ticketType ?? "—",
      lastSeenAt: s.lastSeenAt,
      ipAddress:  s.ipAddress,
    })),
    questions: { pending, approved, answered, total: pending + approved + answered },
  });
}
