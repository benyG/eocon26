import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("sponsors", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sponsors = await prisma.sponsor.findMany({ orderBy: [{ tier: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json(sponsors);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("sponsors", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  // Prevent duplicate: if a sponsor with the same name already exists, update it instead
  const existing = await prisma.sponsor.findFirst({
    where: { name: data.name }, // MySQL collation is case-insensitive by default
  });
  if (existing) {
    const updated = await prisma.sponsor.update({ where: { id: existing.id }, data });
    return NextResponse.json(updated);
  }
  const sponsor = await prisma.sponsor.create({ data });
  return NextResponse.json(sponsor, { status: 201 });
}
