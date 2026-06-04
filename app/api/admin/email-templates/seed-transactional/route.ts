import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const TRANSACTIONAL = [
  {
    slug: "registration_pending",
    name: "🎟️ Inscription reçue (en attente de paiement)",
    subject: "✅ Inscription reçue — EOCON 2026 [{{ticketRef}}]",
    variables: JSON.stringify(["fname", "lname", "ticketType", "ticketRef", "paymentUrl"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026 — Inscription enregistrée</h1>
  <p>Bonjour <strong>{{fname}} {{lname}}</strong>,</p>
  <p>Votre inscription a bien été reçue pour le billet <strong>{{ticketType}}</strong>.</p>
  <p>Votre référence : <strong style="color:#00ff9d">{{ticketRef}}</strong></p>
  <div style="background:#111;border:1px solid #ffaa0033;border-radius:12px;padding:24px;margin:24px 0">
    <p style="color:#ffaa00;font-weight:bold;margin:0 0 12px">⚠️ Votre place n'est pas encore confirmée</p>
    <p style="margin:0 0 12px">Effectuez votre paiement pour valider définitivement votre inscription :</p>
    <div style="text-align:center;margin:16px 0">
      <a href="{{paymentUrl}}" style="background:#00ff9d;color:#000;font-weight:bold;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block">💳 Procéder au paiement</a>
    </div>
    <p style="color:#555;font-size:12px;margin:8px 0 0">Mentionnez votre référence <strong>{{ticketRef}}</strong> lors du paiement.</p>
  </div>
  <p>Une fois confirmé, vous recevrez votre billet avec QR code d'accès.</p>
  <hr style="border-color:#222;margin:24px 0"/>
  <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala · #EOCON</p>
</div>`,
  },
  {
    slug: "registration_ticket",
    name: "🎟️ Billet confirmé (avec QR code)",
    subject: "🎟️ Votre billet EOCON 2026 — {{ticketRef}}",
    variables: JSON.stringify(["fname", "lname", "ticketType", "ticketRef", "qr_code_img"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026 — BILLET CONFIRMÉ</h1>
  <div style="background:#111;border:1px solid #00ff9d33;border-radius:12px;padding:24px;margin:24px 0">
    <p style="margin:0 0 8px"><span style="color:#00ff9d">Participant :</span> {{fname}} {{lname}}</p>
    <p style="margin:0 0 8px"><span style="color:#00ff9d">Type :</span> {{ticketType}}</p>
    <p style="margin:0 0 8px"><span style="color:#00ff9d">Référence :</span> <strong>{{ticketRef}}</strong></p>
    <p style="margin:0"><span style="color:#00ff9d">Date :</span> 28 Novembre 2026</p>
    <div style="text-align:center;margin:24px 0">
      {{qr_code_img}}
      <p style="color:#00ff9d;font-size:12px;margin-top:8px">Présentez ce QR code à l'entrée</p>
    </div>
  </div>
  <p>📍 Hotel Onomo, Douala, Cameroun</p>
  <p>Présentez ce billet (email ou capture d'écran) à l'entrée.</p>
  <hr style="border-color:#222;margin:24px 0"/>
  <p style="color:#555;font-size:12px">#EOCON #EOCTF · eyesopensecurity.com</p>
</div>`,
  },
  {
    slug: "cfp_confirmation",
    name: "📨 CFP reçu (confirmation au speaker)",
    subject: "✅ Votre proposition de talk a bien été reçue — EOCON 2026",
    variables: JSON.stringify(["name", "talkTitle"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
  <p>Bonjour <strong>{{name}}</strong>,</p>
  <p>Votre proposition <em>&ldquo;{{talkTitle}}&rdquo;</em> a bien été reçue. Notre comité de sélection l'examinera et vous contactera prochainement.</p>
  <hr style="border-color:#222;margin:24px 0"/>
  <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala · #EOCON</p>
</div>`,
  },
  {
    slug: "cfp_accepted",
    name: "🎉 CFP accepté",
    subject: "🎉 CFP Accepté - EOCON 2026 : \"{{talkTitle}}\"",
    variables: JSON.stringify(["name", "talkTitle"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026 — Talk Accepté !</h1>
  <p>Bonjour {{name}},</p>
  <p>Nous avons le plaisir de vous informer que votre proposition <strong>"{{talkTitle}}"</strong> a été <strong>acceptée</strong> pour EOCON 2026 !</p>
  <p>Notre équipe prendra contact avec vous prochainement pour les détails pratiques.</p>
  <p>Bienvenue parmi les speakers d'EOCON 2026 !</p>
  <p>— L'équipe EOCON</p>
</div>`,
  },
  {
    slug: "cfp_rejected",
    name: "CFP non retenu",
    subject: "CFP - EOCON 2026 : \"{{talkTitle}}\"",
    variables: JSON.stringify(["name", "talkTitle"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
  <p>Bonjour {{name}},</p>
  <p>Merci pour votre proposition <strong>"{{talkTitle}}"</strong> soumise à EOCON 2026.</p>
  <p>Après examen par notre comité, nous ne sommes malheureusement pas en mesure de la retenir cette année.</p>
  <p>Nous vous encourageons à soumettre à nouveau lors de la prochaine édition.</p>
  <p>— L'équipe EOCON</p>
</div>`,
  },
  {
    slug: "volunteer_confirmation",
    name: "🙋 Candidature bénévole reçue",
    subject: "✅ Candidature bénévole reçue — EOCON 2026",
    variables: JSON.stringify(["name"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026</h1>
  <p>Bonjour <strong>{{name}}</strong>,</p>
  <p>Merci pour votre candidature bénévole ! Nous sommes ravis de votre intérêt et reviendrons vers vous très bientôt.</p>
  <p>Notre équipe examine toutes les candidatures et vous contactera avant octobre 2026.</p>
  <hr style="border-color:#222;margin:24px 0"/>
  <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala · #EOCON</p>
</div>`,
  },
  {
    slug: "volunteer_accepted",
    name: "🎉 Bénévole accepté(e)",
    subject: "🎉 Candidature bénévole acceptée — EOCON 2026",
    variables: JSON.stringify(["name", "assignedRole"]),
    htmlBody: `<div style="font-family:monospace;background:#0a0a0a;color:#fff;padding:32px;max-width:600px">
  <h1 style="color:#00ff9d">&gt; EOCON 2026 — Bienvenue dans l'équipe !</h1>
  <p>Bonjour <strong>{{name}}</strong>,</p>
  <p>Votre candidature bénévole a été <strong>acceptée</strong> ! Bienvenue dans l'équipe EOCON 2026.</p>
  <div style="background:#111;border:1px solid #00ff9d33;border-radius:12px;padding:20px;margin:20px 0">
    <p style="margin:0 0 8px"><span style="color:#00ff9d">Rôle assigné :</span> <strong>{{assignedRole}}</strong></p>
  </div>
  <p>Notre équipe vous contactera prochainement avec les détails pratiques (planning, briefing, matériel).</p>
  <p>Merci pour votre engagement !</p>
  <p>— L'équipe EOCON 2026</p>
  <hr style="border-color:#222;margin:24px 0"/>
  <p style="color:#555;font-size:12px">📅 28 Novembre 2026 · Hotel Onomo, Douala · #EOCON</p>
</div>`,
  },
];

export async function POST() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let created = 0;
  for (const t of TRANSACTIONAL) {
    const existing = await prisma.emailTemplate.findUnique({ where: { slug: t.slug } });
    if (!existing) {
      await prisma.emailTemplate.create({ data: { ...t, segment: "transactional" } });
      created++;
    }
  }
  return NextResponse.json({ created });
}
