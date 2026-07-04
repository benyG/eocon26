import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — EOCON 2026",
  description: "Terms and conditions for EOCON 2026 — EyesOpen Security Conference. Conditions générales d'utilisation.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">

        {/* Back link */}
        <Link
          href="/"
          className="text-xs font-mono text-neon-green hover:underline mb-10 inline-block"
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
        >
          &lt; Back to EOCON 2026
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; EOCON_26 / LEGAL
          </p>
          <h1 className="text-3xl font-black text-white mb-1">Terms &amp; Conditions</h1>
          <h2 className="text-xl font-bold text-gray-400 mb-4">Conditions Générales</h2>
          <p className="text-gray-500 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            Last updated · Dernière mise à jour : July 2026
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* ── 1. Organizer ─────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              01 — Organizer / Organisateur
            </h3>
            <p className="text-gray-300 mb-3">
              EOCON 2026 is organized by <strong className="text-white">Services ExamBoot Inc.</strong>, incorporated in Canada.
              Registered address: <strong className="text-white">1321 Rue des Céramistes, Québec, G3K 0R2, Canada</strong>.
              Contact: <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>.
            </p>
            <p className="text-gray-400">
              EOCON 2026 est organisé par <strong className="text-white">Services ExamBoot Inc.</strong>, société incorporée au Canada.
              Adresse enregistrée : <strong className="text-white">1321 Rue des Céramistes, Québec, G3K 0R2, Canada</strong>.
              Contact : <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>.
            </p>
          </section>

          {/* ── 2. Registration ──────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              02 — Registration / Inscription
            </h3>
            <p className="text-gray-300 mb-3">
              By registering for EOCON 2026, you confirm that the information provided is accurate and complete.
              Each ticket is personal and non-transferable unless otherwise stated. The organizer reserves the right
              to refuse or cancel a registration that does not meet the event's eligibility criteria.
            </p>
            <p className="text-gray-400">
              En vous inscrivant à EOCON 2026, vous confirmez que les informations fournies sont exactes et complètes.
              Chaque billet est personnel et non cessible, sauf mention contraire. L'organisateur se réserve le droit
              de refuser ou d'annuler une inscription ne répondant pas aux critères d'éligibilité de l'événement.
            </p>
          </section>

          {/* ── 3. Tickets & Payment ─────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              03 — Tickets &amp; Payment / Billets &amp; Paiement
            </h3>
            <p className="text-gray-300 mb-3">
              All prices are displayed inclusive of applicable taxes. Payment is processed securely via our payment
              partners (Stripe / Netticket). A confirmation email with your QR code will be sent upon successful payment.
              In case of payment failure, your registration is not confirmed.
            </p>
            <p className="text-gray-400">
              Tous les prix sont affichés toutes taxes comprises. Le paiement est traité de manière sécurisée via nos
              partenaires de paiement (Stripe / Netticket). Un email de confirmation accompagné de votre QR code vous
              sera envoyé dès réception du paiement. En cas d'échec du paiement, votre inscription n'est pas confirmée.
            </p>
          </section>

          {/* ── 4. Cancellation & Refund ─────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              04 — Cancellation &amp; Refund / Annulation &amp; Remboursement
            </h3>
            <ul className="list-none space-y-2 text-gray-300 mb-3">
              {[
                "Cancellation more than 60 days before the event: full refund minus processing fees.",
                "Cancellation between 30 and 60 days before the event: 50% refund.",
                "Cancellation less than 30 days before the event: no refund. Ticket may be transferred to another person upon written request.",
                "If the event is cancelled by the organizer, full refunds will be issued.",
              ].map(item => (
                <li key={item} className="flex gap-2"><span className="text-neon-green shrink-0">▸</span>{item}</li>
              ))}
            </ul>
            <ul className="list-none space-y-2 text-gray-400">
              {[
                "Annulation plus de 60 jours avant l'événement : remboursement intégral moins les frais de traitement.",
                "Annulation entre 30 et 60 jours avant l'événement : remboursement à 50 %.",
                "Annulation moins de 30 jours avant l'événement : aucun remboursement. Le billet peut être transféré à une autre personne sur demande écrite.",
                "En cas d'annulation par l'organisateur, un remboursement intégral sera effectué.",
              ].map(item => (
                <li key={item} className="flex gap-2"><span className="text-neon-green shrink-0">▸</span>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 5. Event Changes ─────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              05 — Event Changes / Modifications de l'événement
            </h3>
            <p className="text-gray-300 mb-3">
              The organizer reserves the right to modify the program, speakers, format, or date of EOCON 2026
              due to circumstances beyond its control (force majeure, health or safety reasons, etc.).
              Registered attendees will be notified as soon as possible. Such changes do not entitle attendees
              to a refund unless the event is cancelled outright.
            </p>
            <p className="text-gray-400">
              L'organisateur se réserve le droit de modifier le programme, les intervenants, le format ou la date
              d'EOCON 2026 pour des raisons indépendantes de sa volonté (force majeure, raisons sanitaires ou de sécurité, etc.).
              Les participants inscrits seront informés dans les meilleurs délais. Ces modifications n'ouvrent pas droit
              à remboursement, sauf annulation totale de l'événement.
            </p>
          </section>

          {/* ── 6. Code of Conduct ───────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              06 — Code of Conduct / Code de conduite
            </h3>
            <p className="text-gray-300 mb-3">
              All attendees, speakers, sponsors, and volunteers are required to respect EOCON's Code of Conduct.
              Harassment, discrimination, or disruptive behavior of any kind will result in immediate expulsion
              from the event without refund. The organizer's decisions in such matters are final.
            </p>
            <p className="text-gray-400">
              Tous les participants, speakers, sponsors et bénévoles sont tenus de respecter le Code de conduite d'EOCON.
              Tout harcèlement, discrimination ou comportement perturbateur entraînera l'exclusion immédiate de l'événement
              sans remboursement. Les décisions de l'organisateur en la matière sont définitives.
            </p>
          </section>

          {/* ── 7. Intellectual Property ─────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              07 — Intellectual Property / Propriété intellectuelle
            </h3>
            <p className="text-gray-300 mb-3">
              All content produced by EOCON 2026 (videos, slides, branding, website) is the property of Services ExamBoot Inc.
              or its content partners. Speakers retain ownership of their own presentations but grant EOCON a non-exclusive
              licence to record, reproduce, and broadcast them.
            </p>
            <p className="text-gray-400">
              L'ensemble du contenu produit par EOCON 2026 (vidéos, diapositives, identité visuelle, site web) est la propriété
              de Services ExamBoot Inc. ou de ses partenaires de contenu. Les speakers conservent la propriété de leurs
              présentations, mais accordent à EOCON une licence non exclusive de les enregistrer, reproduire et diffuser.
            </p>
          </section>

          {/* ── 8. Photography & Recording ───────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              08 — Photography &amp; Recording / Photos &amp; Enregistrements
            </h3>
            <p className="text-gray-300 mb-3">
              By attending EOCON 2026, you acknowledge that photos, videos, and audio recordings may be taken
              during the event and used for promotional and archival purposes. If you do not wish to appear
              in such media, please notify the organising team on site.
            </p>
            <p className="text-gray-400">
              En assistant à EOCON 2026, vous reconnaissez que des photos, vidéos et enregistrements audio pourront être réalisés
              pendant l'événement et utilisés à des fins promotionnelles et d'archivage. Si vous ne souhaitez pas apparaître
              dans ces médias, veuillez en informer l'équipe organisatrice sur place.
            </p>
          </section>

          {/* ── 9. Liability ─────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              09 — Limitation of Liability / Limitation de responsabilité
            </h3>
            <p className="text-gray-300 mb-3">
              Services ExamBoot Inc. shall not be liable for any indirect, incidental, or consequential damages
              arising from attendance at EOCON 2026. Our liability is limited to the amount paid for the ticket.
              Attendees are responsible for their own travel, accommodation, and insurance arrangements.
            </p>
            <p className="text-gray-400">
              Services ExamBoot Inc. ne saurait être tenu responsable de dommages indirects, accessoires ou consécutifs
              liés à la participation à EOCON 2026. Notre responsabilité est limitée au montant payé pour le billet.
              Les participants sont responsables de leurs propres arrangements de voyage, hébergement et assurance.
            </p>
          </section>

          {/* ── 10. Governing Law ────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              10 — Governing Law / Droit applicable
            </h3>
            <p className="text-gray-300 mb-3">
              These terms are governed by the laws of the Province of Québec, Canada. Any dispute arising from
              these terms shall be subject to the exclusive jurisdiction of the courts of Québec City, Québec.
            </p>
            <p className="text-gray-400">
              Les présentes conditions sont régies par les lois de la Province de Québec, Canada. Tout litige
              découlant des présentes conditions relèvera de la compétence exclusive des tribunaux de Québec (Québec).
            </p>
          </section>

          {/* ── 11. Contact ──────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              11 — Contact
            </h3>
            <p className="text-gray-300">
              Services ExamBoot Inc. ·{" "}
              <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>
              <br />1321 Rue des Céramistes, Québec, G3K 0R2, Canada
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-neon-green/10 flex items-center justify-between flex-wrap gap-4">
          <p className="text-gray-700 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            © 2026 Services ExamBoot Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-neon-green text-xs font-mono hover:underline" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              &lt; Privacy Policy
            </Link>
            <Link href="/" className="text-neon-green text-xs font-mono hover:underline" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              &lt; EOCON 2026
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
