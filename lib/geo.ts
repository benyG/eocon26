// Geo detection + currency resolution.
//
// In production the country is taken from Cloudflare's `CF-IPCountry` request
// header (Cloudflare sits in front of Caddy, which transparently forwards all
// request headers to the Next.js app). Enable "IP Geolocation" in the
// Cloudflare dashboard so the header is added.
//
// Currency rule (strictly geo-driven):
//   - Cameroon (CM)        → XAF  → Mobile Money (NetTicket)
//   - every other country  → USD  → Card (Stripe)
//
// For QA, a manual XAF/USD selector can be exposed by setting the env var
// PAYMENT_ALLOW_CURRENCY_SELECTOR="true". It never changes the geo default,
// it only lets a tester override it client-side.

import type { NextRequest } from "next/server";

export type Currency = "XAF" | "USD";

/** Read the visitor's ISO country code from Cloudflare's geo header. */
export function getCountryFromRequest(req: NextRequest): string | null {
  const cf =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("CF-IPCountry") ||
    req.headers.get("x-vercel-ip-country"); // harmless fallback for other CDNs
  if (!cf) return null;
  const code = cf.trim().toUpperCase();
  // Cloudflare uses "XX"/"T1" for unknown / Tor; treat those as unknown.
  if (!code || code === "XX" || code === "T1") return null;
  return code;
}

/** True for visitors located in Cameroon. */
export function isCameroon(country: string | null): boolean {
  return country === "CM";
}

/** Geo-driven default currency: XAF for Cameroon, USD everywhere else. */
export function currencyForCountry(country: string | null): Currency {
  return isCameroon(country) ? "XAF" : "USD";
}

/** Whether the manual currency selector is enabled (QA / testing only). */
export function isCurrencySelectorAllowed(): boolean {
  return process.env.PAYMENT_ALLOW_CURRENCY_SELECTOR === "true";
}
