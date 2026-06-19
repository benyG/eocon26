import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { audienceFacets, resolveRecipients, type CampaignSegment } from "@/lib/campaignRecipients";

export const dynamic = "force-dynamic";

// GET → available filter values (distinct statuses, ticket types, countries…).
export async function GET() {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await audienceFacets());
}

// POST → resolve a segment to a recipient count + small sample (live preview).
export async function POST(req: NextRequest) {
  if (!(await hasPermission("campaigns", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const segment = (await req.json()) as CampaignSegment;
  const recipients = await resolveRecipients(segment);
  return NextResponse.json({
    count: recipients.length,
    sample: recipients.slice(0, 8).map(r => r.email),
  });
}
