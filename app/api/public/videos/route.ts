export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const videos = await prisma.sessionVideo.findMany({
      where: { isVisible: true },
      orderBy: [{ edition: "desc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json(videos);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
