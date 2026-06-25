import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("ctf", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get ticket types with CTF access
  const ctfTickets = await prisma.ticketType.findMany({ where: { includesCTF: true } });
  const ctfSlugs = ctfTickets.map(t => t.slug);

  const participants = await prisma.registration.findMany({
    where: { status: "validated", ticketType: { in: ctfSlugs } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, fname: true, lname: true, email: true,
      ctfCompetitorName: true, ctfTeamName: true,
      ctfAccountCreated: true, ctfPassword: true,
      langExpression: true, ticketType: true,
    },
  });

  return NextResponse.json(participants);
}
