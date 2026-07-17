import { prisma } from "@/lib/db";

export interface CtfdConfig {
  url: string;
  apiKey: string;
}

/** Read the CTFd base URL + API key from event settings. Returns null if unset. */
export async function getCtfdConfig(): Promise<CtfdConfig | null> {
  const settings = await prisma.eventSetting.findMany({ where: { key: { in: ["ctfdUrl", "ctfdApiKey"] } } });
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  const url = map.ctfdUrl?.replace(/\/$/, "");
  const apiKey = map.ctfdApiKey;
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

export interface CtfdResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/** Thin CTFd REST wrapper. `path` starts with /api/v1/... */
export async function ctfdFetch<T = unknown>(
  cfg: CtfdConfig,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  timeoutMs = 6000,
): Promise<CtfdResult<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Token ${cfg.apiKey}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data: T;
    try { data = (await res.json()) as T; } catch { data = null as unknown as T; }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null as unknown as T };
  } finally {
    clearTimeout(timer);
  }
}
