export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/stripe";
import { finalizeRegistrationPaid } from "@/lib/payment";

// POST /api/payment/stripe/webhook
// Primary, reliable finalization path. Configure the endpoint in the Stripe
// dashboard with event `checkout.session.completed` and set STRIPE_WEBHOOK_SECRET.
// We read the raw body for signature verification (no card data is processed).
export async function POST(req: NextRequest) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!verifyWebhookSignature(payload, sig)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data?.object || {};
      const paymentStatus = String(session.payment_status || "");
      const regId =
        Number((session.metadata as Record<string, unknown> | undefined)?.registrationId) ||
        Number(session.client_reference_id);

      if (regId && (paymentStatus === "paid" || paymentStatus === "no_payment_required")) {
        await finalizeRegistrationPaid(regId);
      }
    }
  } catch (err) {
    console.error("[Stripe webhook]", err);
    // Still ack so Stripe doesn't hammer retries on our internal error.
  }

  return NextResponse.json({ received: true });
}
