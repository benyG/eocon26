import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { regeneratePackageJson } from "@/lib/packagePerks";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const { labelFr, labelEn, category, isActivation, isVisible, sortOrder } = await req.json();
  const perk = await prisma.perk.update({
    where: { id },
    data: {
      ...(labelFr !== undefined ? { labelFr } : {}),
      ...(labelEn !== undefined ? { labelEn } : {}),
      ...(category !== undefined ? { category: category || null } : {}),
      ...(isActivation !== undefined ? { isActivation: !!isActivation } : {}),
      ...(isVisible !== undefined ? { isVisible: !!isVisible } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  });
  // A label change ripples into the package display JSON.
  if (labelFr !== undefined || labelEn !== undefined) {
    const links = await prisma.packagePerk.findMany({ where: { perkId: id }, select: { packageId: true } });
    for (const l of Array.from(new Set(links.map(l => l.packageId)))) await regeneratePackageJson(l);
  }
  return NextResponse.json(perk);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const links = await prisma.packagePerk.findMany({ where: { perkId: id }, select: { packageId: true } });
  await prisma.perk.delete({ where: { id } }); // cascades package_perks; sets sponsor_perks.perkId null
  for (const l of Array.from(new Set(links.map(l => l.packageId)))) await regeneratePackageJson(l);
  return NextResponse.json({ success: true });
}
