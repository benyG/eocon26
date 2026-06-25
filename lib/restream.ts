const RESTREAM_BASE = "https://api.restream.io/v2";
const RESTREAM_RTMP_BASE = "rtmp://live.restream.io/live";

export interface RestreamChannel {
  id: number;
  displayName: string;
  type: string;
  isActive: boolean;
  isLive: boolean;
  viewerCount: number;
  embedUrl: string | null;
}

export interface RestreamStatus {
  channels: RestreamChannel[];
  streamKey: string;
  rtmpUrl: string;
  anyLive: boolean;
  youtubeEmbedUrl: string | null;
}

async function restreamGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${RESTREAM_BASE}${path}`, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("Token invalide ou expiré");
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Restream API ${res.status}: ${txt.slice(0, 120)}`);
  }
  return res.json() as Promise<T>;
}

function buildEmbedUrl(ch: Record<string, unknown>): string | null {
  const type = String(ch.type ?? "").toLowerCase();
  // YouTube: liveStreamId or videoId or broadcastId field
  const ytId = ch.liveStreamId ?? ch.videoId ?? ch.broadcastId ?? ch.youtubeVideoId;
  if (type === "youtube" && ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1`;
  return null;
}

export async function fetchRestreamStatus(token: string): Promise<RestreamStatus> {
  const [rawChannels, rawKey] = await Promise.all([
    restreamGet<Record<string, unknown>[]>("/user/channel", token),
    restreamGet<Record<string, unknown>>("/user/streamKey", token),
  ]);

  const channels: RestreamChannel[] = (rawChannels ?? []).map(ch => ({
    id: Number(ch.id ?? 0),
    displayName: String(ch.displayName ?? ch.name ?? "Channel"),
    type: String(ch.type ?? ""),
    isActive: Boolean(ch.isActive ?? ch.active ?? true),
    isLive: Boolean(ch.isLive ?? ch.live ?? false),
    viewerCount: Number(ch.viewerCount ?? ch.viewers ?? 0),
    embedUrl: buildEmbedUrl(ch),
  }));

  const streamKey = String(rawKey?.streamKey ?? rawKey?.key ?? "");
  const ytChannel = channels.find(c => c.type === "youtube" && c.isLive && c.embedUrl);

  return {
    channels,
    streamKey,
    rtmpUrl: RESTREAM_RTMP_BASE,
    anyLive: channels.some(c => c.isLive),
    youtubeEmbedUrl: ytChannel?.embedUrl ?? null,
  };
}
