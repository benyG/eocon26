import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { cleanText, cleanOptional, cleanEmail, cleanPhone } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!rateLimit(`partner:${getIp(req)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de requêtes, réessayez plus tard." }, { status: 429 });
  }
  const body = await req.json();
  const org = cleanText(body.org, 200);
  if (!org) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });
  const prospect = await prisma.sponsorProspect.create({
    data: {
      org,
      contact: cleanOptional(body.contact, 120),
      email: cleanEmail(body.email),
      phone: cleanPhone(body.phone),
      package: cleanOptional(body.package, 60),
      notes: cleanOptional(body.message, 2000),
      status: "demande",
    },
  });
  return NextResponse.json({ success: true, id: prospect.id }, { status: 201 });
}
