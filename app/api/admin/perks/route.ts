import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { regeneratePackageJson } from "@/lib/packagePerks";

export const dynamic = "force-dynamic";

// Known perks + à-la-carte activations. isActivation = selectable individually (#4).
const SEED_PERKS = [
  { labelFr: "Logo sur supports print & digital", labelEn: "Logo on print & digital materials", category: "Visibilité", isActivation: false },
  { labelFr: "Logo premium sur le site web", labelEn: "Premium website logo", category: "Digital", isActivation: false },
  { labelFr: "Stand premium 6 m²", labelEn: "Premium 6 sqm booth", category: "Présence", isActivation: false },
  { labelFr: "Pass VIP", labelEn: "VIP passes", category: "Présence", isActivation: false },
  { labelFr: "Annonce dédiée (email & réseaux)", labelEn: "Dedicated announcement (e-mail & networks)", category: "Digital", isActivation: false },
  { labelFr: "Goodies/supports dans les kits participants", labelEn: "Goodies/materials in attendee kits", category: "Présence", isActivation: false },
  { labelFr: "Statut Partenaire Stratégique", labelEn: "Strategic Partner status", category: "Visibilité", isActivation: false },
  { labelFr: "Branding pendant les sessions", labelEn: "Branding during sessions", category: "Visibilité", isActivation: false },
  { labelFr: "Diffusion d'offres d'emploi", labelEn: "Job postings shared", category: "Talents", isActivation: false },
  // Activations à la carte
  { labelFr: "Keynote officielle", labelEn: "Official keynote presentation", category: "Activation", isActivation: true },
  { labelFr: "Cocktail privé", labelEn: "Private cocktail", category: "Activation", isActivation: true },
  { labelFr: "Organisation d'un panel", labelEn: "Organization of a panel", category: "Activation", isActivation: true },
  { labelFr: "Prix aux talents du CTF", labelEn: "Award to CTF talents", category: "Talents", isActivation: true },
  { labelFr: "Sponsor du livestream", labelEn: "Livestream sponsor", category: "Activation", isActivation: true },
  { labelFr: "Sponsor du Wi-Fi", labelEn: "Wi-Fi sponsor", category: "Activation", isActivation: true },
  { labelFr: "Lounge VIP", labelEn: "VIP lounge", category: "Activation", isActivation: true },
  { labelFr: "Session Women in Cybersecurity", labelEn: "Women in Cybersecurity session", category: "Activation", isActivation: true },
  { labelFr: "Sponsor du badge participant", labelEn: "Attendee badge sponsor", category: "Activation", isActivation: true },
  { labelFr: "Sponsor des pass étudiants", labelEn: "Student pass sponsor", category: "Talents", isActivation: true },
];

// Default tier -> { perk labelEn: quantity|null } mapping, applied only to packages with
// no assignments yet, so the structure is immediately usable after seeding.
const DEFAULT_MAP: Record<string, Record<string, number | null>> = {
  PLATINUM: {
    "Logo on print & digital materials": null, "Premium website logo": null, "Premium 6 sqm booth": null,
    "VIP passes": 15, "Dedicated announcement (e-mail & networks)": null, "Goodies/materials in attendee kits": null,
    "Strategic Partner status": null, "Branding during sessions": null, "Job postings shared": null,
    "Official keynote presentation": null, "Private cocktail": null, "Organization of a panel": null,
  },
  GOLD: {
    "Logo on print & digital materials": null, "Premium website logo": null, "Premium 6 sqm booth": null,
    "VIP passes": 6, "Dedicated announcement (e-mail & networks)": null, "Branding during sessions": null,
    "Job postings shared": null, "Organization of a panel": null,
  },
  SILVER: {
    "Logo on print & digital materials": null, "Premium website logo": null, "VIP passes": 3,
    "Dedicated announcement (e-mail & networks)": null,
  },
  BRONZE: { "Premium website logo": null, "VIP passes": 1 },
  PARTNER: { "Strategic Partner status": null, "Premium website logo": null },
};

export async function GET() {
  if (!(await hasPermission("sponsor-packages", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.perk.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();

  if (body.seed) {
    const existing = await prisma.perk.count();
    if (existing > 0) return NextResponse.json({ error: "Already seeded", count: existing }, { status: 409 });
    await prisma.perk.createMany({ data: SEED_PERKS.map((p, i) => ({ ...p, sortOrder: i })) });
    const perks = await prisma.perk.findMany();
    const byEn = new Map(perks.map(p => [p.labelEn, p.id]));

    // Auto-assign to packages that have no perks yet.
    const packages = await prisma.sponsorPackage.findMany({ include: { packagePerks: true } });
    for (const pkg of packages) {
      if (pkg.packagePerks.length > 0) continue;
      const map = DEFAULT_MAP[pkg.tier.toUpperCase()];
      if (!map) continue;
      const data = Object.entries(map)
        .map(([labelEn, quantity], i) => {
          const perkId = byEn.get(labelEn);
          return perkId ? { packageId: pkg.id, perkId, quantity, sortOrder: i } : null;
        })
        .filter(Boolean) as { packageId: number; perkId: number; quantity: number | null; sortOrder: number }[];
      if (data.length) {
        await prisma.packagePerk.createMany({ data, skipDuplicates: true });
        await regeneratePackageJson(pkg.id);
      }
    }
    return NextResponse.json({ seeded: perks.length });
  }

  const { labelFr, labelEn, category, isActivation, sortOrder } = body;
  if (!labelFr || !labelEn) return NextResponse.json({ error: "labelFr and labelEn are required" }, { status: 400 });
  const perk = await prisma.perk.create({
    data: { labelFr, labelEn, category: category || null, isActivation: !!isActivation, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(perk, { status: 201 });
}
