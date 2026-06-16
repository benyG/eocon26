import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getEventSettings } from "@/lib/settings";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}

const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";

export async function POST() {
  if (!(await hasPermission("tickets", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const preRegistered = await prisma.registration.findMany({
    where: { status: "pre_registered" },
  });

  if (preRegistered.length === 0) return NextResponse.json({ notified: 0 });

  const settings = await getEventSettings().catch(() => ({} as Record<string, string>));
  const siteUrl = settings.url_inscription || settings.site_base_url || "https://eyesopensecurity.com/#inscription";

  const resend = getResend();
  let notified = 0;

  for (const reg of preRegistered) {
    const isFr = reg.langExpression !== "en";
    const subject = isFr
      ? "🎟️ Les billets EOCON 2026 sont disponibles !"
      : "🎟️ EOCON 2026 tickets are now available!";
    const body = isFr
      ? `<p>Bonjour <strong style="color:#00ff9d">${reg.fname} ${reg.lname}</strong>,</p>
         <p>Le guichet EOCON 2026 est maintenant ouvert ! Vous pouvez finaliser votre inscription.</p>
         <p><a href="${siteUrl}" style="color:#00ff9d;font-weight:bold;">Finalisez votre inscription →</a></p>
         <p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 Novembre 2026</p>`
      : `<p>Hello <strong style="color:#00ff9d">${reg.fname} ${reg.lname}</strong>,</p>
         <p>EOCON 2026 tickets are now available! You can finalize your registration.</p>
         <p><a href="${siteUrl}" style="color:#00ff9d;font-weight:bold;">Finalize your registration →</a></p>
         <p style="color:#888;font-size:12px;">EOCON 2026 · Hotel Onomo, Douala · 28 November 2026</p>`;

    try {
      await resend.emails.send({
        from: FROM,
        to: reg.email,
        subject,
        html: `<!DOCTYPE html><html><body style="background:#030408;color:#fff;font-family:'Courier New',monospace;padding:32px;">${body}</body></html>`,
      });
      notified++;
    } catch (e) {
      console.error("[notify-preregistered]", reg.email, e);
    }
  }

  return NextResponse.json({ notified });
}
