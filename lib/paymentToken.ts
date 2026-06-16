import { createHmac, timingSafeEqual } from "crypto";

// Per-registration ownership token for the Mobile Money payment flow.
// Issued by /api/register and required by initiate/status so a registration id
// alone is not enough to drive someone else's payment / poll their status.

function secret(): string {
  return process.env.PAYMENT_SECRET || process.env.ADMIN_SECRET || "qr-fallback-secret";
}

export function signPaymentToken(registrationId: number): string {
  return createHmac("sha256", secret()).update(`pay:${registrationId}`).digest("hex").slice(0, 32);
}

export function verifyPaymentToken(registrationId: number, token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = signPaymentToken(registrationId);
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
