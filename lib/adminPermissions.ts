import { cookies } from "next/headers";
import { verifyUserSession, isValidToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ADMIN_PROFILES } from "@/lib/adminProfiles";

export interface CurrentPerms {
  isLegacy: boolean;
  permissions: Record<string, string>;
}

// Resolve the current request's permissions (same logic as /api/admin/me).
export async function getCurrentPermissions(): Promise<CurrentPerms | null> {
  const c = await cookies();

  const userCookie = c.get("admin_user_token")?.value;
  if (userCookie) {
    const parsed = verifyUserSession(userCookie);
    if (parsed) {
      const session = await prisma.adminSession.findFirst({
        where: { userId: parsed.userId, token: parsed.sessionToken, expiresAt: { gt: new Date() } },
        include: { user: true },
      });
      if (session?.user?.isActive) {
        const u = session.user;
        let permissions: Record<string, string> = {};
        if (u.profileId) {
          const dbProfile = await prisma.adminProfile.findUnique({ where: { id: u.profileId } });
          if (dbProfile) {
            const staticProfile = ADMIN_PROFILES.find(p => p.name === dbProfile.name);
            if (staticProfile) {
              permissions = { ...staticProfile.permissions } as Record<string, string>;
            } else {
              try { permissions = JSON.parse(dbProfile.permissions || "{}") as Record<string, string>; }
              catch { permissions = {}; }
            }
          }
        }
        try { permissions = { ...permissions, ...(JSON.parse(u.permissions || "{}") as Record<string, string>) }; }
        catch { /* ignore */ }
        return { isLegacy: false, permissions };
      }
    }
  }

  const legacy = c.get("admin_token")?.value;
  if (legacy && isValidToken(legacy)) return { isLegacy: true, permissions: {} };

  return null;
}

// True when the current request may act on `module` at the given level.
export async function hasPermission(module: string, level: "read" | "write" = "write"): Promise<boolean> {
  const p = await getCurrentPermissions();
  if (!p) return false;
  if (p.isLegacy) return true; // shared super-admin password = full access
  const lvl = p.permissions[module];
  return level === "read" ? (lvl === "read" || lvl === "write") : lvl === "write";
}
