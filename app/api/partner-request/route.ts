import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { org, contact, email, phone, package: pkg, message } = await req.json();
  if (!org?.trim()) return NextResponse.json({ error: "Organisation requise" }, { status: 400 });
  const prospect = await prisma.sponsorProspect.create({
    data: {
      org: org.trim(),
      contact: contact || null,
      email: email || null,
      phone: phone || null,
      package: pkg || null,
      notes: message || null,
      status: "demande",
    },
  });
  return NextResponse.json({ success: true, id: prospect.id }, { status: 201 });
}
