import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

function computeIpAndTier(p: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number }, participationModel: string, tierOverride: boolean, currentTier?: string) {
  const ip = Math.round(p.p1 * 0.25 + p.p2 * 0.10 + p.p3 * 0.15 + p.p4 * 0.30 + p.p5 * 0.10 + p.p6 * 0.10);
  if (tierOverride && currentTier) return { ipScore: ip, tier: currentTier };
  if (participationModel === "paid") return { ipScore: ip, tier: "Veille" };
  const tier = ip >= 75 ? "Tier1" : ip >= 50 ? "Tier2" : ip >= 25 ? "Tier3" : "Veille";
  return { ipScore: ip, tier };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const body = await req.json();
  const existing = await prisma.speakerProfile.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const p = {
    p1: body.p1 ?? existing.p1,
    p2: body.p2 ?? existing.p2,
    p3: body.p3 ?? existing.p3,
    p4: body.p4 ?? existing.p4,
    p5: body.p5 ?? existing.p5,
    p6: body.p6 ?? existing.p6,
  };
  const pm = body.participationModel ?? existing.participationModel;
  const to = body.tierOverride ?? existing.tierOverride;
  const ct = body.tier ?? existing.tier;
  const { ipScore, tier } = computeIpAndTier(p, pm, to, ct);

  // Strip relation arrays and read-only fields — Prisma rejects them in data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, speakerId: _sid, createdAt: _ca, updatedAt: _ua, contacts: _c, sources: _s, ...scalars } = body;

  const updated = await prisma.speakerProfile.update({
    where: { id },
    data: { ...scalars, ipScore, tier },
    include: { contacts: true, sources: true },
  });
  logAction(req, "UPDATE", "speaker-profile", id, { name: existing.name, ipScore, tier });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("prospection-speakers", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = parseInt(params.id);
  const existing = await prisma.speakerProfile.findUnique({ where: { id }, select: { name: true } });
  // Never delete — archive instead
  const updated = await prisma.speakerProfile.update({
    where: { id },
    data: { status: "archived" },
  });
  logAction(req, "ARCHIVE", "speaker-profile", id, { name: existing?.name ?? "" });
  return NextResponse.json(updated);
}
