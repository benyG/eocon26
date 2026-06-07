export interface AdminPermissions {
  dashboard?: "read";
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
  budget?: "read" | "write";
  logistics?: "read" | "write";
  communication?: "read" | "write";
  team?: "read" | "write";
  export?: "read" | "write";
  users?: "read" | "write";
  prospection?: "read" | "write";
  certificates?: "read" | "write";
  ctf?: "read" | "write";
}

export interface AdminProfile {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: AdminPermissions;
}

export const ADMIN_PROFILES: AdminProfile[] = [
  {
    id: "super_admin",
    name: "Super Admin",
    description: "Accès complet à toutes les fonctionnalités",
    color: "#ff0066",
    permissions: {
      cfp: "write", speakers: "write", onboarding: "write", sessions: "write",
      workshops: "write", volunteers: "write", registrations: "write",
      newsletter: "write", sponsors: "write", "sponsor-pipeline": "write",
      budget: "write", logistics: "write", communication: "write",
      team: "write", export: "write", users: "write", prospection: "write",
      certificates: "write",
      ctf: "write",
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
      communication: "write", newsletter: "write", speakers: "read",
      sessions: "read", sponsors: "read",
    },
  },
  {
    id: "responsable_sponsors",
    name: "Responsable Sponsors",
    description: "Pipeline sponsors, packages et budget",
    color: "#ffaa00",
    permissions: {
      sponsors: "write", "sponsor-pipeline": "write", budget: "write",
      prospection: "write", export: "read",
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
    id: "observateur",
    name: "Observateur",
    description: "Lecture seule sur toutes les sections",
    color: "#888888",
    permissions: {
      cfp: "read", speakers: "read", sessions: "read", workshops: "read",
      volunteers: "read", registrations: "read", newsletter: "read",
      sponsors: "read", budget: "read", logistics: "read",
    },
  },
];
