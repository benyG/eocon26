export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { retrieveCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { finalizeRegistrationPaid } from "@/lib/payment";
import { verifyPaymentToken } from "@/lib/paymentToken";

// GET /api/payment/stripe/confirm?registrationId=..&token=..&session_id=..
// Called by the return page after Stripe redirects back. Verifies the session
// is paid with Stripe (source of truth) and finalizes the registration.
// Idempotent and safe to poll. The webhook is the primary path; this is the
// synchronous fallback so the user gets immediate confirmation.
export async function GET(req: NextRequest) {
  if (!(await checkRateLimit(`paystatus:${getIp(req)}`, 150, 10 * 60 * 1000))) {
    return NextResponse.json({ state: "pending" }, { status: 429 });
  }
  try {
    const sp = req.nextUrl.searchParams;
    const registrationId = Number(sp.get("registrationId"));
    const token = sp.get("token");
    const sessionId = sp.get("session_id");

    if (!registrationId) return NextResponse.json({ error: "registrationId requis" }, { status: 400 });
    if (!verifyPaymentToken(registrationId, token)) {
      return NextResponse.json({ error: "Jeton de paiement invalide" }, { status: 403 });
    }

    const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
    if (!reg) return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    if (reg.status === "paid") return NextResponse.json({ state: "successful" });

    if (!isStripeConfigured()) return NextResponse.json({ state: "pending" });

    // The session id must match the one we recorded for this registration.
    const sid = sessionId || reg.paymentRef;
    if (!sid || (reg.paymentRef && sid !== reg.paymentRef)) {
      return NextResponse.json({ state: "pending" });
    }

    const session = await retrieveCheckoutSession(sid);
    if (session.payment_status === "paid" || session.status === "complete") {
      await finalizeRegistrationPaid(reg.id);
      return NextResponse.json({ state: "successful" });
    }
    return NextResponse.json({ state: "pending" });
  } catch (err) {
    console.error("[Stripe confirm]", err);
    return NextResponse.json({ state: "pending" });
  }
}
