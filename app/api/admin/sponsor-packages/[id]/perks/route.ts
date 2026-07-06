import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { regeneratePackageJson } from "@/lib/packagePerks";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsor-packages", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.packagePerk.findMany({
    where: { packageId: parseInt(params.id) },
    include: { perk: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(rows);
}

// Replace the whole set of perk assignments for a package (source of truth), then
// regenerate the legacy perksFr/perksEn JSON so the public site stays in sync.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const packageId = parseInt(params.id);
  const { perks } = await req.json() as { perks: { perkId: number; quantity?: number | null }[] };
  if (!Array.isArray(perks)) return NextResponse.json({ error: "perks[] required" }, { status: 400 });

  await prisma.$transaction([
    prisma.packagePerk.deleteMany({ where: { packageId } }),
    prisma.packagePerk.createMany({
      data: perks.map((p, i) => ({
        packageId,
        perkId: p.perkId,
        quantity: p.quantity ?? null,
        sortOrder: i,
      })),
      skipDuplicates: true,
    }),
  ]);
  await regeneratePackageJson(packageId);

  const rows = await prisma.packagePerk.findMany({
    where: { packageId },
    include: { perk: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(rows);
}
