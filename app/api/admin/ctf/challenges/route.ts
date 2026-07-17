import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("ctf", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.cTFChallenge.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("ctf", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  const { title, category, difficulty, points, author, notes } = b;
  if (!title || !category) return NextResponse.json({ error: "title et category requis" }, { status: 400 });
  const ch = await prisma.cTFChallenge.create({
    data: {
      title, category,
      difficulty: difficulty || "medium",
      points: points || 0,
      author: author || null,
      notes: notes || null,
      fragmentCode: b.fragmentCode || null,
      fragmentName: b.fragmentName || null,
      isPrimeSeal: !!b.isPrimeSeal,
      storyArc: b.storyArc || null,
      linkedEntity: b.linkedEntity || null,
      locationEn: b.locationEn || null, locationFr: b.locationFr || null,
      artifactEn: b.artifactEn || null, artifactFr: b.artifactFr || null,
      contextEn: b.contextEn || null, contextFr: b.contextFr || null,
      objectiveEn: b.objectiveEn || null, objectiveFr: b.objectiveFr || null,
      revealEn: b.revealEn || null, revealFr: b.revealFr || null,
      techniqueNote: b.techniqueNote || null,
      flag: b.flag || null,
    },
  });
  return NextResponse.json(ch, { status: 201 });
}
