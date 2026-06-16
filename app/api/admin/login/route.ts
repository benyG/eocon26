import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { signToken } from "@/lib/adminAuth";
import { rateLimit, getIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  // 10 attempts per IP per 15 minutes
  const ip = getIp(req);
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans 15 minutes." }, { status: 429 });
  }

  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (typeof password !== "string" || !safeEqual(password, expected)) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const token = signToken(password);
  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    // Secure by default; disable only in explicit local dev
    secure: process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_token");
  return res;
}
