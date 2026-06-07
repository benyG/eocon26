import { NextRequest, NextResponse } from "next/server";

// ── Verify legacy shared-password token (HMAC over ADMIN_PASSWORD + daily nonce) ──
async function isValidAdminToken(token: string): Promise<boolean> {
  const SECRET = process.env.ADMIN_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  if (!SECRET || !password) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const d = new Date();
  const nonce = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${password}:${nonce}`));
  const expected = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  if (token.length !== expected.length) return false;
  const a = enc.encode(token);
  const b = enc.encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ── Verify per-user session cookie: "${userId}|${sessionToken}|${hmac}" ──
// No DB hit needed — just verify the HMAC signature.
async function isValidUserToken(cookie: string): Promise<boolean> {
  const SECRET = process.env.ADMIN_SECRET;
  if (!SECRET) return false;

  const parts = cookie.split("|");
  if (parts.length !== 3) return false;
  const [userIdStr, sessionToken, sig] = parts;
  const userId = Number(userIdStr);
  if (!Number.isFinite(userId) || userId <= 0) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(`${userId}:${sessionToken}`));
  const expected = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  if (sig.length !== expected.length) return false;
  const a = enc.encode(sig);
  const b = enc.encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAdminApi  = pathname.startsWith("/api/admin") &&
    pathname !== "/api/admin/login" &&
    !pathname.startsWith("/api/admin/auth/");

  if (isAdminPage || isAdminApi) {
    const adminToken = req.cookies.get("admin_token")?.value;
    const userToken  = req.cookies.get("admin_user_token")?.value;

    const authed =
      (adminToken && await isValidAdminToken(adminToken)) ||
      (userToken  && await isValidUserToken(userToken));

    if (!authed) {
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
