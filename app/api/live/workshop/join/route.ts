import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOnlineSession } from "@/lib/onlineAuth";
import { signJaaSToken, jaaSMeetUrl } from "@/lib/jaasJwt";

export const dynamic = "force-dynamic";

interface Workshop { id: string; title: string; titleEn: string; room: string; active: boolean; }

async function getJaasConfig() {
  const rows = await prisma.eventSetting.findMany({
    where: { key: { in: ["jaas_app_id", "jaas_api_key", "jaas_private_key"] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

async function getWorkshops(): Promise<Workshop[]> {
  const row = await prisma.eventSetting.findUnique({ where: { key: "workshops" } });
  if (!row) return [];
  try { return JSON.parse(row.value) as Workshop[]; } catch { return []; }
}

export async function GET(req: NextRequest) {
  const session = await getOnlineSession();
  if (!session) return NextResponse.redirect(new URL("/live", req.url));

  if (!session.includesWorkshops) {
    return NextResponse.redirect(new URL("/live?error=no_workshop_access", req.url));
  }

  const workshopId = req.nextUrl.searchParams.get("id");
  if (!workshopId) return NextResponse.redirect(new URL("/live", req.url));

  const workshops = await getWorkshops();
  const workshop = workshops.find(w => w.id === workshopId);
  if (!workshop || !workshop.active) {
    return NextResponse.redirect(new URL("/live?error=workshop_not_found", req.url));
  }

  const cfg = await getJaasConfig();
  const appId      = cfg["jaas_app_id"];
  const apiKeyId   = cfg["jaas_api_key"];
  const privateKey = cfg["jaas_private_key"];

  if (!appId || !apiKeyId || !privateKey) {
    return NextResponse.redirect(new URL("/live?error=jaas_not_configured", req.url));
  }

  try {
    const jwt = signJaaSToken({
      appId,
      apiKeyId,
      privateKeyPem: privateKey,
      room: workshop.room,
      user: {
        id:    String(session.registrationId),
        name:  `${session.fname} ${session.lname}`,
        email: session.email,
      },
    });
    const meetUrl = jaaSMeetUrl(appId, workshop.room, jwt);
    return NextResponse.redirect(meetUrl);
  } catch (err) {
    console.error("[JaaS JWT error]", err);
    return NextResponse.redirect(new URL("/live?error=jaas_error", req.url));
  }
}
