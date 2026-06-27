import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const body = await req.json();
  const { supplier, domain, description, amount, paymentTerms, pdfUrl, advantages, risks, comment } = body;
  const updated = await prisma.supplierOffer.update({
    where: { id },
    data: {
      ...(supplier !== undefined && { supplier }),
      ...(domain !== undefined && { domain }),
      ...(description !== undefined && { description }),
      ...(amount !== undefined && { amount: amount != null ? Number(amount) : null }),
      ...(paymentTerms !== undefined && { paymentTerms: paymentTerms || null }),
      ...(pdfUrl !== undefined && { pdfUrl: pdfUrl || null }),
      ...(advantages !== undefined && { advantages: advantages || null }),
      ...(risks !== undefined && { risks: risks || null }),
      ...(comment !== undefined && { comment: comment || null }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await prisma.supplierOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
