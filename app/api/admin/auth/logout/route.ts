import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUserSession } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const cookie = req.cookies.get("admin_user_token")?.value;
  if (cookie) {
    const parsed = verifyUserSession(cookie);
    if (parsed) {
      const session = await prisma.adminSession.findFirst({ where: { token: parsed.sessionToken }, select: { user: { select: { email: true } } } });
      if (session?.user?.email) logAction(req, "LOGOUT", "auth", parsed.userId, { email: session.user.email }, session.user.email);
      // Delete the session from DB so the token can't be reused
      await prisma.adminSession.deleteMany({ where: { token: parsed.sessionToken } }).catch(() => {});
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_user_token", "", { maxAge: 0, path: "/" });
  return res;
}
