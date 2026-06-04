import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profiles = await prisma.adminProfile.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
