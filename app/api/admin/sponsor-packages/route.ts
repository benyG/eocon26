import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const DEFAULT_PACKAGES = [
  {
    tier: "PLATINUM",
    nameFr: "Partenaire Platinum",
    nameEn: "Platinum Partner",
    price: 5000000,
    maxSponsors: 2,
    sortOrder: 1,
    highlightColor: "#E5E4E2",
    perksFr: JSON.stringify([
      "Logo grande taille sur tous les supports (print + digital)",
      "Stand premium (6m²) dans l'espace d'exposition",
      "10 billets VIP inclus",
      "Prise de parole de 5 minutes lors de la cérémonie d'ouverture",
      "Mention dans tous les emails et réseaux sociaux",
      "Bannière sur le site web (homepage)",
      "Accès à la liste des participants (opt-in)",
      "Remise de gadjet/documentation dans les kits participants",
    ]),
    perksEn: JSON.stringify([
      "Large logo on all materials (print + digital)",
      "Premium booth (6m²) in exhibition area",
      "10 VIP tickets included",
      "5-minute speech at opening ceremony",
      "Mention in all emails and social media",
      "Homepage banner on website",
      "Access to attendee list (opt-in)",
      "Branded item/documentation in attendee kits",
    ]),
    perks: JSON.stringify([]),
  },
  {
    tier: "GOLD",
    nameFr: "Partenaire Gold",
    nameEn: "Gold Partner",
    price: 3000000,
    maxSponsors: 3,
    sortOrder: 2,
    highlightColor: "#FFD700",
    perksFr: JSON.stringify([
      "Logo sur tous les supports (print + digital)",
      "Stand standard (4m²) dans l'espace d'exposition",
      "6 billets inclus (dont 2 VIP)",
      "Mention dans les emails et réseaux sociaux",
      "Logo sur le site web",
      "Remise de documentation dans les kits participants",
    ]),
    perksEn: JSON.stringify([
      "Logo on all materials (print + digital)",
      "Standard booth (4m²) in exhibition area",
      "6 tickets included (2 VIP)",
      "Mention in emails and social media",
      "Logo on website",
      "Documentation in attendee kits",
    ]),
    perks: JSON.stringify([]),
  },
  {
    tier: "SILVER",
    nameFr: "Partenaire Silver",
    nameEn: "Silver Partner",
    price: 1500000,
    maxSponsors: 5,
    sortOrder: 3,
    highlightColor: "#C0C0C0",
    perksFr: JSON.stringify([
      "Logo sur les supports print",
      "Table de présentation (sans stand)",
      "4 billets inclus",
      "Mention sur les réseaux sociaux",
      "Logo sur le site web",
    ]),
    perksEn: JSON.stringify([
      "Logo on print materials",
      "Presentation table (no booth)",
      "4 tickets included",
      "Mention on social media",
      "Logo on website",
    ]),
    perks: JSON.stringify([]),
  },
  {
    tier: "BRONZE",
    nameFr: "Partenaire Bronze",
    nameEn: "Bronze Partner",
    price: 750000,
    maxSponsors: 10,
    sortOrder: 4,
    highlightColor: "#CD7F32",
    perksFr: JSON.stringify([
      "Logo sur les supports digitaux",
      "2 billets inclus",
      "Mention sur le site web",
    ]),
    perksEn: JSON.stringify([
      "Logo on digital materials",
      "2 tickets included",
      "Mention on website",
    ]),
    perks: JSON.stringify([]),
  },
  {
    tier: "PARTNER",
    nameFr: "Partenaire Média / Institutionnel",
    nameEn: "Media / Institutional Partner",
    price: 0,
    maxSponsors: 10,
    sortOrder: 5,
    highlightColor: "#0066ff",
    perksFr: JSON.stringify([
      "Logo sur les supports",
      "Échange de visibilité",
      "2 billets inclus",
    ]),
    perksEn: JSON.stringify([
      "Logo on materials",
      "Visibility exchange",
      "2 tickets included",
    ]),
    perks: JSON.stringify([]),
  },
];

export async function GET() {
  if (!(await hasPermission("sponsor-packages", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.sponsorPackage.findMany({ orderBy: { sortOrder: "asc" } }));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  if (body.seed) {
    const existing = await prisma.sponsorPackage.count();
    if (existing > 0) return NextResponse.json({ error: "Already seeded", count: existing }, { status: 409 });
    await prisma.sponsorPackage.createMany({ data: DEFAULT_PACKAGES });
    return NextResponse.json({ seeded: DEFAULT_PACKAGES.length });
  }
  const pkg = await prisma.sponsorPackage.create({ data: body });
  return NextResponse.json(pkg, { status: 201 });
}
