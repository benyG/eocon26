export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const speakers = await prisma.pastSpeaker.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(speakers);
  } catch (e) {
    console.error("[/api/past-speakers]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
