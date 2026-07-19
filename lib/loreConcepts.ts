// ── Concept dossiers — the two "reality model" cards (SERVER-ONLY reveals) ──────
// Two conceptual dossiers open the Echo Vault Console record index: « Our Reality »
// and « The Convergence ». Unlike the sealed entity/location dossiers they are never
// hidden — they are the narrative hook shown from the first minute of the CTF — but
// their status line and prose escalate as specific Fragments are authenticated on
// CTFd. Only the text matching the currently-earned stage is sent to a browser; the
// higher-stage reveals never ship before their triggers are recovered globally.

import type { Stage } from "@/lib/bibleState";

type Bi = { en: string; fr: string };

export interface ConceptState {
  key: "reality" | "convergence";
  stage: Stage;
  cat: Bi;        // rail category label
  title: Bi;      // dossier title
  status: Bi;     // system status line (log-style — identical EN/FR)
  body: Bi;       // current-stage prose
  image: string;  // gated asset key (see lib/gatedAssets.ts) — always released for these two
}

// « Our Reality » — image3 (Douala three-realities). PARTIAL → VERIFIED → RESOLVED.
function realityConcept(rec: (code: string) => boolean): ConceptState {
  const base = {
    key: "reality" as const,
    cat: { en: "Reality model", fr: "Modèle de réalité" },
    title: { en: "Our Reality", fr: "Notre réalité" },
    image: "reality",
  };
  const among = ["F-18", "F-33", "F-34"].filter(rec).length;

  // État final — REALITY TOPOLOGY MAPPED (after F-40)
  if (rec("F-40")) {
    return {
      ...base,
      stage: "RESOLVED",
      status: { en: "REALITY TOPOLOGY MAPPED", fr: "REALITY TOPOLOGY MAPPED" },
      body: {
        en: "The EyesOpen Codex confirms the existence of a structured set of interconnected realities. Some lie close to ours, while others show major technological, historical or physical differences. The monument of the city of Douala is a recurring common point across several of the identified branches.",
        fr: "L'EyesOpen Codex confirme l'existence d'un ensemble structuré de réalités interconnectées. Certaines sont proches de la nôtre, tandis que d'autres présentent des différences technologiques, historiques ou physiques majeures. Le monument de la ville de Douala constitue un point commun récurrent dans plusieurs branches identifiées.",
      },
    };
  }
  // VERIFIED — F-01 and at least two of {F-18, F-33, F-34}
  if (rec("F-01") && among >= 2) {
    return {
      ...base,
      stage: "VERIFIED",
      status: { en: "MULTIPLE REALITIES VERIFIED // CROSS-REALITY EVIDENCE AUTHENTICATED", fr: "MULTIPLE REALITIES VERIFIED // CROSS-REALITY EVIDENCE AUTHENTICATED" },
      body: {
        en: "The authenticated Fragments confirm that our reality is not unique. Several coherent versions of the same place, the same event and certain identities exist in parallel. These realities are not mere simulations or falsified data: they have their own histories, infrastructures and populations. The conditions that allow them to interact, however, remain unknown.",
        fr: "Les Fragments authentifiés confirment que notre réalité n'est pas unique. Plusieurs versions cohérentes d'un même lieu, d'un même événement et de certaines identités existent parallèlement. Ces réalités ne sont pas de simples simulations ou des données falsifiées : elles possèdent leurs propres histoires, infrastructures et populations. Les conditions permettant leur interaction restent cependant inconnues.",
      },
    };
  }
  // État initial — PARTIAL
  return {
    ...base,
    stage: "PARTIAL",
    status: { en: "THEORY ACTIVE // EVIDENCE INCOMPLETE", fr: "THEORY ACTIVE // EVIDENCE INCOMPLETE" },
    body: {
      en: "Data recovered by the EyesOpen Protocol suggests that our reality may not be the only one. Some anomalies contain incompatible versions of the same place, the same event or the same identity — as if several distinct realities ran in parallel. At this stage, their number, their origin and whether they can be reached all remain unknown.",
      fr: "Les données récupérées par le Protocole EyesOpen suggèrent que notre réalité pourrait ne pas être unique. Certaines anomalies contiennent des versions incompatibles d'un même lieu, d'un même événement ou d'une même identité, comme si plusieurs réalités distinctes existaient en parallèle. À ce stade, leur nombre, leur origine et la possibilité de les atteindre restent inconnus.",
    },
  };
}

// « The Convergence » — image2 (converging cityscape).
// DETECTED → VERIFIED → COMPROMISED (critical) → RESOLVED.
function convergenceConcept(rec: (code: string) => boolean): ConceptState {
  const base = {
    key: "convergence" as const,
    cat: { en: "Phenomenon", fr: "Phénomène" },
    title: { en: "The Convergence", fr: "La Convergence" },
    image: "convergence",
  };

  // MASTER TOPOLOGY RECOVERED (after F-40)
  if (rec("F-40")) {
    return {
      ...base,
      stage: "RESOLVED",
      status: { en: "MASTER TOPOLOGY RECOVERED // CLOSURE SEQUENCE REQUIRED", fr: "MASTER TOPOLOGY RECOVERED // CLOSURE SEQUENCE REQUIRED" },
      body: {
        en: "The EyesOpen Codex now holds a complete representation of the realities and the Gates involved in the Convergence. The threat is confirmed. What remains is to identify and authenticate the one sequence capable of separating the worlds before the final collapse.",
        fr: "L'EyesOpen Codex dispose désormais d'une représentation complète des réalités et des Gates impliquées dans la Convergence. La menace est confirmée. Il reste à identifier et authentifier la seule séquence capable de séparer les mondes avant l'effondrement final.",
      },
    };
  }
  // Évolution critique — THREAT LEVEL // CRITICAL (after F-16 and F-39)
  if (rec("F-16") && rec("F-39")) {
    return {
      ...base,
      stage: "COMPROMISED",
      status: { en: "THREAT LEVEL // CRITICAL — COLLISION TRAJECTORY CONFIRMED", fr: "THREAT LEVEL // CRITICAL — COLLISION TRAJECTORY CONFIRMED" },
      body: {
        en: "The reconstructed model indicates that the superposition is no longer temporary. The realities involved are converging toward a state of permanent collision. If that point is reached, their histories, their populations and their infrastructures will attempt to occupy the same space at once. None of the worlds involved is expected to survive that fusion intact.",
        fr: "Le modèle reconstruit indique que la superposition n'est plus temporaire. Les réalités concernées convergent vers un état de collision permanente. Si ce point est atteint, leurs histoires, leurs populations et leurs infrastructures tenteront d'occuper simultanément le même espace. Aucun des mondes impliqués ne devrait survivre intact à cette fusion.",
      },
    };
  }
  // VERIFIED — F-02, F-14 and at least one of {F-16, F-35}
  if (rec("F-02") && rec("F-14") && (rec("F-16") || rec("F-35"))) {
    return {
      ...base,
      stage: "VERIFIED",
      status: { en: "CONVERGENCE VERIFIED // REALITY OVERLAP ACTIVE", fr: "CONVERGENCE VERIFIED // REALITY OVERLAP ACTIVE" },
      body: {
        en: "The gathered evidence confirms that the Convergence has begun. Several realities are gradually entering superposition with ours. This phenomenon causes data transfers, duplicated identities, incompatible memories and the temporary appearance of structures from other worlds. The intensity of these overlaps is rising. Without intervention, the separation between realities could become irreversible.",
        fr: "Les preuves recueillies confirment que la Convergence a commencé. Plusieurs réalités entrent progressivement en superposition avec la nôtre. Ce phénomène provoque des transferts de données, des identités dupliquées, des souvenirs incompatibles et l'apparition temporaire de structures provenant d'autres mondes. L'intensité de ces chevauchements augmente. Sans intervention, la séparation entre les réalités pourrait devenir irréversible.",
      },
    };
  }
  // État initial — DETECTED
  return {
    ...base,
    stage: "DETECTED",
    status: { en: "CONVERGENCE HYPOTHESIS // UNCONFIRMED", fr: "CONVERGENCE HYPOTHESIS // UNCONFIRMED" },
    body: {
      en: "The Convergence is the name given to a theoretical phenomenon in which two or more realities would begin to overlap. The disturbances observed suggest that the separation between them may be weakening — producing impossible data, contradictory memories and structures that should not coexist. If the phenomenon is confirmed and keeps progressing, it could bring about the collapse of our reality.",
      fr: "La Convergence est le nom donné à un phénomène théorique dans lequel deux ou plusieurs réalités commenceraient à se superposer. Les perturbations observées laissent penser que leur séparation pourrait être en train de s'affaiblir, provoquant des données impossibles, des souvenirs contradictoires et des structures qui ne devraient pas coexister. Si le phénomène est confirmé et continue de progresser, il pourrait entraîner l'effondrement de notre réalité.",
    },
  };
}

/** The two concept dossiers, ordered as they appear first in the record index. */
export function computeConcepts(rec: (code: string) => boolean): ConceptState[] {
  return [realityConcept(rec), convergenceConcept(rec)];
}

/** Concept images are always released — the cards are never sealed. */
export const CONCEPT_IMAGE_KEYS = new Set(["reality", "convergence"]);
