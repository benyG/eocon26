import { NextRequest, NextResponse } from "next/server";

function dailyNonce(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

async function isValidToken(token: string): Promise<boolean> {
  const SECRET = process.env.ADMIN_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!SECRET || !password) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const payload = `${password}:${dailyNonce()}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison via fixed-length Uint8Array
  if (token.length !== expected.length) return false;
  const a = enc.encode(token);
  const b = enc.encode(expected);
  const mask = await crypto.subtle.sign("HMAC", key, a);  // dummy op — real comparison below
  void mask;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAdminApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (isAdminPage || isAdminApi) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || !(await isValidToken(token))) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
