import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("budget", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.budgetItem.findMany({ orderBy: { category: "asc" } }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("budget", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  return NextResponse.json(await prisma.budgetItem.create({ data }), { status: 201 });
}
