import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.cTFChallenge.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, category, difficulty, points, author, notes } = await req.json();
  if (!title || !category) return NextResponse.json({ error: "title et category requis" }, { status: 400 });
  const ch = await prisma.cTFChallenge.create({
    data: { title, category, difficulty: difficulty || "medium", points: points || 0, author: author || null, notes: notes || null },
  });
  return NextResponse.json(ch, { status: 201 });
}
