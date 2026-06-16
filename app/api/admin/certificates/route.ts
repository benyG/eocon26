import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function getFrom(): string {
  return process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CERT_STYLES = `
body{font-family:Georgia,serif;background:#0a0a0f;color:#e0e0e0;margin:0;padding:40px}
.cert{max-width:700px;margin:0 auto;border-radius:12px;padding:48px;text-align:center}
.title{font-size:13px;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px}
h1{font-size:32px;color:#ffffff;margin:16px 0;font-weight:bold}
.name{font-size:28px;margin:24px 0;font-style:italic}
.talk{font-size:16px;color:#00ff9d;margin:12px 0;font-style:italic}
.body{font-size:15px;color:#cccccc;line-height:1.8;margin:16px 0}
.event{font-size:18px;color:#ffffff;font-weight:bold;margin:16px 0}
.date{font-size:13px;color:#888;margin-top:32px}
.sig{margin-top:40px;border-top:1px solid #333;padding-top:24px;color:#888;font-size:12px}`;

function participantCertHtml(name: string, lang: "fr" | "en" = "en"): string {
  const n = esc(name);
  const isFr = lang === "fr";
  const issuedOn = new Date().toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CERT_STYLES}</style></head>
<body><div class="cert" style="border:2px solid #00ff9d">
  <div class="title" style="color:#00ff9d">${isFr ? "Certificat de Participation" : "Certificate of Participation"}</div>
  <h1>EOCON 2026</h1>
  <div class="body">${isFr ? "Nous certifions que" : "This is to certify that"}</div>
  <div class="name" style="color:#00ff9d">${n}</div>
  <div class="body">${isFr ? "a participé à la" : "has participated in the"}</div>
  <div class="event">7${isFr ? "ème" : "th"} ${isFr ? "Édition — EyesOpen Security Conference" : "Edition — EyesOpen Security Conference"}</div>
  <div class="body">${isFr ? "28 Novembre 2026 · Hotel Onomo, Douala, Cameroun" : "November 28, 2026 · Hotel Onomo, Douala, Cameroon"}</div>
  <div class="date">${isFr ? "Émis le" : "Issued on"} ${issuedOn}</div>
  <div class="sig">EyesOpen Association · eyesopensecurity.com</div>
</div></body></html>`;
}

function speakerCertHtml(name: string, talkTitle: string, lang: "fr" | "en" = "en"): string {
  const n = esc(name);
  const t = esc(talkTitle);
  const isFr = lang === "fr";
  const issuedOn = new Date().toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CERT_STYLES}</style></head>
<body><div class="cert" style="border:2px solid #ff0066">
  <div class="title" style="color:#ff0066">${isFr ? "Certificat de Speaker" : "Speaker Certificate"}</div>
  <h1>EOCON 2026</h1>
  <div class="body">${isFr ? "Nous certifions que" : "This is to certify that"}</div>
  <div class="name" style="color:#ff0066">${n}</div>
  <div class="body">${isFr ? "a présenté un talk intitulé" : "delivered a talk titled"}</div>
  <div class="talk">&ldquo;${t}&rdquo;</div>
  <div class="body">${isFr ? "lors de la" : "at the"}</div>
  <div class="event">7${isFr ? "ème" : "th"} ${isFr ? "Édition — EyesOpen Security Conference" : "Edition — EyesOpen Security Conference"}</div>
  <div class="body">${isFr ? "28 Novembre 2026 · Hotel Onomo, Douala, Cameroun" : "November 28, 2026 · Hotel Onomo, Douala, Cameroon"}</div>
  <div class="date">${isFr ? "Émis le" : "Issued on"} ${issuedOn}</div>
  <div class="sig">EyesOpen Association · eyesopensecurity.com</div>
</div></body></html>`;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("certificates", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { type } = await req.json();
  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let failed = 0;

  if (type === "participants") {
    const regs = await prisma.registration.findMany({ where: { checkedInAt: { not: null } } });
    for (const r of regs) {
      const lang: "fr" | "en" = r.langExpression === "en" ? "en" : "fr";
      try {
        await resend.emails.send({
          from: getFrom(),
          to: r.email,
          subject: lang === "fr"
            ? `🎓 Votre certificat de participation — EOCON 2026`
            : `🎓 Your certificate of participation — EOCON 2026`,
          html: participantCertHtml(`${r.fname} ${r.lname}`, lang),
        });
        sent++;
      } catch { failed++; }
    }
  } else if (type === "speakers") {
    // Speakers don't have an email in the Speaker model — send via CFPSubmission if exists
    const speakers = await prisma.speaker.findMany({ where: { edition: "2026", isVisible: true } });
    for (const s of speakers) {
      if (!s.talkTitle) continue;
      // Try to find matching CFP for the speaker's email and language preference
      const cfp = await prisma.cFPSubmission.findFirst({ where: { speakerId: s.id } });
      if (!cfp?.email) continue;
      const lang: "fr" | "en" = cfp.langPresentation === "en" ? "en" : "fr";
      try {
        await resend.emails.send({
          from: getFrom(),
          to: cfp.email,
          subject: lang === "fr"
            ? `🎤 Votre certificat de speaker — EOCON 2026`
            : `🎤 Your speaker certificate — EOCON 2026`,
          html: speakerCertHtml(s.name, s.talkTitle, lang),
        });
        sent++;
      } catch { failed++; }
    }
  } else if (type === "preview-participant") {
    return new NextResponse(participantCertHtml("Jean Dupont", "fr"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } else if (type === "preview-speaker") {
    return new NextResponse(speakerCertHtml("Alice Martin", "Cybersécurité & IA : menaces émergentes", "fr"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({ sent, failed });
}
