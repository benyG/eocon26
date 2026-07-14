// Canonical volunteer roles + alias resolution.
//
// The public application form exists in FR and EN, and its labels have also
// drifted from the admin list over time ("Assistance aux sessions" vs
// "Support Sessions" vs "Session Support"…). Everything that groups or matches
// volunteers by role MUST go through canonicalVolunteerRole() so a role and
// its translations are never treated as different roles.

export const VOLUNTEER_ROLES = [
  "Accueil & Inscription",
  "Support Sessions",
  "Modérateur de session",
  "Support streaming",
  "Ambassadeur réseaux sociaux",
  "Support CTF",
  "Médias & Réseaux Sociaux",
  "Ambassadeur de Sponsoring",
  "Logistique",
] as const;

// alias (lowercased, trimmed) → canonical label. Includes the EN form labels,
// the FR form labels that differ from the admin list, and a few likely drifts.
const ALIASES: Record<string, string> = {
  // Accueil
  "accueil & inscription": "Accueil & Inscription",
  "registration desk": "Accueil & Inscription",
  // Sessions
  "support sessions": "Support Sessions",
  "session support": "Support Sessions",
  "assistance aux sessions": "Support Sessions",
  // Modération
  "modérateur de session": "Modérateur de session",
  "session moderator": "Modérateur de session",
  // Streaming
  "support streaming": "Support streaming",
  "streaming support": "Support streaming",
  // Ambassadeur social
  "ambassadeur réseaux sociaux": "Ambassadeur réseaux sociaux",
  "social media ambassador": "Ambassadeur réseaux sociaux",
  // CTF
  "support ctf": "Support CTF",
  "ctf support": "Support CTF",
  "assistance ctf": "Support CTF",
  // Médias
  "médias & réseaux sociaux": "Médias & Réseaux Sociaux",
  "media & social": "Médias & Réseaux Sociaux",
  "medias & réseaux sociaux": "Médias & Réseaux Sociaux",
  // Sponsoring
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
