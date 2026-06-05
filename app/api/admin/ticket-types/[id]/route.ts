import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id);
  const { nameFr, nameEn, priceFr, priceEn, perksFr, perksEn, earlyBirdPriceFr, earlyBirdPriceEn, earlyBirdUntil, color, isFeatured, isVisible, ctfAccess, includesCTF, maxCapacity, sortOrder } = await req.json();

  const updated = await prisma.ticketType.update({
    where: { id },
    data: {
      ...(nameFr !== undefined && { nameFr }),
      ...(nameEn !== undefined && { nameEn }),
      ...(priceFr !== undefined && { priceFr }),
      ...(priceEn !== undefined && { priceEn }),
      ...(perksFr !== undefined && { perksFr: JSON.stringify(perksFr) }),
      ...(perksEn !== undefined && { perksEn: JSON.stringify(perksEn) }),
      ...(earlyBirdPriceFr !== undefined && { earlyBirdPriceFr }),
      ...(earlyBirdPriceEn !== undefined && { earlyBirdPriceEn }),
      ...(earlyBirdUntil !== undefined && { earlyBirdUntil: earlyBirdUntil ? new Date(earlyBirdUntil) : null }),
      ...(color !== undefined && { color }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isVisible !== undefined && { isVisible }),
      ...(ctfAccess !== undefined && { ctfAccess }),
      ...(includesCTF !== undefined && { includesCTF }),
      ...(maxCapacity !== undefined && { maxCapacity }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(params.id);
  const ticket = await prisma.ticketType.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const regCount = await prisma.registration.count({ where: { ticketType: ticket.slug } });
  if (regCount > 0) return NextResponse.json({ error: `Impossible de supprimer : ${regCount} inscription(s) utilisent ce type de billet.` }, { status: 409 });
  await prisma.ticketType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
