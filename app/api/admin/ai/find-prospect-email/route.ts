import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { findProspectEmails } from "@/lib/findEmail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { website } = await req.json() as { website: string };
  if (!website) return NextResponse.json({ error: "website requis" }, { status: 400 });

  const emails = await findProspectEmails(website);
  const hunterAvailable = !!process.env.HUNTER_API_KEY;

  return NextResponse.json({ emails, hunterAvailable });
}
