import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  // Whitelist scalar columns — never let relation fields (packagePerks) or id/createdAt through.
  const allowed = ["tier", "nameFr", "nameEn", "price", "maxSponsors", "sortOrder", "highlightColor", "isVisible", "perksFr", "perksEn", "perks"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k];
  return NextResponse.json(await prisma.sponsorPackage.update({ where: { id: parseInt(params.id) }, data }));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("sponsor-packages", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.sponsorPackage.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ success: true });
}
