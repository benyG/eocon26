// WhatsApp Business Cloud API — Channel/broadcast message
// Required env vars:
//   META_ACCESS_TOKEN         — System User token with whatsapp_business_messaging permission
//   WHATSAPP_PHONE_NUMBER_ID  — Phone Number ID (from Meta Business Manager)
//   WHATSAPP_CHANNEL_NUMBER   — The WhatsApp number to send FROM (E.164: +15819889001)
//
// NOTE: WhatsApp Channels (broadcast feature) has no public Graph API endpoint yet.
// This lib sends via WhatsApp Business Cloud API — suitable for sending announcements
// to a configured number or triggering templates to opted-in subscribers.
// Posting to a WhatsApp Channel must still be done manually from the WhatsApp app.

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function getCredentials() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error("WhatsApp credentials missing: WHATSAPP_PHONE_NUMBER_ID, META_ACCESS_TOKEN");
  }
  return { phoneNumberId, token };
}

export interface WhatsAppPostResult {
  id: string;
  url: string;
}

export async function publishWhatsAppMessage(text: string, imageUrl?: string): Promise<WhatsAppPostResult> {
  const { phoneNumberId, token } = getCredentials();

  // Destination: the channel's linked number or a broadcast recipient
  const to = process.env.WHATSAPP_BROADCAST_TO || process.env.WHATSAPP_CHANNEL_NUMBER;
  if (!to) {
    throw new Error("WhatsApp destination missing: WHATSAPP_BROADCAST_TO or WHATSAPP_CHANNEL_NUMBER");
  }

  let body: Record<string, unknown>;

  if (imageUrl) {
    body = {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: imageUrl,
        caption: text,
      },
    };
  } else {
    body = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text, preview_url: true },
    };
  }

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { messages?: { id: string }[] };
  const msgId = data.messages?.[0]?.id ?? "unknown";

  return {
    id: msgId,
    url: `https://wa.me/${to.replace(/^\+/, "")}`,
  };
}
