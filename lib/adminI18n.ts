export type AdminLang = "fr" | "en";

export const adminI18n = {
  fr: {
    // Top bar
    viewSite: "Voir le site",
    logout: "Déconnexion",

    // Sidebar groups
    overview: "Vue générale",
    speakersProgram: "Speakers & Programme",
    participants: "Participants",
    sponsorsGroup: "Sponsors",
    budget: "Budget",
    communication: "Communication",
    operations: "Opérations",

    // Sidebar tabs
    dashboard: "Dashboard",
    pipeline: "Pipeline CFP→Programme",
    sessions: "Programme / Sessions",
    pastSpeakers: "Anciens Speakers",
    registrations: "Inscriptions",
    volunteers: "Bénévoles",
    newsletter: "Newsletter",
    sponsorsActive: "Sponsors actifs",
    sponsorPipeline: "Pipeline",
    prospection: "Prospection IA",
    tickets: "Billets & Tarifs",
    sponsorPackages: "Packages Sponsoring",
    budgetTracking: "Suivi Budget",
    communicationPosts: "Planification & Posts",
    logistics: "Logistique",
    team: "Équipe",
    certificates: "Certificats",
    exportCsv: "Export CSV",
    users: "Utilisateurs",
    profiles: "Profils & Droits",
    auditLog: "Journal d'Audit",
    eventSettings: "⚙ Paramètres Événement",
    ctf: "⚡ CTF",

    // Dashboard
    dashboardTitle: "Dashboard",
    speakers: "Speakers",
    sponsors: "Sponsors",
    sessionsLabel: "Sessions",
    cfp: "CFP",
    benevoles: "Bénévoles",
    inscriptions: "Inscriptions",
    newsletterLabel: "Newsletter",
    equipe: "Équipe",

    // Common actions
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    close: "Fermer",
    confirm: "Confirmer",
    loading: "Chargement…",
    noData: "Aucune donnée",

    // Status labels
    pending: "En attente",
    validated: "Validé",
    accepted: "Accepté",
    rejected: "Rejeté",
    active: "Actif",
    inactive: "Inactif",

    // CFP / Submissions
    cfpTitle: "Soumissions CFP",
    name: "Nom",
    email: "Email",
    org: "Organisation",
    talkTitle: "Titre du talk",
    format: "Format",
    status: "Statut",
    notes: "Notes",
    score: "Score",
    actions: "Actions",
    accept: "Accepter",
    reject: "Rejeter",

    // Registrations
    registrationsTitle: "Inscriptions",
    fname: "Prénom",
    lname: "Nom",
    ticketType: "Type de billet",
    ticketRef: "Référence",
    checkedIn: "Checké",
    validateAndSend: "✓ Valider + envoyer billet",

    // Volunteers
    volunteersTitle: "Bénévoles",
    role: "Rôle",
    assignedRole: "Rôle assigné",
    shiftStart: "Début service",
    shiftEnd: "Fin service",
    assign: "Assigner",

    // Sponsors
    sponsorsTitle: "Sponsors",
    addSponsor: "+ Ajouter",
    tier: "Tier",
    logo: "Logo",
    website: "Site web",
    visible: "Visible",

    // Pipeline / Prospects
    pipelineTitle: "Pipeline Sponsors",
    addProspect: "+ Prospect",
    aiEmail: "✨ Email IA",
    markContacted: "📤 Marquer comme envoyé → Statut \"Contacté\"",
    contact: "Contact",
    phone: "Téléphone",
    package: "Package / Tier",

    // Sessions
    sessionsTitle: "Programme / Sessions",
    initStandard: "⚡ Initialiser standard",
    newSession: "Nouvelle session",
    sessionTitle: "Titre",
    type: "Type",
    date: "Date",
    startTime: "Heure début",
    endTime: "Heure fin",
    room: "Salle",
    speakerName: "Nom du speaker",
    sortOrder: "Ordre d'affichage",
    description: "Description",
    visibleOnSite: "Visible sur le site",
    hidden: "masqué",
    editSession: "Modifier la session",
    noSessions: "// Aucune session — cliquez sur ⚡ Initialiser standard pour commencer",

    // Audit
    auditTitle: "Journal d'Audit",
    retention60: "Conservation 60 jours",
    entry: "entrée(s)",
    purgeOld: "🗑 Purger anciens",
    allResources: "— Toutes ressources",
    allActions: "— Toutes actions",
    noEntries: "// Aucune entrée",
    page: "page",
    of: "/",
    confirmPurge: "Supprimer définitivement les entrées de plus de 60 jours ?",
    deletedEntries: "entrée(s) supprimée(s).",

    // Budget
    budgetTitle: "Suivi Budget",
    revenue: "Revenus",
    costs: "Dépenses",
    label: "Libellé",
    planned: "Prévu",
    actual: "Réel",
    difference: "Écart",
    addLine: "+ Ajouter ligne",

    // Users
    usersTitle: "Utilisateurs Admin",
    newUser: "+ Nouvel utilisateur",
    receiveCredentials: "Les utilisateurs reçoivent leurs identifiants par email à la création.",

    // Export
    exportTitle: "Export CSV",
    exportRegistrations: "Inscriptions CSV",
    exportCfpLabel: "CFP CSV",
    exportVolunteers: "Bénévoles CSV",
    exportNewsletter: "Newsletter CSV",
    allParticipants: "Tous les participants inscrits",
    allCfp: "Toutes les propositions de talks",
    allVolunteers: "Candidatures bénévoles",
    allNewsletter: "Abonnés à la newsletter",
  },
  en: {
    // Top bar
    viewSite: "View site",
    logout: "Logout",

    // Sidebar groups
    overview: "Overview",
    speakersProgram: "Speakers & Program",
    participants: "Participants",
    sponsorsGroup: "Sponsors",
    budget: "Budget",
    communication: "Communication",
    operations: "Operations",

    // Sidebar tabs
    dashboard: "Dashboard",
    pipeline: "Pipeline CFP→Program",
    sessions: "Program / Sessions",
    pastSpeakers: "Past Speakers",
    registrations: "Registrations",
    volunteers: "Volunteers",
    newsletter: "Newsletter",
    sponsorsActive: "Active Sponsors",
    sponsorPipeline: "Pipeline",
    prospection: "AI Prospection",
    tickets: "Tickets & Pricing",
    sponsorPackages: "Sponsor Packages",
    budgetTracking: "Budget Tracking",
    communicationPosts: "Planning & Posts",
    logistics: "Logistics",
    team: "Team",
    certificates: "Certificates",
    exportCsv: "CSV Export",
    users: "Users",
    profiles: "Profiles & Permissions",
    auditLog: "Audit Log",
    eventSettings: "⚙ Event Settings",
    ctf: "⚡ CTF",

    // Dashboard
    dashboardTitle: "Dashboard",
    speakers: "Speakers",
    sponsors: "Sponsors",
    sessionsLabel: "Sessions",
    cfp: "CFP",
    benevoles: "Volunteers",
    inscriptions: "Registrations",
    newsletterLabel: "Newsletter",
    equipe: "Team",

    // Common actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading…",
    noData: "No data",

    // Status labels
    pending: "Pending",
    validated: "Validated",
    accepted: "Accepted",
    rejected: "Rejected",
    active: "Active",
    inactive: "Inactive",

    // CFP / Submissions
    cfpTitle: "CFP Submissions",
    name: "Name",
    email: "Email",
    org: "Organisation",
    talkTitle: "Talk title",
    format: "Format",
    status: "Status",
    notes: "Notes",
    score: "Score",
    actions: "Actions",
    accept: "Accept",
    reject: "Reject",

    // Registrations
    registrationsTitle: "Registrations",
    fname: "First name",
    lname: "Last name",
    ticketType: "Ticket type",
    ticketRef: "Reference",
    checkedIn: "Checked in",
    validateAndSend: "✓ Validate + send ticket",

    // Volunteers
    volunteersTitle: "Volunteers",
    role: "Role",
    assignedRole: "Assigned role",
    shiftStart: "Shift start",
    shiftEnd: "Shift end",
    assign: "Assign",

    // Sponsors
    sponsorsTitle: "Sponsors",
    addSponsor: "+ Add",
    tier: "Tier",
    logo: "Logo",
    website: "Website",
    visible: "Visible",

    // Pipeline / Prospects
    pipelineTitle: "Sponsor Pipeline",
    addProspect: "+ Prospect",
    aiEmail: "✨ AI Email",
    markContacted: "📤 Mark as sent → Status \"Contacted\"",
    contact: "Contact",
    phone: "Phone",
    package: "Package / Tier",

    // Sessions
    sessionsTitle: "Program / Sessions",
    initStandard: "⚡ Initialize standard",
    newSession: "New session",
    sessionTitle: "Title",
    type: "Type",
    date: "Date",
    startTime: "Start time",
    endTime: "End time",
    room: "Room",
    speakerName: "Speaker name",
    sortOrder: "Display order",
    description: "Description",
    visibleOnSite: "Visible on site",
    hidden: "hidden",
    editSession: "Edit session",
    noSessions: "// No sessions — click ⚡ Initialize standard to get started",

    // Audit
    auditTitle: "Audit Log",
    retention60: "60-day retention",
    entry: "entry(ies)",
    purgeOld: "🗑 Purge old entries",
    allResources: "— All resources",
    allActions: "— All actions",
    noEntries: "// No entries",
    page: "page",
    of: "/",
    confirmPurge: "Permanently delete entries older than 60 days?",
    deletedEntries: "entry(ies) deleted.",

    // Budget
    budgetTitle: "Budget Tracking",
    revenue: "Revenue",
    costs: "Costs",
    label: "Label",
    planned: "Planned",
    actual: "Actual",
    difference: "Variance",
    addLine: "+ Add line",

    // Users
    usersTitle: "Admin Users",
    newUser: "+ New user",
    receiveCredentials: "Users receive credentials by email upon creation.",

    // Export
    exportTitle: "CSV Export",
    exportRegistrations: "Registrations CSV",
    exportCfpLabel: "CFP CSV",
    exportVolunteers: "Volunteers CSV",
    exportNewsletter: "Newsletter CSV",
    allParticipants: "All registered participants",
    allCfp: "All talk proposals",
    allVolunteers: "Volunteer applications",
    allNewsletter: "Newsletter subscribers",
  },
} as const;

export type AdminTranslations = (typeof adminI18n)[AdminLang];
