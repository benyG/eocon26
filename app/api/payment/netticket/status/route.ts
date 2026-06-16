export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkPayment, isNetticketConfigured } from "@/lib/netticket";
import { finalizeRegistrationPaid } from "@/lib/payment";
import { rateLimit, getIp } from "@/lib/rateLimit";

// GET /api/payment/netticket/status?registrationId=123
// Polled by the registration modal while a Mobile Money payment is pending.
export async function GET(req: NextRequest) {
  // Generous limit: legitimate polling is ~1 req / 4s during a payment.
  if (!rateLimit(`paystatus:${getIp(req)}`, 150, 10 * 60 * 1000)) {
    return NextResponse.json({ state: "pending" }, { status: 429 });
  }
  try {
    const registrationId = Number(req.nextUrl.searchParams.get("registrationId"));
    if (!registrationId) {
      return NextResponse.json({ error: "registrationId requis" }, { status: 400 });
    }

    const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
    if (!reg) return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });

    // Already finalized.
    if (reg.status === "paid") {
      return NextResponse.json({ state: "successful" });
    }

    // No transaction reference yet, or provider not configured → still pending.
    if (!reg.paymentRef || !isNetticketConfigured()) {
      return NextResponse.json({ state: "pending" });
    }

    const result = await checkPayment(reg.paymentRef);
    if (result.state === "successful") {
      await finalizeRegistrationPaid(reg.id);
      return NextResponse.json({ state: "successful" });
    }

    // NetTicket returns "failed" both for declined and still-processing transactions;
    // keep the registration in payment_pending so the user can retry.
    return NextResponse.json({ state: "pending", message: result.message });
  } catch (err) {
    console.error("[NetTicket status]", err);
    return NextResponse.json({ state: "pending" });
  }
}
