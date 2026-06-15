import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.teamMember.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, role, email, bio, photoUrl, linkedin, twitter, isVisible, sortOrder } = body;
  if (!name || !role) return NextResponse.json({ error: "name et role requis" }, { status: 400 });
  return NextResponse.json(await prisma.teamMember.create({
    data: {
      name, role,
      email: email || null,
      bio: bio || null,
      photoUrl: photoUrl || null,
      linkedin: linkedin || null,
      twitter: twitter || null,
      isVisible: isVisible !== false,
      sortOrder: sortOrder ?? 0,
    },
  }), { status: 201 });
}
