import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Registrations over time (last 60 days, grouped by day)
  const registrations = await prisma.registration.findMany({
    select: { createdAt: true, ticketType: true, country: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const byDate: Record<string, number> = {};
  for (const r of registrations) {
    const d = r.createdAt.toISOString().slice(0, 10);
    byDate[d] = (byDate[d] || 0) + 1;
  }

  // By ticket type
  const byTicket: Record<string, number> = {};
  for (const r of registrations) {
    byTicket[r.ticketType] = (byTicket[r.ticketType] || 0) + 1;
  }

  // By country (top 10)
  const byCountry: Record<string, number> = {};
  for (const r of registrations) {
    if (r.country) byCountry[r.country] = (byCountry[r.country] || 0) + 1;
  }
  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  // CFP conversion rate
  const cfpTotal = await prisma.cFPSubmission.count();
  const cfpAccepted = await prisma.cFPSubmission.count({ where: { status: "accepted" } });

  // Check-in rate
  const checkedIn = await prisma.registration.count({ where: { checkedInAt: { not: null } } });

  // Volunteer acceptance
  const volTotal = await prisma.volunteerApplication.count();
  const volAccepted = await prisma.volunteerApplication.count({ where: { status: "accepted" } });

  return NextResponse.json({
    registrationCurve: Object.entries(byDate).map(([date, count]) => ({ date, count })),
    byTicket,
    topCountries,
    totalRegistrations: registrations.length,
    checkedIn,
    cfpTotal,
    cfpAccepted,
    cfpRate: cfpTotal > 0 ? Math.round((cfpAccepted / cfpTotal) * 100) : 0,
    volTotal,
    volAccepted,
    volRate: volTotal > 0 ? Math.round((volAccepted / volTotal) * 100) : 0,
  });
}
