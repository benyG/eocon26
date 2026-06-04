"use client";
import { useState } from "react";
import { Translations } from "@/lib/i18n";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Bangladesh","Belarus","Belgium","Benin","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Bulgaria","Burkina Faso","Burundi",
  "Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Congo","Congo (DRC)","Côte d'Ivoire","Croatia","Cuba",
  "Czech Republic","Denmark","Djibouti","Dominican Republic","Ecuador","Egypt","El Salvador","Eritrea","Estonia","Ethiopia",
  "Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Guatemala","Guinea","Guinea-Bissau",
  "Haiti","Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kosovo","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Liberia","Libya","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Mali","Malta","Mauritania","Mauritius","Mexico","Moldova","Mongolia","Montenegro","Morocco","Mozambique",
  "Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman","Pakistan","Palestine","Panama","Paraguay","Peru","Philippines","Poland","Portugal","Qatar",
  "Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Sierra Leone","Singapore","Slovakia","Slovenia","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
];

export default function CFPSection({ t }: { t: Translations }) {
  const [formData, setFormData] = useState({
    name: "", email: "", org: "", country: "", talk_title: "", format: "", abstract: "", bio: "", lang_presentation: "fr"
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cfp", {
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

  const formats = [t.cfp.format1, t.cfp.format2, t.cfp.format3, t.cfp.format4];

  return (
    <section id="cfp" className="py-24 px-4 relative bg-dark-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; OPEN CFP.FORM
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.cfp.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-neon-green/60 text-lg max-w-2xl mx-auto">{t.cfp.subtitle}</p>
          <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto">{t.cfp.description}</p>
          <div className="mt-4 inline-block px-4 py-1.5 bg-neon-green/10 border border-neon-green/30 rounded-full text-neon-green text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ⏰ {t.cfp.deadline}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: topics & formats */}
          <div className="space-y-8">
            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.cfp.topics_title}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {t.cfp.topics.map((topic, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-400 group hover:text-gray-200 transition-colors">
                    <span className="text-neon-green/40 font-mono text-xs w-6 shrink-0" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="w-px h-4 bg-neon-green/20 group-hover:bg-neon-green/60 transition-colors" />
                    {topic}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.cfp.formats_title}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {formats.map((fmt, i) => (
                  <div key={i} className="cyber-card rounded-lg p-3 text-sm text-gray-400 text-center">
                    {fmt}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <h3 className="text-white font-bold text-xl mb-6">{t.cfp.form.title}</h3>
            {submitted ? (
              <div className="cyber-card rounded-xl p-8 text-center">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-neon-green font-mono text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.cfp.form.success}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.name} *</label>
                    <input
                      required
                      className="cyber-input w-full px-3 py-2 rounded text-sm"
                      placeholder={t.cfp.form.name}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.email} *</label>
                    <input
                      required type="email"
                      className="cyber-input w-full px-3 py-2 rounded text-sm"
                      placeholder={t.cfp.form.email}
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.org}</label>
                    <input
                      className="cyber-input w-full px-3 py-2 rounded text-sm"
                      placeholder={t.cfp.form.org}
                      value={formData.org}
                      onChange={e => setFormData({ ...formData, org: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.country}</label>
                    <select
                      className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent"
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                    >
                      <option value="">--</option>
                      {COUNTRIES.map(c => <option key={c} value={c} className="bg-dark-800">{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.talk_title} *</label>
                  <input
                    required
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder={t.cfp.form.talk_title}
                    value={formData.talk_title}
                    onChange={e => setFormData({ ...formData, talk_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.format}</label>
                  <select
                    className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent"
                    value={formData.format}
                    onChange={e => setFormData({ ...formData, format: e.target.value })}
                  >
                    <option value="">--</option>
                    {formats.map(f => <option key={f} value={f} className="bg-dark-800">{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.abstract} *</label>
                  <textarea
                    required rows={4}
                    className="cyber-input w-full px-3 py-2 rounded text-sm resize-none"
                    placeholder={t.cfp.form.abstract}
                    value={formData.abstract}
                    onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.bio}</label>
                  <textarea
                    rows={3}
                    className="cyber-input w-full px-3 py-2 rounded text-sm resize-none"
                    placeholder={t.cfp.form.bio}
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.cfp.form.lang_presentation} *</label>
                  <select required className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent" value={formData.lang_presentation} onChange={e => setFormData({ ...formData, lang_presentation: e.target.value })}>
                    <option value="fr" className="bg-dark-800">Français</option>
                    <option value="en" className="bg-dark-800">English</option>
                  </select>
                </div>
                {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50">
                  {loading ? "..." : t.cfp.form.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
