import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// P1 25% · P2 10% · P3 15% · P4 30% · P5 10% · P6 10%
function computeIpAndTier(
  p1: number, p2: number, p3: number, p4: number, p5: number, p6: number,
  participationModel: string, tierOverride: boolean, currentTier: string,
) {
  const ip = Math.round(p1 * 0.25 + p2 * 0.10 + p3 * 0.15 + p4 * 0.30 + p5 * 0.10 + p6 * 0.10);
  if (tierOverride) return { ipScore: ip, tier: currentTier };
  if (participationModel === "paid") return { ipScore: ip, tier: "Veille" };
  const tier = ip >= 75 ? "Tier1" : ip >= 50 ? "Tier2" : ip >= 25 ? "Tier3" : "Veille";
  return { ipScore: ip, tier };
}

/** POST /api/admin/speaker-profiles/recalculate
 *  Re-evaluates ipScore and tier for every non-archived profile using the
 *  current weighting formula. Returns { updated: number }. */
export async function POST() {
  if (!(await hasPermission("prospection-speakers", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profiles = await prisma.speakerProfile.findMany({
    where: { status: { not: "archived" } },
    select: { id: true, p1: true, p2: true, p3: true, p4: true, p5: true, p6: true, participationModel: true, tierOverride: true, tier: true },
  });

  const updates = profiles.map(pr => {
    const { ipScore, tier } = computeIpAndTier(
      pr.p1, pr.p2, pr.p3, pr.p4, pr.p5, pr.p6,
      pr.participationModel, pr.tierOverride, pr.tier,
    );
    return prisma.speakerProfile.update({ where: { id: pr.id }, data: { ipScore, tier } });
  });

  await prisma.$transaction(updates);

  return NextResponse.json({ updated: updates.length });
}
