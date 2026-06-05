import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { registrationId, operatorName } = await req.json();
  if (!registrationId) return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });

  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  if (reg.status !== "validated") return NextResponse.json({ error: "Paiement non confirmé" }, { status: 403 });
  if (reg.checkedInAt) return NextResponse.json({ error: "Already checked in", checkedInAt: reg.checkedInAt }, { status: 409 });

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { checkedInAt: new Date(), checkedInBy: operatorName || "Hôtesse" },
  });
  return NextResponse.json({ success: true, registration: updated });
}
