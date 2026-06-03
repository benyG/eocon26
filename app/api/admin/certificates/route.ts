import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { Resend } from "resend";

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function participantCertHtml(name: string): string {
  const n = esc(name);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: Georgia, serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 40px; }
.cert { max-width: 700px; margin: 0 auto; border: 2px solid #00ff9d; border-radius: 12px; padding: 48px; text-align: center; }
.title { font-size: 13px; letter-spacing: 4px; color: #00ff9d; text-transform: uppercase; margin-bottom: 8px; }
h1 { font-size: 32px; color: #ffffff; margin: 16px 0; font-weight: bold; }
.name { font-size: 28px; color: #00ff9d; margin: 24px 0; font-style: italic; }
.body { font-size: 15px; color: #aaaaaa; line-height: 1.8; margin: 24px 0; }
.event { font-size: 18px; color: #ffffff; font-weight: bold; margin: 16px 0; }
.date { font-size: 13px; color: #666; margin-top: 32px; }
.sig { margin-top: 40px; border-top: 1px solid #333; padding-top: 24px; color: #888; font-size: 12px; }
</style></head>
<body>
<div class="cert">
  <div class="title">Certificate of Participation</div>
  <h1>EOCON 2026</h1>
  <div class="body">This is to certify that</div>
  <div class="name">${n}</div>
  <div class="body">has participated in</div>
  <div class="event">7th Edition — EyesOpen Security Conference</div>
  <div class="body">November 28, 2026 · Hotel Onomo, Douala, Cameroon</div>
  <div class="date">Issued on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
  <div class="sig">EyesOpen Association · eyesopensecurity.com</div>
</div>
</body></html>`;
}

function speakerCertHtml(name: string, talkTitle: string): string {
  const n = esc(name);
  const t = esc(talkTitle);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: Georgia, serif; background: #0a0a0f; color: #e0e0e0; margin: 0; padding: 40px; }
.cert { max-width: 700px; margin: 0 auto; border: 2px solid #ff0066; border-radius: 12px; padding: 48px; text-align: center; }
.title { font-size: 13px; letter-spacing: 4px; color: #ff0066; text-transform: uppercase; margin-bottom: 8px; }
h1 { font-size: 32px; color: #ffffff; margin: 16px 0; font-weight: bold; }
.name { font-size: 28px; color: #ff0066; margin: 24px 0; font-style: italic; }
.talk { font-size: 16px; color: #00ff9d; margin: 12px 0; font-style: italic; }
.body { font-size: 15px; color: #aaaaaa; line-height: 1.8; margin: 16px 0; }
.event { font-size: 18px; color: #ffffff; font-weight: bold; margin: 16px 0; }
.date { font-size: 13px; color: #666; margin-top: 32px; }
.sig { margin-top: 40px; border-top: 1px solid #333; padding-top: 24px; color: #888; font-size: 12px; }
</style></head>
<body>
<div class="cert">
  <div class="title">Speaker Certificate</div>
  <h1>EOCON 2026</h1>
  <div class="body">This is to certify that</div>
  <div class="name">${n}</div>
  <div class="body">delivered a talk titled</div>
  <div class="talk">"${t}"</div>
  <div class="body">at</div>
  <div class="event">7th Edition — EyesOpen Security Conference</div>
  <div class="body">November 28, 2026 · Hotel Onomo, Douala, Cameroon</div>
  <div class="date">Issued on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
  <div class="sig">EyesOpen Association · eyesopensecurity.com</div>
</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type } = await req.json();
  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let failed = 0;

  if (type === "participants") {
    const regs = await prisma.registration.findMany({ where: { checkedInAt: { not: null } } });
    for (const r of regs) {
      try {
        await resend.emails.send({
          from: getFrom(),
          to: r.email,
          subject: "Votre certificat de participation — EOCON 2026",
          html: participantCertHtml(`${r.fname} ${r.lname}`),
        });
        sent++;
      } catch { failed++; }
    }
  } else if (type === "speakers") {
    const speakers = await prisma.speaker.findMany({ where: { edition: "2026", isVisible: true } });
    for (const s of speakers) {
      if (!s.talkTitle) continue;
      try {
        await resend.emails.send({
          from: getFrom(),
          to: "",  // speakers don't have email in DB — send to admin for now
          subject: `Certificat speaker — ${s.name} — EOCON 2026`,
          html: speakerCertHtml(s.name, s.talkTitle),
        });
        sent++;
      } catch { failed++; }
    }
  } else if (type === "preview-participant") {
    // Return HTML preview for a single participant
    return new NextResponse(participantCertHtml("Jean Dupont"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } else if (type === "preview-speaker") {
    return new NextResponse(speakerCertHtml("Alice Martin", "Cybersécurité & IA : menaces émergentes"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({ sent, failed });
}
