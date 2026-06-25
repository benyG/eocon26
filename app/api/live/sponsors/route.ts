import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sponsors = await prisma.sponsor.findMany({
    where: { showOnLive: true, isVisible: true },
    select: { id: true, name: true, logoUrl: true, website: true, tier: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(sponsors, { headers: { "Cache-Control": "no-store" } });
}
