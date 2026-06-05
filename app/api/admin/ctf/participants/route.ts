import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all ticket types with CTF access
  const ctfTicketTypes = await prisma.ticketType.findMany({
    where: { OR: [{ includesCTF: true }, { ctfAccess: true }] },
  });
  const ctfSlugs = ctfTicketTypes.map(t => t.slug);
  const ctfNames = ctfTicketTypes.flatMap(t => [t.nameFr, t.nameEn]);

  const registrations = await prisma.registration.findMany({
    where: {
      status: "validated",
      OR: [
        { ticketType: { in: ctfSlugs } },
        { ticketType: { in: ctfNames } },
      ],
    },
    select: {
      id: true,
      fname: true,
      lname: true,
      email: true,
      ticketType: true,
      ctfCompetitorName: true,
      ctfTeamName: true,
      ctfAccountCreated: true,
      langExpression: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(registrations);
}
