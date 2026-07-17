import { cache } from "react";
import { cookies } from "next/headers";
import { verifyUserSession, isValidToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { resolveProfilePermissions, expandCtfPermissions } from "@/lib/adminProfiles";

export interface CurrentPerms {
  isLegacy: boolean;
  permissions: Record<string, string>;
  // Special CTF capability (see AdminUser.canPublishCtf): may see/edit a FLAG and
  // publish/unpublish/delete a challenge. Legacy shared-password and the root
  // admin always have it; named users only via their per-user checkbox.
  canPublish: boolean;
}

function isRootEmail(email?: string | null): boolean {
  const root = process.env.ROOT_ADMIN_EMAIL?.trim().toLowerCase();
  return !!root && !!email && email.trim().toLowerCase() === root;
}

// Resolve the current request's permissions (same logic as /api/admin/me).
// Wrapped in React `cache()` so it runs its session+profile DB lookup AT MOST
// ONCE per request, no matter how many times hasPermission()/getSessionEmail()
// are called (some routes check 2–3 permissions). Without this every check
// re-queried the DB, multiplying auth queries and exhausting the pool.
export const getCurrentPermissions = cache(async (): Promise<CurrentPerms | null> => {
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
            permissions = resolveProfilePermissions(dbProfile.name, dbProfile.permissions);
          }
        }
        try { permissions = { ...permissions, ...(JSON.parse(u.permissions || "{}") as Record<string, string>) }; }
        catch { /* ignore */ }
        expandCtfPermissions(permissions); // legacy `ctf` grant → ctf-* sub-tabs
        const canPublish = isRootEmail(u.email) || u.canPublishCtf === true;
        return { isLegacy: false, permissions, canPublish };
      }
    }
  }

  const legacy = c.get("admin_token")?.value;
  if (legacy && isValidToken(legacy)) return { isLegacy: true, permissions: {}, canPublish: true };

  return null;
});

/** Returns the email of the currently logged-in admin, or null for legacy/unauthenticated. */
export const getSessionEmail = cache(async (): Promise<string | null> => {
  const c = await cookies();
  const userCookie = c.get("admin_user_token")?.value;
  if (!userCookie) return null;
  const parsed = verifyUserSession(userCookie);
  if (!parsed) return null;
  const session = await prisma.adminSession.findFirst({
    where: { userId: parsed.userId, token: parsed.sessionToken, expiresAt: { gt: new Date() } },
    select: { user: { select: { email: true, isActive: true } } },
  });
  if (session?.user?.isActive) return session.user.email;
  return null;
});

// True when the current request may act on `module` at the given level.
export async function hasPermission(module: string, level: "read" | "write" = "write"): Promise<boolean> {
  const p = await getCurrentPermissions();
  if (!p) return false;
  if (p.isLegacy) return true; // shared super-admin password = full access
  const lvl = p.permissions[module];
  return level === "read" ? (lvl === "read" || lvl === "write") : lvl === "write";
}

// True when the current request holds the special CTF publish capability: the
// ONLY admins allowed to see/edit a challenge FLAG and to publish/unpublish/delete
// a challenge. Independent of the ctf-* read/write tab permissions.
export async function canPublishCtf(): Promise<boolean> {
  const p = await getCurrentPermissions();
  return !!p && p.canPublish === true;
}
