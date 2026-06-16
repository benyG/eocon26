// Shared CTF challenge seed data — distribution matching the planning table:
// WEB       Easy=1 Medium=3 Hard=4 Insane=2 → 10
// CRYPTO    Easy=0 Medium=1 Hard=2 Insane=1 →  4
// FORENSICS Easy=2 Medium=4 Hard=4 Insane=2 → 12
// REVERSE   Easy=0 Medium=1 Hard=2 Insane=1 →  4
// PWN       Easy=0 Medium=1 Hard=2 Insane=1 →  4
// OSINT     Easy=1 Medium=1 Hard=1 Insane=0 →  3
// MISC      Easy=0 Medium=2 Hard=1 Insane=0 →  3
//                                       Total: 40

export interface ChallengeSpec {
  title: string;
  category: string;
  difficulty: "easy" | "medium" | "hard" | "insane";
  points: number;
  notes?: string;
}

export const CTF_POINTS: Record<string, number> = {
  easy: 100,
  medium: 250,
  hard: 400,
  insane: 600,
};

const P = CTF_POINTS;

export const CTF_SEED_CHALLENGES: ChallengeSpec[] = [
  // ── WEB (1/3/4/2 = 10) ──────────────────────────────────────────────────────
  { category: "Web", difficulty: "easy",   title: "web01 — Cookie Monster",          points: P.easy,   notes: "Manipulation de cookies de session pour élever ses privilèges." },
  { category: "Web", difficulty: "medium", title: "web02 — SQLi Login Bypass",       points: P.medium, notes: "Contournement d'authentification via injection SQL classique." },
  { category: "Web", difficulty: "medium", title: "web03 — IDOR Profile",            points: P.medium, notes: "Accès aux données d'autres utilisateurs via IDOR sur un endpoint API." },
  { category: "Web", difficulty: "medium", title: "web04 — Reflected XSS",           points: P.medium, notes: "Injection XSS réfléchie dans un formulaire de recherche non filtré." },
  { category: "Web", difficulty: "hard",   title: "web05 — SSRF Internal",           points: P.hard,   notes: "SSRF vers des services internes pour exfiltrer des métadonnées cloud." },
  { category: "Web", difficulty: "hard",   title: "web06 — JWT Alg Confusion",       points: P.hard,   notes: "Exploitation d'une confusion d'algorithme RS256 → HS256 sur un JWT." },
  { category: "Web", difficulty: "hard",   title: "web07 — XXE Out-of-Band",         points: P.hard,   notes: "Exfiltration de fichiers via XXE out-of-band sur un parser XML." },
  { category: "Web", difficulty: "hard",   title: "web08 — Path Traversal RCE",      points: P.hard,   notes: "Traversée de répertoire menant à l'upload et l'exécution d'un webshell." },
  { category: "Web", difficulty: "insane", title: "web09 — Prototype Pollution RCE", points: P.insane, notes: "RCE via prototype pollution dans une app Node.js/Express." },
  { category: "Web", difficulty: "insane", title: "web10 — GraphQL Chain",           points: P.insane, notes: "Exploitation d'une API GraphQL : introspection, batching, IDOR imbriqué." },

  // ── CRYPTO (0/1/2/1 = 4) ────────────────────────────────────────────────────
  { category: "Crypto", difficulty: "medium", title: "crypto01 — ECB Penguin",          points: P.medium, notes: "Exploitation du mode ECB pour révéler une image chiffrée." },
  { category: "Crypto", difficulty: "hard",   title: "crypto02 — RSA Low Exponent",     points: P.hard,   notes: "Attaque de Håstad sur RSA avec e=3 et plusieurs messages identiques." },
  { category: "Crypto", difficulty: "hard",   title: "crypto03 — Padding Oracle CBC",   points: P.hard,   notes: "Oracle de padding CBC pour déchiffrer un token sans la clé." },
  { category: "Crypto", difficulty: "insane", title: "crypto04 — Bleichenbacher RSA",   points: P.insane, notes: "Attaque Bleichenbacher (oracle PKCS#1 v1.5) pour déchiffrer un message RSA." },

  // ── FORENSICS (2/4/4/2 = 12) ────────────────────────────────────────────────
  { category: "Forensics", difficulty: "easy",   title: "forensics01 — Metadata Hunt",       points: P.easy,   notes: "Extraction de données EXIF/XMP dans une image JPEG." },
  { category: "Forensics", difficulty: "easy",   title: "forensics02 — Strings & Secrets",   points: P.easy,   notes: "Récupération de secrets via la commande strings sur un binaire." },
  { category: "Forensics", difficulty: "medium", title: "forensics03 — PCAP HTTP Flag",      points: P.medium, notes: "Analyse d'une capture réseau : extraction d'un flag dans du trafic HTTP." },
  { category: "Forensics", difficulty: "medium", title: "forensics04 — Steghide JPEG",       points: P.medium, notes: "Extraction d'un fichier caché dans une image JPEG via steghide." },
  { category: "Forensics", difficulty: "medium", title: "forensics05 — Memory Dump Basics",  points: P.medium, notes: "Analyse de dump mémoire Volatility : processus suspects et clés de registre." },
  { category: "Forensics", difficulty: "medium", title: "forensics06 — USB Capture",         points: P.medium, notes: "Reconstitution de frappes clavier à partir d'une capture USB HID." },
  { category: "Forensics", difficulty: "hard",   title: "forensics07 — Disk Image Carving",  points: P.hard,   notes: "Récupération de fichiers supprimés sur une image disque ext4." },
  { category: "Forensics", difficulty: "hard",   title: "forensics08 — PCAP TLS Decrypt",    points: P.hard,   notes: "Déchiffrement TLS avec clé de session exportée, extraction d'artifact." },
  { category: "Forensics", difficulty: "hard",   title: "forensics09 — Office Macro",        points: P.hard,   notes: "Analyse d'un document Office malveillant avec macro VBA obfusquée." },
  { category: "Forensics", difficulty: "hard",   title: "forensics10 — Log Analysis SOC",    points: P.hard,   notes: "Investigation sur des logs Apache/auth.log pour reconstituer une attaque." },
  { category: "Forensics", difficulty: "insane", title: "forensics11 — Ransomware Triage",   points: P.insane, notes: "Analyse d'une infection ransomware : IOCs, clé de chiffrement dans le dump." },
  { category: "Forensics", difficulty: "insane", title: "forensics12 — APT Timeline",        points: P.insane, notes: "Reconstruction complète d'une intrusion APT à partir d'artefacts multi-sources." },

  // ── REVERSE (0/1/2/1 = 4) ───────────────────────────────────────────────────
  { category: "Reverse", difficulty: "medium", title: "reverse01 — Anti-Debug Tricks", points: P.medium, notes: "Contournement de techniques anti-debug (IsDebuggerPresent, timing check)." },
  { category: "Reverse", difficulty: "hard",   title: "reverse02 — Custom VM",         points: P.hard,   notes: "Émulation d'une machine virtuelle custom pour extraire le flag." },
  { category: "Reverse", difficulty: "hard",   title: "reverse03 — Obfuscated Python", points: P.hard,   notes: "Déobfuscation d'un script Python multi-couches (marshal, zlib, base64)." },
  { category: "Reverse", difficulty: "insane", title: "reverse04 — Packed Malware",    points: P.insane, notes: "Unpack dynamique d'un malware + analyse de son protocole C2 custom." },

  // ── PWN (0/1/2/1 = 4) ───────────────────────────────────────────────────────
  { category: "Pwn", difficulty: "medium", title: "pwn01 — Format String Leak", points: P.medium, notes: "Exploitation d'une format string pour lire des adresses sur le stack." },
  { category: "Pwn", difficulty: "hard",   title: "pwn02 — ROP Chain x64",      points: P.hard,   notes: "Construction d'une ROP chain pour bypasser NX et obtenir un shell." },
  { category: "Pwn", difficulty: "hard",   title: "pwn03 — Ret2libc",           points: P.hard,   notes: "Contournement d'ASLR partiel et ret2libc pour exécuter system(\"/bin/sh\")." },
  { category: "Pwn", difficulty: "insane", title: "pwn04 — Heap UAF",           points: P.insane, notes: "Use-After-Free sur le heap pour corrompre des structures de contrôle." },

  // ── OSINT (1/1/1/0 = 3) ─────────────────────────────────────────────────────
  { category: "OSINT", difficulty: "easy",   title: "osint01 — Metadata Geolocation", points: P.easy,   notes: "Géolocalisation d'une photo à partir de ses métadonnées et indices visuels." },
  { category: "OSINT", difficulty: "medium", title: "osint02 — Corporate Recon",      points: P.medium, notes: "Cartographie d'une organisation fictive via sources ouvertes (DNS, leaks, RH)." },
  { category: "OSINT", difficulty: "hard",   title: "osint03 — Dark Web Trace",       points: P.hard,   notes: "Remontée d'une identité à partir de fragments épars sur des forums spécialisés." },

  // ── MISC (0/2/1/0 = 3) ──────────────────────────────────────────────────────
  { category: "Misc", difficulty: "medium", title: "misc01 — Esoteric Encoding",  points: P.medium, notes: "Décodage d'un message encodé en langage ésotérique (Brainfuck / Ook!)." },
  { category: "Misc", difficulty: "medium", title: "misc02 — Python Jail Escape", points: P.medium, notes: "Évasion d'un sandbox Python restreint pour exécuter une commande." },
  { category: "Misc", difficulty: "hard",   title: "misc03 — Multi-stage Enigma",  points: P.hard,   notes: "Challenge multi-étapes combinant stéganographie, crypto et OSINT." },
];
