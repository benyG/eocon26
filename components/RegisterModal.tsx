"use client";
import { useState } from "react";
import { Translations } from "@/lib/i18n";

interface RegisterModalProps {
  t: Translations;
  onClose: () => void;
}

export default function RegisterModal({ t, onClose }: RegisterModalProps) {
  const [step, setStep] = useState<"tiers" | "form">("tiers");
  const [selectedTier, setSelectedTier] = useState("");
  const [formData, setFormData] = useState({ fname: "", lname: "", email: "", org: "", country: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, ticketType: selectedTier }),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const tierColors = ["#00ff9d", "#ffaa00", "#0066ff"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#0a0a0f", border: "1px solid rgba(0,255,157,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neon-green/10">
          <div>
            <h2 className="text-2xl font-black text-white">{t.register.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{t.register.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-neon-green transition-colors text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <p className="text-neon-green font-mono text-lg mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {t.register.form.success}
              </p>
              <button onClick={onClose} className="btn-neon px-6 py-2 rounded text-sm mt-4">
                Close
              </button>
            </div>
          ) : step === "tiers" ? (
            <div>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {t.register.tiers.map((tier, i) => (
                  <div
                    key={tier.name}
                    onClick={() => { setSelectedTier(tier.name); setStep("form"); }}
                    className="cursor-pointer rounded-xl p-5 border transition-all hover:scale-105"
                    style={{
                      borderColor: tierColors[i] + "40",
                      background: (tier as { featured?: boolean }).featured ? tierColors[i] + "10" : "rgba(255,255,255,0.02)",
                      boxShadow: (tier as { featured?: boolean }).featured ? `0 0 30px ${tierColors[i]}20` : undefined,
                    }}
                  >
                    {(tier as { featured?: boolean }).featured && (
                      <div className="text-xs font-mono text-center mb-2 font-bold" style={{ color: tierColors[i], fontFamily: "'Share Tech Mono', monospace" }}>
                        ★ RECOMMENDED
                      </div>
                    )}
                    <h3 className="font-bold text-white text-lg mb-1">{tier.name}</h3>
                    <div className="text-2xl font-black mb-3" style={{ color: tierColors[i], fontFamily: "'Share Tech Mono', monospace" }}>
                      {tier.price}
                    </div>
                    <ul className="space-y-1">
                      {tier.perks.map(p => (
                        <li key={p} className="flex items-start gap-2 text-xs text-gray-400">
                          <span style={{ color: tierColors[i] }}>✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    <div
                      className="mt-4 w-full py-2 rounded text-xs font-mono text-center font-bold uppercase"
                      style={{ background: tierColors[i] + "20", color: tierColors[i], fontFamily: "'Share Tech Mono', monospace" }}
                    >
                      {t.register.cta} →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setStep("tiers")}
                className="text-gray-500 hover:text-neon-green text-sm mb-6 flex items-center gap-1 font-mono transition-colors"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              >
                ← Back
              </button>
              <h3 className="text-white font-bold text-xl mb-6">{t.register.form.title}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.fname} *</label>
                    <input required className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.fname}
                      value={formData.fname} onChange={e => setFormData({ ...formData, fname: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.lname} *</label>
                    <input required className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.lname}
                      value={formData.lname} onChange={e => setFormData({ ...formData, lname: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.email} *</label>
                  <input required type="email" className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.email}
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.org}</label>
                    <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.org}
                      value={formData.org} onChange={e => setFormData({ ...formData, org: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.country}</label>
                    <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.country}
                      value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                  </div>
                </div>
                <div className="p-3 rounded bg-neon-green/5 border border-neon-green/10">
                  <p className="text-xs text-gray-500 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    Selected: <span className="text-neon-green">{selectedTier}</span>
                  </p>
                </div>
                {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50">
                  {loading ? "..." : t.register.form.submit}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
