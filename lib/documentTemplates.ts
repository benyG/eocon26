// Registry of the documents produced across the sponsor journey, in chronological
// order, with their objective, issuing entity and generation kind.

export type IssuerKey = "organizer" | "billing";
export type DocKind = "template" | "pricing" | "proforma" | "invoice";
export type AppliesTo = "general" | "prospect" | "sponsor";

export interface DocType {
  key: string;
  order: number;
  nameFr: string;
  nameEn: string;
  objectiveFr: string;
  objectiveEn: string;
  stageFr: string;
  stageEn: string;
  issuer: IssuerKey;
  appliesTo: AppliesTo;
  kind: DocKind;
}

export const DOC_TYPES: DocType[] = [
  {
    key: "pricing", order: 1, kind: "pricing", issuer: "organizer", appliesTo: "general",
    nameFr: "Grille tarifaire & Packages", nameEn: "Pricing & Packages",
    stageFr: "Prospection", stageEn: "Prospecting",
    objectiveFr: "Présenter l'offre de partenariat et les tarifs par niveau.",
    objectiveEn: "Present the partnership offer and pricing per tier.",
  },
  {
    key: "loi", order: 2, kind: "template", issuer: "organizer", appliesTo: "prospect",
    nameFr: "Lettre d'intention", nameEn: "Letter of Intent",
    stageFr: "Négociation", stageEn: "Negotiation",
    objectiveFr: "Acter l'intention réciproque de partenariat avant le contrat (non contraignant).",
    objectiveEn: "Record the mutual intent to partner before the contract (non-binding).",
  },
  {
    key: "proforma", order: 3, kind: "proforma", issuer: "billing", appliesTo: "sponsor",
    nameFr: "Proforma", nameEn: "Pro-forma",
    stageFr: "Négociation", stageEn: "Negotiation",
    objectiveFr: "Chiffrer formellement les contreparties retenues (devis).",
    objectiveEn: "Formally quote the selected benefits (estimate).",
  },
  {
    key: "contract", order: 4, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Contrat de partenariat", nameEn: "Partnership Agreement",
    stageFr: "Closing", stageEn: "Closing",
    objectiveFr: "Officialiser juridiquement l'accord : contreparties, montant, échéances, obligations, signatures.",
    objectiveEn: "Legally formalize the deal: benefits, amount, deadlines, obligations, signatures.",
  },
  {
    key: "exclusivity", order: 5, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Clause d'exclusivité", nameEn: "Exclusivity Clause",
    stageFr: "Closing", stageEn: "Closing",
    objectiveFr: "Garantir au partenaire l'exclusivité sur son secteur (annexe optionnelle au contrat).",
    objectiveEn: "Grant the partner sector exclusivity (optional annex to the contract).",
  },
  {
    key: "invoice", order: 6, kind: "invoice", issuer: "billing", appliesTo: "sponsor",
    nameFr: "Facture", nameEn: "Invoice",
    stageFr: "Post-signature", stageEn: "Post-signing",
    objectiveFr: "Émettre l'appel de paiement une fois l'accord signé.",
    objectiveEn: "Issue the payment request once the deal is signed.",
  },
  {
    key: "brand_assets", order: 7, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Demande d'éléments de marque", nameEn: "Brand Assets Request",
    stageFr: "Activation", stageEn: "Activation",
    objectiveFr: "Collecter logo, nom légal et éléments de marque nécessaires à la visibilité.",
    objectiveEn: "Collect logo, legal name and brand assets needed for visibility.",
  },
  {
    key: "comm_plan", order: 8, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Plan de communication sponsor", nameEn: "Sponsor Communication Plan",
    stageFr: "Activation", stageEn: "Activation",
    objectiveFr: "Détailler la visibilité livrée : canaux, dates, posts, branding, échéances.",
    objectiveEn: "Detail the delivered visibility: channels, dates, posts, branding, deadlines.",
  },
];

export const docType = (key: string) => DOC_TYPES.find(d => d.key === key);

// Default editable templates for the text-driven documents. Light markup:
//   "## " heading · "- " bullet · "{{PERKS}}" perk list · "{{SIGNATURE}}" signature block
// plus {{placeholders}} resolved from the sponsor/prospect + event settings.
export interface TemplateDefault { nameFr: string; nameEn: string; bodyFr: string; bodyEn: string; }

export const DEFAULT_TEMPLATES: Record<string, TemplateDefault> = {
  loi: {
    nameFr: "Lettre d'intention", nameEn: "Letter of Intent",
    bodyFr: `## Objet
Lettre d'intention de partenariat — EOCON 2026

{{organizer_name}} et {{sponsor_name}} expriment par la présente leur intention commune de nouer un partenariat à l'occasion d'EOCON 2026 (7ème édition), le {{event_date}} à {{event_venue}}.

## Cadre pressenti
- Niveau de partenariat envisagé : {{tier}}
- Contribution indicative : {{amount}}
- Contreparties principales pressenties :
{{PERKS}}

## Portée
La présente lettre traduit une intention de bonne foi et ne constitue pas un engagement ferme. Elle a vocation à être confirmée par un contrat de partenariat définitif.

## Validité
Cette lettre d'intention est valable trente (30) jours à compter du {{date}}.

{{SIGNATURE}}`,
    bodyEn: `## Subject
Letter of Intent for partnership — EOCON 2026

{{organizer_name}} and {{sponsor_name}} hereby express their mutual intent to enter into a partnership for EOCON 2026 (7th edition), on {{event_date}} in {{event_venue}}.

## Envisaged framework
- Envisaged partnership tier: {{tier}}
- Indicative contribution: {{amount}}
- Main envisaged benefits:
{{PERKS}}

## Scope
This letter reflects a good-faith intent and does not constitute a firm commitment. It is intended to be confirmed by a definitive partnership agreement.

## Validity
This letter of intent is valid for thirty (30) days from {{date}}.

{{SIGNATURE}}`,
  },
  contract: {
    nameFr: "Contrat de partenariat", nameEn: "Partnership Agreement",
    bodyFr: `## Entre les soussignés
D'une part, {{organizer_name}}, organisateur d'EOCON 2026 (ci-après « l'Organisateur »),
Et d'autre part, {{sponsor_name}} (ci-après « le Partenaire »).

## Article 1 — Objet
Le présent contrat définit les conditions du partenariat dans le cadre d'EOCON 2026 (7ème édition), le {{event_date}} à {{event_venue}}.

## Article 2 — Niveau et contribution
Le Partenaire souscrit au partenariat de niveau {{tier}} pour un montant de {{amount}}.

## Article 3 — Contreparties
En contrepartie, l'Organisateur s'engage à fournir :
{{PERKS}}

## Article 4 — Obligations du Partenaire
Le Partenaire fournit ses éléments de marque dans les délais permettant leur intégration : supports imprimés avant le {{deadline_print}}, supports digitaux avant le {{deadline_digital}}.

## Article 5 — Paiement
Le montant est payable à réception de la facture émise par l'entité de facturation désignée.

## Article 6 — Confidentialité
Chaque partie préserve la confidentialité des informations échangées dans le cadre du présent contrat.

## Article 7 — Résiliation
En cas de manquement grave non corrigé sous quinze (15) jours après mise en demeure, la partie lésée peut résilier le présent contrat.

## Article 8 — Droit applicable
Le présent contrat est régi par le droit applicable au siège de l'Organisateur. Tout litige sera soumis aux juridictions compétentes.

Fait en deux exemplaires. Référence : {{doc_number}} — {{date}}.

{{SIGNATURE}}`,
    bodyEn: `## Between the undersigned
On one hand, {{organizer_name}}, organizer of EOCON 2026 (the "Organizer"),
And on the other hand, {{sponsor_name}} (the "Partner").

## Article 1 — Purpose
This agreement sets out the terms of the partnership for EOCON 2026 (7th edition), on {{event_date}} in {{event_venue}}.

## Article 2 — Tier and contribution
The Partner subscribes to the {{tier}} partnership tier for an amount of {{amount}}.

## Article 3 — Benefits
In return, the Organizer undertakes to provide:
{{PERKS}}

## Article 4 — Partner obligations
The Partner provides its brand assets in time for integration: print materials before {{deadline_print}}, digital materials before {{deadline_digital}}.

## Article 5 — Payment
The amount is payable upon receipt of the invoice issued by the designated billing entity.

## Article 6 — Confidentiality
Each party keeps confidential the information exchanged under this agreement.

## Article 7 — Termination
In the event of a serious breach not remedied within fifteen (15) days of notice, the aggrieved party may terminate this agreement.

## Article 8 — Governing law
This agreement is governed by the law applicable at the Organizer's registered office. Any dispute shall be submitted to the competent courts.

Executed in two counterparts. Reference: {{doc_number}} — {{date}}.

{{SIGNATURE}}`,
  },
  exclusivity: {
    nameFr: "Clause d'exclusivité", nameEn: "Exclusivity Clause",
    bodyFr: `## Clause d'exclusivité — Annexe au contrat de partenariat
Référence : {{doc_number}} — {{date}}

Dans le cadre du partenariat {{tier}} conclu avec {{sponsor_name}}, {{organizer_name}} accorde au Partenaire une exclusivité sectorielle.

## Portée de l'exclusivité
- Secteur couvert : {{sector}}
- L'Organisateur s'engage à ne pas accueillir de partenaire concurrent direct sur ce secteur pour l'édition 2026.
- L'exclusivité couvre la période de campagne et l'événement du {{event_date}}.

## Contrepartie
Cette exclusivité est consentie au titre du niveau {{tier}} et du montant de {{amount}}.

{{SIGNATURE}}`,
    bodyEn: `## Exclusivity Clause — Annex to the partnership agreement
Reference: {{doc_number}} — {{date}}

Within the {{tier}} partnership concluded with {{sponsor_name}}, {{organizer_name}} grants the Partner sector exclusivity.

## Scope of exclusivity
- Covered sector: {{sector}}
- The Organizer undertakes not to host a direct competing partner in this sector for the 2026 edition.
- Exclusivity covers the campaign period and the event on {{event_date}}.

## Consideration
This exclusivity is granted under the {{tier}} tier and the amount of {{amount}}.

{{SIGNATURE}}`,
  },
  brand_assets: {
    nameFr: "Demande d'éléments de marque", nameEn: "Brand Assets Request",
    bodyFr: `## Demande d'éléments de marque
{{sponsor_name}} — Partenaire {{tier}} · EOCON 2026

Afin d'activer votre visibilité, merci de nous transmettre les éléments suivants avant le {{deadline_print}} (supports imprimés) et le {{deadline_digital}} (supports digitaux).

## Éléments requis
- Logo vectoriel (SVG ou EPS) + version PNG fond transparent (≥ 1000 px)
- Version monochrome du logo (blanc et noir)
- Nom légal exact pour les mentions officielles
- Lien du site web et handles réseaux sociaux
- Courte description (80 mots max, FR et EN)
- Personne de contact communication (nom, email)

## Où envoyer
Merci d'adresser ces éléments à {{organizer_email}} en indiquant « Brand assets — {{sponsor_name}} » en objet.

## Visibilités prévues
{{PERKS}}`,
    bodyEn: `## Brand Assets Request
{{sponsor_name}} — {{tier}} Partner · EOCON 2026

To activate your visibility, please send us the following before {{deadline_print}} (print materials) and {{deadline_digital}} (digital materials).

## Required assets
- Vector logo (SVG or EPS) + transparent PNG (≥ 1000 px)
- Monochrome logo version (white and black)
- Exact legal name for official mentions
- Website link and social media handles
- Short description (max 80 words, FR and EN)
- Communication contact person (name, email)

## Where to send
Please send these to {{organizer_email}} with the subject "Brand assets — {{sponsor_name}}".

## Planned visibility
{{PERKS}}`,
  },
  comm_plan: {
    nameFr: "Plan de communication sponsor", nameEn: "Sponsor Communication Plan",
    bodyFr: `## Plan de communication sponsor
{{sponsor_name}} — Partenaire {{tier}} · EOCON 2026 ({{event_date}})

Ce plan détaille la visibilité livrée dans le cadre de votre partenariat.

## Canaux & contreparties
{{PERKS}}

## Calendrier indicatif
- Pré-annonce : intégration du logo dès la confirmation
- J-6 à J-1 (en ligne) : visibilité pendant les conférences et le CTF
- Jour présentiel ({{event_date}}) : branding sur site, stand et prise de parole selon le niveau
- Après l'événement : remerciements et rapport de visibilité

## Coordination
Un contact unique côté Organisateur assure le suivi. Merci de nous communiquer votre référent communication.`,
    bodyEn: `## Sponsor Communication Plan
{{sponsor_name}} — {{tier}} Partner · EOCON 2026 ({{event_date}})

This plan details the visibility delivered as part of your partnership.

## Channels & benefits
{{PERKS}}

## Indicative timeline
- Pre-announcement: logo integration upon confirmation
- D-6 to D-1 (online): visibility during talks and the CTF
- In-person day ({{event_date}}): on-site branding, booth and speaking slot per tier
- After the event: thanks and visibility report

## Coordination
A single point of contact on the Organizer's side handles the follow-up. Please share your communication lead.`,
  },
};

// Replace {{placeholders}} in a template body (case-sensitive, {{PERKS}}/{{SIGNATURE}} left as-is).
export function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (key === "PERKS" || key === "SIGNATURE") return m; // handled by the renderer
    return vars[key] ?? "";
  });
}
