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

export interface RestreamCaption {
  id: number;
  text: string;
  secondaryText?: string;
  active: boolean;
}

export interface RestreamTicker {
  id: number;
  text: string;
  active: boolean;
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

async function restreamMutate<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${RESTREAM_BASE}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("Token invalide ou expiré");
  if (!res.ok && res.status !== 204) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Restream API ${res.status}: ${txt.slice(0, 120)}`);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as unknown as T;
  return res.json() as Promise<T>;
}

function buildEmbedUrl(ch: Record<string, unknown>): string | null {
  const type = String(ch.type ?? "").toLowerCase();
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

// ── Captions ──────────────────────────────────────────────────────────────────

export async function listCaptions(token: string): Promise<RestreamCaption[]> {
  const raw = await restreamGet<Record<string, unknown>[]>("/user/caption", token);
  return (raw ?? []).map(c => ({
    id: Number(c.id),
    text: String(c.text ?? ""),
    secondaryText: c.secondaryText ? String(c.secondaryText) : undefined,
    active: Boolean(c.active ?? false),
  }));
}

export async function createCaption(token: string, text: string, secondaryText?: string): Promise<RestreamCaption> {
  const raw = await restreamMutate<Record<string, unknown>>("POST", "/user/caption", token, {
    text,
    ...(secondaryText ? { secondaryText } : {}),
  });
  return {
    id: Number(raw.id),
    text: String(raw.text ?? text),
    secondaryText: raw.secondaryText ? String(raw.secondaryText) : undefined,
    active: Boolean(raw.active ?? false),
  };
}

export async function updateCaption(token: string, id: number, patch: { text?: string; secondaryText?: string; active?: boolean }): Promise<void> {
  await restreamMutate("PUT", `/user/caption/${id}`, token, patch);
}

export async function deleteCaption(token: string, id: number): Promise<void> {
  await restreamMutate("DELETE", `/user/caption/${id}`, token);
}

// ── Tickers ───────────────────────────────────────────────────────────────────

export async function listTickers(token: string): Promise<RestreamTicker[]> {
  const raw = await restreamGet<Record<string, unknown>[]>("/user/ticker", token);
  return (raw ?? []).map(t => ({
    id: Number(t.id),
    text: String(t.text ?? ""),
    active: Boolean(t.active ?? false),
  }));
}

export async function createTicker(token: string, text: string): Promise<RestreamTicker> {
  const raw = await restreamMutate<Record<string, unknown>>("POST", "/user/ticker", token, { text });
  return {
    id: Number(raw.id),
    text: String(raw.text ?? text),
    active: Boolean(raw.active ?? false),
  };
}

export async function updateTicker(token: string, id: number, patch: { text?: string; active?: boolean }): Promise<void> {
  await restreamMutate("PUT", `/user/ticker/${id}`, token, patch);
}

export async function deleteTicker(token: string, id: number): Promise<void> {
  await restreamMutate("DELETE", `/user/ticker/${id}`, token);
}
