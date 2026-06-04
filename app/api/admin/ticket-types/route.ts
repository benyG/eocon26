import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const types = await prisma.ticketType.findMany({ orderBy: { sortOrder: "asc" } });
  const regs = await prisma.registration.groupBy({ by: ["ticketType"], _count: { id: true } });
  const soldMap: Record<string, number> = {};
  regs.forEach(r => { soldMap[r.ticketType] = r._count.id; });
  return NextResponse.json(types.map(t => ({ ...t, sold: soldMap[t.slug] || 0 })));
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, nameFr, nameEn, priceFr, priceEn, perksFr, perksEn, earlyBirdPriceFr, earlyBirdPriceEn, earlyBirdUntil, color, isFeatured, isVisible, maxCapacity, sortOrder } = await req.json();
  if (!slug || !nameFr || !nameEn) return NextResponse.json({ error: "slug, nameFr, nameEn requis" }, { status: 400 });

  const t = await prisma.ticketType.create({
    data: {
      slug, nameFr, nameEn,
      priceFr: priceFr || 0, priceEn: priceEn || 0,
      perksFr: JSON.stringify(perksFr || []),
      perksEn: JSON.stringify(perksEn || []),
      earlyBirdPriceFr: earlyBirdPriceFr || null,
      earlyBirdPriceEn: earlyBirdPriceEn || null,
      earlyBirdUntil: earlyBirdUntil ? new Date(earlyBirdUntil) : null,
      color: color || "#00ff9d",
      isFeatured: !!isFeatured,
      isVisible: isVisible !== false,
      maxCapacity: maxCapacity || 200,
      sortOrder: sortOrder || 0,
    },
  });
  return NextResponse.json(t, { status: 201 });
}
