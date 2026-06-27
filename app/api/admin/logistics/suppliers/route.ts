import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasPermission("logistics", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const offers = await prisma.supplierOffer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(offers);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("logistics", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { supplier, domain, description, amount, paymentTerms, pdfUrl, advantages, risks, comment } = body;
  if (!supplier || !domain || !description) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  const offer = await prisma.supplierOffer.create({
    data: {
      supplier,
      domain,
      description,
      amount: amount != null ? Number(amount) : null,
      paymentTerms: paymentTerms || null,
      pdfUrl: pdfUrl || null,
      advantages: advantages || null,
      risks: risks || null,
      comment: comment || null,
    },
  });
  return NextResponse.json(offer, { status: 201 });
}
