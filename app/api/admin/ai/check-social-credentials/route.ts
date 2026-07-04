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
    const nonce = crypto.randomBytes(16).toString("hex");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const url = "https://api.twitter.com/1.1/account/verify_credentials.json";
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: key,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: token,
      oauth_version: "1.0",
    };
    const sortedKeys = Object.keys(oauthParams).sort();
    const paramString = sortedKeys
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join("&");
    const baseString = ["GET", encodeURIComponent(url), encodeURIComponent(paramString)].join("&");
    const signingKey = `${encodeURIComponent(secret)}&${encodeURIComponent(tokenSecret)}`;
    const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
    oauthParams.oauth_signature = signature;
    const authHeader = "OAuth " + Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(", ");
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    const data = await res.json() as { screen_name?: string; errors?: { message: string; code?: number }[] };
    if (data.errors) {
      const msg = data.errors[0]?.message ?? "inconnu";
      const code = data.errors[0]?.code;
      // Code 89 = invalid/expired token, 32 = auth failed, 135 = timestamp out of bounds
      const hint = code === 89 ? "Token invalide ou expiré — régénérer dans le Developer Portal"
        : code === 32 ? "Authentification échouée — vérifier les 4 clés"
        : code === 135 ? "Timestamp invalide — problème d'horloge serveur"
        : "Vérifier les permissions (Read+Write requis) et régénérer l'Access Token";
      return { status: `invalide (code ${code}) — ${msg}`, hint };
    }
    return { status: `OK (@${data.screen_name})`, hint: "Vérifier que l'app a les permissions Read+Write dans le Developer Portal" };
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
