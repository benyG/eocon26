import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

// Resend delivery/engagement webhook.
// Configure in Resend dashboard → Webhooks, pointing at /api/webhooks/resend,
// and set RESEND_WEBHOOK_SECRET (the "whsec_..." signing secret) in the env.
// Open/click events additionally require open & click tracking to be enabled
// on the sending domain in Resend.

// Verifies the Svix signature Resend attaches to every webhook. Returns true
// when no secret is configured (dev) so local testing isn't blocked.
function verifySignature(payload: string, headers: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !timestamp || !sigHeader) return false;

  // secret is "whsec_<base64 key>"
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${payload}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");

  // Header is a space-separated list of "v1,<sig>" entries — match any.
  return sigHeader.split(" ").some(part => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch { return false; }
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad payload" }, { status: 400 }); }

  const emailId = event.data?.email_id;
  if (!emailId) return NextResponse.json({ ok: true }); // nothing to correlate

  const now = new Date();
  const updates: Record<string, unknown> = {};
  switch (event.type) {
    case "email.delivered":        updates.deliveredAt = now; break;
    case "email.opened":           updates.openedAt = now; break;
    case "email.clicked":          updates.clickedAt = now; updates.openedAt = now; break;
    case "email.bounced":          updates.bouncedAt = now; updates.status = "failed"; break;
    case "email.complained":       updates.status = "complained"; break;
    default: return NextResponse.json({ ok: true }); // ignore sent / delayed / etc.
  }

  // Only stamp a timestamp once (first event wins) to keep "first delivered/clicked" semantics.
  await prisma.emailLog.updateMany({ where: { resendId: emailId }, data: updates });
  return NextResponse.json({ ok: true });
}
