import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const ONLINE_SESSION_COOKIE = "eocon_live_session";
export const SESSION_DURATION_DAYS = 7;

export interface OnlineSessionData {
  registrationId: number;
  fname: string;
  lname: string;
  email: string;
  ticketType: string;
  includesWorkshops: boolean;
  includesSessions: boolean;
}

export async function getOnlineSession(): Promise<OnlineSessionData | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ONLINE_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.onlineSession.findUnique({
    where: { sessionToken: token },
    include: {
      registration: {
        select: { id: true, fname: true, lname: true, email: true, ticketType: true },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  // Update lastSeenAt without blocking the response
  prisma.onlineSession
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  // Resolve ticket type access flags
  const ticketTypeDef = await prisma.ticketType.findUnique({
    where: { slug: session.registration.ticketType },
    select: { includesWorkshops: true, includesSessions: true },
  }).catch(() => null);

  return {
    registrationId: session.registration.id,
    fname: session.registration.fname,
    lname: session.registration.lname,
    email: session.registration.email,
    ticketType: session.registration.ticketType,
    includesWorkshops: ticketTypeDef?.includesWorkshops ?? false,
    includesSessions: ticketTypeDef?.includesSessions ?? true,
  };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    name: ONLINE_SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

