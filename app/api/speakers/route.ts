import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const speakers = await prisma.speaker.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(speakers);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
