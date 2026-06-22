import { prisma } from "@/lib/db";

const LINKEDIN_API = "https://api.linkedin.com/v2";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

// ── Token refresh ────────────────────────────────────────────────────────────

export async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  const storedRefresh = await prisma.eventSetting.findUnique({ where: { key: "linkedin_refresh_token" } });
  const refreshToken = storedRefresh?.value || process.env.LINKEDIN_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Renouvellement impossible : LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET et LINKEDIN_REFRESH_TOKEN sont requis."
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await Promise.all([
    prisma.eventSetting.upsert({
      where: { key: "linkedin_access_token" },
      update: { value: data.access_token },
      create: { key: "linkedin_access_token", value: data.access_token },
    }),
    prisma.eventSetting.upsert({
      where: { key: "linkedin_access_token_expires_at" },
      update: { value: expiresAt },
      create: { key: "linkedin_access_token_expires_at", value: expiresAt },
    }),
    ...(data.refresh_token ? [
      prisma.eventSetting.upsert({
        where: { key: "linkedin_refresh_token" },
        update: { value: data.refresh_token },
        create: { key: "linkedin_refresh_token", value: data.refresh_token },
      }),
    ] : []),
  ]);

  return data.access_token;
}

// ── Token resolution ──────────────────────────────────────────────────────────

function hasRefreshCredentials(): boolean {
  const hasEnvRefresh = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_REFRESH_TOKEN);
  return hasEnvRefresh;
}

async function hasDbRefreshToken(): Promise<boolean> {
  const r = await prisma.eventSetting.findUnique({ where: { key: "linkedin_refresh_token" } });
  return !!(r?.value && process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  const [storedToken, storedExpiry] = await Promise.all([
    prisma.eventSetting.findUnique({ where: { key: "linkedin_access_token" } }),
    prisma.eventSetting.findUnique({ where: { key: "linkedin_access_token_expires_at" } }),
  ]);

  // DB token with known expiry — most reliable path
  if (storedToken?.value && storedExpiry?.value) {
    const expiresAt = new Date(storedExpiry.value).getTime();
    const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000;
    if (!needsRefresh) return storedToken.value;
    // Token about to expire or already expired — try to refresh
    if (hasRefreshCredentials() || await hasDbRefreshToken()) return refreshAccessToken();
    throw new Error("Token LinkedIn expiré et aucun credential de refresh configuré (LINKEDIN_CLIENT_ID/SECRET/REFRESH_TOKEN).");
  }

  // DB token without expiry info — use it but note it may be expired (will catch 401 on use)
  if (storedToken?.value) return storedToken.value;

  // Env var fallback — no expiry info available, may be expired
  const envToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (envToken) return envToken;

  // No token at all — try refresh flow to obtain a first token
  if (hasRefreshCredentials() || await hasDbRefreshToken()) return refreshAccessToken();

  throw new Error("Aucun token LinkedIn disponible. Configurez LINKEDIN_ACCESS_TOKEN ou les credentials OAuth (CLIENT_ID/SECRET/REFRESH_TOKEN).");
}

// Invalidate any cached token so the next call will refresh from scratch
async function invalidateToken(): Promise<void> {
  await prisma.eventSetting.deleteMany({
    where: { key: { in: ["linkedin_access_token", "linkedin_access_token_expires_at"] } },
  });
}

function getAuthorUrn(): string {
  const urn = process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_AUTHOR_URN;
  if (!urn) throw new Error("LINKEDIN_ORGANIZATION_URN (or LINKEDIN_AUTHOR_URN) env var is required");
  return urn;
}

// ── LinkedIn API call with 401 retry ─────────────────────────────────────────

async function linkedInFetch(url: string, options: RequestInit, retry = true): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401 && retry) {
    // Token is expired — invalidate, force refresh, retry once
    await invalidateToken();
    const newToken = await refreshAccessToken();
    const newOptions = {
      ...options,
      headers: {
        ...(options.headers as Record<string, string>),
        Authorization: `Bearer ${newToken}`,
      },
    };
    return linkedInFetch(url, newOptions, false);
  }
  return res;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface LinkedInPostResult {
  id: string;
  url: string;
}

export async function publishPost(text: string, imageUrl?: string): Promise<LinkedInPostResult> {
  const token = await getAccessToken();
  const author = getAuthorUrn();

  const body: Record<string, unknown> = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
        ...(imageUrl ? {
          media: [{
            status: "READY",
            description: { text: "EOCON 2026" },
            media: await uploadImage(imageUrl, token, author),
            title: { text: "EOCON 2026" },
          }],
        } : {}),
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await linkedInFetch(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    const authorUrn = process.env.LINKEDIN_ORGANIZATION_URN || process.env.LINKEDIN_AUTHOR_URN || "NOT_SET";
    throw new Error(`LinkedIn API error ${res.status} (author=${authorUrn}): ${err}`);
  }

  const postId = res.headers.get("x-restli-id") || (await res.json() as { id: string }).id;
  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}/`,
  };
}

async function uploadImage(imageUrl: string, token: string, author: string): Promise<string> {
  const registerRes = await fetch(`${LINKEDIN_API}/assets?action=registerUpload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: author,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });

  if (!registerRes.ok) throw new Error("LinkedIn image register failed");
  const registerData = await registerRes.json() as {
    value: {
      asset: string;
      uploadMechanism: { "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string } };
    };
  };

  const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  const assetUrn = registerData.value.asset;

  const imgRes = await fetch(imageUrl);
  const imgBuffer = await imgRes.arrayBuffer();
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
    body: imgBuffer,
  });

  return assetUrn;
}

export async function getProfile(): Promise<{ id: string; name: string }> {
  const token = await getAccessToken();
  const res = await linkedInFetch(`${LINKEDIN_API}/me?projection=(id,localizedFirstName,localizedLastName)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LinkedIn profile error: ${res.status}`);
  const data = await res.json() as { id: string; localizedFirstName: string; localizedLastName: string };
  return { id: data.id, name: `${data.localizedFirstName} ${data.localizedLastName}` };
}

// ── Token status (for admin UI) ───────────────────────────────────────────────

export async function getTokenStatus(): Promise<{
  hasToken: boolean;
  source: "db" | "env" | "none";
  expiresAt: string | null;
  isExpired: boolean;
  canRefresh: boolean;
}> {
  const [storedToken, storedExpiry] = await Promise.all([
    prisma.eventSetting.findUnique({ where: { key: "linkedin_access_token" } }),
    prisma.eventSetting.findUnique({ where: { key: "linkedin_access_token_expires_at" } }),
  ]);

  const dbToken = storedToken?.value;
  const envToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const expiresAt = storedExpiry?.value || null;
  const isExpired = expiresAt ? Date.now() > new Date(expiresAt).getTime() : false;
  const canRefresh = hasRefreshCredentials() || await hasDbRefreshToken();

  if (dbToken) return { hasToken: true, source: "db", expiresAt, isExpired, canRefresh };
  if (envToken) return { hasToken: true, source: "env", expiresAt: null, isExpired: false, canRefresh };
  return { hasToken: false, source: "none", expiresAt: null, isExpired: false, canRefresh };
}
