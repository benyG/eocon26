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

// Services Examboot Inc. — the single issuing entity: it organizes EOCON, concludes
// partnerships and bills. Used for every generated document. Editable via EventSettings.
export async function getIssuerEntity(): Promise<DocEntity> {
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
