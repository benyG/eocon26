import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { logAction } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// Communication-plan tasks (EOCON 2026). Titles are prefixed "[Comm]" so this
// injection is idempotent and clearly identifiable in the kanban.
// IMPORTANT: this endpoint is purely ADDITIVE — it never deletes or resets any
// existing task. Re-running it only inserts the entries that are missing.
type SeedTask = { title: string; date: string; phase: number; priority: string; milestone?: boolean; desc?: string };

const COMM_TASKS: SeedTask[] = [
  // ── Phase A — Fondations · fer de lance = Call For Speakers (juillet) ──
  { title: "Post d'ouverture — Call For Speakers + appel formateurs (réseaux principaux)", date: "2026-07-11", phase: 1, priority: "critical", milestone: true },
  { title: "Lancer l'appel à volontaires (post « Bénévoles » + publications ciblées)", date: "2026-07-12", phase: 1, priority: "high", milestone: true, desc: "L'appel à volontaires débute le 12 juillet." },
  { title: "Poser les fondations (pages officielles, LinkedIn Event, Eventbrite/Luma, Facebook Event, WhatsApp, Telegram) + activer uniquement les canaux du Call For Speakers (Sessionize, WikiCFP, Papercall, OWASP/ISACA/ISC2)", date: "2026-07-25", phase: 1, priority: "high", desc: "Ne pas activer les canaux CTF, médias, étudiants maintenant : ils viendront à leur phase." },
  { title: "Email de lancement + séquence de bienvenue automatisée (J0/J+3/J+7)", date: "2026-07-15", phase: 1, priority: "high" },
  { title: "Cadence sociale : 5 posts/semaine — contexte dominant Call For Speakers", date: "2026-07-15", phase: 1, priority: "medium", desc: "On ne mélange pas encore tous les messages : un domaine phare à la fois." },
  { title: "Recruter 15–20 ambassadeurs (rediffusion des posts clés)", date: "2026-07-20", phase: 1, priority: "medium" },
  { title: "Prospection speakers en volume (Apollo) + constituer le pipeline sponsors en coulisses", date: "2026-07-18", phase: 1, priority: "medium", desc: "La poussée publique sponsors démarre en août." },
  { title: "GATE 31 juil — fondations + canaux Call For Speakers actifs · pipeline sponsors ≥40 · ≥25 candidatures bénévoles · Compétition ouverte", date: "2026-07-31", phase: 1, priority: "critical", milestone: true },

  // ── Phase B — Fer de lance = sponsors (+ speakers confirmés) (août) ──
  { title: "Annonces speakers confirmés (contexte « Speaker », cadence quotidienne)", date: "2026-08-03", phase: 1, priority: "high" },
  { title: "Poussée sponsors : deck aux prospects tièdes + canaux LinkedIn/médias business", date: "2026-08-10", phase: 1, priority: "high" },
  { title: "Premiers contacts médias (préparer la campagne d'octobre, sans publier encore)", date: "2026-08-17", phase: 1, priority: "low" },
  { title: "Activer les canaux communauté Compétition (CTFtime, Discord, Root-Me, HTB/THM)", date: "2026-08-24", phase: 1, priority: "medium", desc: "Donne du temps de rodage avant la poussée Compétition d'octobre." },
  { title: "GATE 31 août — ≥1 sponsor Gold/Platinum signé", date: "2026-08-31", phase: 1, priority: "critical", milestone: true },

  // ── Phase C — Ouverture inscriptions & étudiants (septembre) ──
  { title: "Ouverture des inscriptions : post + email (contexte « Inscriptions ») + boost payant", date: "2026-09-15", phase: 2, priority: "critical", milestone: true },
  { title: "Campagne étudiants (universités, GDG, Cisco Academy, WhatsApp/Facebook) — inscrits + bénévoles", date: "2026-09-16", phase: 2, priority: "high" },
  { title: "GATE 30 sept — 4 workshops retenus · programme quasi complet · brief technique speakers", date: "2026-09-30", phase: 2, priority: "high", milestone: true },

  // ── Phase D — Programme & médias (octobre) ──
  { title: "Révélation du programme (contexte « Session ») + série speakers", date: "2026-10-05", phase: 2, priority: "high" },
  { title: "Campagne médias (Agence Ecofin, CIO Africa/Mag, Digital Business Africa, Business in Cameroon)", date: "2026-10-06", phase: 2, priority: "medium" },
  { title: "Lancer le compte à rebours (≈ J-45) + boost payant têtes d'affiche", date: "2026-10-14", phase: 2, priority: "medium" },
  { title: "GATE 31 oct — 10 sponsors · ~650 inscrits (65 %) · ~200 compétiteurs pré-inscrits · 70 soumissions", date: "2026-10-31", phase: 2, priority: "critical", milestone: true },

  // ── Phase E — Conversion massive (1–21 novembre) ──
  { title: "Passer à 2–3 posts/jour + diffusion quotidienne WhatsApp/Telegram/Discord", date: "2026-11-01", phase: 3, priority: "critical", milestone: true },
  { title: "Relances email de conversion J-14 / J-7 / J-3 / J-1 + relance non-cliqueurs", date: "2026-11-14", phase: 3, priority: "high" },
  { title: "GATE 21 nov — ~1 000 inscrits · 500 compétiteurs · 20 bénévoles déployés", date: "2026-11-21", phase: 3, priority: "critical", milestone: true },

  // ── Phase F — Semaine EOCON (22–28 novembre) ──
  { title: "Couverture live quotidienne + cérémonie de la Compétition (28 nov)", date: "2026-11-22", phase: 4, priority: "high", milestone: true },

  // ── Phase G — Capitalisation (décembre) ──
  { title: "Remerciements officiels + rapport sponsors + save-the-date 2027", date: "2026-12-15", phase: 5, priority: "medium", milestone: true },
];

const TAG = "[Comm]";

export async function POST(req: NextRequest) {
  if (!(await hasPermission("pilotage", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Idempotency: skip any comm task whose (tagged) title already exists.
  // We NEVER delete — existing kanban tasks stay untouched.
  const existing = await prisma.steeringTask.findMany({ select: { title: true } });
  const existingTitles = new Set(existing.map((t) => t.title));

  const toCreate = COMM_TASKS
    .map((t) => ({ ...t, fullTitle: `${TAG} ${t.title}` }))
    .filter((t) => !existingTitles.has(t.fullTitle))
    .map((t, i) => ({
      title: t.fullTitle,
      description: t.desc || null,
      phase: t.phase,
      pole: "Resp. Communication & Marketing",
      subTeam: "Contenu",
      status: "todo",
      priority: t.priority,
      dueDate: new Date(`${t.date}T09:00:00`),
      isMilestone: !!t.milestone,
      sortOrder: i,
    }));

  if (toCreate.length) {
    await prisma.steeringTask.createMany({ data: toCreate });
  }

  const added = toCreate.length;
  const skipped = COMM_TASKS.length - added;
  logAction(req, "CREATE", "pilotage", null, { commPlanAdded: added, skipped });
  return NextResponse.json({ added, skipped, total: COMM_TASKS.length });
}
