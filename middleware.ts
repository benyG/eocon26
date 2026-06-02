import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

function isValidToken(token: string): boolean {
  const SECRET = process.env.ADMIN_SECRET || "change-me-in-production";
  const password = process.env.ADMIN_PASSWORD || "admin";
  const expected = createHmac("sha256", SECRET).update(password).digest("hex");
  return token === expected;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || !isValidToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
