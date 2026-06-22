import { prisma } from "@/lib/db";

const LINKEDIN_API = "https://api.linkedin.com/v2";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

// ── Token refresh ────────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  // Prefer refresh token stored in DB (updated after each refresh),
  // fall back to the bootstrap value from env.
  const storedRefresh = await prisma.eventSetting.findUnique({ where: { key: "linkedin_refresh_token" } });
  const refreshToken = storedRefresh?.value || process.env.LINKEDIN_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "LinkedIn token refresh requires LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REFRESH_TOKEN"
    );
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Persist new access token + expiry in DB
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
    // LinkedIn may issue a new refresh token — persist it if present
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

// ── Token resolution (with auto-refresh) ─────────────────────────────────────

async function getAccessToken(): Promise<string> {
  // Check DB for a stored token + expiry
  const [storedToken, storedExpiry] = await Promise.all([
    prisma.eventSetting.findUnique({ where: { key: "linkedin_access_token" } }),
    prisma.eventSetting.findUnique({ where: { key: "linkedin_access_token_expires_at" } }),
  ]);

  const hasRefreshCredentials =
    !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET &&
      (process.env.LINKEDIN_REFRESH_TOKEN || storedToken));

  if (storedToken?.value && storedExpiry?.value) {
    const expiresAt = new Date(storedExpiry.value).getTime();
    // Refresh proactively 5 minutes before expiry
    const needsRefresh = Date.now() > expiresAt - 5 * 60 * 1000;
    if (!needsRefresh) return storedToken.value;
    if (hasRefreshCredentials) return refreshAccessToken();
    throw new Error("LinkedIn access token expired and no refresh credentials configured");
  }

  // No DB token — try env fallback, then refresh
  const envToken = process.env.LINKEDIN_ACCESS_TOKEN;
  if (envToken) return envToken;
  if (hasRefreshCredentials) return refreshAccessToken();

  throw new Error("No LinkedIn access token available. Set LINKEDIN_ACCESS_TOKEN or configure OAuth refresh credentials.");
}

function getAuthorUrn(): string {
  const urn = process.env.LINKEDIN_AUTHOR_URN;
  if (!urn) throw new Error("LINKEDIN_AUTHOR_URN env var is required");
  return urn;
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

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
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
    throw new Error(`LinkedIn API error ${res.status}: ${err}`);
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
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
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
  const res = await fetch(`${LINKEDIN_API}/me?projection=(id,localizedFirstName,localizedLastName)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`LinkedIn profile error: ${res.status}`);
  const data = await res.json() as { id: string; localizedFirstName: string; localizedLastName: string };
  return { id: data.id, name: `${data.localizedFirstName} ${data.localizedLastName}` };
}
