import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { wrapCampaignHtml } from "@/lib/email";
import { personalize } from "@/lib/campaignRecipients";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { to, subject, htmlBody } = await req.json();
  if (!to?.trim() || !subject?.trim()) return NextResponse.json({ error: "to and subject are required" }, { status: 400 });

  // Personalize with sample data so {{fname}} etc. are visible in the test.
  const sample = { email: to, fname: "Prénom", lname: "Nom", org: "Organisation", country: "Cameroun", ticketType: "Standard" };
  const html = wrapCampaignHtml(personalize(htmlBody || "", sample));

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: getFrom(), to: to.trim(), subject: `[TEST] ${subject}`, html });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Send failed" }, { status: 500 });
  }
}
