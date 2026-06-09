/**
 * Seed 40 CTF challenges following the distribution:
 * WEB:       Easy=2, Medium=2, Hard=3, Insane=3  → 10
 * CRYPTO:    Easy=1, Medium=1, Hard=1, Insane=1  →  4
 * FORENSICS: Easy=2, Medium=3, Hard=4, Insane=3  → 12
 * REVERSE:   Easy=1, Medium=1, Hard=2, Insane=1  →  5
 * PWN:       Easy=1, Medium=1, Hard=1, Insane=2  →  5
 * OSINT:     Easy=0, Medium=0, Hard=1, Insane=2  →  3
 * MISC:      Easy=0, Medium=0, Hard=0, Insane=1  →  1
 *                                               Total: 40
 *
 * Run: npx tsx prisma/seed-ctf.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ChallengeSpec {
  title: string;
  category: string;
  difficulty: string;
  points: number;
  notes?: string;
}

const POINTS: Record<string, number> = {
  easy: 100,
  medium: 250,
  hard: 400,
  insane: 600,
};

const challenges: ChallengeSpec[] = [
  // ── WEB (10) ──────────────────────────────────────────────────────────────
  { category: "Web", difficulty: "easy",   title: "web01 — Cookie Monster",         points: POINTS.easy,   notes: "Manipulation de cookies de session pour élever ses privilèges." },
  { category: "Web", difficulty: "easy",   title: "web02 — Reflected XSS",          points: POINTS.easy,   notes: "Injection XSS réfléchie dans un formulaire de recherche non filtré." },
  { category: "Web", difficulty: "medium", title: "web03 — SQLi Login Bypass",      points: POINTS.medium, notes: "Contournement d'authentification via injection SQL classique." },
  { category: "Web", difficulty: "medium", title: "web04 — IDOR Profile",           points: POINTS.medium, notes: "Accès aux données d'autres utilisateurs via IDOR sur un endpoint API." },
  { category: "Web", difficulty: "hard",   title: "web05 — SSRF Internal",          points: POINTS.hard,   notes: "SSRF vers des services internes pour exfiltrer des métadonnées cloud." },
  { category: "Web", difficulty: "hard",   title: "web06 — JWT Alg Confusion",      points: POINTS.hard,   notes: "Exploitation d'une confusion d'algorithme RS256 → HS256 sur un JWT." },
  { category: "Web", difficulty: "hard",   title: "web07 — XXE Out-of-Band",        points: POINTS.hard,   notes: "Exfiltration de fichiers via XXE out-of-band sur un parser XML." },
  { category: "Web", difficulty: "insane", title: "web08 — OAuth Token Theft",      points: POINTS.insane, notes: "Vol de token OAuth2 via open redirect + state forgery." },
  { category: "Web", difficulty: "insane", title: "web09 — Prototype Pollution RCE",points: POINTS.insane, notes: "RCE via prototype pollution dans une app Node.js/Express." },
  { category: "Web", difficulty: "insane", title: "web10 — GraphQL Introspection",  points: POINTS.insane, notes: "Exploitation d'une API GraphQL : introspection, batching, IDOR imbriqué." },

  // ── CRYPTO (4) ────────────────────────────────────────────────────────────
  { category: "Crypto", difficulty: "easy",   title: "crypto01 — Base64 Cascade",    points: POINTS.easy,   notes: "Décodage multi-couches : Base64, ROT13, Hex." },
  { category: "Crypto", difficulty: "medium", title: "crypto02 — ECB Penguin",       points: POINTS.medium, notes: "Exploitation du mode ECB pour révéler une image chiffrée." },
  { category: "Crypto", difficulty: "hard",   title: "crypto03 — RSA Low Exponent",  points: POINTS.hard,   notes: "Attaque de Håstad sur RSA avec e=3 et plusieurs messages identiques." },
  { category: "Crypto", difficulty: "insane", title: "crypto04 — Bleichenbacher CBC", points: POINTS.insane, notes: "Oracle de padding CBC pour déchiffrer un token sans la clé." },

  // ── FORENSICS (12) ────────────────────────────────────────────────────────
  { category: "Forensics", difficulty: "easy",   title: "forensics01 — Metadata Hunt",       points: POINTS.easy,   notes: "Extraction de données EXIF/XMP dans une image JPEG." },
  { category: "Forensics", difficulty: "easy",   title: "forensics02 — Strings & Secrets",   points: POINTS.easy,   notes: "Récupération de secrets via la commande strings sur un binaire." },
  { category: "Forensics", difficulty: "medium", title: "forensics03 — PCAP HTTP Flag",      points: POINTS.medium, notes: "Analyse d'une capture réseau : extraction d'un flag dans du trafic HTTP." },
  { category: "Forensics", difficulty: "medium", title: "forensics04 — Steghide JPEG",       points: POINTS.medium, notes: "Extraction d'un fichier caché dans une image JPEG via steghide." },
  { category: "Forensics", difficulty: "medium", title: "forensics05 — Memory Dump Basics",  points: POINTS.medium, notes: "Analyse de dump mémoire Volatility : processus suspects et clés de registre." },
  { category: "Forensics", difficulty: "hard",   title: "forensics06 — Disk Image Carving",  points: POINTS.hard,   notes: "Récupération de fichiers supprimés sur une image disque ext4." },
  { category: "Forensics", difficulty: "hard",   title: "forensics07 — PCAP TLS Decrypt",    points: POINTS.hard,   notes: "Déchiffrement TLS avec clé de session exportée, extraction d'artifact." },
  { category: "Forensics", difficulty: "hard",   title: "forensics08 — Log Analysis SOC",    points: POINTS.hard,   notes: "Investigation sur des logs Apache/auth.log pour reconstituer une attaque." },
  { category: "Forensics", difficulty: "hard",   title: "forensics09 — Office Macro",        points: POINTS.hard,   notes: "Analyse d'un document Office malveillant avec macro VBA obfusquée." },
  { category: "Forensics", difficulty: "insane", title: "forensics10 — Ransomware Triage",   points: POINTS.insane, notes: "Analyse d'une infection ransomware : IOCs, clé de chiffrement dans le dump." },
  { category: "Forensics", difficulty: "insane", title: "forensics11 — Firmware Extraction", points: POINTS.insane, notes: "Extraction et analyse d'un firmware IoT : squashfs, backdoor hardcodée." },
  { category: "Forensics", difficulty: "insane", title: "forensics12 — APT Timeline",        points: POINTS.insane, notes: "Reconstruction complète d'une intrusion APT à partir d'artefacts multi-sources." },

  // ── REVERSE (5) ───────────────────────────────────────────────────────────
  { category: "Reverse", difficulty: "easy",   title: "reverse01 — Crackme Baby",       points: POINTS.easy,   notes: "Analyse statique d'un crackme simple : comparaison de chaîne en clair." },
  { category: "Reverse", difficulty: "medium", title: "reverse02 — Anti-Debug Tricks",  points: POINTS.medium, notes: "Contournement de techniques anti-debug (IsDebuggerPresent, timing check)." },
  { category: "Reverse", difficulty: "hard",   title: "reverse03 — Custom VM",          points: POINTS.hard,   notes: "Émulation d'une machine virtuelle custom pour extraire le flag." },
  { category: "Reverse", difficulty: "hard",   title: "reverse04 — Obfuscated Python",  points: POINTS.hard,   notes: "Déobfuscation d'un script Python multi-couches (marshal, zlib, base64)." },
  { category: "Reverse", difficulty: "insane", title: "reverse05 — Packed Malware",     points: POINTS.insane, notes: "Unpack dynamique d'un malware + analyse de son protocole C2 custom." },

  // ── PWN (5) ───────────────────────────────────────────────────────────────
  { category: "Pwn", difficulty: "easy",   title: "pwn01 — Buffer Overflow 101",    points: POINTS.easy,   notes: "Stack overflow classique : écrasement d'EIP pour rediriger vers win()." },
  { category: "Pwn", difficulty: "medium", title: "pwn02 — Format String Leak",     points: POINTS.medium, notes: "Exploitation d'une format string pour lire des adresses sur le stack." },
  { category: "Pwn", difficulty: "hard",   title: "pwn03 — ROP Chain x64",          points: POINTS.hard,   notes: "Construction d'une ROP chain pour bypasser NX et obtenir un shell." },
  { category: "Pwn", difficulty: "insane", title: "pwn04 — Heap UAF",               points: POINTS.insane, notes: "Use-After-Free sur le heap pour corrompre des structures de contrôle." },
  { category: "Pwn", difficulty: "insane", title: "pwn05 — Kernel Ret2usr",         points: POINTS.insane, notes: "Exploitation d'un module kernel vulnérable pour escalader en root." },

  // ── OSINT (3) ─────────────────────────────────────────────────────────────
  { category: "OSINT", difficulty: "hard",   title: "osint01 — Geolocation Challenge", points: POINTS.hard,   notes: "Identification précise d'un lieu africain à partir d'indices visuels." },
  { category: "OSINT", difficulty: "insane", title: "osint02 — Dark Web Trace",        points: POINTS.insane, notes: "Remontée d'une identité à partir de fragments épars sur des forums spécialisés." },
  { category: "OSINT", difficulty: "insane", title: "osint03 — Corporate Recon",       points: POINTS.insane, notes: "Cartographie complète d'une organisation fictive via sources ouvertes." },

  // ── MISC (1) ──────────────────────────────────────────────────────────────
  { category: "Misc", difficulty: "insane", title: "misc01 — The Final Enigma", points: POINTS.insane, notes: "Challenge final multi-étapes combinant stéganographie, crypto et OSINT." },
];

async function main() {
  console.log(`Seeding ${challenges.length} CTF challenges...`);

  let created = 0;
  for (let i = 0; i < challenges.length; i++) {
    const c = challenges[i];
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
    process.stdout.write(`\r  ${created}/${challenges.length}`);
  }

  console.log(`\nDone — ${created} challenges created.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
