export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const members = await prisma.teamMember.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(members);
  } catch (e) {
    console.error("[/api/team]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
