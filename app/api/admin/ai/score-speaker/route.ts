import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

function computeIpAndTier(p1: number, p2: number, p3: number, p4: number, p5: number, p6: number, participationModel: string) {
  const ip = Math.round(p1 * 0.20 + p2 * 0.20 + p3 * 0.20 + p4 * 0.25 + p5 * 0.08 + p6 * 0.07);
  if (participationModel === "paid") return { ipScore: ip, tier: "Veille" };
  const tier = ip >= 75 ? "Tier1" : ip >= 50 ? "Tier2" : ip >= 25 ? "Tier3" : "Veille";
  return { ipScore: ip, tier };
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, p1, p2, p3, p4, p5, p6 } = await req.json() as { id: number; p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const profile = await prisma.speakerProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scores = { p1: p1 ?? profile.p1, p2: p2 ?? profile.p2, p3: p3 ?? profile.p3, p4: p4 ?? profile.p4, p5: p5 ?? profile.p5, p6: p6 ?? profile.p6 };
  const { ipScore, tier } = computeIpAndTier(scores.p1, scores.p2, scores.p3, scores.p4, scores.p5, scores.p6, profile.participationModel);

  const updated = await prisma.speakerProfile.update({
    where: { id },
    data: { ...scores, ipScore, tier: profile.tierOverride ? profile.tier : tier },
  });
  return NextResponse.json({ ipScore: updated.ipScore, tier: updated.tier, ...scores });
}
