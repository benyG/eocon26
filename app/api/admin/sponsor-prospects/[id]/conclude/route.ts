import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

interface SelectedPerk {
  perkId?: number | null;
  labelFr: string;
  labelEn: string;
  quantity?: number | null;
}

// Conclude a sponsor prospect: create/refresh the public Sponsor, snapshot the
// accepted perks (which double as the delivery checklist), and create the linked
// revenue line. Requires at least one accepted perk to validate the deal.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const canWrite = (await hasPermission("prospection", "write")) || (await hasPermission("sponsor-pipeline", "write"));
  if (!canWrite) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const prospectId = parseInt(params.id);
  const prospect = await prisma.sponsorProspect.findUnique({ where: { id: prospectId } });
  if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

  const body = await req.json();
  const name: string = (body.name || prospect.org || "").trim();
  const tier: string = (body.tier || prospect.package || "BRONZE").toString().toUpperCase();
  const perks: SelectedPerk[] = Array.isArray(body.perks) ? body.perks : [];
  const dealAmount: number | null = body.dealAmount != null && body.dealAmount !== "" ? Math.round(Number(body.dealAmount)) : null;

  if (!name) return NextResponse.json({ error: "Sponsor name required" }, { status: 400 });
  const validPerks = perks.filter(p => p.labelFr?.trim() && p.labelEn?.trim());
  if (validPerks.length === 0) {
    return NextResponse.json({ error: "Select at least one accepted perk to validate the sponsor." }, { status: 400 });
  }

  // ── Sponsor: reuse the linked one, else match by name, else create ──
  let sponsor = prospect.sponsorId ? await prisma.sponsor.findUnique({ where: { id: prospect.sponsorId } }) : null;
  if (!sponsor) sponsor = await prisma.sponsor.findFirst({ where: { name } });

  const sponsorData = {
    name,
    logoUrl: (body.logoUrl ?? sponsor?.logoUrl ?? "") as string,
    website: (body.website ?? prospect.website ?? "") as string,
    email: prospect.email ?? undefined,
    phone: prospect.phone ?? undefined,
    tier,
    isVisible: true,
    dealAmount,
  };
  sponsor = sponsor
    ? await prisma.sponsor.update({ where: { id: sponsor.id }, data: sponsorData })
    : await prisma.sponsor.create({ data: sponsorData });

  // ── Perks snapshot (delivery checklist) — replace any previous set ──
  await prisma.sponsorPerk.deleteMany({ where: { sponsorId: sponsor.id } });
  await prisma.sponsorPerk.createMany({
    data: validPerks.map((p, i) => ({
      sponsorId: sponsor!.id,
      perkId: p.perkId ?? null,
      labelFr: p.labelFr.trim(),
      labelEn: p.labelEn.trim(),
      quantity: p.quantity ?? null,
      sortOrder: i,
    })),
  });

  // ── Revenue line (create once per sponsor) ──
  const existingLine = await prisma.budgetItem.findFirst({ where: { sponsorId: sponsor.id, category: "revenue" } });
  if (!existingLine) {
    await prisma.budgetItem.create({
      data: {
        category: "revenue",
        label: `Sponsor — ${name} (${tier})`,
        planned: dealAmount ?? 0,
        actual: 0,
        status: "pending",
        sponsorId: sponsor.id,
      },
    });
  } else if (dealAmount != null && existingLine.planned === 0) {
    await prisma.budgetItem.update({ where: { id: existingLine.id }, data: { planned: dealAmount, label: `Sponsor — ${name} (${tier})` } });
  }

  // ── Prospect: mark concluded, stop the follow-up cadence, link the sponsor ──
  await prisma.sponsorProspect.update({
    where: { id: prospectId },
    data: { status: "concluded", package: tier, sponsorId: sponsor.id, nextFollowupAt: null },
  });

  // ── Optional announcement draft (kept from the previous auto-conclude behaviour) ──
  if (body.generatePost !== false) {
    await prisma.socialPost.create({
      data: {
        platform: "linkedin",
        lang: "fr",
        brief: `Annonce sponsor ${tier} — ${name}`,
        content: `🎉 [EOCON 2026 · Sponsor ${tier}] Nous sommes ravis d'accueillir ${name} comme partenaire ${tier} d'EOCON 2026 ! 🙏\n\nMerci pour votre soutien à la communauté cybersécurité africaine.\n\n📅 28 Novembre 2026 · Douala\n\n#EOCON2026 #Cybersecurity #Cameroun`,
        status: "draft",
        contentType: "custom",
      },
    }).catch(() => {});
  }

  logAction(req, "UPDATE", "sponsor_prospect", prospectId, { conclude: true, sponsorId: sponsor.id, perks: validPerks.length });

  const perkRows = await prisma.sponsorPerk.findMany({ where: { sponsorId: sponsor.id }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ sponsor, perks: perkRows });
}
