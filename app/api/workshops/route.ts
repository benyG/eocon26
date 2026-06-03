import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const workshops = await prisma.workshop.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(workshops);
  } catch (e) {
    console.error("[/api/workshops]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
