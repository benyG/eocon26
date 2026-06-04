"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface Sponsor {
  id: number;
  name: string;
  tier: string;
  logoUrl: string | null;
  website: string | null;
}

interface SponsorPackage {
  id: number;
  tier: string;
  nameFr: string;
  nameEn: string;
  price: number;
  perksFr: string;
  perksEn: string;
  highlightColor: string | null;
  isVisible: boolean;
  sortOrder: number;
}

const tierOrder = ["platinum", "gold", "silver", "bronze"];
const tierColors: Record<string, string> = {
  platinum: "#E5E4E2",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
};

export default function Sponsors({ t, lang = "fr" }: { t: Translations; lang?: "en" | "fr" }) {
  const tiers = t.sponsors.tiers;
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [packages, setPackages] = useState<SponsorPackage[]>([]);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [form, setForm] = useState({ org: "", contact: "", email: "", phone: "", selectedPackage: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/sponsors").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSponsors(data);
    }).catch(() => {});
    fetch("/api/packages").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPackages(data);
    }).catch(() => {});
  }, []);

  const grouped = tierOrder.reduce<Record<string, Sponsor[]>>((acc, tier) => {
    acc[tier] = sponsors.filter(s => s.tier === tier);
    return acc;
  }, {});

  const hasSponsors = sponsors.length > 0;

  const parsePerks = (raw: string): string[] => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.org.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/partner-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org: form.org,
          contact: form.contact,
          email: form.email,
          phone: form.phone,
          package: form.selectedPackage,
          message: form.message,
        }),
      });
      setSubmitted(true);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowPartnerForm(false);
    setSubmitted(false);
    setForm({ org: "", contact: "", email: "", phone: "", selectedPackage: "", message: "" });
  };

  // Determine which tiers to show
  const useDbPackages = packages.length > 0;

  return (
    <section id="sponsors" className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; CAT SPONSORS.MD
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.sponsors.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.sponsors.subtitle}</p>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl mx-auto">{t.sponsors.description}</p>
        </div>

        {/* Sponsor logos */}
        <div className="mb-16 p-8 rounded-2xl border border-dashed border-neon-green/10">
          {hasSponsors ? (
            <div className="space-y-8">
              {tierOrder.map(tier => {
                const tierSponsors = grouped[tier];
                if (!tierSponsors.length) return null;
                return (
                  <div key={tier}>
                    <p
                      className="text-xs font-mono uppercase tracking-widest mb-4 text-center"
                      style={{ color: tierColors[tier], fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      ◆ {tier}
                    </p>
                    <div className="flex flex-wrap justify-center gap-6">
                      {tierSponsors.map(s => (
                        <a
                          key={s.id}
                          href={s.website || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center rounded border border-gray-800 hover:border-neon-green/30 transition-all p-3 bg-white/5"
                          style={{ minWidth: "120px", minHeight: "60px" }}
                          title={s.name}
                        >
                          {s.logoUrl ? (
                            <img src={s.logoUrl} alt={s.name} className="max-h-12 max-w-[140px] object-contain" />
                          ) : (
                            <span className="text-gray-400 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                              {s.name}
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 text-sm font-mono mb-6" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                [ SPONSOR LOGOS COMING SOON ]
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-32 h-16 rounded border border-dashed border-gray-800 flex items-center justify-center"
                  >
                    <span className="text-gray-700 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>SPONSOR</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tiers */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {useDbPackages
            ? packages.map((pkg, i) => {
                const name = lang === "fr" ? pkg.nameFr : pkg.nameEn;
                const perks = parsePerks(lang === "fr" ? pkg.perksFr : pkg.perksEn);
                const color = pkg.highlightColor || tierColors[pkg.tier] || "#00ff9d";
                return (
                  <div
                    key={pkg.id}
                    className="cyber-card rounded-xl p-6 flex flex-col"
                    style={{
                      borderColor: color + "40",
                      background: i === 0 ? "rgba(229,228,226,0.03)" : undefined,
                    }}
                  >
                    <div
                      className="text-sm font-black uppercase tracking-widest mb-2 font-mono"
                      style={{ color, fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      ◆ {name}
                    </div>
                    <div className="text-xs font-mono mb-4" style={{ color }}>
                      {pkg.price.toLocaleString()} FCFA
                    </div>
                    <ul className="space-y-2 flex-1">
                      {perks.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                          <span style={{ color }} className="mt-0.5 shrink-0">✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            : tiers.map((tier, i) => (
                <div
                  key={tier.name}
                  className="cyber-card rounded-xl p-6 flex flex-col"
                  style={{
                    borderColor: tier.color + "40",
                    background: i === 0 ? "rgba(229,228,226,0.03)" : undefined,
                  }}
                >
                  <div
                    className="text-sm font-black uppercase tracking-widest mb-4 font-mono"
                    style={{ color: tier.color, fontFamily: "'Share Tech Mono', monospace" }}
                  >
                    ◆ {tier.name}
                  </div>
                  <ul className="space-y-2 flex-1">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                        <span style={{ color: tier.color }} className="mt-0.5 shrink-0">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
        </div>

        <div className="text-center space-y-4">
          <button
            onClick={() => setShowPartnerForm(true)}
            className="inline-block btn-neon-solid px-8 py-4 rounded text-sm border-2 border-neon-green"
          >
            {t.sponsors.cta}
          </button>
          <p className="text-gray-600 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {t.sponsors.contact}
          </p>
        </div>
      </div>

      {/* Partner Request Modal */}
      {showPartnerForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-black text-lg">{t.sponsors.cta}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {submitted ? (
              <div className="text-center py-8">
                <p className="text-neon-green text-lg font-bold mb-2">✓ {lang === "fr" ? "Demande envoyée !" : "Request sent!"}</p>
                <p className="text-gray-400 text-sm">
                  {lang === "fr" ? "Nous vous contacterons très prochainement." : "We will contact you shortly."}
                </p>
                <button onClick={closeModal} className="mt-6 btn-neon px-6 py-2 rounded text-sm">
                  {lang === "fr" ? "Fermer" : "Close"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {lang === "fr" ? "Organisation *" : "Organization *"}
                  </label>
                  <input
                    required
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    value={form.org}
                    onChange={e => setForm(p => ({ ...p, org: e.target.value }))}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      {lang === "fr" ? "Contact" : "Contact"}
                    </label>
                    <input
                      className="cyber-input w-full px-3 py-2 rounded text-sm"
                      value={form.contact}
                      onChange={e => setForm(p => ({ ...p, contact: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email</label>
                    <input
                      type="email"
                      className="cyber-input w-full px-3 py-2 rounded text-sm"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {lang === "fr" ? "Téléphone" : "Phone"}
                  </label>
                  <input
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {lang === "fr" ? "Package souhaité" : "Desired package"}
                  </label>
                  <select
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    value={form.selectedPackage}
                    onChange={e => setForm(p => ({ ...p, selectedPackage: e.target.value }))}
                  >
                    <option value="">{lang === "fr" ? "Choisir un package" : "Choose a package"}</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.tier}>
                        {lang === "fr" ? pkg.nameFr : pkg.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {lang === "fr" ? "Message" : "Message"}
                  </label>
                  <textarea
                    rows={3}
                    className="cyber-input w-full px-3 py-2 rounded text-sm resize-none"
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-neon-solid px-6 py-2 rounded text-sm border-2 border-neon-green disabled:opacity-50"
                  >
                    {submitting ? "…" : (lang === "fr" ? "Envoyer" : "Send")}
                  </button>
                  <button type="button" onClick={closeModal} className="px-6 py-2 rounded text-sm text-gray-500 hover:text-white">
                    {lang === "fr" ? "Annuler" : "Cancel"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
