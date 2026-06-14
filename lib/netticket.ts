// NetTicket API client — https://netticket.net/developers
// All calls are server-side only: the API key must never reach the browser.

const BASE_URL = process.env.NETTICKET_BASE_URL || "https://netticket.net/api";
const API_KEY = process.env.NETTICKET_API_KEY || "";
const EVENT_REFERENCE = process.env.NETTICKET_EVENT_REFERENCE || "";

// NetTicket payment modalities
export const NETTICKET_MODALITY = {
  free: 1,
  mtn: 3,
  orange: 4,
} as const;

export type NettOperator = "mtn" | "orange";

function headers() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": API_KEY,
  };
}

export function isNetticketConfigured(): boolean {
  return !!API_KEY;
}

/**
 * Normalize a phone number to the bare local format NetTicket expects (e.g. 670495858):
 * strips spaces, "+", and a leading Cameroon country code (237).
 */
export function sanitizePhone(raw: string): string {
  let digits = (raw || "").replace(/[^\d]/g, "");
  if (digits.startsWith("237") && digits.length > 9) digits = digits.slice(3);
  return digits;
}

export interface NetticketTicket {
  id: number;
  name: string;
  price: number;
  description?: string;
  stock?: number;
  x_refund?: unknown;
  x_active?: unknown;
}

/** GET /get/{event_reference}/tickets — list tickets for the configured event. */
export async function listNetticketTickets(eventReference = EVENT_REFERENCE): Promise<NetticketTicket[]> {
  if (!eventReference) throw new Error("NETTICKET_EVENT_REFERENCE manquant");
  const res = await fetch(`${BASE_URL}/get/${encodeURIComponent(eventReference)}/tickets`, {
    method: "GET",
    headers: headers(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "NetTicket: échec de récupération des tickets");
  return (data.tickets || []) as NetticketTicket[];
}

export interface MobilePaymentResult {
  ok: boolean;
  // "successful" → confirmed; "pending" → must be polled; "failed" → declined
  state: "successful" | "pending" | "failed";
  transactionId: string | null;
  message: string;
  raw: Record<string, unknown>;
}

/** POST /payment/mobile — initiate a Mobile Money payment (MTN / Orange). */
export async function initiateMobilePayment(params: {
  email: string;
  phone: string;
  ticketId: string;
  operator: NettOperator;
  quantity?: number;
  name?: string;
}): Promise<MobilePaymentResult> {
  const modality = params.operator === "mtn" ? NETTICKET_MODALITY.mtn : NETTICKET_MODALITY.orange;
  const res = await fetch(`${BASE_URL}/payment/mobile`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email: params.email,
      phone: Number(sanitizePhone(params.phone)),
      ticket_id: Number(params.ticketId),
      modality,
      quantity: params.quantity || 1,
      name: params.name,
      notification: true,
    }),
  });
  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  // NetTicket may return a transaction id under various keys; capture whatever is present.
  const transactionId =
    (raw.transaction_id as string) ||
    (raw.transactionId as string) ||
    (raw.id ? String(raw.id) : null) ||
    null;

  if (res.ok && raw.success) {
    // Synchronous success OR accepted-and-pending. If a tx id is present we still
    // let the caller poll /check to be safe; otherwise treat as confirmed.
    return {
      ok: true,
      state: transactionId ? "pending" : "successful",
      transactionId,
      message: String(raw.success),
      raw,
    };
  }

  return {
    ok: false,
    state: "failed",
    transactionId,
    message: String(raw.message || raw.error || "Échec du paiement"),
    raw,
  };
}

export interface CheckResult {
  state: "successful" | "failed";
  message: string;
}

/** GET /payment/{transaction_id}/check — poll a transaction's status. */
export async function checkPayment(transactionId: string): Promise<CheckResult> {
  const res = await fetch(`${BASE_URL}/payment/${encodeURIComponent(transactionId)}/check`, {
    method: "GET",
    headers: headers(),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok && data.success) {
    return { state: "successful", message: String(data.success) };
  }
  return { state: "failed", message: String(data.error || data.message || "Transaction failed") };
}
