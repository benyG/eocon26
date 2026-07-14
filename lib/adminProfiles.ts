export interface AdminPermissions {
  dashboard?: "read" | "write";
  pilotage?: "read" | "write";
  "pilotage-meetings"?: "read" | "write";
  checkin?: "read" | "write";
  cfp?: "read" | "write";
  speakers?: "read" | "write";
  onboarding?: "read" | "write";
  sessions?: "read" | "write";
  workshops?: "read" | "write";
  volunteers?: "read" | "write";
  registrations?: "read" | "write";
  newsletter?: "read" | "write";
  sponsors?: "read" | "write";
  "sponsor-pipeline"?: "read" | "write";
  tickets?: "read" | "write";
  "sponsor-packages"?: "read" | "write";
  budget?: "read" | "write";
  documents?: "read" | "write";
  transactions?: "read" | "write";
  logistics?: "read" | "write";
  communication?: "read" | "write";
  library?: "read" | "write";
  "cyber-watch"?: "read" | "write";
  team?: "read" | "write";
  video?: "read" | "write";
  export?: "read" | "write";
  users?: "read" | "write";
  profiles?: "read" | "write";
  audit?: "read" | "write";
  settings?: "read" | "write";
  prospection?: "read" | "write";
  "prospection-speakers"?: "read" | "write";
  certificates?: "read" | "write";
  ctf?: "read" | "write";
  live?: "read" | "write";
  website?: "read" | "write";
  testimony?: "read" | "write";
  campaigns?: "read" | "write";
  "strategic-plan"?: "read" | "write";
}

export interface AdminProfile {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: AdminPermissions;
}

/**
 * Resolve the effective permissions for a stored profile.
 *
 * This is the SINGLE source of truth used by BOTH the server-side gate
 * (getCurrentPermissions in lib/adminPermissions.ts) and the client hydration
 * route (/api/admin/me). They MUST resolve identically — if they diverge, the
 * server can authorize an action while the client hides its button (or vice
 * versa).
 *
 * Rules:
 *  - System profile (name matches a built-in ADMIN_PROFILES entry): the static
 *    code definition is the always-current baseline, so newly shipped
 *    permission keys (e.g. "prospection-speakers", "pilotage-meetings") are
 *    immediately available to built-in roles WITHOUT re-seeding the DB. Any
 *    customization stored via the profile editor is layered on top.
 *  - Custom profile (no static match): the DB permissions are authoritative.
 */
export function resolveProfilePermissions(
  profileName: string,
  storedPermissionsJson: string | null | undefined,
): Record<string, string> {
  let dbPerms: Record<string, string> = {};
  try { dbPerms = JSON.parse(storedPermissionsJson || "{}") as Record<string, string>; }
  catch { dbPerms = {}; }

  const staticProfile = ADMIN_PROFILES.find(p => p.name === profileName);
  if (staticProfile) {
    return { ...(staticProfile.permissions as Record<string, string>), ...dbPerms };
  }
  return dbPerms;
}

export const ADMIN_PROFILES: AdminProfile[] = [
  {
    id: "super_admin",
    name: "Super Admin",
    description: "Accès complet à toutes les fonctionnalités",
    color: "#ff0066",
    permissions: {
      dashboard: "write",
      cfp: "write", speakers: "write", onboarding: "write", sessions: "write",
      workshops: "write", volunteers: "write", registrations: "write",
      newsletter: "write", sponsors: "write", "sponsor-pipeline": "write",
      tickets: "write", "sponsor-packages": "write", budget: "write",
      documents: "write", transactions: "write",
      logistics: "write", communication: "write", library: "write", "cyber-watch": "write",
      team: "write", video: "write", export: "write", users: "write",
      profiles: "write", audit: "write", settings: "write", prospection: "write",
      "prospection-speakers": "write",
      certificates: "write", ctf: "write", live: "write", website: "write", pilotage: "write",
      testimony: "write", campaigns: "write", "strategic-plan": "write",
    },
  },
  {
    id: "coordinateur_cfp",
    name: "Coordinateur CFP",
    description: "Gestion des soumissions, speakers et programme",
    color: "#cc00ff",
    permissions: {
      cfp: "write", speakers: "write", onboarding: "write",
      sessions: "read", workshops: "read", registrations: "read",
    },
  },
  {
    id: "charge_communication",
    name: "Chargé de Communication",
    description: "Communication, réseaux sociaux et newsletter",
    color: "#0066ff",
    permissions: {
      communication: "write", library: "write", "cyber-watch": "write",
      newsletter: "write", speakers: "read",
      sessions: "read", sponsors: "read",
      campaigns: "write", testimony: "write", "strategic-plan": "write",
    },
  },
  {
    id: "responsable_sponsors",
    name: "Responsable Sponsors",
    description: "Pipeline sponsors, packages et budget sponsors",
    color: "#ffaa00",
    permissions: {
      sponsors: "write", "sponsor-pipeline": "write",
      "sponsor-packages": "write", budget: "write", documents: "write",
      prospection: "write", "prospection-speakers": "write", export: "read",
    },
  },
  {
    id: "responsable_logistique",
    name: "Responsable Logistique",
    description: "Logistique, bénévoles et inscriptions",
    color: "#ff6600",
    permissions: {
      logistics: "write", volunteers: "write", registrations: "write",
      team: "write", export: "read",
    },
  },
  {
    id: "hotesse",
    name: "Hôtesse d'Accueil",
    description: "Validation check-in et consultation des inscrits",
    color: "#00ccff",
    permissions: {
      checkin: "write",
      registrations: "read",
    },
  },
  {
    id: "responsable_ctf",
    name: "Responsable CTF",
    description: "Gestion complète du CTF : challenges, participants et configuration CTFd",
    color: "#00ccff",
    permissions: {
      ctf: "write",
      registrations: "read",
      export: "read",
    },
  },
  {
    id: "observateur_ctf",
    name: "Observateur CTF",
    description: "Lecture seule sur le CTF",
    color: "#006688",
    permissions: {
      ctf: "read",
    },
  },
  {
    id: "observateur",
    name: "Observateur",
    description: "Lecture seule sur toutes les sections",
    color: "#888888",
    permissions: {
      cfp: "read", speakers: "read", sessions: "read", workshops: "read",
      volunteers: "read", registrations: "read", newsletter: "read",
      sponsors: "read", tickets: "read", "sponsor-packages": "read",
      budget: "read", transactions: "read", logistics: "read",
      communication: "read", certificates: "read", team: "read", video: "read",
      live: "read", website: "read", "strategic-plan": "read",
    },
  },
];
