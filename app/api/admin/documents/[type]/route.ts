import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { buildDocument } from "@/lib/buildDocument";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// Download / preview a generated document as PDF.
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  if (!(await hasPermission("documents", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const lang = sp.get("lang") === "en" ? "en" : "fr";
  const sponsorId = sp.get("sponsorId") ? parseInt(sp.get("sponsorId")!) : undefined;
  const prospectId = sp.get("prospectId") ? parseInt(sp.get("prospectId")!) : undefined;

  try {
    const doc = await buildDocument({ type: params.type, sponsorId, prospectId, lang });
    logAction(req, "CREATE", "document", `${params.type}`, { lang, sponsorId: sponsorId ?? null, prospectId: prospectId ?? null });
    return new NextResponse(new Uint8Array(doc.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Generation failed" }, { status: 400 });
  }
}
