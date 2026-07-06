import { getEventSettings } from "@/lib/settings";
import { getBillingEntity } from "@/lib/sponsorBilling";

// A party that issues a document (header, signature block, footer).
export interface DocEntity {
  legalName: string;
  address: string;
  email: string;
  phone: string;
  taxId: string;
  logoKey: string;   // basename in public/branding for the local logo file
  logoUrl: string;   // remote URL override
  accentColor: string;
}

// EyesOpen Association — the event organizer & partnership counterparty (contracts,
// LOI, exclusivity, brand assets, communication plan). Editable via EventSettings.
export async function getOrganizerEntity(): Promise<DocEntity> {
  const s = await getEventSettings();
  return {
    legalName: s.eyesopen_legal_name || "EyesOpen Association",
    address: s.eyesopen_address || "Douala, Cameroun",
    email: s.eyesopen_email || "sponsors@eyesopensecurity.com",
    phone: s.eyesopen_phone || "+1 581-849-3838",
    taxId: s.eyesopen_tax_id || "",
    logoKey: "eyesopen-logo",
    logoUrl: s.eyesopen_logo_url || "",
    accentColor: /^#[0-9a-fA-F]{6}$/.test(s.eyesopen_accent_color || "") ? s.eyesopen_accent_color : "#00b368",
  };
}

// Services Examboot Inc. — the billing entity (proforma & invoice), mapped from the
// existing billing settings.
export async function getBillingDocEntity(): Promise<DocEntity> {
  const b = await getBillingEntity();
  return {
    legalName: b.legalName,
    address: b.address,
    email: b.email,
    phone: b.phone,
    taxId: b.taxId,
    logoKey: "examboot-logo",
    logoUrl: b.logoUrl,
    accentColor: /^#[0-9a-fA-F]{6}$/.test(b.accentColor) ? b.accentColor : "#0a7d4b",
  };
}
