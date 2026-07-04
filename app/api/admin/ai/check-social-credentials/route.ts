import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Lightweight Graph API ping — just check token validity with /me
async function testMeta(token: string): Promise<string> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`, {
      next: { revalidate: 0 },
    });
    const data = await res.json() as { id?: string; name?: string; error?: { message: string } };
    if (data.error) return `invalide — ${data.error.message}`;
    return `OK (${data.name ?? data.id})`;
  } catch (e) {
    return `erreur réseau: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function testTwitter(): Promise<string> {
  const key = process.env.X_API_KEY;
  const secret = process.env.X_API_SECRET;
  const token = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!key || !secret || !token || !tokenSecret) return "manquant";
  // Just verify credentials via OAuth 1.0a GET account/verify_credentials
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
    const data = await res.json() as { screen_name?: string; errors?: { message: string }[] };
    if (data.errors) return `invalide — ${data.errors[0]?.message}`;
    return `OK (@${data.screen_name})`;
  } catch (e) {
    return `erreur réseau: ${e instanceof Error ? e.message : String(e)}`;
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

  // Run token tests in parallel
  const [metaStatus, twitterStatus] = await Promise.all([
    metaToken ? testMeta(metaToken) : Promise.resolve("manquant"),
    testTwitter(),
  ]);

  return NextResponse.json({
    twitter: {
      status: twitterStatus,
      vars: {
        X_API_KEY: !!process.env.X_API_KEY,
        X_API_SECRET: !!process.env.X_API_SECRET,
        X_ACCESS_TOKEN: !!process.env.X_ACCESS_TOKEN,
        X_ACCESS_TOKEN_SECRET: !!process.env.X_ACCESS_TOKEN_SECRET,
      },
    },
    facebook: {
      status: fbPageId ? metaStatus : "manquant",
      vars: {
        META_ACCESS_TOKEN: !!metaToken,
        FACEBOOK_PAGE_ID: !!fbPageId,
      },
      pageId: fbPageId || null,
    },
    instagram: {
      status: igAccountId ? metaStatus : "manquant",
      vars: {
        META_ACCESS_TOKEN: !!metaToken,
        INSTAGRAM_BUSINESS_ACCOUNT_ID: !!igAccountId,
      },
      accountId: igAccountId || null,
    },
    whatsapp: {
      status: waPhoneId && waBroadcastTo ? metaStatus : "manquant",
      vars: {
        META_ACCESS_TOKEN: !!metaToken,
        WHATSAPP_PHONE_NUMBER_ID: !!waPhoneId,
        WHATSAPP_BROADCAST_TO: !!waBroadcastTo,
      },
    },
    meta_token_status: metaStatus,
  });
}
