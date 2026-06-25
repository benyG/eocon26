import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ONLINE_SESSION_COOKIE } from "@/lib/onlineAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = cookies().get(ONLINE_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  await prisma.onlineSession
    .updateMany({
      where: { sessionToken: token, expiresAt: { gt: new Date() } },
      data:  { lastSeenAt: new Date() },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
