import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/adminAuth";

const LOGISTICS_SEED = [
  { category: "Production", title: "Commande gadjets & goodies", sortOrder: 1 },
  { category: "Production", title: "Impression roll-up et banners", sortOrder: 2 },
  { category: "Production", title: "Impression badges participants", sortOrder: 3 },
  { category: "Production", title: "Impression programme & signalétique", sortOrder: 4 },
  { category: "Coordination bénévoles", title: "Brief équipe bénévoles", sortOrder: 1 },
  { category: "Coordination bénévoles", title: "Attribution des postes", sortOrder: 2 },
  { category: "Coordination bénévoles", title: "Test walkie-talkies / communication interne", sortOrder: 3 },
  { category: "Salle & Scène", title: "Plan de salle validé", sortOrder: 1 },
  { category: "Salle & Scène", title: "Podium et scène installés", sortOrder: 2 },
  { category: "Salle & Scène", title: "Signalétique en place", sortOrder: 3 },
  { category: "Salle & Scène", title: "Eau et ravitaillement speakers", sortOrder: 4 },
  { category: "Technique", title: "Test audio (micros, enceintes)", sortOrder: 1 },
  { category: "Technique", title: "Test vidéo (projecteur, écran)", sortOrder: 2 },
  { category: "Technique", title: "Test streaming / diffusion live", sortOrder: 3 },
  { category: "Technique", title: "Internet salle (WiFi + filaire)", sortOrder: 4 },
  { category: "Technique", title: "Caméras positionnées et testées", sortOrder: 5 },
  { category: "Technique", title: "Backup matériel prévu", sortOrder: 6 },
  { category: "Participants", title: "Vérification liste billets QR", sortOrder: 1 },
  { category: "Participants", title: "Kit accueil participants prêt", sortOrder: 2 },
  { category: "Participants", title: "Tables d'enregistrement installées", sortOrder: 3 },
  { category: "Speakers", title: "Kit speakers (badge, programme, eau)", sortOrder: 1 },
  { category: "Speakers", title: "Loges / espace speakers préparé", sortOrder: 2 },
  { category: "Speakers", title: "Répétition technique avec chaque speaker", sortOrder: 3 },
  { category: "Cérémonie", title: "Animateur/MC briefé", sortOrder: 1 },
  { category: "Cérémonie", title: "Discours d'ouverture préparé", sortOrder: 2 },
  { category: "Cérémonie", title: "Discours de clôture préparé", sortOrder: 3 },
  { category: "Cérémonie", title: "Animation DJ confirmée", sortOrder: 4 },
  { category: "Sécurité & Santé", title: "Équipe sécurité briefée", sortOrder: 1 },
  { category: "Sécurité & Santé", title: "Trousse de premiers secours disponible", sortOrder: 2 },
  { category: "Sécurité & Santé", title: "Plan d'évacuation affiché", sortOrder: 3 },
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

  return NextResponse.json({ error: "Unknown seed type" }, { status: 400 });
}
