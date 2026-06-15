import { prisma } from "@/lib/db";
import { sendRegistrationTicket } from "@/lib/email";
import { formatTicketRef } from "@/lib/ticketRef";

/**
 * Mark a registration as paid and send the ticket/badge confirmation email.
 * Idempotent: a registration already in "paid" state is left untouched.
 * Records whether the ticket email was delivered on the registration's
 * successful transactions so it can be tracked/resent from the admin.
 */
export async function finalizeRegistrationPaid(registrationId: number): Promise<void> {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg || reg.status === "paid") return;

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "paid", paidAt: new Date() },
  });

  // Flag the pending transaction(s) as confirmed (leave failed attempts intact).
  await prisma.paymentTransaction.updateMany({
    where: { registrationId, state: { not: "failed" } },
    data: { state: "success" },
  }).catch(() => {});

  await sendRegistrationTicketTracked(registrationId);
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
