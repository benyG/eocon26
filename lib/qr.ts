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
  const parts = payload.split(":");
  if (parts.length !== 2) return null;
  const id = parseInt(parts[0]);
  if (isNaN(id)) return null;
  const expected = generateQrPayload(id);
  if (expected !== payload) return null;
  return id;
}
