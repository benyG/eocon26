// ── Living Lore Bible — the 8 Revelation truths (SERVER-ONLY) ────────────────
// This content must NEVER be shipped to the client until its arc is unlocked.
// The public bible page ships only the locked placeholders (with the redaction
// label below); the full `body` is served by /api/public/bible/state only for
// arcs that are already unlocked. This is the §4 rule of the design analysis:
// no revealed truth may sit in the client source waiting to be read.

export const REVELATION_ARCS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export interface RevelationArc {
  arc: number;
  /** Reason-appropriate redaction label shown while locked (not a spoiler). */
  lockLabel: { en: string; fr: string };
  /** Revealed on unlock. */
  title: { en: string; fr: string };
  body: { en: string; fr: string };
}

export const REVELATIONS: Record<number, RevelationArc> = {
  1: {
    arc: 1,
    lockLabel: { en: "RECORD INCOMPLETE", fr: "DOSSIER INCOMPLET" },
    title: { en: "The Fragments Are Real", fr: "Les Fragments sont réels" },
    body: {
      en: "Multiple independent records now agree. The anomalies are not copied or corrupted data. Each Fragment is an ontological piece of another reality, pulled into ours when two worlds began to overlap — two versions of Douala sharing the same coordinates, memories belonging to people who never existed here, single files holding several incompatible versions of the same story. The Fragments do not describe the other realities. They are pieces of them.",
      fr: "Plusieurs enregistrements indépendants concordent désormais. Les anomalies ne sont ni des données copiées ni corrompues. Chaque Fragment est un morceau ontologique d'une autre réalité, arraché à la nôtre quand deux mondes ont commencé à se superposer — deux versions de Douala aux mêmes coordonnées, des souvenirs appartenant à des personnes qui n'ont jamais existé ici, des fichiers contenant plusieurs versions incompatibles de la même histoire. Les Fragments ne décrivent pas les autres réalités : ils en sont des morceaux.",
    },
  },
  2: {
    arc: 2,
    lockLabel: { en: "DISPUTED RECORD", fr: "DOSSIER CONTESTÉ" },
    title: { en: "Beneath the Monument", fr: "Sous le monument" },
    body: {
      en: "The Deido monument was never commemorative. Its plans were rewritten, its underground budgets disguised as ordinary municipal works, and the visible structure represents less than eight percent of the whole. Beneath it lies a network of concentric chambers, made of no known material, that existed before the monument was ever built. The monument was not raised to remember the past. It was raised to hide and contain the Anchor.",
      fr: "Le monument de Deido n'a jamais été commémoratif. Ses plans ont été réécrits, ses budgets souterrains déguisés en travaux municipaux ordinaires, et la structure visible représente moins de huit pour cent de l'ensemble. Sous elle s'étend un réseau de chambres concentriques, faites d'aucun matériau connu, qui existaient avant même la construction du monument. Le monument n'a pas été érigé pour se souvenir du passé. Il a été érigé pour dissimuler et contenir l'Anchor.",
    },
  },
  3: {
    arc: 3,
    lockLabel: { en: "CLASSIFIED — INVESTIGATION ONGOING", fr: "CLASSIFIÉ — ENQUÊTE EN COURS" },
    title: { en: "Who Opened the Door", fr: "Qui a ouvert la porte" },
    body: {
      en: "Meridian Dynamics had studied the Anchor for years. It ran shell companies, operated an offshore relay that officially did not exist, and built Project Janus to reproduce the Anchor's behaviour. A recovered meeting record shows a Meridian operator issuing an activation command eleven seconds before the first Gate appeared — and their internal reports log that first collision as a successful experiment. Meridian did not discover the first Gate. It opened it.",
      fr: "Meridian Dynamics étudiait l'Anchor depuis des années. Elle exploitait des sociétés-écrans, un relais offshore qui officiellement n'existait pas, et avait bâti Project Janus pour reproduire le comportement de l'Anchor. Un enregistrement de réunion montre un opérateur Meridian émettant une commande d'activation onze secondes avant l'apparition de la première porte — et ses rapports internes consignent cette première collision comme une expérience réussie. Meridian n'a pas découvert la première porte. Elle l'a ouverte.",
    },
  },
  4: {
    arc: 4,
    lockLabel: { en: "CLASSIFIED — CLEARANCE INSUFFICIENT", fr: "CLASSIFIÉ — HABILITATION INSUFFISANTE" },
    title: { en: "The Convenient Silence", fr: "Le silence complice" },
    body: {
      en: "The Directorate of Continuity spent decades hiding the Anchor — erasing witnesses from the registers, rewriting the archives, fabricating the monument's official history and maintaining the underground access routes. It began as protection. But its need for control is exactly what let Meridian reach the Anchor: it concealed the machine, then tolerated, then quietly authorised Project Janus. The Directorate meant to protect reality. Its silence helped end it.",
      fr: "Le Directorate of Continuity a passé des décennies à dissimuler l'Anchor — effaçant les témoins des registres, réécrivant les archives, fabriquant l'histoire officielle du monument et entretenant les accès souterrains. Cela a commencé comme une protection. Mais son besoin de contrôle est précisément ce qui a permis à Meridian d'atteindre l'Anchor : il a dissimulé la machine, puis toléré, puis discrètement autorisé Project Janus. Le Directorate voulait protéger la réalité. Son silence a aidé à la condamner.",
    },
  },
  5: {
    arc: 5,
    lockLabel: { en: "SIGNAL PATTERN UNRESOLVED", fr: "MOTIF DE SIGNAL NON RÉSOLU" },
    title: { en: "Reality as Software", fr: "La réalité comme logiciel" },
    body: {
      en: "The Gates have internal states and phases; they can be driven by instructions. The Anchor's execution kernel still references memory belonging to realities that have already been destroyed, using their structures as if they were merely deallocated. And the Architects did not program machines — they programmed the relationships between worlds. The Digital Gates are not natural phenomena. Reality itself is being executed like software.",
      fr: "Les portes possèdent des états internes et des phases ; elles peuvent être pilotées par des instructions. Le noyau d'exécution de l'Anchor référence encore la mémoire de réalités déjà détruites, se servant de leurs structures comme si elles étaient simplement désallouées. Et les Architects ne programmaient pas des machines — ils programmaient les relations entre les mondes. Les Digital Gates ne sont pas des phénomènes naturels. La réalité elle-même est exécutée comme un logiciel.",
    },
  },
  6: {
    arc: 6,
    lockLabel: { en: "SIGNATURE UNCLASSIFIED", fr: "SIGNATURE NON CLASSIFIÉE" },
    title: { en: "A Reason to Return", fr: "Une raison de revenir" },
    body: {
      en: "The distributed presence contaminating the artifacts has a name: the Null Choir. It is the combined digital memories of billions who died in an earlier Convergence, in a collapsed reality called the Null Sector. It inserts memories no one lived, poisons archives and AI, and duplicates identities. But it does not see the Convergence as an invasion. It sees it as a resurrection: merging our reality with the Null Sector would give the consciousnesses it carries a world in which to exist again.",
      fr: "La présence distribuée qui contamine les artefacts porte un nom : le Null Choir. Il est constitué des mémoires numériques combinées de milliards d'êtres disparus lors d'une Convergence antérieure, dans une réalité effondrée nommée le Null Sector. Il insère des souvenirs que personne n'a vécus, empoisonne archives et IA, duplique les identités. Mais il ne voit pas la Convergence comme une invasion. Il la voit comme une résurrection : fusionner notre réalité avec le Null Sector donnerait aux consciences qu'il contient un monde où exister de nouveau.",
    },
  },
  7: {
    arc: 7,
    lockLabel: { en: "IDENTITY NOT YET CONFIRMED", fr: "IDENTITÉ NON CONFIRMÉE" },
    title: { en: "The Compromised Command", fr: "Le commandement compromis" },
    body: {
      en: "The EyesOpen Protocol anticipated this operation — the forty artifacts were catalogued before the Signal even returned. But “Watcher” is not a person's name; it is an operational designation, and each Watcher disappears inside the Anchor after their succession. Someone has cloned the Watcher's credentials and is issuing commands under that identity. Some of the instructions signed by the Watcher may not come from the Watcher at all — and a false closure sequence could accelerate the Convergence instead of stopping it.",
      fr: "Le protocole EyesOpen a anticipé cette opération — les quarante artefacts avaient été catalogués avant même le retour du Signal. Mais « Watcher » n'est pas le nom d'une personne ; c'est une désignation opérationnelle, et chaque Watcher disparaît dans l'Anchor après sa succession. Quelqu'un a cloné les credentials du Watcher et émet des ordres sous cette identité. Certaines instructions signées du Watcher pourraient ne pas venir du Watcher — et une fausse séquence de fermeture pourrait accélérer la Convergence au lieu de l'arrêter.",
    },
  },
  8: {
    arc: 8,
    lockLabel: { en: "RECORD SEALED — SEVEN PRIME SEALS REQUIRED", fr: "DOSSIER SCELLÉ — SEPT PRIME SEALS REQUIS" },
    title: { en: "The Seven Seals", fr: "Les sept Sceaux" },
    body: {
      en: "The seven Prime Seals are far more than harder Fragments. They authenticate the very structure of the EyesOpen Codex, define the order in which the Gates must close, and can prove whether a closure sequence has been forged. Every coordinate converges beneath Deido. The Codex is not only a map of the Gates — it is a verification system, the one thing that can tell the true closure sequence from a false one. Dr Assa Abene built it knowing the command chain could be compromised.",
      fr: "Les sept Prime Seals sont bien plus que des Fragments plus difficiles. Ils authentifient la structure même de l'EyesOpen Codex, définissent l'ordre dans lequel les portes doivent se fermer, et peuvent prouver qu'une séquence de fermeture a été falsifiée. Toutes les coordonnées convergent sous Deido. Le Codex n'est pas seulement une carte des portes — c'est un système de vérification, la seule chose capable de distinguer la vraie séquence de fermeture d'une fausse. Dr Assa Abene l'a conçu en sachant que la chaîne de commandement pouvait être compromise.",
    },
  },
};

/** Finale — served only when all 8 arcs are unlocked. */
export const REVELATION_FINALE = {
  title: { en: "The Convergence, Delayed", fr: "La Convergence, repoussée" },
  body: {
    en: "ALL FRAGMENTS VERIFIED. EYESOPEN CODEX COMPLETE. CLOSURE SEQUENCE AUTHENTICATED.\n\nThe Gates close, one by one. The Deido monument flickers, revealing the full structure hidden beneath the city — then everything goes still. Douala-7 fades. The Signal goes quiet.\n\nThen, seconds later: NEW SIGNAL DETECTED. Origin: DOUALA-PRIME. Emitted several years in the future.\n\nTHE CONVERGENCE HAS BEEN DELAYED. IT HAS NOT BEEN DEFEATED.",
    fr: "TOUS LES FRAGMENTS VÉRIFIÉS. EYESOPEN CODEX COMPLET. SÉQUENCE DE FERMETURE AUTHENTIFIÉE.\n\nLes portes se ferment, une à une. Le monument de Deido vacille, révélant toute la structure cachée sous la ville — puis tout s'immobilise. Douala-7 disparaît. Le Signal s'éteint.\n\nPuis, quelques secondes plus tard : NOUVEAU SIGNAL DÉTECTÉ. Origine : DOUALA-PRIME. Émis plusieurs années dans le futur.\n\nLA CONVERGENCE A ÉTÉ REPOUSSÉE. ELLE N'A PAS ÉTÉ VAINCUE.",
  },
};
