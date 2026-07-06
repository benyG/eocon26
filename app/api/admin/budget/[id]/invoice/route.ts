export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { buildInvoicePdf } from "@/lib/invoicePdf";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ok = (await hasPermission("budget", "read")) || (await hasPermission("documents", "read"));
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const type = req.nextUrl.searchParams.get("type") === "invoice" ? "invoice" : "proforma";
  const item = await prisma.budgetItem.findUnique({
    where: { id: parseInt(params.id) },
    include: { sponsor: { include: { perks: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!item) return NextResponse.json({ error: "Budget line not found" }, { status: 404 });
  if (!item.sponsor) return NextResponse.json({ error: "This budget line is not linked to a sponsor." }, { status: 400 });

  const { buffer, docNumber } = await buildInvoicePdf(item, type);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${type}-${docNumber}.pdf"`,
    },
  });
}
