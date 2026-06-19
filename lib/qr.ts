import { createHmac } from "crypto";

function getQrSecret(): string {
  return process.env.ADMIN_SECRET || "qr-fallback-secret";
}

export function generateQrPayload(registrationId: number): string {
  const nonce = `${registrationId}:eocon26`;
  const sig = createHmac("sha256", getQrSecret()).update(nonce).digest("hex").slice(0, 16);
  return `${registrationId}:${sig}`;
}

export function verifyQrPayload(payload: string): number | null {
  // Handle full URL format: https://...//checkin/123:abcd1234
  let raw = payload;
  if (payload.includes("/checkin/")) raw = payload.split("/checkin/").pop() || payload;
  const parts = raw.split(":");
  if (parts.length !== 2) return null;
  const id = parseInt(parts[0]);
  if (isNaN(id)) return null;
  const expected = generateQrPayload(id);
  if (expected !== payload) return null;
  return id;
}

// ── Networking /connect signature ────────────────────────────────────────────
// The networking QR encodes /connect/<ticketRef>?sig=<hmac>. The signature makes
// the per-attendee URL unguessable and non-enumerable: a crawler cannot iterate
// /connect/EOCON-0001, 0002… without the secret, and search engines never index
// it (the page also sets noindex). Only someone who scanned a real badge has it.
export function signConnectRef(ticketRef: string): string {
  return createHmac("sha256", getQrSecret()).update(`connect:${ticketRef}`).digest("hex").slice(0, 16);
}

export function verifyConnectSig(ticketRef: string, sig: string | null | undefined): boolean {
  if (!sig) return false;
  const expected = signConnectRef(ticketRef);
  // Constant-length compare (both are 16-char hex slices).
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
