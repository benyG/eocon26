import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.eventSetting.findMany({
    where: { key: { in: ["ctfdUrl", "ctfdApiKey"] } },
  });
  const map: Record<string, string> = {};
  settings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });

  const ctfdUrl = (map.ctfdUrl || "").replace(/\/$/, "");
  const apiKey = map.ctfdApiKey || "";

  if (!ctfdUrl) {
    return NextResponse.json({ configured: false, scores: [] });
  }

  try {
    const fetchOpts = { headers: apiKey ? { "Authorization": `Token ${apiKey}` } : {}, next: { revalidate: 30 } } as unknown as RequestInit;
    const res = await fetch(`${ctfdUrl}/api/v1/scoreboard/top/10`, fetchOpts);

    if (!res.ok) {
      return NextResponse.json({ configured: true, error: "CTFd unreachable", scores: [] });
    }

    const json = await res.json() as { success: boolean; data: Record<string, { name: string; score: number; members?: unknown[] }> };

    const scores = Object.entries(json.data || {})
      .map(([rank, entry]) => ({
        rank: parseInt(rank),
        name: entry.name,
        score: entry.score,
        solves: Array.isArray(entry.members) ? entry.members.length : 0,
      }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({ configured: true, scores });
  } catch {
    return NextResponse.json({ configured: true, error: "Fetch error", scores: [] });
  }
}
