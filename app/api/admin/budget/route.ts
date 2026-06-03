import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.budgetItem.findMany({ orderBy: { category: "asc" } }));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  return NextResponse.json(await prisma.budgetItem.create({ data }), { status: 201 });
}
