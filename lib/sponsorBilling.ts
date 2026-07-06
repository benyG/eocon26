import { getEventSettings } from "@/lib/settings";

// Billing entity that issues sponsor proformas & invoices (editable via EventSettings).
export interface BillingEntity {
  legalName: string;
  address: string;
  email: string;
  phone: string;
  taxId: string;
  logoUrl: string; // remote URL; falls back to public/branding/examboot-logo.* if empty
  paymentTerms: string; // shown in the payment box (bank / mobile money instructions)
  accentColor: string;  // brand accent used on the document
}

export async function getBillingEntity(): Promise<BillingEntity> {
  const s = await getEventSettings();
  return {
    legalName: s.examboot_legal_name || "Services Examboot Inc.",
    address: s.examboot_address || "",
    email: s.examboot_email || "eocon@examboot.net",
    phone: s.examboot_phone || "+1 581-849-3838",
    taxId: s.examboot_tax_id || "",
    logoUrl: s.examboot_logo_url || "",
    paymentTerms: s.examboot_payment_terms || "",
    accentColor: s.examboot_accent_color || "#0a7d4b",
  };
}

// Sponsor commitment deadlines (#3 — urgency). Editable via EventSettings.
export interface SponsorDeadline {
  key: "print" | "digital";
  date: Date;
  labelFr: string;
  labelEn: string;
}

export async function getSponsorDeadlines(): Promise<SponsorDeadline[]> {
  const s = await getEventSettings();
  const print = s.sponsor_deadline_print || "2026-10-31";
  const digital = s.sponsor_deadline_digital || "2026-11-15";
  const list: SponsorDeadline[] = [
    { key: "print", date: new Date(`${print}T23:59:59`), labelFr: "Inclusion supports imprimés + branding CTF", labelEn: "Print materials + CTF branding inclusion" },
    { key: "digital", date: new Date(`${digital}T23:59:59`), labelFr: "Supports digitaux + jour présentiel", labelEn: "Digital materials + in-person day" },
  ];
  return list.filter(d => !isNaN(d.date.getTime())).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// The nearest not-yet-passed deadline and days remaining — feeds the urgency banner and AI emails.
export async function getNextSponsorDeadline(now = new Date()): Promise<(SponsorDeadline & { daysLeft: number }) | null> {
  const deadlines = await getSponsorDeadlines();
  for (const d of deadlines) {
    const daysLeft = Math.ceil((d.date.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft >= 0) return { ...d, daysLeft };
  }
  return null;
}
