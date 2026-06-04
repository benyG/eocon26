export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { tier: "asc" }],
    });
    return NextResponse.json(sponsors);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
