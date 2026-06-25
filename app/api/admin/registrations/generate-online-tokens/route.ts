import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { sendOnlineAccessLink } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await hasPermission("registrations", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrations = await prisma.registration.findMany({
    where: {
      status: { in: ["validated", "paid"] },
      onlineToken: null,
    },
    select: { id: true, fname: true, lname: true, email: true, langExpression: true },
  });

  let generated = 0;
  for (const reg of registrations) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.registration.update({
      where: { id: reg.id },
      data: { onlineToken: token, onlineAccessSentAt: new Date() },
    });
    await sendOnlineAccessLink(reg.email, reg.fname, reg.lname, token, reg.langExpression === "en" ? "en" : "fr");
    generated++;
  }

  return NextResponse.json({ generated, total: registrations.length });
}
