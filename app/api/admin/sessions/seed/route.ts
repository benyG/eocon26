import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";

export const dynamic = "force-dynamic";

// Standard conference moments — admin can rename, reorder, and add sessions around these
const SEED_SESSIONS = [
  { sortOrder: 10,  time: "08:00", type: "logistics",  title: "Accueil & Enregistrement",          isVisible: true },
  { sortOrder: 20,  time: "09:00", type: "keynote",    title: "Cérémonie d'Ouverture EOCON 2026",   isVisible: true },
  { sortOrder: 30,  time: "09:30", type: "keynote",    title: "Keynote d'ouverture",                isVisible: true },
  { sortOrder: 40,  time: "10:30", type: "break",      title: "Pause Café & Networking",            isVisible: true },
  { sortOrder: 50,  time: "11:00", type: "talk",       title: "Talk — [À confirmer]",               isVisible: false },
  { sortOrder: 60,  time: "11:45", type: "talk",       title: "Talk — [À confirmer]",               isVisible: false },
  { sortOrder: 70,  time: "12:30", type: "break",      title: "Déjeuner",                           isVisible: true },
  { sortOrder: 80,  time: "14:00", type: "talk",       title: "Talk — [À confirmer]",               isVisible: false },
  { sortOrder: 90,  time: "14:45", type: "talk",       title: "Talk — [À confirmer]",               isVisible: false },
  { sortOrder: 100, time: "15:30", type: "break",      title: "Pause Café",                         isVisible: true },
  { sortOrder: 110, time: "16:00", type: "panel",      title: "Table Ronde / Panel",                isVisible: true },
  { sortOrder: 120, time: "17:00", type: "workshop",   title: "Atelier Pratique — [À confirmer]",   isVisible: false },
  { sortOrder: 130, time: "18:00", type: "logistics",  title: "Cocktail & Networking",              isVisible: true },
  { sortOrder: 140, time: "19:00", type: "logistics",  title: "Lancement CTF EOCTF 2026",           isVisible: true },
  { sortOrder: 150, time: "19:30", type: "logistics",  title: "CTF EOCTF 2026 — 48h de compétition", isVisible: true },
  { sortOrder: 999, time: "17:30", type: "keynote",    title: "Cérémonie de Clôture & Remise de Prix", isVisible: true },
];

export async function POST() {
  if (!(await hasPermission("cfp", "write"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.conferenceSession.count();
  if (existing > 0) {
    return NextResponse.json({ error: "Des sessions existent déjà. Supprimez-les avant de re-seeder.", count: existing }, { status: 409 });
  }

  await prisma.conferenceSession.createMany({ data: SEED_SESSIONS });
  return NextResponse.json({ seeded: SEED_SESSIONS.length });
}
