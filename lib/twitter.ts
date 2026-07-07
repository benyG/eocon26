// X (Twitter) API v2 — OAuth 1.0a User Context for posting
// Required env vars (all values from https://developer.twitter.com/en/portal):
//   X_API_KEY             — Consumer Key  (App Key)
//   X_API_SECRET          — Consumer Secret  (App Secret)
//   X_ACCESS_TOKEN        — Access Token  (format: 1234567890-xxxxx, NOT the Bearer Token)
//   X_ACCESS_TOKEN_SECRET — Access Token Secret

import crypto from "crypto";

const API_BASE = "https://api.x.com/2";
const UPLOAD_BASE = "https://upload.twitter.com/1.1";

function getCredentials() {
  // .trim() guards against trailing spaces / newlines that silently break signatures
  const apiKey = (process.env.X_API_KEY ?? "").trim();
  const apiSecret = (process.env.X_API_SECRET ?? "").trim();
  const accessToken = (process.env.X_ACCESS_TOKEN ?? "").trim();
  const accessTokenSecret = (process.env.X_ACCESS_TOKEN_SECRET ?? "").trim();
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X API credentials missing: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET");
  }
  // Sanity-check: the OAuth 1.0a Access Token looks like "1234567890-xxxxx".
  // A Bearer Token starts with "AAAA" and would silently produce code-32 errors.
  if (accessToken.startsWith("AAAA")) {
    throw new Error(
      "X_ACCESS_TOKEN looks like a Bearer Token (starts with AAAA). " +
      "Use the OAuth 1.0a Access Token from the 'Keys and Tokens' tab " +
      "(format: 1234567890-xxxxxx), not the Bearer Token.",
    );
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

// RFC 3986 percent-encoding (stricter than encodeURIComponent — encodes ! ' ( ) * too)
function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// Build OAuth 1.0a Authorization header.
// `bodyParams` must be provided for application/x-www-form-urlencoded requests
// (RFC 5849 §3.4.1 — form body params are part of the signature base string).
// Leave empty for JSON or multipart bodies.
function buildOAuthHeader(
  method: string,
  url: string,
  bodyParams: Record<string, string> = {},
): string {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getCredentials();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Collect ALL params that go into the signature
  const allParams: Record<string, string> = { ...bodyParams, ...oauthParams };

  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${pct(k)}=${pct(allParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${pct(url)}&${pct(paramString)}`;
  const signingKey = `${pct(apiSecret)}&${pct(accessTokenSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  oauthParams.oauth_signature = signature;

  return (
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map(k => `${pct(k)}="${pct(oauthParams[k])}"`)
      .join(", ")
  );
}

export interface TwitterPostResult {
  id: string;
  url: string;
}

export async function publishTweet(text: string, imageUrl?: string): Promise<TwitterPostResult> {
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
      // JSON body: no body params in the OAuth signature
      Authorization: buildOAuthHeader("POST", url),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    // 402 CreditsDepleted: the X account has no API write credits. This is an account/
    // billing matter on X's side (posting via the X API requires a paid plan) — nothing the
    // app can fix. Surface a clear, actionable message instead of the raw JSON.
    if (res.status === 402 || /CreditsDepleted|"credits"/i.test(err)) {
      throw new Error("X (Twitter) : le compte n'a plus de crédits API. La publication sur X nécessite un plan X API payant (Basic/Pro) avec des crédits — rien à corriger côté application. Rechargez le compte X ou publiez manuellement.");
    }
    throw new Error(`X API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { data: { id: string } };
  const id = data.data.id;
  return { id, url: `https://x.com/i/web/status/${id}` };
}

async function uploadMedia(imageUrl: string): Promise<string> {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to fetch image for X upload: ${imgRes.status}`);

  // Strip content-type parameters (e.g. "image/jpeg; charset=utf-8" → "image/jpeg")
  const mimeType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const totalBytes = buffer.byteLength;

  const uploadUrl = `${UPLOAD_BASE}/media/upload.json`;

  // ── INIT ──────────────────────────────────────────────────────────────────
  // Form-encoded body → all params MUST be in the OAuth signature base string.
  const initBody: Record<string, string> = {
    command: "INIT",
    media_category: "tweet_image",
    media_type: mimeType,
    total_bytes: totalBytes.toString(),
  };
  const initRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", uploadUrl, initBody),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(initBody).toString(),
  });
  if (!initRes.ok) throw new Error(`X media INIT failed: ${await initRes.text()}`);
  const { media_id_string } = await initRes.json() as { media_id_string: string };

  // ── APPEND ────────────────────────────────────────────────────────────────
  // Send as form-encoded with media_data (base64).
  // All params (including media_data) go into the OAuth signature.
  const b64 = buffer.toString("base64");
  const appendBody: Record<string, string> = {
    command: "APPEND",
    media_data: b64,
    media_id: media_id_string,
    segment_index: "0",
  };
  const appendRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", uploadUrl, appendBody),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(appendBody).toString(),
  });
  if (!appendRes.ok && appendRes.status !== 204) {
    throw new Error(`X media APPEND failed: ${await appendRes.text()}`);
  }

  // ── FINALIZE ──────────────────────────────────────────────────────────────
  const finalizeBody: Record<string, string> = {
    command: "FINALIZE",
    media_id: media_id_string,
  };
  const finalizeRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: buildOAuthHeader("POST", uploadUrl, finalizeBody),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(finalizeBody).toString(),
  });
  if (!finalizeRes.ok) throw new Error(`X media FINALIZE failed: ${await finalizeRes.text()}`);

  return media_id_string;
}
