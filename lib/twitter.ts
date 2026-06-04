// X (Twitter) API v2 — OAuth 1.0a User Context for posting
// Required env vars:
//   X_API_KEY            — Consumer Key (App Key)
//   X_API_SECRET         — Consumer Secret (App Secret)
//   X_ACCESS_TOKEN       — Access Token (your account)
//   X_ACCESS_TOKEN_SECRET — Access Token Secret

import crypto from "crypto";

const API_BASE = "https://api.twitter.com/2";
const UPLOAD_BASE = "https://upload.twitter.com/1.1";

function getCredentials() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X API credentials missing: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET");
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

// OAuth 1.0a signature
function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string,
): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join("&");

  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;

  const headerValue = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");

  return headerValue;
}

function authHeader(method: string, url: string, params: Record<string, string> = {}): string {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getCredentials();
  return oauthSign(method, url, params, apiKey, apiSecret, accessToken, accessTokenSecret);
}

export interface TwitterPostResult {
  id: string;
  url: string;
}

export async function publishTweet(text: string, imageUrl?: string): Promise<TwitterPostResult> {
  // Twitter enforces 280-char limit — truncate with ellipsis if needed
  const content = text.length > 280 ? text.slice(0, 277) + "..." : text;

  const body: Record<string, unknown> = { text: content };

  if (imageUrl) {
    const mediaId = await uploadMedia(imageUrl);
    body.media = { media_ids: [mediaId] };
  }

  const url = `${API_BASE}/tweets`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: { id: string; text: string } };
  const id = data.data.id;
  return {
    id,
    url: `https://x.com/i/web/status/${id}`,
  };
}

async function uploadMedia(imageUrl: string): Promise<string> {
  // Fetch image bytes
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to fetch image for X upload: ${imgRes.status}`);
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const totalBytes = buffer.byteLength;
  const b64 = buffer.toString("base64");

  // INIT
  const initUrl = `${UPLOAD_BASE}/media/upload.json`;
  const initParams = {
    command: "INIT",
    total_bytes: totalBytes.toString(),
    media_type: contentType,
    media_category: "tweet_image",
  };
  const initRes = await fetch(initUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader("POST", initUrl),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(initParams).toString(),
  });
  if (!initRes.ok) throw new Error(`X media INIT failed: ${await initRes.text()}`);
  const { media_id_string } = await initRes.json() as { media_id_string: string };

  // APPEND (single chunk — max 5MB; GCS images should be under that)
  const appendUrl = `${UPLOAD_BASE}/media/upload.json`;
  const formData = new URLSearchParams({
    command: "APPEND",
    media_id: media_id_string,
    media_data: b64,
    segment_index: "0",
  });
  const appendRes = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader("POST", appendUrl),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
  if (!appendRes.ok && appendRes.status !== 204) {
    throw new Error(`X media APPEND failed: ${await appendRes.text()}`);
  }

  // FINALIZE
  const finalizeUrl = `${UPLOAD_BASE}/media/upload.json`;
  const finalizeRes = await fetch(finalizeUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader("POST", finalizeUrl),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ command: "FINALIZE", media_id: media_id_string }).toString(),
  });
  if (!finalizeRes.ok) throw new Error(`X media FINALIZE failed: ${await finalizeRes.text()}`);

  return media_id_string;
}
