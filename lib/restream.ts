/// <reference types="node" />
import { prisma } from "@/lib/db";

const RESTREAM_BASE = "https://api.restream.io/v2";
const RESTREAM_RTMP_BASE = "rtmp://live.restream.io/live";
const RESTREAM_TOKEN_URL = "https://api.restream.io/oauth/token";

// ── OAuth token management ─────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId     = process.env.RESTREAM_CLIENT_ID ?? "";
  const clientSecret = process.env.RESTREAM_CLIENT_SECRET ?? "";
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(RESTREAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }).toString(),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Restream token refresh failed (${res.status}): ${txt.slice(0, 120)}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    accessTokenExpiresEpoch?: number;
  };

  const expiresAt = data.accessTokenExpiresEpoch
    ? String(data.accessTokenExpiresEpoch)
    : String(Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600));

  // Persist new tokens
  await Promise.all([
    prisma.eventSetting.upsert({ where: { key: "restream_access_token"     }, create: { key: "restream_access_token",     value: data.access_token  }, update: { value: data.access_token  } }),
    prisma.eventSetting.upsert({ where: { key: "restream_refresh_token"    }, create: { key: "restream_refresh_token",    value: data.refresh_token }, update: { value: data.refresh_token } }),
    prisma.eventSetting.upsert({ where: { key: "restream_token_expires_at" }, create: { key: "restream_token_expires_at", value: expiresAt           }, update: { value: expiresAt           } }),
  ]);

  return data.access_token;
}

/** Returns a valid access token, refreshing automatically if expired (< 5 min remaining). */
export async function getValidRestreamToken(): Promise<string> {
  const rows = await prisma.eventSetting.findMany({
    where: { key: { in: ["restream_access_token", "restream_refresh_token", "restream_token_expires_at"] } },
  });
  const get = (k: string) => rows.find((r: { key: string; value: string }) => r.key === k)?.value ?? "";
  const accessToken  = get("restream_access_token");
  const refreshToken = get("restream_refresh_token");
  const expiresAt    = Number(get("restream_token_expires_at") || "0");

  if (!accessToken) throw new Error("Restream non connecté");

  // Refresh if expired or expiring within 5 minutes
  const nowSec = Math.floor(Date.now() / 1000);
  if (refreshToken && expiresAt && expiresAt - nowSec < 300) {
    return refreshAccessToken(refreshToken);
  }

  return accessToken;
}

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

async function restreamGet<T>(path: string, token: string, opts?: { on404?: T }): Promise<T> {
  const res = await fetch(`${RESTREAM_BASE}${path}`, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("Token invalide ou expiré");
  if (res.status === 404 && opts?.on404 !== undefined) return opts.on404;
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
  // Fetch channels and stream key in parallel. The streamKey endpoint returns 404
  // on some Restream account types — handle gracefully so it doesn't kill the whole call.
  const [rawChannels, rawKey] = await Promise.all([
    restreamGet<Record<string, unknown>[]>("/user/channel", token, { on404: [] }),
    restreamGet<Record<string, unknown>>("/user/streamKey", token).catch(() => null),
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

  const streamKey = rawKey ? String(rawKey.streamKey ?? rawKey.key ?? "") : "";
  const ytChannel = channels.find(c => c.type === "youtube" && c.isLive && c.embedUrl);

  return {
    channels,
    streamKey,
    rtmpUrl: RESTREAM_RTMP_BASE,
    anyLive: channels.some(c => c.isLive),
    youtubeEmbedUrl: ytChannel?.embedUrl ?? null,
  };
}

// ── Active YouTube embed URL ──────────────────────────────────────────────────

interface RestreamEventPlatform {
  platform?: string;
  type?: string;
  eventId?: string;
  externalEventId?: string;
  videoId?: string;
  [key: string]: unknown;
}

interface RestreamEvent {
  id?: number | string;
  title?: string;
  status?: string;
  externalEventId?: string;
  eventIdentifier?: string;
  videoId?: string;
  youtubeVideoId?: string;
  platforms?: RestreamEventPlatform[];
  [key: string]: unknown;
}

function extractYoutubeIdFromEvent(event: RestreamEvent): string | null {
  for (const p of (event.platforms ?? [])) {
    const isYt = String(p.platform ?? p.type ?? "").toLowerCase().includes("youtube");
    if (!isYt) continue;
    const id = p.externalEventId ?? p.eventId ?? p.videoId;
    if (id) return String(id);
  }
  const top = event.externalEventId ?? event.eventIdentifier ?? event.videoId ?? event.youtubeVideoId;
  return top ? String(top) : null;
}

/**
 * Tries to resolve the active YouTube embed URL via Restream:
 * 1. Channel status → YouTube channel isLive with embedUrl
 * 2. Events list   → most recent event with a YouTube platform ID
 * Returns { url, source } or null.
 */
export async function fetchActiveYoutubeEmbedUrl(
  token: string,
): Promise<{ url: string; source: string } | null> {
  // ── 1. Channel status (Go Live direct) ───────────────────────────────
  try {
    const status = await fetchRestreamStatus(token);
    if (status.youtubeEmbedUrl) {
      return { url: status.youtubeEmbedUrl, source: "channel_live" };
    }
  } catch { /* non-fatal */ }

  // ── 2. Events list (pre-created event) ───────────────────────────────
  try {
    const events = await restreamGet<RestreamEvent[]>("/user/events", token, { on404: [] });
    if (Array.isArray(events)) {
      for (const ev of events.slice(0, 20)) {
        const ytId = extractYoutubeIdFromEvent(ev);
        if (ytId) {
          return {
            url: `https://www.youtube.com/embed/${ytId}?autoplay=1`,
            source: "events_list",
          };
        }
      }
    }
  } catch { /* non-fatal */ }

  return null;
}

// ── Captions ──────────────────────────────────────────────────────────────────

export async function listCaptions(token: string): Promise<RestreamCaption[]> {
  const raw = await restreamGet<Record<string, unknown>[]>("/user/caption", token, { on404: [] });
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
  const raw = await restreamGet<Record<string, unknown>[]>("/user/ticker", token, { on404: [] });
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
