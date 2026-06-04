export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (!rateLimit(`newsletter:${getIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: {},
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
