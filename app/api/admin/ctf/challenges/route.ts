import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission, canPublishCtf } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("ctf-challenges", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.cTFChallenge.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  // The FLAG is a secret: only holders of the CTF publish capability ever see it.
  if (await canPublishCtf()) return NextResponse.json(rows);
  return NextResponse.json(rows.map(({ flag: _flag, ...rest }) => rest));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("ctf-challenges", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      // Only the CTF publish capability may set a FLAG.
      flag: (await canPublishCtf()) ? (b.flag || null) : null,
    },
  });
  return NextResponse.json(ch, { status: 201 });
}
