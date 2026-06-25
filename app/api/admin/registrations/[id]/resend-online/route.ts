import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendOnlineAccessLink } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await hasPermission("registrations", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const reg = await prisma.registration.findUnique({
    where: { id },
    select: { id: true, fname: true, lname: true, email: true, status: true, onlineToken: true },
  });

  if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["validated", "paid"].includes(reg.status)) {
    return NextResponse.json({ error: "Registration not validated" }, { status: 400 });
  }

  const token = reg.onlineToken || crypto.randomBytes(32).toString("hex");

  await prisma.registration.update({
    where: { id },
    data: { onlineToken: token, onlineAccessSentAt: new Date() },
  });

  await sendOnlineAccessLink(reg.email, reg.fname, reg.lname, token, "fr");

  return NextResponse.json({ ok: true });
}
