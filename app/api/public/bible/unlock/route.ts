import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { REVELATION_ARCS } from "@/lib/revelationContent";
import { getArcToken, unlockArc, getRevealRedirect, getSiteBaseUrl } from "@/lib/revelationUnlock";

export const dynamic = "force-dynamic";

// A player who has solved a synthesis challenge clicks this link (from the CTFd
// challenge description). We validate the arc token, unlock the arc GLOBALLY, then
// redirect straight to the freshly revealed truth on the bible page.
export async function GET(req: NextRequest) {
  const base = await getSiteBaseUrl();
  const arc = parseInt(req.nextUrl.searchParams.get("arc") || "", 10);
  const k = req.nextUrl.searchParams.get("k") || "";

  const fail = () => NextResponse.redirect(`${base}/ctf-briefing.html#revelations`);

  if (!REVELATION_ARCS.includes(arc as never)) return fail();

  const token = await getArcToken(arc);
  const a = Buffer.from(k);
  const b = Buffer.from(token);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return fail();

  await unlockArc(arc, "key");
  return NextResponse.redirect(await getRevealRedirect(arc));
}
