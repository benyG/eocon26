import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const challenges = await prisma.cTFChallenge.findMany({
    orderBy: [{ category: "asc" }, { status: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(challenges);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, category, difficulty, points, author, notes, sortOrder } = await req.json();
  if (!title || !category) return NextResponse.json({ error: "title and category required" }, { status: 400 });
  const challenge = await prisma.cTFChallenge.create({
    data: {
      title,
      category,
      difficulty: difficulty || "medium",
      points: points || 0,
      author: author || null,
      notes: notes || null,
      sortOrder: sortOrder || 0,
    },
  });
  return NextResponse.json(challenge, { status: 201 });
}
