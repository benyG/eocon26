import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const types = await prisma.ticketType.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });

  // Count sold per slug
  const regs = await prisma.registration.groupBy({ by: ["ticketType"], _count: { id: true } });
  const soldMap: Record<string, number> = {};
  regs.forEach(r => { soldMap[r.ticketType] = r._count.id; });

  const now = new Date();
  return NextResponse.json(types.map(t => {
    const earlyBirdActive = !!(t.earlyBirdUntil && t.earlyBirdUntil > now && t.earlyBirdPriceFr);
    return {
      ...t,
      perksFr: JSON.parse(t.perksFr || "[]"),
      perksEn: JSON.parse(t.perksEn || "[]"),
      activePriceFr: earlyBirdActive ? t.earlyBirdPriceFr : t.priceFr,
      activePriceEn: earlyBirdActive ? t.earlyBirdPriceEn : t.priceEn,
      earlyBirdActive,
      sold: soldMap[t.slug] || 0,
      available: t.maxCapacity - (soldMap[t.slug] || 0),
    };
  }));
}
