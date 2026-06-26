import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.RESTREAM_CLIENT_ID ?? "";
const REDIRECT_URI = process.env.RESTREAM_REDIRECT_URI ?? "";

export async function GET() {
  if (!(await hasPermission("live", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json(
      { error: "RESTREAM_CLIENT_ID or RESTREAM_REDIRECT_URI not configured" },
      { status: 500 }
    );
  }

  // Generate and persist a CSRF state token
  const state = randomBytes(24).toString("hex");
  await prisma.eventSetting.upsert({
    where:  { key: "restream_oauth_state" },
    create: { key: "restream_oauth_state", value: state },
    update: { value: state },
  });

  const url = new URL("https://api.restream.io/login");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("state", state);

  return NextResponse.json({ url: url.toString() });
}

export async function DELETE() {
  if (!(await hasPermission("live", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.eventSetting.deleteMany({
    where: {
      key: {
        in: [
          "restream_access_token",
          "restream_refresh_token",
          "restream_token_expires_at",
          "restream_oauth_state",
        ],
      },
    },
  });
  return NextResponse.json({ ok: true });
}
