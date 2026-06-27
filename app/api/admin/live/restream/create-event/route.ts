import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";
import { getValidRestreamToken } from "@/lib/restream";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

interface RestreamEventResponse {
  id?: number | string;
  eventId?: string;
  eventIdentifier?: string;
  videoId?: string;
  youtubeVideoId?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("live", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { title?: string; privacy?: string };

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  let token: string;
  try {
    token = await getValidRestreamToken();
  } catch (e) {
    return NextResponse.json({ error: `Restream not configured: ${(e as Error).message}` }, { status: 503 });
  }

  let data: RestreamEventResponse;
  try {
    const res = await fetch("https://api.restream.io/v2/user/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        title: body.title,
        privacy: body.privacy ?? "unlisted",
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Restream API error (${res.status}): ${txt.slice(0, 200)}` },
        { status: res.status >= 400 && res.status < 500 ? 400 : 502 },
      );
    }

    data = await res.json() as RestreamEventResponse;
  } catch (e) {
    return NextResponse.json({ error: `Network error: ${(e as Error).message}` }, { status: 502 });
  }

  // Extract the YouTube video ID: check platforms[] first, then top-level fields
  const eventId = data.id ? String(data.id) : null;
  const platforms = Array.isArray(data.platforms)
    ? (data.platforms as Array<Record<string, unknown>>)
    : [];
  const ytPlatform = platforms.find(p =>
    String(p.platform ?? p.type ?? "").toLowerCase().includes("youtube"),
  );
  const eventIdentifier: string | null =
    (ytPlatform?.externalEventId as string | undefined) ??
    (ytPlatform?.eventId as string | undefined) ??
    (ytPlatform?.videoId as string | undefined) ??
    (data.externalEventId as string | undefined) ??
    (data.eventIdentifier as string | undefined) ??
    (data.videoId as string | undefined) ??
    (data.youtubeVideoId as string | undefined) ??
    (data.eventId as string | undefined) ??
    null;

  const liveUrl = eventIdentifier
    ? `https://www.youtube.com/embed/${eventIdentifier}?autoplay=1`
    : null;

  logAction(req, "create", "restream_event", eventId ?? undefined, { title: body.title, eventIdentifier: eventIdentifier ?? "" });

  return NextResponse.json({ eventId, eventIdentifier, liveUrl, raw: data });
}
