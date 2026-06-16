// Stripe client — REST API only (no SDK dependency), server-side.
//
// We use Stripe Checkout (hosted payment page) so that NO card data ever
// touches our app or database — the customer enters their card on Stripe's
// domain. We only keep the Checkout Session id as a reference (paymentRef) to
// reconcile with the Stripe dashboard.

import { createHmac, timingSafeEqual } from "crypto";

const API_BASE = "https://api.stripe.com/v1";

function secretKey(): string {
  return process.env.STRIPE_SECRET_KEY || "";
}

export function isStripeConfigured(): boolean {
  return !!secretKey();
}

function authHeaders() {
  return {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

// Flatten a nested object into Stripe's bracketed form-encoding
// (e.g. line_items[0][price_data][currency]=usd).
function encodeForm(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") {
      parts.push(encodeForm(value as Record<string, unknown>, fullKey));
    } else {
      parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: string; // "paid" | "unpaid" | "no_payment_required"
  status: string;         // "open" | "complete" | "expired"
  payment_intent?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
}

/** Create a Checkout Session for a single ticket priced in USD. */
export async function createCheckoutSession(params: {
  amountUsd: number;        // dollars (will be converted to cents)
  productName: string;
  email: string;
  registrationId: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  const body = encodeForm({
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.email,
    client_reference_id: String(params.registrationId),
    metadata: { registrationId: String(params.registrationId) },
    payment_intent_data: { metadata: { registrationId: String(params.registrationId) } },
    "line_items[0]": {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(params.amountUsd * 100),
        product_data: { name: params.productName },
      },
    },
  });

  const res = await fetch(`${API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Stripe: échec de création de la session");
  }
  return data as CheckoutSession;
}

/** Retrieve a Checkout Session (used on return + webhook). */
export async function retrieveCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  const res = await fetch(`${API_BASE}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Stripe: session introuvable");
  }
  return data as CheckoutSession;
}

/**
 * Verify a Stripe webhook signature (Stripe-Signature header).
 * Implements the same scheme as the SDK's constructEvent, without the SDK.
 */
export function verifyWebhookSignature(payload: string, sigHeader: string | null, toleranceSec = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret || !sigHeader) return false;

  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.split("=");
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  // Reject stale timestamps to limit replay.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > toleranceSec) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
