import { prisma } from "@/lib/db";

// Format a perk line with an optional quantity, e.g. (15, "VIP passes") -> "15× VIP passes".
export function formatPerkLabel(label: string, quantity?: number | null): string {
  return quantity && quantity > 1 ? `${quantity}× ${label}` : label;
}

// The structured PackagePerk rows are the source of truth. The public site and the
// sponsorship deck still read the legacy perksFr/perksEn JSON arrays, so we regenerate
// those from the assignments on every change — keeping display backward-compatible.
export async function regeneratePackageJson(packageId: number): Promise<void> {
  const rows = await prisma.packagePerk.findMany({
    where: { packageId },
    include: { perk: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const perksFr = rows.map(r => formatPerkLabel(r.perk.labelFr, r.quantity));
  const perksEn = rows.map(r => formatPerkLabel(r.perk.labelEn, r.quantity));
  await prisma.sponsorPackage.update({
    where: { id: packageId },
    data: { perksFr: JSON.stringify(perksFr), perksEn: JSON.stringify(perksEn) },
  });
}
