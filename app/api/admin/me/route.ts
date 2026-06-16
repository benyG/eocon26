import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidToken, verifyUserSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ADMIN_PROFILES } from "@/lib/adminProfiles";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();

  // Per-user session takes precedence
  const userCookie = cookieStore.get("admin_user_token")?.value;
  if (userCookie) {
    const parsed = verifyUserSession(userCookie);
    if (parsed) {
      const session = await prisma.adminSession.findFirst({
        where: { userId: parsed.userId, token: parsed.sessionToken, expiresAt: { gt: new Date() } },
        include: { user: true },
      });
      if (session?.user?.isActive) {
        const u = session.user;
        // Merge profile permissions + any user-level overrides stored in JSON
        let permissions: Record<string, string> = {};
        if (u.profileId) {
          const dbProfile = await prisma.adminProfile.findUnique({ where: { id: u.profileId } });
          if (dbProfile) {
            // System profiles use their static definition (always current);
            // custom profiles use the permissions stored in DB so the profile
            // editor takes effect.
            const staticProfile = ADMIN_PROFILES.find(p => p.name === dbProfile.name);
            if (staticProfile) {
              permissions = { ...staticProfile.permissions } as Record<string, string>;
            } else {
              try { permissions = JSON.parse(dbProfile.permissions || "{}") as Record<string, string>; }
              catch { permissions = {}; }
            }
          }
        }
        // User-level JSON overrides (stored as { cfp: "write", ... })
        try {
          const overrides = JSON.parse(u.permissions || "{}") as Record<string, string>;
          permissions = { ...permissions, ...overrides };
        } catch { /* ignore */ }
        const mfaSetting = await prisma.eventSetting.findUnique({ where: { key: "mfa_required" } });
        return NextResponse.json({
          isLegacy: false,
          id: u.id,
          name: u.name,
          email: u.email,
          mfaEnabled: u.mfaEnabled,
          mfaRequired: mfaSetting?.value === "true",
          permissions,
        });
      }
    }
  }

  // Legacy shared-password token → full access
  const legacyToken = cookieStore.get("admin_token")?.value;
  if (legacyToken && isValidToken(legacyToken)) {
    return NextResponse.json({ isLegacy: true, name: "Admin", permissions: {} });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
