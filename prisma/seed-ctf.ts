/**
 * Seed CTF challenges from the shared distribution (lib/ctfSeedData.ts):
 * WEB 10 · CRYPTO 4 · FORENSICS 12 · REVERSE 4 · PWN 4 · OSINT 3 · MISC 3 → 40
 *
 * Run: npx tsx prisma/seed-ctf.ts
 */

import { PrismaClient } from "@prisma/client";
import { CTF_SEED_CHALLENGES } from "../lib/ctfSeedData";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${CTF_SEED_CHALLENGES.length} CTF challenges...`);

  let created = 0;
  for (let i = 0; i < CTF_SEED_CHALLENGES.length; i++) {
    const c = CTF_SEED_CHALLENGES[i];
    await prisma.cTFChallenge.create({
      data: {
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        points: c.points,
        notes: c.notes ?? null,
        status: "idea",
        sortOrder: i,
      },
    });
    created++;
    process.stdout.write(`\r  ${created}/${CTF_SEED_CHALLENGES.length}`);
  }

  console.log(`\nDone — ${created} challenges created.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
