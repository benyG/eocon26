import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await hasPermission("logistics", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const where = sector && sector !== "all" ? { sector } : {};
  const prospects = await prisma.logisticsProspect.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(prospects);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json() as {
    sector: string; name: string; contactName?: string; contactTitle?: string;
    email?: string; phone?: string; website?: string; address?: string; city?: string;
    googlePlaceId?: string; googleRating?: number; source?: string;
  };
  if (!body.sector || !body.name) return NextResponse.json({ error: "sector and name required" }, { status: 400 });

  const existing = body.googlePlaceId
    ? await prisma.logisticsProspect.findUnique({ where: { googlePlaceId: body.googlePlaceId } })
    : null;
  if (existing) return NextResponse.json(existing);

  const prospect = await prisma.logisticsProspect.create({
    data: {
      sector: body.sector,
      name: body.name,
      contactName: body.contactName ?? null,
      contactTitle: body.contactTitle ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      address: body.address ?? null,
      city: body.city ?? "Douala",
      googlePlaceId: body.googlePlaceId ?? null,
      googleRating: body.googleRating ?? null,
      source: body.source ?? "manual",
    },
  });
  return NextResponse.json(prospect, { status: 201 });
}
