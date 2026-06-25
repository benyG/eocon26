import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOnlineAccessLink } from "@/lib/email";

export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_MINUTES = 10;

export async function POST(req: NextRequest) {
  const { email, lang } = await req.json() as { email: string; lang?: string };
  const isFr = lang !== "en";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: isFr ? "Email invalide" : "Invalid email" }, { status: 400 });
  }

  const registration = await prisma.registration.findFirst({
    where: { email: email.toLowerCase().trim() },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fname: true, lname: true, email: true,
      status: true, onlineToken: true, onlineAccessSentAt: true, langExpression: true,
    },
  });

  // Always return success to avoid email enumeration
  if (!registration || !["validated", "paid"].includes(registration.status) || !registration.onlineToken) {
    return NextResponse.json({ ok: true });
  }

  // Cooldown check
  if (registration.onlineAccessSentAt) {
    const minutesSinceLast = (Date.now() - registration.onlineAccessSentAt.getTime()) / 60000;
    if (minutesSinceLast < RESEND_COOLDOWN_MINUTES) {
      return NextResponse.json({
        error: isFr
          ? `Veuillez patienter ${RESEND_COOLDOWN_MINUTES} minutes avant de renvoyer.`
          : `Please wait ${RESEND_COOLDOWN_MINUTES} minutes before resending.`,
      }, { status: 429 });
    }
  }

  await sendOnlineAccessLink(
    registration.email,
    registration.fname,
    registration.lname,
    registration.onlineToken,
    registration.langExpression === "en" ? "en" : "fr",
  );

  await prisma.registration.update({
    where: { id: registration.id },
    data: { onlineAccessSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
