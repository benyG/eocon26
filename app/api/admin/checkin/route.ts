import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyQrPayload } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { payload, operatorName } = await req.json();
  if (!payload) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }
  const id = verifyQrPayload(payload);
  if (!id) {
    return NextResponse.json({ error: "Invalid QR code" }, { status: 400 });
  }
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }
  if (reg.status !== "validated") {
    return NextResponse.json({ error: "Paiement non confirmé — inscription non validée" }, { status: 403 });
  }
  if (reg.checkedInAt) {
    return NextResponse.json({
      error: "Already checked in",
      checkedInAt: reg.checkedInAt,
      checkedInBy: reg.checkedInBy,
    }, { status: 409 });
  }
  const updated = await prisma.registration.update({
    where: { id },
    data: { checkedInAt: new Date(), checkedInBy: operatorName || "Admin" },
  });
  return NextResponse.json({ success: true, registration: updated });
}
