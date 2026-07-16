// Canonical volunteer roles + alias resolution.
//
// The ONLY roles are the six offered by the landing-page application form
// (lib/i18n.ts, FR/EN). Submitted labels arrive in either language — and some
// legacy admin labels existed before this list was unified — so everything
// that groups or matches volunteers by role MUST go through
// canonicalVolunteerRole().

export const VOLUNTEER_ROLES = [
  "Accueil & Inscription",
  "Assistance aux sessions",
  "Assistance CTF",
  "Médias & Réseaux Sociaux",
  "Ambassadeur de Sponsoring",
  "Logistique",
] as const;

// alias (lowercased, trimmed) → canonical label. Covers the EN form labels and
// the legacy admin-side labels that used to exist in the assign dropdown.
const ALIASES: Record<string, string> = {
  // Accueil & Inscription
  "accueil & inscription": "Accueil & Inscription",
  "registration desk": "Accueil & Inscription",
  // Assistance aux sessions
  "assistance aux sessions": "Assistance aux sessions",
  "session support": "Assistance aux sessions",
  "support sessions": "Assistance aux sessions",
  "modérateur de session": "Assistance aux sessions",
  "session moderator": "Assistance aux sessions",
  "support streaming": "Assistance aux sessions",
  "streaming support": "Assistance aux sessions",
  // Assistance CTF
  "assistance ctf": "Assistance CTF",
  "ctf support": "Assistance CTF",
  "support ctf": "Assistance CTF",
  // Médias & Réseaux Sociaux
  "médias & réseaux sociaux": "Médias & Réseaux Sociaux",
  "medias & réseaux sociaux": "Médias & Réseaux Sociaux",
  "media & social": "Médias & Réseaux Sociaux",
  "ambassadeur réseaux sociaux": "Médias & Réseaux Sociaux",
  "social media ambassador": "Médias & Réseaux Sociaux",
  // Ambassadeur de Sponsoring
  "ambassadeur de sponsoring": "Ambassadeur de Sponsoring",
  "sponsoring ambassador": "Ambassadeur de Sponsoring",
  // Logistique
  "logistique": "Logistique",
  "logistics": "Logistique",
};

/**
 * Resolve any submitted/stored role label (FR/EN/legacy) to its canonical
 * form. Unknown custom labels are returned trimmed as-is; empty → null.
 */
export function canonicalVolunteerRole(raw: string | null | undefined): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  return ALIASES[trimmed.toLowerCase()] || trimmed;
}
