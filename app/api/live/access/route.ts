import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ONLINE_SESSION_COOKIE, SESSION_DURATION_DAYS, sessionCookieOptions } from "@/lib/onlineAuth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("access");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  if (!token || token.length < 32) {
    return NextResponse.redirect(`${baseUrl}/live/resend?error=invalid`);
  }

  const registration = await prisma.registration.findUnique({
    where: { onlineToken: token },
    select: { id: true, fname: true, status: true, ticketType: true, onlineCheckedInAt: true },
  });

  if (!registration) {
    return NextResponse.redirect(`${baseUrl}/live/resend?error=invalid`);
  }

  if (!["validated", "paid"].includes(registration.status)) {
    return NextResponse.redirect(`${baseUrl}/live/resend?error=notvalidated`);
  }

  // Check ticket type grants session access
  const ticketType = await prisma.ticketType.findUnique({
    where: { slug: registration.ticketType },
    select: { includesSessions: true },
  });
  if (ticketType && !ticketType.includesSessions) {
    return NextResponse.redirect(`${baseUrl}/live/resend?error=noaccess`);
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 86400 * 1000);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;

  // Expire all existing sessions for this registration before creating a new one.
  // This ensures only one active session per ticket: if the magic link is shared,
  // the previous holder is logged out and only the latest user stays connected.
  await prisma.onlineSession.updateMany({
    where: { registrationId: registration.id, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() },
  });

  await prisma.onlineSession.create({
    data: {
      registrationId: registration.id,
      sessionToken,
      expiresAt,
      ipAddress: ip,
      userAgent,
    },
  });

  if (!registration.onlineCheckedInAt) {
    await prisma.registration.update({
      where: { id: registration.id },
      data: { onlineCheckedInAt: new Date() },
    });
  }

  const response = NextResponse.redirect(`${baseUrl}/live`);
  const cookieOpts = sessionCookieOptions(expiresAt);
  response.cookies.set(cookieOpts.name, sessionToken, cookieOpts);
  return response;
}
