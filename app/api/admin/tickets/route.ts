import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const DEFAULT_TYPES = [
  { ticketType: "standard", maxCapacity: 200, alertPercent: 80 },
  { ticketType: "student", maxCapacity: 50, alertPercent: 80 },
  { ticketType: "vip", maxCapacity: 30, alertPercent: 90 },
  { ticketType: "sponsor", maxCapacity: 20, alertPercent: 100 },
  { ticketType: "online", maxCapacity: 500, alertPercent: 80 },
  { ticketType: "early-bird", maxCapacity: 50, alertPercent: 100 },
];

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tickets = await prisma.ticketCapacity.findMany({ orderBy: { ticketType: "asc" } });
  // Get registration counts per type
  const regs = await prisma.registration.groupBy({ by: ["ticketType"], _count: { id: true } });
  const countMap: Record<string, number> = {};
  regs.forEach(r => { countMap[r.ticketType] = r._count.id; });
  return NextResponse.json(tickets.map(t => ({ ...t, sold: countMap[t.ticketType] || 0 })));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (body.seed) {
    await prisma.ticketCapacity.createMany({ data: DEFAULT_TYPES, skipDuplicates: true });
    return NextResponse.json({ seeded: DEFAULT_TYPES.length });
  }
  const ticket = await prisma.ticketCapacity.create({ data: { ticketType: body.ticketType, maxCapacity: body.maxCapacity, alertPercent: body.alertPercent || 80 } });
  return NextResponse.json(ticket, { status: 201 });
}
