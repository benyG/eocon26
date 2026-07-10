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
    key: "onepager", order: 1, kind: "template", issuer: "organizer", appliesTo: "prospect",
    nameFr: "One-pager / Teaser", nameEn: "One-pager / Teaser",
    stageFr: "Prospection", stageEn: "Prospecting",
    objectiveFr: "Accrocher en 1 page : EOCON en bref + pourquoi sponsoriser + appel \u00e0 l'action, avant le dossier complet.",
    objectiveEn: "Hook in one page: EOCON at a glance + why sponsor + call to action, before the full deck.",
  },
  {
    key: "pricing", order: 2, kind: "pricing", issuer: "organizer", appliesTo: "general",
    nameFr: "Grille tarifaire & Packages", nameEn: "Pricing & Packages",
    stageFr: "Prospection", stageEn: "Prospecting",
    objectiveFr: "Présenter l'offre de partenariat et les tarifs par niveau.",
    objectiveEn: "Present the partnership offer and pricing per tier.",
  },
  {
    key: "loi", order: 3, kind: "template", issuer: "organizer", appliesTo: "prospect",
    nameFr: "Lettre d'intention", nameEn: "Letter of Intent",
    stageFr: "Négociation", stageEn: "Negotiation",
    objectiveFr: "Acter l'intention réciproque de partenariat avant le contrat (non contraignant).",
    objectiveEn: "Record the mutual intent to partner before the contract (non-binding).",
  },
  {
    key: "proforma", order: 4, kind: "proforma", issuer: "billing", appliesTo: "sponsor",
    nameFr: "Proforma", nameEn: "Pro-forma",
    stageFr: "Négociation", stageEn: "Negotiation",
    objectiveFr: "Chiffrer formellement les contreparties retenues (devis).",
    objectiveEn: "Formally quote the selected benefits (estimate).",
  },
  {
    key: "contract", order: 5, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Contrat de partenariat", nameEn: "Partnership Agreement",
    stageFr: "Closing", stageEn: "Closing",
    objectiveFr: "Officialiser juridiquement l'accord : contreparties, montant, échéances, obligations, signatures.",
    objectiveEn: "Legally formalize the deal: benefits, amount, deadlines, obligations, signatures.",
  },
  {
    key: "exclusivity", order: 6, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Clause d'exclusivité", nameEn: "Exclusivity Clause",
    stageFr: "Closing", stageEn: "Closing",
    objectiveFr: "Garantir au partenaire l'exclusivité sur son secteur (annexe optionnelle au contrat).",
    objectiveEn: "Grant the partner sector exclusivity (optional annex to the contract).",
  },
  {
    key: "invoice", order: 7, kind: "invoice", issuer: "billing", appliesTo: "sponsor",
    nameFr: "Facture", nameEn: "Invoice",
    stageFr: "Post-signature", stageEn: "Post-signing",
    objectiveFr: "Émettre l'appel de paiement une fois l'accord signé.",
    objectiveEn: "Issue the payment request once the deal is signed.",
  },
  {
    key: "brand_assets", order: 8, kind: "template", issuer: "organizer", appliesTo: "sponsor",
    nameFr: "Demande d'éléments de marque", nameEn: "Brand Assets Request",
    stageFr: "Activation", stageEn: "Activation",
    objectiveFr: "Collecter logo, nom légal et éléments de marque nécessaires à la visibilité.",
    objectiveEn: "Collect logo, legal name and brand assets needed for visibility.",
  },
  {
    key: "comm_plan", order: 9, kind: "template", issuer: "organizer", appliesTo: "sponsor",
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
  onepager: {
    nameFr: "One-pager / Teaser", nameEn: "One-pager / Teaser",
    bodyFr: `## EOCON 2026 — Sécuriser l'avenir
{{organizer_name}} · 7e édition · {{event_date}} · {{event_venue}}

EOCON est la convention internationale de cybersécurité portée par {{organizer_name}} pour connecter les talents, les entreprises, les institutions et les décideurs qui construisent l'avenir numérique de l'Afrique francophone.

## EOCON en bref
- 1 000+ participants attendus · 15+ pays représentés · 91% de satisfaction lors de l'édition 2024
- 27+ intervenants internationaux · ateliers pratiques · challenge pratique de cybersécurité de 48h
- Format hybride : 6 jours en ligne + 1 journée présentielle à {{event_venue}}

## Pourquoi {{sponsor_name}} devrait s'associer
- Accéder à un vivier qualifié de talents cyber : étudiants avancés, ingénieurs, chercheurs et professionnels IT
- Renforcer votre marque employeur auprès d'une audience technique et internationale
- Affirmer votre engagement pour la confiance numérique, la résilience et l'innovation en Afrique
- Gagner en visibilité auprès de décideurs, entreprises, communautés techniques et relais institutionnels
- Associer votre marque à un rendez-vous crédible, utile et orienté impact

## Opportunité de partenariat
Niveau de partenariat suggéré : {{tier}}.
Nous serions ravis de vous présenter le dossier complet et d'évaluer avec vous une formule alignée sur vos objectifs de visibilité, recrutement, innovation et impact.

Contact : {{organizer_email}}`,
    bodyEn: `## EOCON 2026 — Secure the future
{{organizer_name}} · 7th edition · {{event_date}} · {{event_venue}}

EOCON is the international cybersecurity convention led by {{organizer_name}} to connect the talent, companies, institutions and decision-makers shaping the digital future of Francophone Africa.

## EOCON at a glance
- 1,000+ expected attendees · 15+ countries represented · 91% satisfaction in the 2024 edition
- 27+ international speakers · hands-on workshops · 48-hour practical cybersecurity challenge
- Hybrid format: 6 online days + 1 in-person day at {{event_venue}}

## Why {{sponsor_name}} should partner
- Access a qualified pool of cyber talent: advanced students, engineers, researchers and IT professionals
- Strengthen your employer brand with a technical and international audience
- Demonstrate your commitment to digital trust, resilience and innovation in Africa
- Gain visibility among decision-makers, companies, technical communities and institutional stakeholders
- Associate your brand with a credible, useful and impact-driven platform

## Partnership opportunity
Suggested partnership tier: {{tier}}.
We would be pleased to share the full deck and explore a partnership format aligned with your visibility, recruitment, innovation and impact objectives.

Contact: {{organizer_email}}`,
  },
  loi: {
    nameFr: "Lettre d'intention", nameEn: "Letter of Intent",
    bodyFr: `## Objet
Lettre d'intention de partenariat — EOCON 2026

{{organizer_name}} et {{sponsor_name}} expriment par la présente leur intention commune d'étudier et de formaliser un partenariat à l'occasion d'EOCON 2026 (7e édition), prévu le {{event_date}} à {{event_venue}}.

## Cadre pressenti
- Niveau de partenariat envisagé : {{tier}}
- Contribution indicative : {{amount}}
- Contreparties principales pressenties :
{{PERKS}}

## Portée de l'intention
La présente lettre traduit une intention de bonne foi entre les parties. Elle ne constitue pas, à ce stade, un engagement ferme de sponsoring, de paiement ou de livraison de contreparties.

Les éléments ci-dessus restent soumis à validation interne par chaque partie, à la confirmation du périmètre final des contreparties et à la signature d'un contrat de partenariat définitif.

## Confidentialité et usage
Les informations échangées dans le cadre de cette discussion sont destinées à l'évaluation du partenariat. Elles ne doivent pas être diffusées publiquement sans accord préalable des parties.

## Validité
Cette lettre d'intention est valable trente (30) jours à compter du {{date}}, sauf prolongation écrite convenue entre les parties.

{{SIGNATURE}}`,
    bodyEn: `## Subject
Letter of Intent for Partnership — EOCON 2026

{{organizer_name}} and {{sponsor_name}} hereby express their mutual intent to explore and formalize a partnership for EOCON 2026 (7th edition), scheduled for {{event_date}} at {{event_venue}}.

## Envisaged framework
- Envisaged partnership tier: {{tier}}
- Indicative contribution: {{amount}}
- Main envisaged benefits:
{{PERKS}}

## Scope of intent
This letter reflects a good-faith intent between the parties. At this stage, it does not constitute a binding sponsorship, payment or benefit-delivery commitment.

The elements above remain subject to internal approval by each party, confirmation of the final scope of benefits and signature of a final partnership agreement.

## Confidentiality and use
Information exchanged as part of this discussion is intended for partnership evaluation purposes. It shall not be publicly disclosed without the prior agreement of the parties.

## Validity
This letter of intent is valid for thirty (30) days from {{date}}, unless extended in writing by the parties.

{{SIGNATURE}}`,
  },
  contract: {
    nameFr: "Contrat de partenariat", nameEn: "Partnership Agreement",
    bodyFr: `## Entre les soussignés
D'une part, {{organizer_name}}, organisateur d'EOCON 2026 (ci-après « l'Organisateur »),
Et d'autre part, {{sponsor_name}} (ci-après « le Partenaire »).

Ensemble, les « Parties ».

## Article 1 — Objet
Le présent contrat définit les conditions du partenariat conclu dans le cadre d'EOCON 2026 (7e édition), prévu le {{event_date}} à {{event_venue}}.

## Article 2 — Niveau de partenariat et contribution
Le Partenaire souscrit au niveau de partenariat {{tier}} pour un montant de {{amount}}.

Ce montant couvre les contreparties listées à l'article 3. Toute prestation additionnelle non prévue au présent contrat devra faire l'objet d'un accord écrit entre les Parties.

## Article 3 — Contreparties du partenariat
En contrepartie de la contribution du Partenaire, l'Organisateur s'engage à fournir les visibilités et bénéfices suivants :
{{PERKS}}

Les contreparties sont livrées sous réserve du respect des délais de transmission des éléments de marque et des informations nécessaires par le Partenaire.

## Article 4 — Obligations de l'Organisateur
L'Organisateur s'engage à :
- intégrer le Partenaire dans les supports et activations correspondant au niveau {{tier}} ;
- utiliser les éléments de marque transmis uniquement dans le cadre de la promotion, de l'organisation et du bilan d'EOCON 2026 ;
- informer le Partenaire des principales échéances nécessaires à la bonne activation du partenariat ;
- fournir, après l'événement, un récapitulatif raisonnable des visibilités livrées lorsque cela est applicable.

## Article 5 — Obligations du Partenaire
Le Partenaire s'engage à :
- fournir ses éléments de marque, son nom légal et les contenus nécessaires dans les délais requis ;
- transmettre les éléments destinés aux supports imprimés avant le {{deadline_print}} ;
- transmettre les éléments destinés aux supports digitaux avant le {{deadline_digital}} ;
- garantir qu'il dispose des droits nécessaires sur les logos, visuels et contenus transmis ;
- procéder au paiement selon les conditions prévues à l'article 6.

Les éléments reçus après les délais indiqués pourront être exclus de certains supports déjà produits ou planifiés.

## Article 6 — Facturation et paiement
Le montant du partenariat est payable à réception de la facture émise par l'entité de facturation désignée.

Sauf accord écrit contraire, les taxes, frais bancaires, retenues, commissions de transfert ou frais de change éventuellement applicables restent à la charge de la Partie à laquelle ils incombent légalement ou contractuellement.

L'activation complète de certaines contreparties peut être conditionnée à la réception du paiement ou d'une preuve de paiement acceptée par l'Organisateur.

## Article 7 — Usage des marques et validation
Chaque Partie autorise l'autre à utiliser son nom, son logo et ses signes distinctifs uniquement pour l'exécution du présent partenariat.

Toute utilisation substantiellement différente du cadre prévu devra faire l'objet d'une validation préalable. Le Partenaire reste responsable de l'exactitude des éléments de marque et mentions officielles transmis.

## Article 8 — Report, annulation ou modification de l'événement
En cas de report, d'annulation, de changement de format ou de modification significative de l'événement pour des raisons indépendantes de la volonté raisonnable de l'Organisateur, les Parties se concerteront de bonne foi afin d'adapter les contreparties, le calendrier ou les modalités d'exécution.

Les contreparties déjà livrées ou engagées pourront être prises en compte dans toute discussion relative à un ajustement.

## Article 9 — Confidentialité
Chaque Partie s'engage à préserver la confidentialité des informations non publiques échangées dans le cadre du présent contrat, sauf obligation légale, accord écrit préalable ou information déjà publique.

## Article 10 — Résiliation
En cas de manquement grave par l'une des Parties, non corrigé dans un délai de quinze (15) jours après notification écrite, la Partie lésée peut résilier le présent contrat.

La résiliation ne remet pas en cause les sommes dues au titre des prestations déjà réalisées ou engagées, sauf accord écrit contraire entre les Parties.

## Article 11 — Responsabilité
Chaque Partie demeure responsable de ses propres actes, engagements, contenus et obligations. Aucune Partie ne pourra être tenue responsable des dommages indirects, pertes d'opportunité ou pertes commerciales indirectes, sauf faute lourde, fraude ou obligation légale contraire.

## Article 12 — Droit applicable et règlement des différends
Le présent contrat est régi par le droit applicable au siège de l'Organisateur, sauf disposition impérative contraire.

En cas de différend, les Parties rechercheront d'abord une solution amiable. À défaut d'accord, le litige sera soumis aux juridictions compétentes.

Fait en deux exemplaires. Référence : {{doc_number}} — {{date}}.

{{SIGNATURE}}`,
    bodyEn: `## Between the undersigned
On one hand, {{organizer_name}}, organizer of EOCON 2026 (the "Organizer"),
And on the other hand, {{sponsor_name}} (the "Partner").

Together, the "Parties".

## Article 1 — Purpose
This agreement sets out the terms of the partnership entered into for EOCON 2026 (7th edition), scheduled for {{event_date}} at {{event_venue}}.

## Article 2 — Partnership tier and contribution
The Partner subscribes to the {{tier}} partnership tier for an amount of {{amount}}.

This amount covers the benefits listed in Article 3. Any additional service not provided for in this agreement must be agreed in writing by the Parties.

## Article 3 — Partnership benefits
In consideration of the Partner's contribution, the Organizer undertakes to provide the following visibility and benefits:
{{PERKS}}

Benefits are delivered subject to the Partner providing the required brand assets and information within the applicable deadlines.

## Article 4 — Organizer obligations
The Organizer undertakes to:
- integrate the Partner into the materials and activations corresponding to the {{tier}} tier;
- use the brand assets provided only for the promotion, organization and post-event reporting of EOCON 2026;
- inform the Partner of the main deadlines required for proper partnership activation;
- provide, after the event, a reasonable summary of delivered visibility where applicable.

## Article 5 — Partner obligations
The Partner undertakes to:
- provide its brand assets, legal name and required content within the applicable deadlines;
- provide assets intended for print materials before {{deadline_print}};
- provide assets intended for digital materials before {{deadline_digital}};
- warrant that it holds the required rights to the logos, visuals and content provided;
- make payment according to the terms set out in Article 6.

Assets received after the indicated deadlines may be excluded from certain materials already produced or scheduled.

## Article 6 — Invoicing and payment
The partnership amount is payable upon receipt of the invoice issued by the designated billing entity.

Unless otherwise agreed in writing, taxes, bank fees, withholding amounts, transfer commissions or currency exchange fees that may apply remain payable by the Party legally or contractually responsible for them.

Full activation of certain benefits may be subject to receipt of payment or proof of payment accepted by the Organizer.

## Article 7 — Use of marks and approval
Each Party authorizes the other to use its name, logo and distinctive signs only for the performance of this partnership.

Any substantially different use must receive prior approval. The Partner remains responsible for the accuracy of the brand assets and official mentions provided.

## Article 8 — Postponement, cancellation or event changes
In the event of postponement, cancellation, format change or significant modification of the event for reasons beyond the Organizer's reasonable control, the Parties shall consult in good faith to adapt the benefits, timeline or performance terms.

Benefits already delivered or committed may be taken into account in any adjustment discussion.

## Article 9 — Confidentiality
Each Party undertakes to keep confidential any non-public information exchanged under this agreement, except where disclosure is required by law, previously agreed in writing or the information is already public.

## Article 10 — Termination
In the event of a serious breach by either Party that is not remedied within fifteen (15) days after written notice, the aggrieved Party may terminate this agreement.

Termination shall not affect amounts due for services already performed or committed, unless otherwise agreed in writing by the Parties.

## Article 11 — Liability
Each Party remains responsible for its own acts, commitments, content and obligations. Neither Party shall be liable for indirect damages, loss of opportunity or indirect commercial losses, except in cases of gross negligence, fraud or mandatory legal obligation to the contrary.

## Article 12 — Governing law and dispute resolution
This agreement is governed by the law applicable at the Organizer's registered office, unless mandatory provisions provide otherwise.

In the event of a dispute, the Parties shall first seek an amicable solution. Failing agreement, the dispute shall be submitted to the competent courts.

Executed in two counterparts. Reference: {{doc_number}} — {{date}}.

{{SIGNATURE}}`,
  },
  exclusivity: {
    nameFr: "Clause d'exclusivité", nameEn: "Exclusivity Clause",
    bodyFr: `## Clause d'exclusivité — Annexe au contrat de partenariat
Référence : {{doc_number}} — {{date}}

Dans le cadre du partenariat {{tier}} conclu avec {{sponsor_name}}, {{organizer_name}} accorde au Partenaire une exclusivité sectorielle limitée au périmètre défini ci-dessous.

## Secteur couvert
- Secteur couvert : {{sector}}
- L'exclusivité vise les partenaires commerciaux directement concurrents du Partenaire dans ce secteur.
- Les partenaires déjà confirmés avant la signature de la présente clause ne sont pas remis en cause.

## Portée de l'exclusivité
Pendant la période de campagne et jusqu'à la fin de l'événement du {{event_date}}, l'Organisateur s'engage à ne pas accorder à un concurrent direct du Partenaire un statut de sponsor officiel dans le secteur couvert.

Sauf mention contraire écrite, cette exclusivité ne s'applique pas aux intervenants, médias, communautés, institutions publiques, fournisseurs techniques, exposants non sponsors, partenaires académiques ou organisations dont l'activité principale ne relève pas directement du secteur couvert.

## Conditions
Cette exclusivité est accordée au titre du niveau {{tier}} et du montant de {{amount}}. Elle reste conditionnée au respect par le Partenaire de ses obligations contractuelles, notamment le paiement et la transmission des éléments requis dans les délais.

## Interprétation
En cas de doute sur le caractère directement concurrent d'une organisation, les Parties se concerteront de bonne foi avant toute confirmation de partenariat concerné.

{{SIGNATURE}}`,
    bodyEn: `## Exclusivity Clause — Annex to the Partnership Agreement
Reference: {{doc_number}} — {{date}}

Within the {{tier}} partnership concluded with {{sponsor_name}}, {{organizer_name}} grants the Partner sector exclusivity limited to the scope defined below.

## Covered sector
- Covered sector: {{sector}}
- Exclusivity applies to commercial partners that directly compete with the Partner in this sector.
- Partners already confirmed before signature of this clause are not affected.

## Scope of exclusivity
During the campaign period and until the end of the event on {{event_date}}, the Organizer undertakes not to grant official sponsor status in the covered sector to a direct competitor of the Partner.

Unless otherwise agreed in writing, this exclusivity does not apply to speakers, media, communities, public institutions, technical suppliers, non-sponsor exhibitors, academic partners or organizations whose main activity does not directly fall within the covered sector.

## Conditions
This exclusivity is granted under the {{tier}} tier and the amount of {{amount}}. It remains subject to the Partner fulfilling its contractual obligations, including payment and timely delivery of the required assets.

## Interpretation
In case of doubt as to whether an organization is a direct competitor, the Parties shall consult in good faith before any relevant partnership is confirmed.

{{SIGNATURE}}`,
  },
  brand_assets: {
    nameFr: "Demande d'éléments de marque", nameEn: "Brand Assets Request",
    bodyFr: `## Demande d'éléments de marque
{{sponsor_name}} — Partenaire {{tier}} · EOCON 2026

Afin d'activer correctement votre visibilité dans le cadre d'EOCON 2026, merci de nous transmettre les éléments ci-dessous avant le {{deadline_print}} pour les supports imprimés et avant le {{deadline_digital}} pour les supports digitaux.

## Éléments requis
- Logo vectoriel : SVG ou EPS
- Logo PNG fond transparent : largeur minimale recommandée 1000 px
- Versions monochromes du logo : blanc et noir
- Nom légal exact à utiliser dans les mentions officielles
- Site web officiel et liens réseaux sociaux à promouvoir
- Courte description de l'organisation : 80 mots maximum, idéalement en français et en anglais
- Référent communication : nom, fonction et email

## Autorisation d'usage
En nous transmettant ces éléments, {{sponsor_name}} autorise {{organizer_name}} à les utiliser exclusivement pour l'activation du partenariat EOCON 2026 : site web, supports de communication, supports imprimés, signalétique, présentations, réseaux sociaux et bilan post-événement.

Le Partenaire garantit disposer des droits nécessaires sur les éléments transmis et reste responsable de leur exactitude.

## Délais importants
Les éléments reçus après le {{deadline_print}} peuvent ne pas figurer sur certains supports imprimés. Les éléments reçus après le {{deadline_digital}} peuvent retarder ou limiter certaines activations digitales.

## Où envoyer
Merci d'adresser ces éléments à {{organizer_email}} en indiquant « Brand assets — {{sponsor_name}} » en objet.

## Visibilités prévues
{{PERKS}}`,
    bodyEn: `## Brand Assets Request
{{sponsor_name}} — {{tier}} Partner · EOCON 2026

To properly activate your visibility for EOCON 2026, please send us the assets below before {{deadline_print}} for print materials and before {{deadline_digital}} for digital materials.

## Required assets
- Vector logo: SVG or EPS
- Transparent PNG logo: recommended minimum width 1000 px
- Monochrome logo versions: white and black
- Exact legal name to use in official mentions
- Official website and social media links to promote
- Short organization description: maximum 80 words, ideally in French and English
- Communication lead: name, title and email

## Usage authorization
By sending these assets, {{sponsor_name}} authorizes {{organizer_name}} to use them exclusively for EOCON 2026 partnership activation: website, communication materials, print materials, signage, presentations, social media and post-event reporting.

The Partner warrants that it holds the required rights to the assets provided and remains responsible for their accuracy.

## Important deadlines
Assets received after {{deadline_print}} may not appear on certain print materials. Assets received after {{deadline_digital}} may delay or limit certain digital activations.

## Where to send
Please send these elements to {{organizer_email}} with the subject "Brand assets — {{sponsor_name}}".

## Planned visibility
{{PERKS}}`,
  },
  comm_plan: {
    nameFr: "Plan de communication sponsor", nameEn: "Sponsor Communication Plan",
    bodyFr: `## Plan de communication sponsor
{{sponsor_name}} — Partenaire {{tier}} · EOCON 2026 ({{event_date}})

Ce plan précise les principales actions de visibilité prévues dans le cadre du partenariat {{tier}}. Il sert de feuille de route opérationnelle entre {{organizer_name}} et {{sponsor_name}}.

## Canaux & contreparties
{{PERKS}}

## Calendrier indicatif
- Dès confirmation : intégration du logo sur les supports digitaux éligibles et annonce selon le niveau de partenariat
- Avant le {{deadline_print}} : validation des éléments destinés aux supports imprimés
- Avant le {{deadline_digital}} : validation des éléments destinés aux supports digitaux, pages web, posts et visuels de campagne
- J-6 à J-1 (programme en ligne) : visibilité pendant les conférences, ateliers et le challenge pratique de cybersécurité
- Jour présentiel ({{event_date}}) : visibilité sur site, signalétique, stand, prise de parole ou activation selon le niveau retenu
- Après l'événement : remerciements publics et récapitulatif des principales visibilités livrées lorsque cela est applicable

## Responsabilités du Partenaire
- Fournir les logos, descriptions, liens et contacts de validation dans les délais
- Valider les contenus soumis dans un délai raisonnable afin de ne pas retarder la campagne
- Informer l'Organisateur de toute contrainte d'usage de marque ou formulation obligatoire

## Responsabilités de l'Organisateur
- Coordonner la mise en visibilité du Partenaire selon les contreparties prévues
- Respecter les éléments de marque transmis par le Partenaire
- Informer le Partenaire des échéances clés et besoins de validation
- Ajuster raisonnablement les activations en cas de contrainte technique, éditoriale ou logistique

## Coordination
Un contact unique côté Organisateur assure le suivi. Merci de nous communiquer votre référent communication afin de fluidifier les validations et la livraison des activations prévues.`,
    bodyEn: `## Sponsor Communication Plan
{{sponsor_name}} — {{tier}} Partner · EOCON 2026 ({{event_date}})

This plan outlines the main visibility actions planned under the {{tier}} partnership. It serves as an operational roadmap between {{organizer_name}} and {{sponsor_name}}.

## Channels & benefits
{{PERKS}}

## Indicative timeline
- Upon confirmation: logo integration on eligible digital materials and announcement according to partnership tier
- Before {{deadline_print}}: approval of assets intended for print materials
- Before {{deadline_digital}}: approval of assets intended for digital materials, web pages, posts and campaign visuals
- D-6 to D-1 (online program): visibility during talks, workshops and the hands-on cybersecurity challenge
- In-person day ({{event_date}}): on-site visibility, signage, booth, speaking opportunity or activation according to the selected tier
- After the event: public thanks and summary of key delivered visibility where applicable

## Partner responsibilities
- Provide logos, descriptions, links and approval contacts within the required deadlines
- Approve submitted content within a reasonable timeframe so the campaign is not delayed
- Inform the Organizer of any brand usage restriction or mandatory wording

## Organizer responsibilities
- Coordinate Partner visibility according to the agreed benefits
- Respect the brand assets provided by the Partner
- Inform the Partner of key deadlines and approval needs
- Reasonably adjust activations in case of technical, editorial or logistical constraints

## Coordination
A single point of contact on the Organizer's side handles the follow-up. Please share your communication lead to streamline approvals and delivery of the planned activations.`,
  },
};

// Replace {{placeholders}} in a template body (case-sensitive, {{PERKS}}/{{SIGNATURE}} left as-is).
export function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (key === "PERKS" || key === "SIGNATURE") return m; // handled by the renderer
    return vars[key] ?? "";
  });
}
