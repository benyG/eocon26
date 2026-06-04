export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sessions = await prisma.conferenceSession.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
