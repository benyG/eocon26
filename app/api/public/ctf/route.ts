import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CtfdEntry { name: string; score: number; solves?: number; members?: Array<{ name: string }> }

export async function GET() {
  const settings = await prisma.eventSetting.findMany({ where: { key: { in: ["ctfdUrl", "ctfdApiKey", "ctfEnabled"] } } });
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });

  if (map.ctfEnabled !== "true") return NextResponse.json({ enabled: false });

  const ctfdUrl = map.ctfdUrl?.replace(/\/$/, "");
  const apiKey = map.ctfdApiKey;
  if (!ctfdUrl || !apiKey) return NextResponse.json({ enabled: true, error: "CTFd non configuré" });

  try {
    const res = await fetch(`${ctfdUrl}/api/v1/scoreboard/top/10`, {
      headers: { "Authorization": `Token ${apiKey}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) return NextResponse.json({ enabled: true, error: "Erreur CTFd" });

    const raw = await res.json() as { success: boolean; data: Record<string, CtfdEntry> };
    const standings = Object.entries(raw.data || {})
      .map(([rank, entry]) => ({
        rank: parseInt(rank),
        name: entry.name,
        score: entry.score,
        solves: entry.solves ?? 0,
        members: (entry.members || []).map(m => m.name),
      }))
      .sort((a, b) => a.rank - b.rank);

    return NextResponse.json({ enabled: true, standings, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ enabled: true, error: "Impossible de joindre CTFd" });
  }
}
