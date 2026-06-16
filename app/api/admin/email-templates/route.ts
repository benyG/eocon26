import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("communication", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const template = await prisma.emailTemplate.create({ data });
  return NextResponse.json(template, { status: 201 });
}
