import { NextRequest, NextResponse } from "next/server";
import { GATED_ASSETS } from "@/lib/gatedAssets";
import { isImageUnlocked } from "@/lib/bibleState";

export const dynamic = "force-dynamic";

// Serve a full-resolution gated image ONLY when its story arc is unlocked (global
// CTFd progress). Before that, the launch page shows a genuinely redacted low-res
// version and this endpoint returns 403 — the original never reaches the client.
export async function GET(_req: NextRequest, { params }: { params: { key: string } }) {
  const asset = GATED_ASSETS[params.key];
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await isImageUnlocked(params.key))) {
    return NextResponse.json({ error: "Classified — arc not yet unlocked" }, { status: 403 });
  }
  const bytes = Buffer.from(asset.b64, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: { "Content-Type": asset.mime, "Cache-Control": "no-store" },
  });
}
