// Shared CTF challenge seed data — distribution matching the planning table:
// WEB       Easy=2 Medium=4 Hard=3 Insane=1 → 10
// CRYPTO    Easy=1 Medium=1 Hard=2 Insane=0 →  4
// FORENSICS Easy=3 Medium=5 Hard=3 Insane=1 → 12
// REVERSE   Easy=1 Medium=1 Hard=1 Insane=1 →  4
// PWN       Easy=0 Medium=2 Hard=2 Insane=0 →  4
// OSINT     Easy=2 Medium=1 Hard=0 Insane=0 →  3
// MISC      Easy=1 Medium=2 Hard=0 Insane=0 →  3
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
  // ── WEB (2/4/3/1 = 10) ──────────────────────────────────────────────────────
  { category: "Web", difficulty: "easy",   title: "web01 — Cookie Monster",          points: P.easy,   notes: "Manipulation de cookies de session pour élever ses privilèges." },
  { category: "Web", difficulty: "easy",   title: "web02 — Reflected XSS",           points: P.easy,   notes: "Injection XSS réfléchie dans un formulaire de recherche non filtré." },
  { category: "Web", difficulty: "medium", title: "web03 — SQLi Login Bypass",       points: P.medium, notes: "Contournement d'authentification via injection SQL classique." },
  { category: "Web", difficulty: "medium", title: "web04 — IDOR Profile",            points: P.medium, notes: "Accès aux données d'autres utilisateurs via IDOR sur un endpoint API." },
  { category: "Web", difficulty: "medium", title: "web05 — CSRF Account Takeover",   points: P.medium, notes: "Changement d'email via CSRF sur un formulaire sans token anti-CSRF." },
  { category: "Web", difficulty: "medium", title: "web06 — Path Traversal",          points: P.medium, notes: "Lecture de fichiers serveur via traversée de répertoire sur un endpoint de download." },
  { category: "Web", difficulty: "hard",   title: "web07 — SSRF Internal",           points: P.hard,   notes: "SSRF vers des services internes pour exfiltrer des métadonnées cloud." },
  { category: "Web", difficulty: "hard",   title: "web08 — JWT Alg Confusion",       points: P.hard,   notes: "Exploitation d'une confusion d'algorithme RS256 → HS256 sur un JWT." },
  { category: "Web", difficulty: "hard",   title: "web09 — XXE Out-of-Band",         points: P.hard,   notes: "Exfiltration de fichiers via XXE out-of-band sur un parser XML." },
  { category: "Web", difficulty: "insane", title: "web10 — Prototype Pollution RCE", points: P.insane, notes: "RCE via prototype pollution dans une app Node.js/Express." },

  // ── CRYPTO (1/1/2/0 = 4) ────────────────────────────────────────────────────
  { category: "Crypto", difficulty: "easy",   title: "crypto01 — Base64 Cascade",    points: P.easy,   notes: "Décodage multi-couches : Base64, ROT13, Hex." },
  { category: "Crypto", difficulty: "medium", title: "crypto02 — ECB Penguin",       points: P.medium, notes: "Exploitation du mode ECB pour révéler une image chiffrée." },
  { category: "Crypto", difficulty: "hard",   title: "crypto03 — RSA Low Exponent",  points: P.hard,   notes: "Attaque de Håstad sur RSA avec e=3 et plusieurs messages identiques." },
  { category: "Crypto", difficulty: "hard",   title: "crypto04 — Padding Oracle CBC", points: P.hard,  notes: "Oracle de padding CBC pour déchiffrer un token sans la clé." },

  // ── FORENSICS (3/5/3/1 = 12) ────────────────────────────────────────────────
  { category: "Forensics", difficulty: "easy",   title: "forensics01 — Metadata Hunt",       points: P.easy,   notes: "Extraction de données EXIF/XMP dans une image JPEG." },
  { category: "Forensics", difficulty: "easy",   title: "forensics02 — Strings & Secrets",   points: P.easy,   notes: "Récupération de secrets via la commande strings sur un binaire." },
  { category: "Forensics", difficulty: "easy",   title: "forensics03 — Zip Password",        points: P.easy,   notes: "Cassage d'une archive ZIP protégée par mot de passe faible." },
  { category: "Forensics", difficulty: "medium", title: "forensics04 — PCAP HTTP Flag",      points: P.medium, notes: "Analyse d'une capture réseau : extraction d'un flag dans du trafic HTTP." },
  { category: "Forensics", difficulty: "medium", title: "forensics05 — Steghide JPEG",       points: P.medium, notes: "Extraction d'un fichier caché dans une image JPEG via steghide." },
  { category: "Forensics", difficulty: "medium", title: "forensics06 — Memory Dump Basics",  points: P.medium, notes: "Analyse de dump mémoire Volatility : processus suspects et clés de registre." },
  { category: "Forensics", difficulty: "medium", title: "forensics07 — USB Capture",         points: P.medium, notes: "Reconstitution de frappes clavier à partir d'une capture USB HID." },
  { category: "Forensics", difficulty: "medium", title: "forensics08 — Log Analysis SOC",    points: P.medium, notes: "Investigation sur des logs Apache/auth.log pour reconstituer une attaque." },
  { category: "Forensics", difficulty: "hard",   title: "forensics09 — Disk Image Carving",  points: P.hard,   notes: "Récupération de fichiers supprimés sur une image disque ext4." },
  { category: "Forensics", difficulty: "hard",   title: "forensics10 — PCAP TLS Decrypt",    points: P.hard,   notes: "Déchiffrement TLS avec clé de session exportée, extraction d'artifact." },
  { category: "Forensics", difficulty: "hard",   title: "forensics11 — Office Macro",        points: P.hard,   notes: "Analyse d'un document Office malveillant avec macro VBA obfusquée." },
  { category: "Forensics", difficulty: "insane", title: "forensics12 — APT Timeline",        points: P.insane, notes: "Reconstruction complète d'une intrusion APT à partir d'artefacts multi-sources." },

  // ── REVERSE (1/1/1/1 = 4) ───────────────────────────────────────────────────
  { category: "Reverse", difficulty: "easy",   title: "reverse01 — Crackme Baby",      points: P.easy,   notes: "Analyse statique d'un crackme simple : comparaison de chaîne en clair." },
  { category: "Reverse", difficulty: "medium", title: "reverse02 — Anti-Debug Tricks", points: P.medium, notes: "Contournement de techniques anti-debug (IsDebuggerPresent, timing check)." },
  { category: "Reverse", difficulty: "hard",   title: "reverse03 — Custom VM",         points: P.hard,   notes: "Émulation d'une machine virtuelle custom pour extraire le flag." },
  { category: "Reverse", difficulty: "insane", title: "reverse04 — Packed Malware",    points: P.insane, notes: "Unpack dynamique d'un malware + analyse de son protocole C2 custom." },

  // ── PWN (0/2/2/0 = 4) ───────────────────────────────────────────────────────
  { category: "Pwn", difficulty: "medium", title: "pwn01 — Format String Leak", points: P.medium, notes: "Exploitation d'une format string pour lire des adresses sur le stack." },
  { category: "Pwn", difficulty: "medium", title: "pwn02 — Ret2win",            points: P.medium, notes: "Stack overflow classique : écrasement de l'adresse de retour vers win()." },
  { category: "Pwn", difficulty: "hard",   title: "pwn03 — ROP Chain x64",      points: P.hard,   notes: "Construction d'une ROP chain pour bypasser NX et obtenir un shell." },
  { category: "Pwn", difficulty: "hard",   title: "pwn04 — Heap UAF",           points: P.hard,   notes: "Use-After-Free sur le heap pour corrompre des structures de contrôle." },

  // ── OSINT (2/1/0/0 = 3) ─────────────────────────────────────────────────────
  { category: "OSINT", difficulty: "easy",   title: "osint01 — Metadata Geolocation", points: P.easy,   notes: "Géolocalisation d'une photo à partir de ses métadonnées et indices visuels." },
  { category: "OSINT", difficulty: "easy",   title: "osint02 — Social Footprint",     points: P.easy,   notes: "Reconstitution de l'empreinte numérique d'un pseudonyme sur les réseaux." },
  { category: "OSINT", difficulty: "medium", title: "osint03 — Corporate Recon",      points: P.medium, notes: "Cartographie d'une organisation fictive via sources ouvertes (DNS, leaks, RH)." },

  // ── MISC (1/2/0/0 = 3) ──────────────────────────────────────────────────────
  { category: "Misc", difficulty: "easy",   title: "misc01 — Sanity Check",        points: P.easy,   notes: "Challenge d'accueil : trouver le flag dans la description / le scoreboard." },
  { category: "Misc", difficulty: "medium", title: "misc02 — Esoteric Encoding",   points: P.medium, notes: "Décodage d'un message encodé en langage ésotérique (Brainfuck / Ook!)." },
  { category: "Misc", difficulty: "medium", title: "misc03 — Python Jail Escape",  points: P.medium, notes: "Évasion d'un sandbox Python restreint pour exécuter une commande." },
];
