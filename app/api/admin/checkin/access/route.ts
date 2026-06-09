import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUserId, isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Returns { allowed: true } if the caller has checkin permission (read or write).
// Legacy admin_token (super admin) always allowed.
// Per-user token: checks permissions JSON for "checkin" key.
export async function GET() {
  // Legacy super-admin token → full access
  if (await isAdminAuthenticated()) {
    return NextResponse.json({ allowed: true, role: "super_admin" });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  const session = await prisma.adminSession.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!session) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { permissions: true, name: true },
  });
  if (!user?.permissions) {
    return NextResponse.json({ allowed: false }, { status: 403 });
  }

  let perms: Record<string, string> = {};
  try { perms = JSON.parse(user.permissions); } catch { /* empty */ }

  if (!perms.checkin) {
    return NextResponse.json({ allowed: false, reason: "no_checkin_permission" }, { status: 403 });
  }

  return NextResponse.json({ allowed: true, access: perms.checkin, name: user.name });
}
