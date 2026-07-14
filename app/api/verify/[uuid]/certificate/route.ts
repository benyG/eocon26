export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildParticipationCertificate } from "@/lib/certificatePdf";
import { getEventSettings } from "@/lib/settings";

// Certificate of participation (PDF) for a badge. Beautiful, minimalist A4
// landscape featuring the badge medallion. Linked from every badge surface.
export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  if (badge.revokedAt) return NextResponse.json({ error: "Badge revoked" }, { status: 410 });

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";
  const verifyUrl = `${baseUrl}/verify/${badge.uuid}`;

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
      venue: settings.event_venue || "Hôtel Onomo",
      city: settings.event_city || "Douala",
      dateFr: settings.event_date_display_fr || "28 novembre 2026",
      year: "2026",
    },
  );

  const safeName = badge.recipientName.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "participant";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificat-eocon2026-${safeName}.pdf"`,
    },
  });
}
