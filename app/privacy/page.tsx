import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — EOCON 2026",
  description: "Privacy Policy for EOCON 2026 — EOCON Cybersecurity Event. Politique de confidentialité.",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-black text-white mb-1">Privacy Policy</h1>
          <h2 className="text-xl font-bold text-gray-400 mb-4">Politique de confidentialité</h2>
          <p className="text-gray-500 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            Last updated · Dernière mise à jour : June 2026
          </p>
        </div>

        {/* Bilingual sections */}
        <div className="space-y-10 text-sm leading-relaxed">

          {/* ── 1. Who we are ──────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              01 — Who We Are / Qui nous sommes
            </h3>
            <p className="text-gray-300 mb-3">
              EOCON 2026 is organized by <strong className="text-white">Services ExamBoot Inc.</strong>, a company incorporated in Canada.
              Registered address: <strong className="text-white">1321 Rue des Céramistes, Quebec, G3K 0R2, Canada</strong>.
              Contact:{" "}
              <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>.
            </p>
            <p className="text-gray-400">
              EOCON 2026 est organisé par <strong className="text-white">Services ExamBoot Inc.</strong>, une société incorporée au Canada.
              Adresse enregistrée : <strong className="text-white">1321 Rue des Céramistes, Québec, G3K 0R2, Canada</strong>.
              Contact :{" "}
              <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>.
            </p>
          </section>

          {/* ── 2. Data collected ─────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              02 — Data We Collect / Données collectées
            </h3>
            <p className="text-gray-300 mb-2">We collect the following personal data when you register, submit a CFP, or volunteer:</p>
            <ul className="list-none space-y-1 text-gray-300 mb-3">
              {[
                "Full name, email address, phone number",
                "Professional information (organization, job title)",
                "Country of residence",
                "Language preference (EN/FR)",
                "Payment information (processed securely via third-party — we do not store card numbers)",
                "Ticket type and attendance status",
              ].map(item => (
                <li key={item} className="flex gap-2"><span className="text-neon-green shrink-0">▸</span>{item}</li>
              ))}
            </ul>
            <p className="text-gray-400 mb-2">Nous collectons les données personnelles suivantes lors de votre inscription, soumission CFP ou bénévolat :</p>
            <ul className="list-none space-y-1 text-gray-400">
              {[
                "Nom complet, adresse e-mail, numéro de téléphone",
                "Informations professionnelles (organisation, intitulé de poste)",
                "Pays de résidence",
                "Préférence linguistique (EN/FR)",
                "Informations de paiement (traitées via un tiers sécurisé — nous ne stockons pas les numéros de carte)",
                "Type de billet et statut de présence",
              ].map(item => (
                <li key={item} className="flex gap-2"><span className="text-neon-green shrink-0">▸</span>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 3. Purpose ────────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              03 — Purpose of Processing / Finalités du traitement
            </h3>
            <p className="text-gray-300 mb-2">Your data is used exclusively to:</p>
            <ul className="list-none space-y-1 text-gray-300 mb-3">
              {[
                "Manage your event registration and issue your ticket & QR code",
                "Send confirmation, schedule updates, and logistical information",
                "Issue participation or speaker certificates after the event",
                "Send the EOCON newsletter if you subscribed (unsubscribe any time)",
                "Comply with legal obligations",
              ].map(item => (
                <li key={item} className="flex gap-2"><span className="text-neon-green shrink-0">▸</span>{item}</li>
              ))}
            </ul>
            <p className="text-gray-400 mb-2">Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-none space-y-1 text-gray-400">
              {[
                "Gérer votre inscription et émettre votre billet & QR code",
                "Envoyer la confirmation, les mises à jour du programme et les informations logistiques",
                "Émettre des certificats de participation ou de speaker après l'événement",
                "Envoyer la newsletter EOCON si vous y avez souscrit (désinscription à tout moment)",
                "Respecter nos obligations légales",
              ].map(item => (
                <li key={item} className="flex gap-2"><span className="text-neon-green shrink-0">▸</span>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 4. Legal basis ────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              04 — Legal Basis / Base légale
            </h3>
            <p className="text-gray-300 mb-3">
              Processing is based on (i) contractual necessity (fulfilling your registration), (ii) your consent (newsletter),
              and (iii) our legitimate interest in organizing a safe, well-managed event.
            </p>
            <p className="text-gray-400">
              Le traitement repose sur (i) l'exécution du contrat (traitement de votre inscription), (ii) votre consentement (newsletter),
              et (iii) notre intérêt légitime à organiser un événement sûr et bien géré.
            </p>
          </section>

          {/* ── 5. Data sharing ───────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              05 — Data Sharing / Partage des données
            </h3>
            <p className="text-gray-300 mb-3">
              We do <strong className="text-white">not</strong> sell or rent your personal data. We share data only with trusted service providers
              strictly necessary for the event (email delivery via <strong className="text-white">Resend</strong>, payment processing).
              These providers are bound by data processing agreements.
            </p>
            <p className="text-gray-400">
              Nous ne <strong className="text-white">vendons</strong> ni ne louons vos données personnelles. Nous partageons les données uniquement avec des prestataires
              de confiance strictement nécessaires à l'événement (envoi d'e-mails via <strong className="text-white">Resend</strong>, traitement des paiements).
              Ces prestataires sont liés par des accords de traitement de données.
            </p>
          </section>

          {/* ── 6. Retention ──────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              06 — Data Retention / Durée de conservation
            </h3>
            <p className="text-gray-300 mb-3">
              Registration data is retained for <strong className="text-white">3 years</strong> after the event for accounting and legal purposes, then deleted.
              Newsletter subscriptions are kept until you unsubscribe.
            </p>
            <p className="text-gray-400">
              Les données d'inscription sont conservées pendant <strong className="text-white">3 ans</strong> après l'événement à des fins comptables et légales, puis supprimées.
              Les abonnements à la newsletter sont conservés jusqu'à votre désinscription.
            </p>
          </section>

          {/* ── 7. Your rights ────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              07 — Your Rights / Vos droits
            </h3>
            <p className="text-gray-300 mb-2">
              You have the right to access, rectify, delete, or port your data, and to object to or restrict processing.
              To exercise these rights, contact us at{" "}
              <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>.
            </p>
            <p className="text-gray-400">
              Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation du traitement.
              Pour les exercer, contactez-nous à{" "}
              <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>.
            </p>
          </section>

          {/* ── 8. Cookies ────────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              08 — Cookies
            </h3>
            <p className="text-gray-300 mb-3">
              This site uses only strictly necessary session cookies (authentication) and no third-party analytics or advertising cookies.
            </p>
            <p className="text-gray-400">
              Ce site utilise uniquement des cookies de session strictement nécessaires (authentification) et aucun cookie d'analyse ou de publicité tiers.
            </p>
          </section>

          {/* ── 9. Security ───────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              09 — Security / Sécurité
            </h3>
            <p className="text-gray-300 mb-3">
              All data is stored in encrypted databases with access controls. Communications are encrypted in transit (HTTPS/TLS).
              We apply industry-standard security practices, consistent with our mission as a cybersecurity conference.
            </p>
            <p className="text-gray-400">
              Toutes les données sont stockées dans des bases de données chiffrées avec contrôles d'accès. Les communications sont chiffrées en transit (HTTPS/TLS).
              Nous appliquons les bonnes pratiques de sécurité du secteur, conformément à notre mission de conférence cybersécurité.
            </p>
          </section>

          {/* ── 10. Contact ───────────────────────────────────────── */}
          <section>
            <h3 className="text-neon-green font-mono uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              10 — Contact
            </h3>
            <p className="text-gray-300">
              Services ExamBoot Inc. · <a href="mailto:contact@eyesopensecurity.com" className="text-neon-green hover:underline">contact@eyesopensecurity.com</a>
              <br />1321 Rue des Céramistes, Québec, G3K 0R2, Canada
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-neon-green/10 flex items-center justify-between">
          <p className="text-gray-700 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            © 2026 Services ExamBoot Inc. All rights reserved.
          </p>
          <Link href="/" className="text-neon-green text-xs font-mono hover:underline" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &lt; EOCON 2026
          </Link>
        </div>
      </div>
    </main>
  );
}
