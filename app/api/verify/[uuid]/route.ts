import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCredential } from "@/lib/badgeCredential";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  const isValid = badge.revokedAt ? false : verifyCredential(badge.credentialJson);
  return NextResponse.json({
    credential: JSON.parse(badge.credentialJson),
    verified: isValid,
    revoked: !!badge.revokedAt,
  });
}
