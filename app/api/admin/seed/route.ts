import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { CTF_SEED_CHALLENGES } from "@/lib/ctfSeedData";

export const dynamic = "force-dynamic";

// Tâches strictement dans le périmètre du Responsable Logistique :
// logistique matérielle (mobilier, signalétique, kits, stocks, impression,
// transport, installation/démontage). Aucune tâche relevant d'un autre pôle
// (technique/AV, speakers, cérémonie, sécurité, bénévoles).
const LOGISTICS_SEED = [
  // Matériel & fournisseurs
  { category: "Matériel & fournisseurs", title: "Établir la liste complète du matériel nécessaire", sortOrder: 1 },
  { category: "Matériel & fournisseurs", title: "Valider la liste du matériel avec le Coordonnateur local", sortOrder: 2 },
  { category: "Matériel & fournisseurs", title: "Identifier les fournisseurs et obtenir les devis", sortOrder: 3 },
  { category: "Matériel & fournisseurs", title: "Sélectionner les fournisseurs et passer les commandes", sortOrder: 4 },
  { category: "Matériel & fournisseurs", title: "Suivi des commandes et confirmation des livraisons", sortOrder: 5 },
  // Impression & supports
  { category: "Impression & supports", title: "Préparer les fichiers print (badges, programme, signalétique)", sortOrder: 1 },
  { category: "Impression & supports", title: "Envoyer les fichiers print à l'imprimeur (délai min. 3 semaines)", sortOrder: 2 },
  { category: "Impression & supports", title: "Commander les supports imprimés (flyers, affiches, roll-up, signalétique)", sortOrder: 3 },
  { category: "Impression & supports", title: "Imprimer les badges participants", sortOrder: 4 },
  { category: "Impression & supports", title: "Réceptionner et contrôler les supports imprimés", sortOrder: 5 },
  // Kits participants
  { category: "Kits participants", title: "Commander les gadgets & goodies", sortOrder: 1 },
  { category: "Kits participants", title: "Composer les kits participants (badge, programme, sac)", sortOrder: 2 },
  { category: "Kits participants", title: "Assembler et conditionner les kits", sortOrder: 3 },
  { category: "Kits participants", title: "Préparer le matériel des tables d'enregistrement", sortOrder: 4 },
  // Mobilier & signalétique
  { category: "Mobilier & signalétique", title: "Définir les besoins en mobilier (tables, chaises, stands)", sortOrder: 1 },
  { category: "Mobilier & signalétique", title: "Commander / louer le mobilier auprès du prestataire", sortOrder: 2 },
  { category: "Mobilier & signalétique", title: "Valider le plan d'implantation du mobilier avec le Coordonnateur local", sortOrder: 3 },
  { category: "Mobilier & signalétique", title: "Positionner la signalétique directionnelle sur site", sortOrder: 4 },
  // Transport & stockage
  { category: "Transport & stockage", title: "Organiser le stockage anticipé du matériel", sortOrder: 1 },
  { category: "Transport & stockage", title: "Planifier le transport du matériel vers le lieu", sortOrder: 2 },
  { category: "Transport & stockage", title: "Transport du matériel vers le site", sortOrder: 3 },
  // Installation (Jour J)
  { category: "Installation (Jour J)", title: "Installation sur site — mobilier, signalétique, kits", sortOrder: 1 },
  { category: "Installation (Jour J)", title: "Vérifier que tout le matériel est en place avant l'ouverture", sortOrder: 2 },
  { category: "Installation (Jour J)", title: "Gérer les besoins matériels en temps réel", sortOrder: 3 },
  // Démontage & inventaire
  { category: "Démontage & inventaire", title: "Démontage progressif en fin d'événement", sortOrder: 1 },
  { category: "Démontage & inventaire", title: "Démontage complet et retour du matériel loué", sortOrder: 2 },
  { category: "Démontage & inventaire", title: "Inventaire post-événement et liste de réassort", sortOrder: 3 },
];

const BUDGET_SEED = [
  { category: "revenue", label: "Billets Standard", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Billets Student", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Billets VIP", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Billets Early Bird", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Sponsoring Platinum", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Sponsoring Gold", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Sponsoring Silver", planned: 0, actual: 0, status: "pending" },
  { category: "revenue", label: "Sponsoring Bronze", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Hébergement services web", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Sponsoring pages LinkedIn/Twitter/Instagram", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Insertion Média papier", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Communication Média TV/Radio", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Couverture TV/Radio", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Salle de conférence Hotel Onomo", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Service conférence (restauration, pauses)", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Hébergement parties prenantes clés", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Transports", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Impressions (supports, badges, roll-up)", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Gadjets & goodies", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Sécurité", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Santé (premiers secours)", planned: 0, actual: 0, status: "pending" },
  { category: "costs", label: "Animation DJ", planned: 0, actual: 0, status: "pending" },
];

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type } = await req.json();

  if (type === "logistics") {
    const existing = await prisma.logisticsTask.count();
    if (existing > 0) return NextResponse.json({ error: "Logistics tasks already seeded", count: existing }, { status: 409 });
    await prisma.logisticsTask.createMany({ data: LOGISTICS_SEED });
    return NextResponse.json({ seeded: LOGISTICS_SEED.length });
  }

  if (type === "budget") {
    const existing = await prisma.budgetItem.count();
    if (existing > 0) return NextResponse.json({ error: "Budget items already seeded", count: existing }, { status: 409 });
    await prisma.budgetItem.createMany({ data: BUDGET_SEED });
    return NextResponse.json({ seeded: BUDGET_SEED.length });
  }

  if (type === "ctf") {
    const existing = await prisma.cTFChallenge.count();
    if (existing > 0) return NextResponse.json({ error: "CTF challenges already seeded", count: existing }, { status: 409 });
    await prisma.cTFChallenge.createMany({
      data: CTF_SEED_CHALLENGES.map((c, i) => ({
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        points: c.points,
        notes: c.notes ?? null,
        status: "idea",
        sortOrder: i,
      })),
    });
    return NextResponse.json({ seeded: CTF_SEED_CHALLENGES.length });
  }

  return NextResponse.json({ error: "Unknown seed type" }, { status: 400 });
}
