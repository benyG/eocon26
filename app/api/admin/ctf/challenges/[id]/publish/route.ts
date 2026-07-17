import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canPublishCtf } from "@/lib/adminPermissions";
import { getCtfdConfig, ctfdFetch } from "@/lib/ctfd";
import { composeCtfdDescription } from "@/lib/challengeBrief";

export const dynamic = "force-dynamic";

interface CtfdChallengeResp { success?: boolean; data?: { id?: number } }

// ── Publish a challenge to CTFd ───────────────────────────────────────────────
// Creates the CTFd challenge with the structured bilingual brief (Location /
// Context / Objective, ENG+FR) and attaches its static flag. The on-solve
// revelation and the internal technique hint are never sent to CTFd.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canPublishCtf())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id);
  const ch = await prisma.cTFChallenge.findUnique({ where: { id } });
  if (!ch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ch.ctfdId) return NextResponse.json({ error: `Déjà publié sur CTFd (id ${ch.ctfdId}). Dépubliez d'abord.` }, { status: 409 });

  const cfg = await getCtfdConfig();
  if (!cfg) return NextResponse.json({ error: "CTFd non configuré (URL ou clé API manquante)" }, { status: 400 });

  if (!ch.flag) return NextResponse.json({ error: "Flag manquant : renseignez le flag du challenge avant de le publier." }, { status: 400 });

  const description = composeCtfdDescription(ch);

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

  const updated = await prisma.cTFChallenge.update({
    where: { id },
    data: { ctfdId, status: "published" },
  });
  return NextResponse.json({ ok: true, ctfdId, challenge: updated });
}

// ── Unpublish (delete from CTFd) ──────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await canPublishCtf())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
