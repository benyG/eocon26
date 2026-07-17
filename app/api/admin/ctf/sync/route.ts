import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

function randomPassword(len = 7): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function getCtfdConfig() {
  const settings = await prisma.eventSetting.findMany({ where: { key: { in: ["ctfdUrl", "ctfdApiKey"] } } });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return { url: map.ctfdUrl?.replace(/\/$/, ""), apiKey: map.ctfdApiKey };
}

async function ctfdPost(url: string, apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Token ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

async function ctfdPatch(url: string, apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${url}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": `Token ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("ctf-participants", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, registrationIds } = await req.json() as { action: string; registrationIds?: number[] };
  const { url, apiKey } = await getCtfdConfig();

  if (!url || !apiKey) return NextResponse.json({ error: "CTFd non configuré (URL ou clé API manquante)" }, { status: 400 });

  // Get target participants
  let where: { id?: { in: number[] }; ctfAccountCreated?: boolean } = {};
  if (registrationIds?.length) where = { id: { in: registrationIds } };

  const participants = await prisma.registration.findMany({
    where: { ...where, ctfCompetitorName: { not: null } },
    select: { id: true, email: true, ctfCompetitorName: true, ctfTeamName: true, ctfPassword: true, ctfAccountCreated: true },
  });

  const results: { id: number; pseudo: string; success: boolean; error?: string; password?: string }[] = [];

  if (action === "create_account" || action === "sync_all") {
    for (const p of participants) {
      if (p.ctfAccountCreated) { results.push({ id: p.id, pseudo: p.ctfCompetitorName!, success: true }); continue; }

      // Generate unique password per user if not already set
      const password = p.ctfPassword || randomPassword(7);

      const r = await ctfdPost(url, apiKey, "/api/v1/users", {
        name: p.ctfCompetitorName,
        email: p.email,
        password,
        type: "user",
        verified: true,
      });

      if (r.ok) {
        await prisma.registration.update({
          where: { id: p.id },
          data: { ctfAccountCreated: true, ctfPassword: password },
        });
        results.push({ id: p.id, pseudo: p.ctfCompetitorName!, success: true, password });
      } else {
        results.push({ id: p.id, pseudo: p.ctfCompetitorName!, success: false, error: JSON.stringify(r.data) });
      }
    }
  }

  if (action === "create_team" || action === "sync_all") {
    // Group participants by team name
    const teamMap: Record<string, typeof participants> = {};
    for (const p of participants) {
      if (!p.ctfTeamName) continue;
      if (!teamMap[p.ctfTeamName]) teamMap[p.ctfTeamName] = [];
      teamMap[p.ctfTeamName].push(p);
    }

    for (const [teamName, members] of Object.entries(teamMap)) {
      // Unique password per team (same for all team members)
      const teamPassword = randomPassword(7);

      // Create team on CTFd
      const tr = await ctfdPost(url, apiKey, "/api/v1/teams", {
        name: teamName,
        password: teamPassword,
      });

      if (!tr.ok) continue;
      const teamId = tr.data?.data?.id as number | undefined;
      if (!teamId) continue;

      // Store team password in settings for reference
      await prisma.eventSetting.upsert({
        where: { key: `ctfTeamPassword_${teamName}` },
        update: { value: teamPassword },
        create: { key: `ctfTeamPassword_${teamName}`, value: teamPassword },
      });

      // Add each member to team
      for (const member of members) {
        // Get CTFd user id by looking up users (try GET /api/v1/users?name=...)
        const userRes = await fetch(`${url}/api/v1/users?name=${encodeURIComponent(member.ctfCompetitorName!)}`, {
          headers: { "Authorization": `Token ${apiKey}` },
        });
        if (!userRes.ok) continue;
        const userData = await userRes.json() as { data?: Array<{ id: number }> };
        const ctfdUserId = userData.data?.[0]?.id;
        if (!ctfdUserId) continue;

        // Assign user to team
        await ctfdPatch(url, apiKey, `/api/v1/users/${ctfdUserId}`, { team_id: teamId });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
