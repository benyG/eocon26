import { prisma } from "@/lib/db";
import { sendRegistrationTicket } from "@/lib/email";
import { formatTicketRef } from "@/lib/ticketRef";

/**
 * Mark a registration as paid and fire off the ticket/badge confirmation email.
 * Idempotent: a registration already in "paid" state is left untouched.
 */
export async function finalizeRegistrationPaid(registrationId: number): Promise<void> {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg || reg.status === "paid") return;

  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: "paid", paidAt: new Date() },
  });

  sendRegistrationTicket(
    reg.email, reg.fname, reg.lname, reg.ticketType, reg.id, formatTicketRef(reg.ticketRef || ""),
    reg.langExpression === "en" ? "en" : "fr",
  ).catch(e => console.error("[Payment ticket email]", e));
}
