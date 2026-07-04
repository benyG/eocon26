import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// Auto-compute IP score and tier from P1-P6
function computeIpAndTier(p: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number }, participationModel: string, tierOverride: boolean, currentTier?: string) {
  const ip = Math.round(p.p1 * 0.25 + p.p2 * 0.10 + p.p3 * 0.15 + p.p4 * 0.30 + p.p5 * 0.10 + p.p6 * 0.10);
  if (tierOverride && currentTier) return { ipScore: ip, tier: currentTier };
  // Anti-payant rule: paid → Veille always
  if (participationModel === "paid") return { ipScore: ip, tier: "Veille" };
  const tier = ip >= 75 ? "Tier1" : ip >= 50 ? "Tier2" : ip >= 25 ? "Tier3" : "Veille";
  return { ipScore: ip, tier };
}

// Generate next SPK-XXXXXX id
async function nextSpeakerId(): Promise<string> {
  const last = await prisma.speakerProfile.findFirst({ orderBy: { id: "desc" } });
  const n = last ? last.id + 1 : 1;
  return `SPK-${String(n).padStart(6, "0")}`;
}

export async function GET() {
  const canRead = (await hasPermission("prospection-speakers", "read")) || (await hasPermission("prospection-speakers", "write"));
  if (!canRead) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const profiles = await prisma.speakerProfile.findMany({
    orderBy: { updatedAt: "desc" },
    include: { contacts: true, sources: true },
  });
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const speakerId = await nextSpeakerId();
  const p = { p1: body.p1 ?? 0, p2: body.p2 ?? 0, p3: body.p3 ?? 0, p4: body.p4 ?? 0, p5: body.p5 ?? 0, p6: body.p6 ?? 0 };
  const { ipScore, tier } = computeIpAndTier(p, body.participationModel ?? "unknown", false);
  const profile = await prisma.speakerProfile.create({
    data: { ...body, speakerId, ipScore, tier, p1: p.p1, p2: p.p2, p3: p.p3, p4: p.p4, p5: p.p5, p6: p.p6 },
    include: { contacts: true, sources: true },
  });
  logAction(req, "CREATE", "speaker-profile", profile.id, { name: profile.name, speakerId, tier });
  return NextResponse.json(profile, { status: 201 });
}
