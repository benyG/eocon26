import { prisma } from "@/lib/db";
import { sendRegistrationTicket, sendOnlineAccessLink, sendWatcherRecruitment } from "@/lib/email";
import { formatTicketRef } from "@/lib/ticketRef";
import crypto from "crypto";

/**
 * Mark a registration as paid and send the ticket/badge confirmation email.
 * Idempotent: a registration already in "paid" state is left untouched.
 * Records whether the ticket email was delivered on the registration's
 * successful transactions so it can be tracked/resent from the admin.
 */
export async function finalizeRegistrationPaid(registrationId: number): Promise<void> {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg || reg.status === "paid") return;

  const onlineToken = reg.onlineToken || crypto.randomBytes(32).toString("hex");
  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "paid", paidAt: new Date(), onlineToken, onlineAccessSentAt: new Date() },
  });

  // Flag the pending transaction(s) as confirmed (leave failed attempts intact).
  await prisma.paymentTransaction.updateMany({
    where: { registrationId, state: { not: "failed" } },
    data: { state: "success" },
  }).catch(() => {});

  await sendRegistrationTicketTracked(registrationId);

  // Send online access link (fire-and-forget, non-blocking)
  const lang = reg.langExpression === "en" ? "en" : "fr";
  sendOnlineAccessLink(reg.email, reg.fname, reg.lname, onlineToken, lang).catch(e =>
    console.error("[Online access email after payment]", e),
  );
}

/**
 * Send (or resend) the ticket email for a registration and record delivery
 * status on its transactions. Returns true if the email was sent.
 */
export async function sendRegistrationTicketTracked(registrationId: number): Promise<boolean> {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg) return false;

  let sent = false;
  try {
    await sendRegistrationTicket(
      reg.email, reg.fname, reg.lname, reg.ticketType, reg.id, formatTicketRef(reg.ticketRef || ""),
      reg.langExpression === "en" ? "en" : "fr",
    );
    sent = true;
    // CTF access → also send The Watcher's initiation transmission (auto).
    const tt = await prisma.ticketType.findUnique({ where: { slug: reg.ticketType }, select: { includesCTF: true } }).catch(() => null);
    if (tt?.includesCTF) {
      sendWatcherRecruitment(reg.email, reg.ctfCompetitorName || reg.fname, reg.langExpression === "en" ? "en" : "fr")
        .catch(e => console.error("[Watcher recruitment email]", e));
    }
  } catch (e) {
    console.error("[Payment ticket email]", e);
  }

  if (sent) {
    await prisma.paymentTransaction.updateMany({
      where: { registrationId },
      data: { ticketEmailSent: true },
    }).catch(() => {});
  }
  return sent;
}
