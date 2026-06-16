export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getIp } from "@/lib/rateLimit";
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { verifyPaymentToken } from "@/lib/paymentToken";

function baseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_URL ||
    req.headers.get("origin") ||
    "https://eyesopensecurity.com"
  ).replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  if (!(await checkRateLimit(`pay:${getIp(req)}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard." }, { status: 429 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Paiement par carte indisponible (configuration manquante)." }, { status: 503 });
  }

  try {
    const { registrationId, token } = await req.json();
    if (!registrationId) {
      return NextResponse.json({ error: "registrationId requis" }, { status: 400 });
    }
    if (!verifyPaymentToken(Number(registrationId), token)) {
      return NextResponse.json({ error: "Jeton de paiement invalide" }, { status: 403 });
    }

    const registration = await prisma.registration.findUnique({ where: { id: Number(registrationId) } });
    if (!registration) {
      return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    }
    if (registration.status === "paid") {
      return NextResponse.json({ alreadyPaid: true });
    }

    const ticket = await prisma.ticketType.findUnique({ where: { slug: registration.ticketType } });
    if (!ticket) {
      return NextResponse.json({ error: "Billet introuvable." }, { status: 400 });
    }

    // USD price, early-bird aware.
    const now = new Date();
    const earlyBirdActive = !!(ticket.earlyBirdUntil && ticket.earlyBirdUntil > now && ticket.earlyBirdPriceEn);
    const amountUsd = earlyBirdActive ? (ticket.earlyBirdPriceEn ?? ticket.priceEn) : ticket.priceEn;
    if (!amountUsd || amountUsd <= 0) {
      return NextResponse.json({ error: "Ce billet n'a pas de tarif en USD." }, { status: 400 });
    }

    const base = baseUrl(req);
    const session = await createCheckoutSession({
      amountUsd,
      productName: `EOCON 2026 — ${ticket.nameEn}`,
      email: registration.email,
      registrationId: registration.id,
      successUrl: `${base}/payment/return?registrationId=${registration.id}&token=${encodeURIComponent(token)}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/?payment=cancelled`,
    });

    // Persist provider + session reference; record a pending transaction.
    await prisma.registration.update({
      where: { id: registration.id },
      data: { paymentProvider: "stripe", paymentRef: session.id },
    });
    await prisma.paymentTransaction.create({
      data: {
        registrationId: registration.id,
        email: registration.email,
        provider: "stripe",
        amount: amountUsd,
        ticketType: registration.ticketType,
        state: "pending",
        reason: "success",
        providerRef: session.id,
        message: "Checkout session created",
      },
    }).catch(e => console.error("[Stripe transaction log]", e));

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[Stripe create-session]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
