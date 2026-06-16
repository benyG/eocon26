export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getCountryFromRequest, currencyForCountry, isCameroon, isCurrencySelectorAllowed } from "@/lib/geo";
import { isStripeConfigured } from "@/lib/stripe";
import { isNetticketConfigured } from "@/lib/netticket";

// GET /api/geo
// Tells the client which currency / payment method to display, based strictly
// on the visitor's geo (Cloudflare CF-IPCountry). When the QA selector is
// enabled the client may override the currency, but the geo default is always
// returned here.
export async function GET(req: NextRequest) {
  const country = getCountryFromRequest(req);
  const currency = currencyForCountry(country);
  return NextResponse.json({
    country: country || null,
    currency,                                   // "XAF" (Cameroon) | "USD" (rest)
    isCameroon: isCameroon(country),
    allowSelector: isCurrencySelectorAllowed(), // QA-only manual XAF/USD toggle
    momoAvailable: isNetticketConfigured(),
    stripeAvailable: isStripeConfigured(),
  });
}
