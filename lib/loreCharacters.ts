// ── Key characters — launch presentation (SERVER-ONLY reveals) ───────────────
// A curated character intro shown on the public briefing right after the world
// framing. Four characters are visible at launch; the fifth (the engineer) stays
// locked. Voss's card escalates and the engineer's identity is recovered only as
// the matching Fragments are authenticated on CTFd — the escalated status text,
// the red reveal and the real identity are never sent before they are earned.
//
// Each card leads with what the character IS TO THE OPERATOR (the `role`
// subtitle), per the briefing design.

type Bi = { en: string; fr: string };
export type CharacterTone = "green" | "amber" | "red" | "locked";

export interface CharacterCard {
  key: string;
  name: Bi;
  role: Bi;                                   // subtitle: what they represent for the Operator
  status: Bi;
  statusAlt?: Bi;                             // secondary status line (e.g. THREAT LEVEL // CRITICAL)
  tone: CharacterTone;
  body: Bi;
  alert?: Bi;                                 // escalation note — only present once earned
  portrait: "inline" | "gated" | null;        // inline: page ships it · gated: fetch when earned · null: locked
  locked: boolean;
}

const WATCHER: CharacterCard = {
  key: "watcher",
  name: { en: "The Watcher", fr: "The Watcher" },
  role: { en: "Your recruiter & operational authority", fr: "Votre recruteur et autorité opérationnelle" },
  status: { en: "ACTIVE // IDENTITY UNVERIFIED", fr: "ACTIVE // IDENTITY UNVERIFIED" },
  tone: "green",
  body: {
    en: "The Watcher recruited you as an Operator and coordinates your mission. They issue operational directives and authenticate the Fragments you recover.\n\nTheir identity, location and exact position within the EyesOpen Protocol remain unknown. Until further notice, transmissions carrying this signature are considered official.",
    fr: "The Watcher vous a recruté comme Operator et coordonne votre mission. Il vous transmet les directives opérationnelles et authentifie les Fragments que vous récupérez.\n\nSon identité, sa localisation et sa position exacte au sein du Protocole EyesOpen restent inconnues. Jusqu'à nouvel ordre, les transmissions portant sa signature sont considérées comme officielles.",
  },
  portrait: "inline",
  locked: false,
};

const ASSA: CharacterCard = {
  key: "assa",
  name: { en: "Dr Assa Abene", fr: "Dr Assa Abene" },
  role: { en: "Scientific source of the mission", fr: "Source scientifique de la mission" },
  status: { en: "MISSING // RESEARCH ACTIVE", fr: "MISSING // RESEARCH ACTIVE" },
  tone: "green",
  body: {
    en: "Dr Assa Abene founded the EyesOpen Protocol and was among the first researchers to identify anomalies that could not be linked to any known infrastructure.\n\nAlthough she is missing, her research still provides Operators with the methods required to analyze artifacts and interpret recovered Fragments.",
    fr: "Dr Assa Abene est la fondatrice du Protocole EyesOpen et l'une des premières chercheuses à avoir identifié des anomalies ne correspondant à aucune infrastructure connue.\n\nBien qu'elle soit portée disparue, ses travaux servent encore de référence aux Operators pour analyser les artefacts et comprendre les Fragments récupérés.",
  },
  portrait: "inline",
  locked: false,
};

const NORA: CharacterCard = {
  key: "nora",
  name: { en: "NORA-7", fr: "NORA-7" },
  role: { en: "Your analysis assistant & page interface", fr: "Votre assistante d'analyse et interface" },
  status: { en: "ONLINE // RESTRICTED ACCESS", fr: "ONLINE // RESTRICTED ACCESS" },
  tone: "green",
  body: {
    en: "NORA-7 is the artificial archivist of the EyesOpen Protocol. She analyzes artifacts submitted by Operators, verifies Fragment signatures and organizes discoveries within the EyesOpen Codex.\n\nShe assists you after each validation, although certain decisions still require human authorization.",
    fr: "NORA-7 est l'intelligence artificielle archiviste du Protocole EyesOpen. Elle analyse les artefacts soumis par les Operators, vérifie les signatures des Fragments et organise les découvertes dans l'EyesOpen Codex.\n\nElle vous accompagne après chaque validation, mais certaines décisions restent soumises à une autorisation humaine.",
  },
  portrait: "inline",
  locked: false,
};

const VOSS_BODY: Bi = {
  en: "Adrian Voss leads Meridian Dynamics, a company specializing in critical infrastructure, quantum systems and artificial intelligence.\n\nSeveral Meridian-linked systems appear in the artifacts assigned to Operators. Your mission is to determine the exact nature of his involvement.",
  fr: "Adrian Voss dirige Meridian Dynamics, une entreprise spécialisée dans les infrastructures critiques, les systèmes quantiques et l'intelligence artificielle.\n\nPlusieurs systèmes Meridian apparaissent dans les artefacts confiés aux Operators. Votre mission consiste à déterminer la nature exacte de son implication.",
};

function vossCard(red: boolean, amber: boolean): CharacterCard {
  const base: CharacterCard = {
    key: "voss",
    name: { en: "Adrian Voss", fr: "Adrian Voss" },
    role: { en: "Primary subject of investigation", fr: "Principal sujet d'enquête" },
    status: { en: "PUBLICLY ACTIVE // REVIEW PENDING", fr: "PUBLICLY ACTIVE // REVIEW PENDING" },
    tone: "green",
    body: VOSS_BODY,
    portrait: "inline",
    locked: false,
  };
  if (red) {
    return {
      ...base,
      status: { en: "THREAT CONFIRMED // PROJECT JANUS AUTHORITY", fr: "THREAT CONFIRMED // PROJECT JANUS AUTHORITY" },
      statusAlt: { en: "THREAT LEVEL // CRITICAL", fr: "THREAT LEVEL // CRITICAL" },
      tone: "red",
      alert: {
        en: "Evidence recovered by Operators confirms that Adrian Voss held direct authority over Project Janus. Meridian Dynamics deliberately caused or amplified the opening of the Digital Gates. Voss is now classified as an active threat to the continuity of our reality.",
        fr: "Les preuves récupérées par les Operators confirment qu'Adrian Voss disposait d'une autorité directe sur Project Janus. Meridian Dynamics a délibérément provoqué ou amplifié l'ouverture des Digital Gates. Voss est désormais classé comme une menace active pour la continuité de notre réalité.",
      },
    };
  }
  if (amber) {
    return {
      ...base,
      status: { en: "PERSON OF INTEREST // EVIDENCE INCOMPLETE", fr: "PERSON OF INTEREST // EVIDENCE INCOMPLETE" },
      tone: "amber",
      alert: {
        en: "Recovered evidence ties Adrian Voss to the Meridian systems in play — but his personal responsibility is not yet demonstrated.",
        fr: "Les preuves récupérées lient Adrian Voss aux systèmes Meridian en jeu — mais sa responsabilité personnelle n'est pas encore démontrée.",
      },
    };
  }
  return base;
}

function samuelCard(unlocked: boolean): CharacterCard {
  if (unlocked) {
    return {
      key: "samuel",
      name: { en: "Samuel Mboa", fr: "Samuel Mboa" },
      role: { en: "An identity you reconstructed", fr: "Une identité que vous avez reconstruite" },
      status: { en: "IDENTITY RECOVERED // SAMUEL MBOA", fr: "IDENTITY RECOVERED // SAMUEL MBOA" },
      tone: "green",
      body: {
        en: "Samuel Mboa was an engineer associated with early work around Deido. Evidence recovered by Operators indicates he had discovered inconsistencies beneath the monument and tried to preserve information before his records were erased.",
        fr: "Samuel Mboa était un ingénieur associé à d'anciens travaux autour de Deido. Les preuves récupérées par les Operators indiquent qu'il avait découvert des incohérences sous le monument et tenté de préserver des informations avant la suppression de ses archives.",
      },
      portrait: "gated",
      locked: false,
    };
  }
  return {
    key: "samuel",
    name: { en: "Unidentified Engineer", fr: "Ingénieur non identifié" },
    role: { en: "An identity to reconstruct", fr: "Une identité à reconstruire" },
    status: { en: "RECORD DAMAGED // IDENTITY UNCONFIRMED", fr: "RECORD DAMAGED // IDENTITY UNCONFIRMED" },
    tone: "locked",
    body: {
      en: "An unidentified engineer appears in several historical records connected to work carried out around the Deido Monument.\n\nOperators must restore his dossier to determine what he discovered and why his records were erased.",
      fr: "Un ingénieur non identifié apparaît dans plusieurs archives anciennes liées aux travaux réalisés autour du monument de Deido.\n\nLes Operators doivent restaurer son dossier afin de déterminer ce qu'il avait découvert et pourquoi ses traces ont été supprimées.",
    },
    portrait: null,
    locked: true,
  };
}

/** True once the engineer's identity is recovered (forensics01 F-05 or forensics02 F-06). */
export function isSamuelIdentified(rec: (code: string) => boolean): boolean {
  return rec("F-05") || rec("F-06");
}

/** Build the launch character cards for the current recovery state. */
export function computeCharacters(rec: (code: string) => boolean): CharacterCard[] {
  const vossRed = rec("F-12") && (rec("F-09") || rec("F-32") || rec("F-39"));
  const vossAmber = !vossRed && (rec("F-09") || rec("F-21") || rec("F-32"));
  return [WATCHER, ASSA, NORA, vossCard(vossRed, vossAmber), samuelCard(isSamuelIdentified(rec))];
}
