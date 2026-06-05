import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBadgeSvg, BadgeType } from "@/lib/badgeSvg";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return new NextResponse("Not found", { status: 404 });

  const svg = generateBadgeSvg(badge.badgeType as BadgeType, badge.recipientName, "2026", badge.subtype);
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
