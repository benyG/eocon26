import { NextRequest, NextResponse } from "next/server";

async function isValidToken(token: string): Promise<boolean> {
  const SECRET = process.env.ADMIN_SECRET || "change-me-in-production";
  const password = process.env.ADMIN_PASSWORD || "admin";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return token === expected;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || !(await isValidToken(token))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
