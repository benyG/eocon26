import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sponsors = await prisma.sponsor.findMany({ orderBy: [{ tier: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json(sponsors);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const sponsor = await prisma.sponsor.create({ data });
  return NextResponse.json(sponsor, { status: 201 });
}
