export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { initiateMobilePayment, isNetticketConfigured, sanitizePhone, type NettOperator } from "@/lib/netticket";
import { finalizeRegistrationPaid } from "@/lib/payment";
import { verifyPaymentToken } from "@/lib/paymentToken";

export async function POST(req: NextRequest) {
  if (!rateLimit(`pay:${getIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard." }, { status: 429 });
  }
  if (!isNetticketConfigured()) {
    return NextResponse.json({ error: "Paiement Mobile Money indisponible (configuration manquante)." }, { status: 503 });
  }

  try {
    const { registrationId, operator, phone, token } = await req.json();
    if (!registrationId || !operator || !phone) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (!verifyPaymentToken(Number(registrationId), token)) {
      return NextResponse.json({ error: "Jeton de paiement invalide" }, { status: 403 });
    }
    if (operator !== "mtn" && operator !== "orange") {
      return NextResponse.json({ error: "Opérateur invalide" }, { status: 400 });
    }
    const phoneClean = sanitizePhone(phone);
    if (phoneClean.length < 9) {
      return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({ where: { id: Number(registrationId) } });
    if (!registration) {
      return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    }
    if (registration.status === "paid") {
      return NextResponse.json({ state: "successful", message: "Déjà payé" });
    }

    const ticket = await prisma.ticketType.findUnique({ where: { slug: registration.ticketType } });
    if (!ticket?.netticketTicketId) {
      return NextResponse.json({ error: "Ce billet n'est pas configuré pour le paiement Mobile Money." }, { status: 400 });
    }

    const provider = operator === "mtn" ? "netticket_mtn" : "netticket_orange";
    const result = await initiateMobilePayment({
      email: registration.email,
      phone: phoneClean,
      ticketId: ticket.netticketTicketId,
      operator: operator as NettOperator,
      name: `${registration.fname} ${registration.lname}`,
    });

    // Persist the provider + transaction reference for later polling / audit.
    await prisma.registration.update({
      where: { id: registration.id },
      data: {
        paymentProvider: provider,
        ...(result.transactionId ? { paymentRef: result.transactionId } : {}),
      },
    });

    // Record every attempt (success or failure) for the admin Transactions page.
    await prisma.paymentTransaction.create({
      data: {
        registrationId: registration.id,
        email: registration.email,
        phone: phoneClean,
        provider,
        amount: ticket.priceFr,
        ticketType: registration.ticketType,
        state: result.state === "failed" ? "failed" : (result.state === "successful" ? "success" : "pending"),
        reason: result.reason,
        providerRef: result.transactionId,
        message: result.message,
      },
    }).catch(e => console.error("[Transaction log]", e));

    if (!result.ok) {
      return NextResponse.json({ state: "failed", reason: result.reason, message: result.message }, { status: 400 });
    }

    // Synchronous confirmation (no transaction id to poll) → finalize now.
    if (result.state === "successful") {
      await finalizeRegistrationPaid(registration.id);
    }

    return NextResponse.json({
      state: result.state, // "successful" | "pending"
      reason: result.reason,
      transactionId: result.transactionId,
      message: result.message,
    });
  } catch (err) {
    console.error("[NetTicket initiate]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
