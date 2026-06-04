"use client";
import { useState } from "react";
import { Translations } from "@/lib/i18n";

export default function Volunteer({ t }: { t: Translations }) {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", city: "", role: "", experience: "", motivation: "", lang_expression: "fr"
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="volunteer" className="py-24 px-4 relative bg-dark-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; JOIN --volunteer EOCON2026
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.volunteer.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-neon-green/60 text-lg max-w-2xl mx-auto">{t.volunteer.subtitle}</p>
          <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto">{t.volunteer.description}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: perks & roles */}
          <div className="space-y-8">
            {/* Perks */}
            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.volunteer.perks_title}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {t.volunteer.perks.map((p, i) => (
                  <div key={i} className="cyber-card rounded-lg p-3 flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-neon-green">⬡</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.volunteer.roles_title}
              </h3>
              <div className="space-y-3">
                {t.volunteer.roles.map((r, i) => (
                  <div key={i} className="cyber-card rounded-lg p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green text-xs font-mono shrink-0" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">{r.title}</h4>
                      <p className="text-gray-500 text-xs mt-1">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <h3 className="text-white font-bold text-xl mb-6">{t.volunteer.form.title}</h3>
            {submitted ? (
              <div className="cyber-card rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <p className="text-neon-green font-mono text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.volunteer.form.success}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.name} *</label>
                    <input required className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.volunteer.form.name}
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.email} *</label>
                    <input required type="email" className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.volunteer.form.email}
                      value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.phone}</label>
                    <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.volunteer.form.phone}
                      value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.city}</label>
                    <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.volunteer.form.city}
                      value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.role}</label>
                  <select className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent"
                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                    <option value="">--</option>
                    {t.volunteer.roles.map(r => <option key={r.title} value={r.title} className="bg-dark-800">{r.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.experience}</label>
                  <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-sm resize-none" placeholder={t.volunteer.form.experience}
                    value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.motivation} *</label>
                  <textarea required rows={3} className="cyber-input w-full px-3 py-2 rounded text-sm resize-none" placeholder={t.volunteer.form.motivation}
                    value={formData.motivation} onChange={e => setFormData({ ...formData, motivation: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.volunteer.form.lang_expression}</label>
                  <select className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent" value={formData.lang_expression} onChange={e => setFormData({ ...formData, lang_expression: e.target.value })}>
                    <option value="fr" className="bg-dark-800">Français</option>
                    <option value="en" className="bg-dark-800">English</option>
                  </select>
                </div>
                {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50">
                  {loading ? "..." : t.volunteer.form.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
