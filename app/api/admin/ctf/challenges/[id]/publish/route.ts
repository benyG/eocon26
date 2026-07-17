import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";
import { getUnlockUrl } from "@/lib/revelationUnlock";

export const dynamic = "force-dynamic";

interface CtfdChallengeResp { success?: boolean; data?: { id?: number } }

// ── Publish a challenge to CTFd ───────────────────────────────────────────────
// Creates the CTFd challenge, attaches its static flag, and — for synthesis
// challenges — wires the `requirements` (prerequisites) so CTFd only reveals it to
// a team once every fragment of the block is solved. Stores the returned CTFd id.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("ctf", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id);
  const ch = await prisma.cTFChallenge.findUnique({ where: { id } });
  if (!ch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ch.ctfdId) return NextResponse.json({ error: `Déjà publié sur CTFd (id ${ch.ctfdId}). Dépubliez d'abord.` }, { status: 409 });

  const cfg = await getCtfdConfig();
  if (!cfg) return NextResponse.json({ error: "CTFd non configuré (URL ou clé API manquante)" }, { status: 400 });

  if (!ch.flag) return NextResponse.json({ error: "Flag manquant : renseignez le flag du challenge avant de le publier." }, { status: 400 });

  // Resolve synthesis prerequisites → CTFd ids (all prereqs must already be published)
  let requirementIds: number[] = [];
  if (ch.prerequisites) {
    const codes = ch.prerequisites.split(",").map((c) => c.trim()).filter(Boolean);
    const prereqs = await prisma.cTFChallenge.findMany({ where: { fragmentCode: { in: codes } } });
    const missing = codes.filter((c) => !prereqs.find((p) => p.fragmentCode === c));
    const unpublished = prereqs.filter((p) => !p.ctfdId).map((p) => p.fragmentCode);
    if (missing.length) return NextResponse.json({ error: `Prérequis introuvables : ${missing.join(", ")}` }, { status: 400 });
    if (unpublished.length) return NextResponse.json({ error: `Publiez d'abord les prérequis sur CTFd : ${unpublished.join(", ")}` }, { status: 400 });
    requirementIds = prereqs.map((p) => p.ctfdId!).filter(Boolean);
  }

  // Build the player-facing description (mission brief only). We strip the internal
  // "Technique suggérée / Suggested technique" hint so we never leak the intended
  // exploit path, and we do NOT send the narrative "success message" (it would spoil
  // the reveal pre-solve) — that stays in our DB for the platform to show on solve.
  const brief = (ch.notes || "").split(/\s*Technique sugg|\s*Suggested technique/i)[0].trim();
  const descParts: string[] = [];
  if (brief) descParts.push(brief);
  if (ch.fragmentCode) descParts.push(`\n\n— Reality Fragment ${ch.fragmentCode}${ch.isPrimeSeal ? " · PRIME SEAL" : ""}.`);
  // Synthesis challenges carry the bible unlock link for their arc: solving reveals
  // the truth to the whole community and lands the player on it.
  if (ch.isSynthesis && ch.revelation) {
    const arc = parseInt(ch.revelation.split(",")[0].trim(), 10);
    if (arc) {
      const unlockUrl = await getUnlockUrl(arc);
      descParts.push(`\n\n>> TRANSMISSION UNLOCKED — reveal this truth to every Operator:\n${unlockUrl}`);
    }
  }
  const description = descParts.join("").trim() || ch.title;

  // 1) Create the challenge
  const create = await ctfdFetch<CtfdChallengeResp>(cfg, "POST", "/api/v1/challenges", {
    name: ch.title,
    category: ch.category,
    description,
    value: ch.points ?? 0,
    state: "visible",
    type: "standard",
  });
  if (!create.ok || !create.data?.data?.id) {
    return NextResponse.json({ error: `Échec création CTFd`, detail: create.data }, { status: 502 });
  }
  const ctfdId = create.data.data.id;

  // 2) Attach the static flag (payload shape matches the official ctfcli client)
  const flagRes = await ctfdFetch(cfg, "POST", "/api/v1/flags", {
    challenge_id: ctfdId,
    content: ch.flag,
    type: "static",
    data: "",
  });
  if (!flagRes.ok) {
    // Roll back the orphan challenge so we don't leave a flagless challenge behind.
    await ctfdFetch(cfg, "DELETE", `/api/v1/challenges/${ctfdId}`);
    return NextResponse.json({ error: "Échec ajout du flag CTFd", detail: flagRes.data }, { status: 502 });
  }

  // 3) Wire prerequisites (synthesis gating)
  if (requirementIds.length) {
    const reqRes = await ctfdFetch(cfg, "PATCH", `/api/v1/challenges/${ctfdId}`, {
      requirements: { prerequisites: requirementIds, anonymize: true },
    });
    if (!reqRes.ok) {
      await ctfdFetch(cfg, "DELETE", `/api/v1/challenges/${ctfdId}`);
      return NextResponse.json({ error: "Échec configuration des prérequis CTFd", detail: reqRes.data }, { status: 502 });
    }
  }

  const updated = await prisma.cTFChallenge.update({
    where: { id },
    data: { ctfdId, status: "published" },
  });
  return NextResponse.json({ ok: true, ctfdId, challenge: updated, requirements: requirementIds });
}

// ── Unpublish (delete from CTFd) ──────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("ctf", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id);
  const ch = await prisma.cTFChallenge.findUnique({ where: { id } });
  if (!ch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ch.ctfdId) return NextResponse.json({ error: "Ce challenge n'est pas publié sur CTFd." }, { status: 400 });

  const cfg = await getCtfdConfig();
  if (!cfg) return NextResponse.json({ error: "CTFd non configuré" }, { status: 400 });

  const del = await ctfdFetch(cfg, "DELETE", `/api/v1/challenges/${ch.ctfdId}`);
  // 404 = already gone on CTFd; treat as success so our state can be reconciled.
  if (!del.ok && del.status !== 404) {
    return NextResponse.json({ error: "Échec suppression CTFd", detail: del.data }, { status: 502 });
  }

  const updated = await prisma.cTFChallenge.update({
    where: { id },
    data: { ctfdId: null, status: "validated" },
  });
  return NextResponse.json({ ok: true, challenge: updated });
}
