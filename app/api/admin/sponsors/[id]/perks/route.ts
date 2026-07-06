import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const canRead = async () =>
  (await hasPermission("sponsors", "read")) ||
  (await hasPermission("sponsor-pipeline", "read")) ||
  (await hasPermission("prospection", "read"));
const canWrite = async () =>
  (await hasPermission("sponsors", "write")) ||
  (await hasPermission("sponsor-pipeline", "write")) ||
  (await hasPermission("prospection", "write"));

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canRead())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.sponsorPerk.findMany({
    where: { sponsorId: parseInt(params.id) },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(rows);
}

// Add an à-la-carte perk/activation to an already concluded sponsor (#4).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canWrite())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sponsorId = parseInt(params.id);
  const { perkId, labelFr, labelEn, quantity } = await req.json();
  if (!labelFr || !labelEn) return NextResponse.json({ error: "labelFr and labelEn are required" }, { status: 400 });
  const max = await prisma.sponsorPerk.aggregate({ where: { sponsorId }, _max: { sortOrder: true } });
  const row = await prisma.sponsorPerk.create({
    data: {
      sponsorId,
      perkId: perkId ?? null,
      labelFr,
      labelEn,
      quantity: quantity ?? null,
      sortOrder: (max._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
