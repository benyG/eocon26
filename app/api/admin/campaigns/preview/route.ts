import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { wrapCampaignHtml } from "@/lib/email";
import { personalize } from "@/lib/campaignRecipients";

export const dynamic = "force-dynamic";

// Returns the fully wrapped, personalized HTML so the admin preview is identical
// to what recipients receive.
export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { htmlBody } = await req.json();
  const sample = { email: "demo@example.com", fname: "Prénom", lname: "Nom", org: "Organisation", country: "Cameroun", ticketType: "Standard" };
  return NextResponse.json({ html: wrapCampaignHtml(personalize(htmlBody || "", sample)) });
}
