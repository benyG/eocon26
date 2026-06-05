import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

async function getCtfdSettings() {
  const keys = ["ctfdUrl", "ctfdApiKey", "ctfDefaultPassword"];
  const settings = await prisma.eventSetting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return {
    ctfdUrl: (map.ctfdUrl || "").replace(/\/$/, ""),
    ctfdApiKey: map.ctfdApiKey || "",
    ctfDefaultPassword: map.ctfDefaultPassword || "eocon2026!",
  };
}

async function createCtfdAccount(ctfdUrl: string, apiKey: string, name: string, email: string, password: string) {
  const res = await fetch(`${ctfdUrl}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Token ${apiKey}` },
    body: JSON.stringify({ name, email, password, type: "user" }),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

async function createCtfdTeam(ctfdUrl: string, apiKey: string, teamName: string, password: string) {
  const res = await fetch(`${ctfdUrl}/api/v1/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Token ${apiKey}` },
    body: JSON.stringify({ name: teamName, password }),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, registrationIds } = await req.json() as { action: string; registrationIds?: number[] };

  const { ctfdUrl, ctfdApiKey, ctfDefaultPassword } = await getCtfdSettings();
  if (!ctfdUrl || !ctfdApiKey) {
    return NextResponse.json({ error: "CTFd URL or API key not configured" }, { status: 400 });
  }

  const results: Record<string, unknown>[] = [];

  const fetchRegs = async (ids?: number[]) => {
    const where = ids?.length ? { id: { in: ids } } : {};
    return prisma.registration.findMany({ where });
  };

  if (action === "create_account" || action === "sync_all") {
    const regs = await fetchRegs(registrationIds);
    for (const reg of regs) {
      if (reg.ctfAccountCreated) { results.push({ id: reg.id, skip: true, reason: "already_created" }); continue; }
      const name = reg.ctfCompetitorName || `${reg.fname}${reg.lname}`.replace(/\s/g, "");
      const result = await createCtfdAccount(ctfdUrl, ctfdApiKey, name, reg.email, ctfDefaultPassword);
      if (result.ok || result.status === 400) {
        // 400 might mean user already exists — still mark as created
        await prisma.registration.update({ where: { id: reg.id }, data: { ctfAccountCreated: true } });
      }
      results.push({ id: reg.id, ctfdResult: result });
    }
  }

  if (action === "create_team" || action === "sync_all") {
    const regs = await fetchRegs(registrationIds);
    // Group by team name
    const teams: Record<string, typeof regs> = {};
    for (const reg of regs) {
      if (!reg.ctfTeamName) continue;
      if (!teams[reg.ctfTeamName]) teams[reg.ctfTeamName] = [];
      teams[reg.ctfTeamName].push(reg);
    }
    for (const [teamName, members] of Object.entries(teams)) {
      const result = await createCtfdTeam(ctfdUrl, ctfdApiKey, teamName, ctfDefaultPassword);
      results.push({ team: teamName, members: members.map(m => m.email), ctfdResult: result });
    }
  }

  return NextResponse.json({ ok: true, results });
}
