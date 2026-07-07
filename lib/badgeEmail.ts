import { Resend } from "resend";
import { svgToDataUrl, generateBadgeSvg, BadgeType } from "./badgeSvg";

export async function sendBadgeEmail(opts: {
  to: string;
  recipientName: string;
  badgeType: BadgeType;
  subtype?: string | null;
  uuid: string;
  credentialJson: string;
  lang?: "fr" | "en";
}) {
  const { to, recipientName, badgeType, subtype, uuid, lang = "fr" } = opts;
  const isFr = lang === "fr";
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://eyesopensecurity.com";
  const verifyUrl = `${baseUrl}/verify/${uuid}`;
  const downloadUrl = `${baseUrl}/api/verify/${uuid}/download`;
  const pdfUrl = `${baseUrl}/api/verify/${uuid}/pdf`;
  const svgDataUrl = svgToDataUrl(generateBadgeSvg(badgeType, recipientName, "2026", subtype));

  const badgeLabels: Record<BadgeType, { fr: string; en: string }> = {
    participant:    { fr: "Participant·e à l’évènement", en: "Event Participant" },
    speaker:        { fr: "Intervenant·e",                en: "Speaker" },
    volunteer:      { fr: "Bénévole",                     en: "Event Volunteer" },
    ctf_competitor: { fr: "Compétiteur CTF",              en: "CTF Competitor" },
    ctf_winner:     { fr: "Lauréat·e CTF",                en: "CTF Winner" },
    organizer:      { fr: "Équipe organisatrice",          en: "Organizing Team" },
  };

  const badgeColors: Record<BadgeType, string> = {
    participant:    "#00ff9d",
    speaker:        "#cc0000",
    volunteer:      "#ff6600",
    ctf_competitor: "#00ccff",
    ctf_winner:     "#ffd700",
    organizer:      "#cc00ff",
  };

  const color = badgeColors[badgeType];
  const labelObj = badgeLabels[badgeType];
  const label = labelObj[lang];
  const subtypeStr = subtype ? ` — ${subtype.charAt(0).toUpperCase() + subtype.slice(1)}` : "";

  // LinkedIn Add to Profile URL
  const linkedinAddUrl = new URL("https://www.linkedin.com/profile/add");
  linkedinAddUrl.searchParams.set("startTask", "CERTIFICATION_NAME");
  linkedinAddUrl.searchParams.set("name", `EOCON 2026 — ${labelObj.en}${subtypeStr}`);
  linkedinAddUrl.searchParams.set("issueYear", "2026");
  linkedinAddUrl.searchParams.set("issueMonth", "11");
  linkedinAddUrl.searchParams.set("certUrl", verifyUrl);
  linkedinAddUrl.searchParams.set("certId", uuid);

  // LinkedIn Share Post URL
  const linkedinShareUrl = new URL("https://www.linkedin.com/shareArticle");
  linkedinShareUrl.searchParams.set("mini", "true");
  linkedinShareUrl.searchParams.set("url", verifyUrl);
  linkedinShareUrl.searchParams.set("title", `EOCON 2026 — ${labelObj.en}`);
  linkedinShareUrl.searchParams.set("summary",
    isFr
      ? `J'ai reçu le badge EOCON 2026 ${labelObj.fr} ! Vérifiez ma certification :`
      : `I was awarded the EOCON 2026 ${labelObj.en} badge! Verify my credential:`,
  );

  const subject = isFr
    ? `Votre badge EOCON 2026 — ${label}${subtypeStr}`
    : `Your EOCON 2026 Badge — ${label}${subtypeStr}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Courier New',monospace;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:32px;">
          <p style="font-size:11px;letter-spacing:4px;color:${color};text-transform:uppercase;margin:0 0 8px;">&gt; EOCON 2026</p>
          <h1 style="font-size:28px;color:#ffffff;margin:0;font-family:Georgia,serif;font-weight:bold;">
            ${isFr ? "Votre badge est prêt" : "Your Badge is Ready"}
          </h1>
          <div style="width:60px;height:2px;background:${color};margin:16px auto 0;"></div>
        </td></tr>

        <!-- Badge image -->
        <tr><td style="text-align:center;padding:24px 0;">
          <img src="${svgDataUrl}" width="220" height="257" alt="EOCON 2026 ${label}" style="display:inline-block;" />
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:0 40px 24px;">
          <p style="font-size:15px;color:#aaaaaa;line-height:1.8;margin:0;">
            ${isFr ? "Cher·ère" : "Dear"} <strong style="color:#ffffff;">${recipientName}</strong>,
          </p>
          <p style="font-size:15px;color:#aaaaaa;line-height:1.8;margin:12px 0 0;">
            ${isFr
              ? `Félicitations ! Vous avez reçu le badge <strong style="color:${color};">EOCON 2026 — ${label}${subtypeStr}</strong>. Il s'agit d'une certification cryptographiquement signée, vérifiable par quiconque et ajoutée à vos profils professionnels.`
              : `Congratulations! You have been awarded the <strong style="color:${color};">EOCON 2026 — ${label}${subtypeStr}</strong> Open Badge. This is a cryptographically signed credential that can be verified by anyone and added to your professional profiles.`}
          </p>
        </td></tr>

        <!-- PDF download banner -->
        <tr><td style="padding:0 40px 16px;">
          <div style="background:#0a1628;border:2px solid ${color};border-radius:8px;padding:20px;text-align:center;">
            <p style="font-size:13px;color:#ffffff;margin:0 0 6px;font-weight:bold;">
              📄 ${isFr ? "Téléchargez votre badge en PDF" : "Download your badge as PDF"}
            </p>
            <p style="font-size:11px;color:#888888;margin:0 0 16px;line-height:1.6;">
              ${isFr
                ? "Si le visuel du badge n'apparaît pas correctement dans votre messagerie,<br/>utilisez ce lien pour obtenir la version PDF imprimable avec tous les QR codes visibles."
                : "If the badge image does not display correctly in your email client,<br/>use this link to get the printable PDF version with all QR codes visible."}
            </p>
            <a href="${pdfUrl}" target="_blank"
              style="display:inline-block;background:${color};color:#000000;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:bold;font-family:sans-serif;letter-spacing:1px;">
              ⬇ ${isFr ? "TÉLÉCHARGER MON BADGE (PDF)" : "DOWNLOAD MY BADGE (PDF)"}
            </a>
          </div>
        </td></tr>

        <!-- Verification box -->
        <tr><td style="padding:0 40px 24px;">
          <div style="background:#111827;border:1px solid ${color}33;border-radius:8px;padding:20px;">
            <p style="font-size:11px;letter-spacing:2px;color:${color};text-transform:uppercase;margin:0 0 12px;">
              &#10003; ${isFr ? "Certification vérifiée" : "Verified Credential"}
            </p>
            <p style="font-size:12px;color:#888888;margin:0 0 4px;">Badge ID:</p>
            <p style="font-size:11px;color:#555555;font-family:monospace;margin:0 0 16px;word-break:break-all;">${uuid}</p>
            <a href="${verifyUrl}" style="display:inline-block;background:${color}22;border:1px solid ${color}66;color:${color};padding:10px 20px;border-radius:6px;text-decoration:none;font-size:12px;letter-spacing:1px;">
              ${isFr ? "VÉRIFIER MON BADGE →" : "VERIFY MY BADGE →"}
            </a>
          </div>
        </td></tr>

        <!-- Action buttons -->
        <tr><td style="padding:0 40px 24px;">
          <p style="font-size:11px;letter-spacing:2px;color:#555;text-transform:uppercase;margin:0 0 16px;">
            ${isFr ? "Partagez votre réussite" : "Share your achievement"}
          </p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;">
              <a href="${linkedinShareUrl.toString()}" target="_blank"
                style="display:inline-block;background:#0077b5;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-family:sans-serif;">
                ${isFr ? "Publier sur LinkedIn" : "Post on LinkedIn"}
              </a>
            </td>
            <td style="padding-right:12px;">
              <a href="${linkedinAddUrl.toString()}" target="_blank"
                style="display:inline-block;background:#004182;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:12px;font-family:sans-serif;">
                ${isFr ? "Ajouter au profil LinkedIn" : "Add to LinkedIn Profile"}
              </a>
            </td>
            <td>
              <a href="${downloadUrl}" target="_blank"
                style="display:inline-block;background:#1a1a2e;border:1px solid #333;color:#aaaaaa;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:12px;">
                ${isFr ? "Télécharger (OBv3)" : "Download Badge (OBv3)"}
              </a>
            </td>
          </tr></table>
          <p style="font-size:11px;color:#444;margin:12px 0 0;">
            ${isFr
              ? `Pour ajouter à <a href="https://www.credly.com" style="color:#ff6b00;">Credly</a> : téléchargez le JSON ci-dessus et importez-le via la fonctionnalité d'import de badge Credly.`
              : `To add to <a href="https://www.credly.com" style="color:#ff6b00;">Credly</a>: download the badge JSON above and import it via Credly's badge wallet import feature.`}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 0;border-top:1px solid #1a1a2e;">
          <p style="font-size:11px;color:#333;margin:0;">Services ExamBoot Inc. &middot; EOCON 2026 &middot; eyesopensecurity.com</p>
          <p style="font-size:10px;color:#222;margin:4px 0 0;">
            ${isFr
              ? "Ce badge utilise le standard Open Badges V3 et est cryptographiquement signé."
              : "This badge uses the Open Badges V3 standard and is cryptographically signed."}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
  await resend.emails.send({ from, to, subject, html });
}
