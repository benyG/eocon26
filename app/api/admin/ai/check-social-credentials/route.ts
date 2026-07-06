import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

// Validate token and return the identity it belongs to
async function testMeta(token: string): Promise<string> {
  try {
    const res = await fetch(`${GRAPH}/me?access_token=${token}`);
    const data = await res.json() as { id?: string; name?: string; error?: { message: string } };
    if (data.error) return `invalide — ${data.error.message}`;
    return `OK (${data.name ?? data.id})`;
  } catch (e) {
    return `erreur réseau: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// Test the crucial step: can we exchange the System User token for a Page token?
// This is what actually breaks Facebook posting when using META_ACCESS_TOKEN directly.
async function testFacebookPageToken(pageId: string, token: string): Promise<string> {
  // If a direct page token is set, nothing to exchange
  if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) return "OK (page token direct fourni)";
  try {
    const res = await fetch(`${GRAPH}/${pageId}?fields=access_token,name&access_token=${token}`);
    const data = await res.json() as { access_token?: string; name?: string; error?: { message: string } };
    if (data.error) return `échange token échoué — ${data.error.message} (le System User est-il admin de la page ?)`;
    if (!data.access_token) return "aucun page token retourné (le System User n'est pas admin de cette page)";
    return `OK — Page token obtenu pour "${data.name ?? pageId}"`;
  } catch (e) {
    return `erreur réseau: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function testTwitter(): Promise<{ status: string; hint?: string }> {
  const key = process.env.X_API_KEY;
  const secret = process.env.X_API_SECRET;
  const token = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!key || !secret || !token || !tokenSecret) {
    return { status: "manquant", hint: "X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET requis" };
  }
  try {
    const crypto = await import("crypto");

    // Use X API v2 on api.x.com (canonical domain since 2024).
    // The signature must be computed for the exact URL used — a redirect to api.x.com
    // would invalidate a signature computed for api.twitter.com.
    const url = "https://api.x.com/2/users/me";

    const nonce = crypto.randomBytes(16).toString("hex");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: key,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: token,
      oauth_version: "1.0",
    };

    // RFC 3986 percent-encoding (encodes ! ' ( ) * too, unlike encodeURIComponent)
    const pct = (s: string) =>
      encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

    const paramString = Object.keys(oauthParams)
      .sort()
      .map(k => `${pct(k)}=${pct(oauthParams[k])}`)
      .join("&");
    const baseString = `GET&${pct(url)}&${pct(paramString)}`;
    const signingKey = `${pct(secret)}&${pct(tokenSecret)}`;
    const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
    oauthParams.oauth_signature = signature;

    const authHeader = "OAuth " + Object.keys(oauthParams)
      .sort()
      .map(k => `${pct(k)}="${pct(oauthParams[k])}"`)
      .join(", ");

    const res = await fetch(url, { headers: { Authorization: authHeader } });
    const rawText = await res.text();
    let data: { data?: { id: string; username: string }; errors?: { message: string; code?: number }[]; title?: string; detail?: string } = {};
    try { data = JSON.parse(rawText); } catch { /* non-JSON response */ }

    if (!res.ok || data.errors) {
      // X API v2 returns either v2-style {title, detail} or v1.1-style {errors:[{code,message}]}
      const v1msg = data.errors?.[0]?.message;
      const v1code = data.errors?.[0]?.code;
      const v2detail = data.detail ?? data.title;
      const msg = v1msg ?? v2detail ?? rawText.slice(0, 120);
      const code = v1code;

      const hint = code === 89 ? "Token invalide ou expiré — régénérer dans le Developer Portal"
        : code === 32 ? "Access Token généré sans permission Write. Dans le Developer Portal : User authentication settings → cocher Read+Write → Save, puis Keys and Tokens → Regenerate Access Token."
        : code === 135 ? "Timestamp invalide — problème d'horloge serveur"
        : res.status === 401 ? "OAuth 1.0a non configuré. Dans le Developer Portal → ton app → Settings → User authentication settings : activer OAuth 1.0a, mettre les permissions en Read+Write, sauvegarder, puis Keys and Tokens → Regenerate Access Token & Secret."
        : res.status === 403 ? "Accès refusé — vérifier le niveau d'accès (Basic requis pour l'API v2) et les permissions Read+Write"
        : "Vérifier les permissions (Read+Write requis) et régénérer l'Access Token";
      return { status: `invalide (HTTP ${res.status}${code ? ` / code ${code}` : ""}) — ${msg}`, hint };
    }
    return { status: `OK (@${data.data?.username ?? data.data?.id})` };
  } catch (e) {
    return { status: `erreur réseau: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function GET() {
  if (!(await hasPermission("communication", "read")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const metaToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
  const fbPageId = process.env.FACEBOOK_PAGE_ID || "";
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || "";
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const waBroadcastTo = process.env.WHATSAPP_BROADCAST_TO || "";

  const [metaStatus, fbPageStatus, twitterResult] = await Promise.all([
    metaToken ? testMeta(metaToken) : Promise.resolve("manquant"),
    metaToken && fbPageId ? testFacebookPageToken(fbPageId, metaToken) : Promise.resolve("manquant"),
    testTwitter(),
  ]);

  return NextResponse.json({
    openai: {
      status: process.env.OPENAI_API_KEY ? "OK" : "manquant — OPENAI_API_KEY requis pour la génération de posts",
      vars: { OPENAI_API_KEY: !!process.env.OPENAI_API_KEY },
    },
    twitter: {
      status: twitterResult.status,
      hint: twitterResult.hint,
      vars: {
        X_API_KEY: !!process.env.X_API_KEY,
        X_API_SECRET: !!process.env.X_API_SECRET,
        X_ACCESS_TOKEN: !!process.env.X_ACCESS_TOKEN,
        X_ACCESS_TOKEN_SECRET: !!process.env.X_ACCESS_TOKEN_SECRET,
      },
    },
    facebook: {
      status: fbPageId ? fbPageStatus : "FACEBOOK_PAGE_ID manquant",
      meta_token: metaStatus,
      vars: {
        META_ACCESS_TOKEN: !!metaToken,
        FACEBOOK_PAGE_ID: !!fbPageId,
      },
    },
    instagram: {
      status: igAccountId ? metaStatus : "INSTAGRAM_BUSINESS_ACCOUNT_ID manquant",
      vars: {
        META_ACCESS_TOKEN: !!metaToken,
        INSTAGRAM_BUSINESS_ACCOUNT_ID: !!igAccountId,
      },
    },
    whatsapp: {
      status: waPhoneId && waBroadcastTo ? metaStatus : "WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_BROADCAST_TO manquant",
      vars: {
        META_ACCESS_TOKEN: !!metaToken,
        WHATSAPP_PHONE_NUMBER_ID: !!waPhoneId,
        WHATSAPP_BROADCAST_TO: !!waBroadcastTo,
      },
    },
  });
}
