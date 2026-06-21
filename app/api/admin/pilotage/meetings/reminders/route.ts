// POST /api/admin/pilotage/meetings/reminders
// Send J-1 (day-before) and J0 (day-of) reminder emails for steering meetings.
// Call this endpoint daily via cron or manually from the admin UI.
// Accepts ?secret=CRON_SECRET for unauthenticated cron calls.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const FROM = process.env.EMAIL_FROM || "EOCON 2026 <noreply@eyesopensecurity.com>";
const REPLY_TO = "registration@eyesopensecurity.com";

function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDateTimeFR(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function buildEmail(meeting: {
  title: string;
  scheduledAt: Date;
  location: string | null;
  agenda: string | null;
  convenerName: string | null;
}, stage: "J-1" | "J0"): { subject: string; html: string } {
  const dateStr = fmtDateTimeFR(meeting.scheduledAt);
  const isToday = stage === "J0";
  const subject = `${isToday ? "⏰ Aujourd'hui" : "📅 Demain"} — ${meeting.title}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#12121c;border:1px solid #1e1e2e;border-radius:8px;overflow:hidden;">
    <div style="background:#00ff9d;padding:4px 24px;">
      <p style="margin:0;color:#000;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
        EOCON 2026 — Pilotage global
      </p>
    </div>
    <div style="padding:32px 24px;color:#e0e0e0;">
      <p style="margin:0 0 4px;color:#888;font-size:12px;">${isToday ? "🔔 Rappel — Réunion aujourd'hui" : "📅 Rappel — Réunion demain"}</p>
      <h2 style="margin:0 0 24px;color:#fff;font-size:22px;">${meeting.title}</h2>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 12px;background:#1a1a2e;color:#888;font-size:12px;width:130px;vertical-align:top;">📅 Date</td>
          <td style="padding:8px 12px;background:#1a1a2e;color:#e0e0e0;font-size:14px;">${dateStr}</td>
        </tr>
        ${meeting.location ? `<tr>
          <td style="padding:8px 12px;background:#16162a;color:#888;font-size:12px;vertical-align:top;">📍 Lieu / Lien</td>
          <td style="padding:8px 12px;background:#16162a;color:#e0e0e0;font-size:14px;">${meeting.location}</td>
        </tr>` : ""}
        ${meeting.convenerName ? `<tr>
          <td style="padding:8px 12px;background:#1a1a2e;color:#888;font-size:12px;vertical-align:top;">👤 Convocateur</td>
          <td style="padding:8px 12px;background:#1a1a2e;color:#fbbf24;font-size:14px;font-weight:bold;">${meeting.convenerName}</td>
        </tr>` : ""}
        ${meeting.agenda ? `<tr>
          <td style="padding:8px 12px;background:#16162a;color:#888;font-size:12px;vertical-align:top;">📋 Ordre du jour</td>
          <td style="padding:8px 12px;background:#16162a;color:#e0e0e0;font-size:13px;white-space:pre-line;">${meeting.agenda}</td>
        </tr>` : ""}
      </table>

      ${meeting.convenerName ? `<p style="margin:0 0 24px;color:#9ca3af;font-size:13px;background:#fbbf2410;border-left:3px solid #fbbf24;padding:12px 16px;border-radius:0 4px 4px 0;">
        Il incombe à <strong style="color:#fbbf24;">${meeting.convenerName}</strong> d'organiser et d'animer cette rencontre.
      </p>` : ""}

      <p style="margin:0;color:#555;font-size:11px;border-top:1px solid #1e1e2e;padding-top:16px;">
        Vous recevez ce rappel car vous êtes convoqué(e) à cette réunion dans le cadre de l'organisation d'EOCON 2026.
      </p>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  const isValidCron = cronSecret && secret === cronSecret;
  if (!isValidCron && !(await hasPermission("pilotage", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const today = dayBounds(now);
  const tomorrow = dayBounds(addDays(now, 1));

  // Find meetings tomorrow that haven't had J-1 reminder
  const tomorrowMeetings = await prisma.steeringMeeting.findMany({
    where: {
      scheduledAt: { gte: tomorrow.start, lte: tomorrow.end },
    },
  });

  // Find meetings today that haven't had J0 reminder
  const todayMeetings = await prisma.steeringMeeting.findMany({
    where: {
      scheduledAt: { gte: today.start, lte: today.end },
    },
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  let skipped = 0;

  async function sendReminder(
    meeting: { id: number; title: string; scheduledAt: Date; location: string | null; agenda: string | null; convenerEmail: string | null; convenerName: string | null; attendees: string | null; reminderStage: string | null },
    stage: "J-1" | "J0",
  ) {
    // Skip if already sent
    const stages = (meeting.reminderStage || "").split(",").filter(Boolean);
    if (stages.includes(stage)) { skipped++; return; }

    // Collect all recipients: convener + attendees
    const recipients: { name: string; email: string }[] = [];
    if (meeting.convenerEmail && meeting.convenerName) {
      recipients.push({ name: meeting.convenerName, email: meeting.convenerEmail });
    }
    if (meeting.attendees) {
      try {
        const parsed = JSON.parse(meeting.attendees) as { name: string; email: string }[];
        for (const a of parsed) {
          if (a.email && !recipients.find(r => r.email === a.email)) {
            recipients.push(a);
          }
        }
      } catch { /* ignore malformed JSON */ }
    }
    if (!recipients.length) { skipped++; return; }

    const { subject, html } = buildEmail(meeting, stage);
    for (const r of recipients) {
      try {
        await resend.emails.send({ from: FROM, to: r.email, subject, html, replyTo: REPLY_TO });
        sent++;
      } catch { /* best-effort */ }
    }

    // Mark stage as sent
    const newStage = [...stages, stage].join(",");
    await prisma.steeringMeeting.update({ where: { id: meeting.id }, data: { reminderStage: newStage } });
  }

  for (const m of tomorrowMeetings) await sendReminder(m, "J-1");
  for (const m of todayMeetings) await sendReminder(m, "J0");

  return NextResponse.json({ sent, skipped, checkedJ1: tomorrowMeetings.length, checkedJ0: todayMeetings.length });
}
