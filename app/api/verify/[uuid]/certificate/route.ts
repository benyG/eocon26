export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildParticipationCertificate } from "@/lib/certificatePdf";
import { getEventSettings } from "@/lib/settings";

// Certificate of participation (PDF) for a badge, featuring the original OBv3
// badge image. Downloadable in French (default) or English via ?lang=en.
// Participant certificates include tracked session hours + CPE credits.
export async function GET(req: NextRequest, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  if (badge.revokedAt) return NextResponse.json({ error: "Badge revoked" }, { status: 410 });

  const lang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "fr";

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";
  const verifyUrl = `${baseUrl}/verify/${badge.uuid}`;

  // Session attendance (participants): tracked minutes → hours + CPE line.
  let totalMinutes: number | null = null;
  if (badge.badgeType === "participant" && badge.recipientEmail) {
    const presence = await prisma.livePresence.findFirst({
      where: { registration: { email: badge.recipientEmail } },
      orderBy: { totalMinutes: "desc" },
      select: { totalMinutes: true },
    });
    totalMinutes = presence?.totalMinutes ?? null;
  }

  const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
  const pdf = await buildParticipationCertificate(
    {
      uuid: badge.uuid,
      badgeType: badge.badgeType,
      recipientName: badge.recipientName,
      subtype: badge.subtype,
      issuedAt: badge.issuedAt,
    },
    {
      verifyUrl,
      lang,
      venue: settings.event_venue || "Hôtel Onomo",
      city: settings.event_city || "Douala",
      dateFr: settings.event_date_display_fr || "28 novembre 2026",
      dateEn: settings.event_date_display_en || "November 28, 2026",
      year: "2026",
      totalMinutes,
    },
  );

  const safeName = badge.recipientName.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "participant";
  const fileLabel = lang === "en" ? "certificate" : "certificat";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileLabel}-eocon2026-${safeName}-${lang}.pdf"`,
    },
  });
}
