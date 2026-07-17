// ── EyesOpenCTF 2026 · "The Convergence" — challenge seed ────────────────────
// 40 Reality Fragments + 8 narrative Synthesis challenges.
//
// Category / difficulty distribution (40 fragments), aligned with the Lore Bible:
//   CRYPTO       Medium 1 · Hard 2 · Insane 1                      →  4
//   FORENSICS    Easy 2 · Medium 4 · Hard 4 · Insane 2             → 12
//   AI Security  Medium 2 · Hard 1        (replaces the old Misc)  →  3
//   OSINT        Easy 1 · Medium 1 · Hard 1                        →  3
//   PWN          Medium 1 · Hard 2 · Insane 1                      →  4
//   REVERSE      Medium 1 · Hard 2 · Insane 1                      →  4
//   WEB          Easy 1 · Medium 3 · Hard 4 · Insane 2             → 10
//                                                          Total:    40
//
// The seven Insane challenges are Prime Seals. Each structuring challenge is tagged
// with the Revelation arc(s) it advances (see docs/ctf-doc analyse.txt §2). The 8
// Synthesis challenges conclude each arc and are gated (CTFd `requirements`) on the
// fragments of their block — they are ready to publish to CTFd as-is.
//
// Everything here is a starting point: titles, tags, prerequisites, success messages
// and flags are all editable from the admin CTF panel.

export interface ChallengeSpec {
  title: string;
  category: string;
  difficulty: "easy" | "medium" | "hard" | "insane";
  points: number;
  fragmentCode?: string;    // Reality Fragment id, e.g. "F-01" (omitted for synthesis)
  revelation?: string;      // Revelation arc(s) advanced, comma-separated e.g. "2,4"
  isPrimeSeal?: boolean;
  isSynthesis?: boolean;
  prerequisites?: string;   // Synthesis only: required fragment codes, comma-separated
  successMessage?: string;  // "MESSAGE DE REUSSITE" shown on solve
  flag?: string;            // CTFd static flag (synthesis carries a fixed ack flag)
  notes?: string;           // Mission brief + suggested technique (editable)
}

export const CTF_POINTS: Record<string, number> = {
  easy: 100,
  medium: 250,
  hard: 400,
  insane: 600,
};

const P = CTF_POINTS;

// ── The 40 Reality Fragments ─────────────────────────────────────────────────
export const CTF_SEED_CHALLENGES: ChallengeSpec[] = [
  // ── CRYPTO / THE CIPHER LAYER (F-01 → F-04) ────────────────────────────────
  { category: "Crypto", difficulty: "medium", title: "crypto01 — The Frozen Skyline", points: P.medium,
    fragmentCode: "F-01", revelation: "1",
    successMessage: "The image does not show one city. It shows two cities occupying the same coordinates.",
    notes: "Visual Phase Map. Image de surveillance chiffrée arrivée depuis Douala-7 : deux versions de la ville superposées. Technique suggérée : mode ECB (ECB penguin)." },
  { category: "Crypto", difficulty: "hard", title: "crypto02 — The Low Beacon", points: P.hard,
    fragmentCode: "F-02", revelation: "7",
    successMessage: "The first Gate opened at 23:48 UTC. Assa sent this message three days after her disappearance.",
    notes: "First Gate Timestamp. Relais satellitaire réémettant 87 s un message signé Assa Abene, horodaté après sa disparition. Technique suggérée : RSA à faible exposant (Håstad)." },
  { category: "Crypto", difficulty: "hard", title: "crypto03 — The Glass Ledger", points: P.hard,
    fragmentCode: "F-03", revelation: "2,4",
    successMessage: "The city never financed a monument repair. It financed an underground containment chamber.",
    notes: "Subterranean Construction Ledger. Registre financier du Directorate masquant la vraie destination des fonds sous Deido. Technique suggérée : padding oracle CBC." },
  { category: "Crypto", difficulty: "insane", title: "crypto04 — The Root Key", points: P.insane,
    fragmentCode: "F-04", revelation: "2,8", isPrimeSeal: true,
    successMessage: "PRIME SEAL I RECOVERED. The key is older than every human cryptographic system. The Anchor was already waiting before the monument existed.",
    notes: "Prime Seal I · Origin Vector. Échange racine de l'Anchor négociant avec une autorité non humaine. Technique suggérée : Bleichenbacher (oracle PKCS#1 v1.5)." },

  // ── FORENSICS / THE MEMORY LAYER (F-05 → F-16) ─────────────────────────────
  { category: "Forensics", difficulty: "easy", title: "forensics01 — The First Photograph", points: P.easy,
    fragmentCode: "F-05", revelation: "2",
    successMessage: "The photograph was taken thirty-two metres beneath Deido.",
    notes: "Hidden Access Coordinate. Photo de maintenance de Samuel Mboa devant une porte hors plan. Technique suggérée : métadonnées EXIF/XMP." },
  { category: "Forensics", difficulty: "easy", title: "forensics02 — The Last Warning", points: P.easy,
    fragmentCode: "F-06", revelation: "",
    successMessage: "“If you can read this, history has already been edited.”",
    notes: "Mboa Warning. Exécutable de diagnostic abandonné contenant une note personnelle cachée. Technique suggérée : strings sur binaire." },
  { category: "Forensics", difficulty: "medium", title: "forensics03 — Cleartext Echo", points: P.medium,
    fragmentCode: "F-07", revelation: "",
    successMessage: "The signal entered the public network through Port Aurora Exchange.",
    notes: "Port Aurora Node Identifier. Capture HTTP : première transmission publique d'une Digital Gate. Technique suggérée : analyse PCAP HTTP." },
  { category: "Forensics", difficulty: "medium", title: "forensics04 — The Hidden Blueprint", points: P.medium,
    fragmentCode: "F-08", revelation: "2",
    successMessage: "The visible monument represents less than eight percent of the complete structure.",
    notes: "Anchor Chamber Blueprint. Photo institutionnelle du monument cachant les plans des chambres. Technique suggérée : stéganographie steghide (JPEG)." },
  { category: "Forensics", difficulty: "medium", title: "forensics05 — Memory of Janus", points: P.medium,
    fragmentCode: "F-09", revelation: "3",
    successMessage: "Meridian did not discover the first Gate. It opened it.",
    notes: "Janus Activation Note. Dump mémoire d'un poste Meridian : restes d'une réunion confidentielle. Technique suggérée : analyse mémoire (Volatility)." },
  { category: "Forensics", difficulty: "medium", title: "forensics06 — The Courier's List", points: P.medium,
    fragmentCode: "F-10", revelation: "7",
    successMessage: "Forty artifacts were catalogued. The Protocol expected this competition before the signal appeared.",
    notes: "Forty-Artifact Manifest. Capture USB d'un agent du Directorate synchronisant un inventaire classifié. Technique suggérée : reconstitution de capture USB HID." },
  { category: "Forensics", difficulty: "hard", title: "forensics07 — Assa's Burned Drive", points: P.hard,
    fragmentCode: "F-11", revelation: "1",
    successMessage: "“The Fragments are not copies of information. They are pieces of the realities themselves.”",
    notes: "Assa Field Journal. Image disque partiellement détruite d'un labo secondaire d'Assa. Technique suggérée : carving sur image disque ext4." },
  { category: "Forensics", difficulty: "hard", title: "forensics08 — The Secret Agreement", points: P.hard,
    fragmentCode: "F-12", revelation: "3,4",
    successMessage: "The Directorate concealed the Anchor. Meridian convinced them to activate it.",
    notes: "Continuity–Meridian Agreement. Trafic chiffré intercepté d'une négociation d'accès. Technique suggérée : déchiffrement TLS avec clé de session." },
  { category: "Forensics", difficulty: "hard", title: "forensics09 — The Office of Silence", points: P.hard,
    fragmentCode: "F-13", revelation: "6",
    successMessage: "The attack did not steal files. It inserted memories that none of the employees had lived.",
    notes: "Null Choir Entry Point. Document interne contaminé propageant une présence inconnue. Technique suggérée : analyse de macro VBA obfusquée (Office)." },
  { category: "Forensics", difficulty: "hard", title: "forensics10 — Seven Missing Minutes", points: P.hard,
    fragmentCode: "F-14", revelation: "1",
    successMessage: "For seven minutes, Port Aurora existed simultaneously in three realities.",
    notes: "Gate Activation Sequence. Logs de sécurité avec une lacune identique de sept minutes. Technique suggérée : corrélation de logs SOC." },
  { category: "Forensics", difficulty: "insane", title: "forensics11 — The Compression Event", points: P.insane,
    fragmentCode: "F-15", revelation: "1,8", isPrimeSeal: true,
    successMessage: "PRIME SEAL II RECOVERED. This was not encryption. It was a rehearsal for merging realities.",
    notes: "Prime Seal II · Entropy Pattern. Pseudo-ransomware compressant plusieurs versions d'un même fichier. Technique suggérée : triage ransomware / analyse d'entropie." },
  { category: "Forensics", difficulty: "insane", title: "forensics12 — The Long Convergence", points: P.insane,
    fragmentCode: "F-16", revelation: "8", isPrimeSeal: true,
    successMessage: "PRIME SEAL III RECOVERED. The operation began before Meridian existed. Someone has been preparing the Convergence for decades.",
    notes: "Prime Seal III · Convergence Schedule. Ensemble multi-source révélant le calendrier réel de la collision. Technique suggérée : reconstruction de timeline APT multi-sources." },

  // ── AI SECURITY / THE ORACLE LAYER (F-17 → F-19) — replaces Misc ────────────
  { category: "AI Security", difficulty: "medium", title: "ai01 — The Forbidden Instruction", points: P.medium,
    fragmentCode: "F-17", revelation: "7",
    successMessage: "“Watcher” is not a person’s name. It is an operational designation.",
    notes: "Watcher Designation Record. NORA-7 dissimule un souvenir classifié derrière des instructions contradictoires. Technique suggérée : prompt injection multi-couches." },
  { category: "AI Security", difficulty: "medium", title: "ai02 — The False History", points: P.medium,
    fragmentCode: "F-18", revelation: "4",
    successMessage: "The official account was inserted into every archive on the same night.",
    notes: "Authentic Deido Record. Base documentaire de NORA-7 contaminée par de faux récits. Technique suggérée : distinguer mémoire authentique vs empoisonnée (RAG poisoning)." },
  { category: "AI Security", difficulty: "hard", title: "ai03 — Permission to Open", points: P.hard,
    fragmentCode: "F-19", revelation: "6",
    successMessage: "The Null Choir does not need access to the Anchor. It only needs an agent willing to operate it.",
    notes: "Custodian Control Policy. Agent autonome à outils recevant des ordres contradictoires. Technique suggérée : abus d'un agent LLM connecté à des outils." },

  // ── OSINT / THE SURFACE LAYER (F-20 → F-22) ────────────────────────────────
  { category: "OSINT", difficulty: "easy", title: "osint01 — The Unmarked Entrance", points: P.easy,
    fragmentCode: "F-20", revelation: "",
    successMessage: "The entrance has no address, but it has never stopped being used.",
    notes: "Deido Service Entrance. Photo publique anodine révélant un accès secondaire. Technique suggérée : géolocalisation par indices visuels + métadonnées." },
  { category: "OSINT", difficulty: "medium", title: "osint02 — Meridian's Shadow", points: P.medium,
    fragmentCode: "F-21", revelation: "3",
    successMessage: "Meridian owns an offshore relay that officially does not exist.",
    notes: "Black Reef Ownership Chain. Filiales et sociétés-écrans reliées à une installation offshore. Technique suggérée : reconnaissance corporative (registres, DNS, chaîne de propriété)." },
  { category: "OSINT", difficulty: "hard", title: "osint03 — The Fragment Market", points: P.hard,
    fragmentCode: "F-22", revelation: "6",
    successMessage: "Orpheus-0 is not selling stolen data. He is selling alternate histories.",
    notes: "Orpheus Exchange Route. Vendeur clandestin “Orpheus-0” proposant des souvenirs de vies non vécues. Technique suggérée : traçage d'identité sur forums / dark web." },

  // ── PWN / THE CONTROL LAYER (F-23 → F-26) ──────────────────────────────────
  { category: "Pwn", difficulty: "medium", title: "pwn01 — The Leaking Console", points: P.medium,
    fragmentCode: "F-23", revelation: "5",
    successMessage: "Gate 12 is drifting toward Douala-Prime.",
    notes: "Gate Phase Offset. Console de diagnostic Meridian laissant fuiter son état interne. Technique suggérée : format string leak." },
  { category: "Pwn", difficulty: "hard", title: "pwn02 — Borrowed Instructions", points: P.hard,
    fragmentCode: "F-24", revelation: "5",
    successMessage: "Meridian’s controller is only imitating instructions produced by the Anchor.",
    notes: "Gate Control Sequence. Contrôleur assemblant des composants anciens sans en comprendre la fonction. Technique suggérée : ROP chain x64." },
  { category: "Pwn", difficulty: "hard", title: "pwn03 — The Old Failsafe", points: P.hard,
    fragmentCode: "F-25", revelation: "5",
    successMessage: "The Gate can be stopped, but the closure command must come from inside its own process.",
    notes: "Emergency Closure Primitive. Nœud de secours dont l'arrêt d'urgence exige d'agir depuis le processus lui-même. Technique suggérée : ret2libc." },
  { category: "Pwn", difficulty: "insane", title: "pwn04 — Dead Memory", points: P.insane,
    fragmentCode: "F-26", revelation: "5,8", isPrimeSeal: true,
    successMessage: "PRIME SEAL IV RECOVERED. Digital Gates are not natural phenomena. Reality itself is being executed like software.",
    notes: "Prime Seal IV · Execution Kernel. Le noyau de l'Anchor référence des espaces de réalités détruites. Technique suggérée : Use-After-Free (heap)." },

  // ── REVERSE / THE MACHINE LAYER (F-27 → F-30) ──────────────────────────────
  { category: "Reverse", difficulty: "medium", title: "reverse01 — The Observer Test", points: P.medium,
    fragmentCode: "F-27", revelation: "4",
    successMessage: "The message was designed for someone who knew how not to look at it.",
    notes: "Directorate Authentication Seal. Binaire de messagerie refusant de fonctionner sous observation. Technique suggérée : contournement anti-debug." },
  { category: "Reverse", difficulty: "hard", title: "reverse02 — The Architects' Language", points: P.hard,
    fragmentCode: "F-28", revelation: "5",
    successMessage: "The Architects did not program computers. They programmed relationships between realities.",
    notes: "Architect Instruction Set. Interpréteur non standard récupéré dans une chambre de l'Anchor. Technique suggérée : émulation d'une VM custom." },
  { category: "Reverse", difficulty: "hard", title: "reverse03 — Assa's Maze", points: P.hard,
    fragmentCode: "F-29", revelation: "7",
    successMessage: "A Watcher is chosen only after the previous one disappears inside the Anchor.",
    notes: "Watcher Succession Protocol. Outil labyrinthique d'Assa cachant les règles de succession du Watcher. Technique suggérée : déobfuscation Python multi-couches." },
  { category: "Reverse", difficulty: "insane", title: "reverse04 — The Choir Seed", points: P.insane,
    fragmentCode: "F-30", revelation: "6,8", isPrimeSeal: true,
    successMessage: "PRIME SEAL V RECOVERED. The Null Choir is not attacking our world. It is trying to be born inside it.",
    notes: "Prime Seal V · Null Voiceprint. Malware multicouche abritant une structure consciente distribuée. Technique suggérée : unpacking dynamique + analyse C2." },

  // ── WEB / THE GATEWAY LAYER (F-31 → F-40) ──────────────────────────────────
  { category: "Web", difficulty: "easy", title: "web01 — The Forgotten Session", points: P.easy,
    fragmentCode: "F-31", revelation: "",
    successMessage: "The conference was always more than a public event.",
    notes: "Protocol Session Marker. Portail EOCON archivé conservant la session d'un ancien opérateur. Technique suggérée : analyse de cookie / session archivée." },
  { category: "Web", difficulty: "medium", title: "web02 — The Abandoned Reception", points: P.medium,
    fragmentCode: "F-32", revelation: "3",
    successMessage: "Meridian recorded the first collision as a successful experiment.",
    notes: "Janus Incident Report. Ancien portail employé Meridian encore accessible. Technique suggérée : contournement d'authentification (SQLi login bypass)." },
  { category: "Web", difficulty: "medium", title: "web03 — Borrowed Identities", points: P.medium,
    fragmentCode: "F-33", revelation: "1,6",
    successMessage: "Three employees share one face. Only one belongs to this reality.",
    notes: "Duplicate Identity Index. Registre de profils : mêmes visages, histoires différentes. Technique suggérée : IDOR sur endpoint de profils." },
  { category: "Web", difficulty: "medium", title: "web04 — The Reflected Warning", points: P.medium,
    fragmentCode: "F-34", revelation: "6",
    successMessage: "“Do not open the Anchor. We already made that mistake.”",
    notes: "Douala-7 Distress Message. Panneau d'alerte municipal reflétant une transmission de Douala-7. Technique suggérée : XSS réfléchie." },
  { category: "Web", difficulty: "hard", title: "web05 — Inside Meridian", points: P.hard,
    fragmentCode: "F-35", revelation: "3",
    successMessage: "Nine Gates are controlled from Meridian Tower. The remaining Gates answer to no human system.",
    notes: "Internal Gate Topology. Service interne non documenté conservant la topologie de Project Janus. Technique suggérée : SSRF vers services internes." },
  { category: "Web", difficulty: "hard", title: "web06 — The False Guardian", points: P.hard,
    fragmentCode: "F-36", revelation: "7",
    successMessage: "Someone has been issuing commands using the Watcher’s identity.",
    notes: "Cloned Watcher Credential. Passerelle d'identité contenant un Watcher fantôme aux commandes valides. Technique suggérée : confusion d'algorithme JWT (RS256→HS256)." },
  { category: "Web", difficulty: "hard", title: "web07 — The Buried Archive", points: P.hard,
    fragmentCode: "F-37", revelation: "2",
    successMessage: "The underground structure appears on maps created before the visible monument was built.",
    notes: "Original Foundation Record. Service d'import relié aux archives d'avant la réécriture du Directorate. Technique suggérée : XXE out-of-band." },
  { category: "Web", difficulty: "hard", title: "web08 — The Maintenance Path", points: P.hard,
    fragmentCode: "F-38", revelation: "2,4",
    successMessage: "The Anchor has been recalibrated every year. The Directorate knew the Gates were returning.",
    notes: "Anchor Calibration Notes. Console de maintenance exposant des calibrations annuelles hors inventaire. Technique suggérée : path traversal → RCE." },
  { category: "Web", difficulty: "insane", title: "web09 — The Control Graph", points: P.insane,
    fragmentCode: "F-39", revelation: "3,8", isPrimeSeal: true,
    successMessage: "PRIME SEAL VI RECOVERED. Meridian did not accidentally open the Gates. The activation was approved.",
    notes: "Prime Seal VI · Control Graph. Orchestrateur de Project Janus reliant applications, agents et contrôleurs. Technique suggérée : prototype pollution → RCE." },
  { category: "Web", difficulty: "insane", title: "web10 — The Graph of Worlds", points: P.insane,
    fragmentCode: "F-40", revelation: "8", isPrimeSeal: true,
    successMessage: "PRIME SEAL VII RECOVERED. Every Gate has been located. All paths converge beneath Deido.",
    notes: "Prime Seal VII · Master Topology. Graphe de continuité du Directorate reliant toutes les Gates connues. Technique suggérée : chaîne GraphQL (introspection, batching, IDOR imbriqué)." },
];

// ── The 8 Synthesis challenges — one per Revelation arc ───────────────────────
// Each concludes an arc. Prerequisites are the fragments of the block (CTFd
// `requirements`): the challenge only becomes visible once a team has solved them
// all. Points 0 (narrative, no scoreboard distortion — editable). The flag is a
// fixed acknowledgement string revealed once the block is complete.
export const CTF_SEED_SYNTHESIS: ChallengeSpec[] = [
  { category: "Synthesis", difficulty: "medium", title: "synthesis01 — Two Cities, One Coordinate", points: 0,
    isSynthesis: true, revelation: "1", prerequisites: "F-01,F-11,F-14,F-15,F-33",
    flag: "EOCON{synthesis_fragments_are_real}",
    successMessage: "Multiple records now confirm it: the Fragments are not copied data. They are pieces of other realities, pulled into ours.",
    notes: "Transmission de synthèse — Arc 1. Débloquée quand une équipe a récupéré F-01, F-11, F-14, F-15, F-33." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis02 — Beneath the Monument", points: 0,
    isSynthesis: true, revelation: "2", prerequisites: "F-03,F-04,F-05,F-08,F-37,F-38",
    flag: "EOCON{synthesis_monument_is_a_cover}",
    successMessage: "The monument was never built to remember the past. It was built to hide and contain the structure beneath Deido.",
    notes: "Transmission de synthèse — Arc 2. Débloquée quand une équipe a récupéré F-03, F-04, F-05, F-08, F-37, F-38." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis03 — Who Opened the Door", points: 0,
    isSynthesis: true, revelation: "3", prerequisites: "F-09,F-12,F-21,F-32,F-35,F-39",
    flag: "EOCON{synthesis_meridian_opened_it}",
    successMessage: "Three independent records confirm the same event. Meridian did not discover the first Gate. It opened it.",
    notes: "Transmission de synthèse — Arc 3. Débloquée quand une équipe a récupéré F-09, F-12, F-21, F-32, F-35, F-39." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis04 — The Convenient Silence", points: 0,
    isSynthesis: true, revelation: "4", prerequisites: "F-03,F-12,F-18,F-27,F-38",
    flag: "EOCON{synthesis_control_became_complicity}",
    successMessage: "The Directorate meant to protect reality. Its need for control is what let Meridian reach the Anchor.",
    notes: "Transmission de synthèse — Arc 4. Débloquée quand une équipe a récupéré F-03, F-12, F-18, F-27, F-38." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis05 — Reality as Software", points: 0,
    isSynthesis: true, revelation: "5", prerequisites: "F-23,F-24,F-25,F-26,F-28",
    flag: "EOCON{synthesis_reality_is_executed}",
    successMessage: "The Gates have states, phases and instructions. The Convergence is not a natural phenomenon. Reality is being executed like a system.",
    notes: "Transmission de synthèse — Arc 5. Débloquée quand une équipe a récupéré F-23, F-24, F-25, F-26, F-28." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis06 — A Reason to Return", points: 0,
    isSynthesis: true, revelation: "6", prerequisites: "F-13,F-19,F-22,F-30,F-33,F-34",
    flag: "EOCON{synthesis_convergence_is_resurrection}",
    successMessage: "The distributed intelligence is made of a destroyed reality's memories. It does not see the Convergence as an invasion, but as a resurrection.",
    notes: "Transmission de synthèse — Arc 6. Débloquée quand une équipe a récupéré F-13, F-19, F-22, F-30, F-33, F-34." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis07 — The Compromised Command", points: 0,
    isSynthesis: true, revelation: "7", prerequisites: "F-02,F-10,F-17,F-29,F-36",
    flag: "EOCON{synthesis_watcher_compromised}",
    successMessage: "The Protocol anticipated this operation — but its command is no longer certain. Some Watcher-signed instructions may not come from the Watcher.",
    notes: "Transmission de synthèse — Arc 7. Débloquée quand une équipe a récupéré F-02, F-10, F-17, F-29, F-36." },
  { category: "Synthesis", difficulty: "medium", title: "synthesis08 — The Seven Seals", points: 0,
    isSynthesis: true, revelation: "8", prerequisites: "F-04,F-15,F-16,F-26,F-30,F-39,F-40",
    flag: "EOCON{synthesis_codex_authenticates_closure}",
    successMessage: "The Prime Seals authenticate the Codex itself. Only they can tell the true closure sequence from a forged one. All paths converge beneath Deido.",
    notes: "Transmission de synthèse — Arc 8 (les 7 Prime Seals). Débloquée quand une équipe a récupéré F-04, F-15, F-16, F-26, F-30, F-39, F-40." },
];

// Full seed = 40 fragments + 8 synthesis challenges.
export const CTF_SEED_ALL: ChallengeSpec[] = [...CTF_SEED_CHALLENGES, ...CTF_SEED_SYNTHESIS];
