import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("profiles", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const profiles = await prisma.adminProfile.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("profiles", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { slug, name, description, color, permissions } = await req.json();
  if (!slug || !name) return NextResponse.json({ error: "slug et name requis" }, { status: 400 });

  const existing = await prisma.adminProfile.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });

  const profile = await prisma.adminProfile.create({
    data: {
      slug,
      name,
      description: description || "",
      color: color || "#888888",
      permissions: JSON.stringify(permissions || {}),
    },
  });
  return NextResponse.json(profile, { status: 201 });
}
