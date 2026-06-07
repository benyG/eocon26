import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUserSession } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const cookie = req.cookies.get("admin_user_token")?.value;
  if (cookie) {
    const parsed = verifyUserSession(cookie);
    if (parsed) {
      // Delete the session from DB so the token can't be reused
      await prisma.adminSession.deleteMany({ where: { token: parsed.sessionToken } }).catch(() => {});
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_user_token", "", { maxAge: 0, path: "/" });
  return res;
}
