import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { uuid: string } }) {
  const badge = await prisma.badgeCredential.findUnique({ where: { uuid: params.uuid } });
  if (!badge) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(badge.credentialJson, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="eocon-badge-${params.uuid}.json"`,
    },
  });
}
