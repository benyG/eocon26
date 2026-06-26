import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const CLIENT_ID     = process.env.RESTREAM_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.RESTREAM_CLIENT_SECRET ?? "";
const REDIRECT_URI  = process.env.RESTREAM_REDIRECT_URI ?? "";

function adminUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
  return `${base}/admin${path}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code    = searchParams.get("code");
  const state   = searchParams.get("state");
  const error   = searchParams.get("error");

  if (error || !code) {
    // User denied — redirect back to admin
    return NextResponse.redirect(adminUrl("?restream=denied"));
  }

  // Verify CSRF state
  const stateRow = await prisma.eventSetting.findUnique({ where: { key: "restream_oauth_state" } });
  if (!stateRow || stateRow.value !== state) {
    return NextResponse.redirect(adminUrl("?restream=csrf_error"));
  }

  // Exchange code for tokens
  const body = new URLSearchParams({
    grant_type:   "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const tokenRes = await fetch("https://api.restream.io/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type":  "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text().catch(() => "");
    console.error("Restream token exchange failed:", tokenRes.status, txt);
    return NextResponse.redirect(adminUrl("?restream=token_error"));
  }

  const data = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    accessTokenExpiresEpoch?: number;
  };

  const expiresAt = data.accessTokenExpiresEpoch
    ? String(data.accessTokenExpiresEpoch)
    : String(Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600));

  // Persist tokens
  const pairs: { key: string; value: string }[] = [
    { key: "restream_access_token",     value: data.access_token },
    { key: "restream_refresh_token",    value: data.refresh_token },
    { key: "restream_token_expires_at", value: expiresAt },
  ];
  await Promise.all(
    pairs.map(({ key, value }) =>
      prisma.eventSetting.upsert({
        where:  { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  // Clean up state
  await prisma.eventSetting.deleteMany({ where: { key: "restream_oauth_state" } });

  return NextResponse.redirect(adminUrl("?restream=connected"));
}
