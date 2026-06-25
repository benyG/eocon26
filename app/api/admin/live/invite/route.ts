import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";
import { prisma } from "@/lib/db";
import { sendRestreamSpeakerInvite, sendModeratorStreamingBriefing } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("live", "write")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    type: "speaker" | "moderator";
    to: string;
    name: string;
    sessionTitle: string;
    sessionTime: string;
    studioLink?: string;
    lang?: "fr" | "en";
  };

  const { type, to, name, sessionTitle, sessionTime, studioLink, lang = "fr" } = body;
  if (!to || !name || !type)
    return NextResponse.json({ error: "Champs manquants : type, to, name requis" }, { status: 400 });

  const link = studioLink || "https://studio.restream.io";

  // Retrieve Restream RTMP info (non-blocking)
  let rtmpUrl = "rtmp://live.restream.io/live/";
  let streamKey = "";
  try {
    const tokenRow = await prisma.eventSetting.findUnique({ where: { key: "restream_access_token" } });
    if (tokenRow?.value) {
      const { fetchRestreamStatus } = await import("@/lib/restream");
      const rs = await fetchRestreamStatus(tokenRow.value);
      if (rs.rtmpUrl) rtmpUrl = rs.rtmpUrl;
      if (rs.streamKey) streamKey = rs.streamKey;
    }
  } catch { /* non-blocking */ }

  // Tech contact from settings (fallback to a placeholder)
  const techRow = await prisma.eventSetting.findUnique({ where: { key: "streaming_tech_contact" } });
  const techContact = techRow?.value || "Équipe technique EOCON";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eocon.eyesopensecurity.com";
  const qaAdminUrl = `${baseUrl}/admin?tab=live`;

  try {
    if (type === "speaker") {
      await sendRestreamSpeakerInvite(to, name, link, sessionTitle, sessionTime, techContact, lang as "fr" | "en");
    } else {
      await sendModeratorStreamingBriefing(to, name, link, rtmpUrl, streamKey, qaAdminUrl, sessionTitle, sessionTime, lang as "fr" | "en");
    }
    logAction(req, "send", "live_invite", undefined, { info: `${type} invite → ${to}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
