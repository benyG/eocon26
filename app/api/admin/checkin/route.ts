import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { verifyQrPayload } from "@/lib/qr";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

async function sendFraudAlert(reg: {
  id: number; fname: string; lname: string; email: string;
  ticketType: string; checkedInAt: Date | null; checkedInBy: string | null;
}, newOperator: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
  const firstAt = reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleString("fr-FR", { timeZone: "Africa/Douala" }) : "?";
  await resend.emails.send({
    from,
    to: "benixgs@gmail.com",
    subject: `⚠️ ALERTE FRAUDE — Double check-in : ${reg.fname} ${reg.lname}`,
    html: `
      <div style="font-family:monospace;background:#0a0a0f;color:#e0e0e0;padding:32px;max-width:600px">
        <h1 style="color:#ff0066;margin-bottom:4px">⚠ ALERTE — Tentative de double check-in</h1>
        <p style="color:#888;font-size:12px;margin-bottom:24px">EOCON 2026 · Système de contrôle d'accès</p>
        <div style="background:#1a0000;border:1px solid #ff006640;border-radius:8px;padding:20px;margin-bottom:20px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="color:#888;padding:6px 0;width:160px">Inscrit</td><td style="color:#fff;font-weight:bold">${reg.fname} ${reg.lname}</td></tr>
            <tr><td style="color:#888;padding:6px 0">Email</td><td style="color:#fff">${reg.email}</td></tr>
            <tr><td style="color:#888;padding:6px 0">Billet</td><td style="color:#fff">${reg.ticketType}</td></tr>
            <tr><td style="color:#888;padding:6px 0">ID inscription</td><td style="color:#aaa">#${reg.id}</td></tr>
          </table>
        </div>
        <div style="background:#111;border:1px solid #333;border-radius:8px;padding:20px">
          <p style="color:#ff6600;font-weight:bold;margin:0 0 12px">Chronologie :</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="color:#888;padding:6px 0;width:160px">1er check-in</td><td style="color:#00ff9d">${firstAt}</td></tr>
            <tr><td style="color:#888;padding:6px 0">Par</td><td style="color:#aaa">${reg.checkedInBy || "—"}</td></tr>
            <tr><td style="color:#888;padding:6px 0;padding-top:14px;color:#ff0066">2ème tentative</td><td style="color:#ff0066;padding-top:14px;font-weight:bold">${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Douala" })}</td></tr>
            <tr><td style="color:#888;padding:6px 0">Par</td><td style="color:#ff6600">${newOperator}</td></tr>
          </table>
        </div>
        <p style="color:#555;font-size:11px;margin-top:24px">Ce message est envoyé automatiquement par le système de check-in EOCON 2026.</p>
      </div>`,
  }).catch(e => console.error("[Fraud alert email]", e));
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("registrations", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { payload, operatorName } = await req.json();
  if (!payload) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }
  const id = verifyQrPayload(payload);
  if (!id) {
    return NextResponse.json({ error: "Invalid QR code" }, { status: 400 });
  }
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }
  if (reg.status !== "validated") {
    return NextResponse.json({ error: "Paiement non confirmé — inscription non validée" }, { status: 403 });
  }
  // Atomic conditional update: only writes if checkedInAt is still null.
  // Prevents race conditions when two scanners hit the same QR simultaneously —
  // MySQL guarantees exactly one UPDATE succeeds even under concurrent requests.
  const now = new Date();
  const operator = operatorName || "Admin";
  const result = await prisma.registration.updateMany({
    where: { id, checkedInAt: null },
    data: { checkedInAt: now, checkedInBy: operator },
  });

  if (result.count === 0) {
    // Another request won the race, or it was already checked in.
    const fresh = await prisma.registration.findUnique({ where: { id } });
    sendFraudAlert(
      { ...reg, checkedInAt: fresh?.checkedInAt ?? reg.checkedInAt, checkedInBy: fresh?.checkedInBy ?? reg.checkedInBy },
      operator,
    );
    return NextResponse.json({
      error: "Already checked in",
      checkedInAt: fresh?.checkedInAt ?? reg.checkedInAt,
      checkedInBy: fresh?.checkedInBy ?? reg.checkedInBy,
    }, { status: 409 });
  }

  const updated = await prisma.registration.findUnique({ where: { id } });
  return NextResponse.json({ success: true, registration: updated });
}
