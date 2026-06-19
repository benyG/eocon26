"use client";
import { useState, useEffect } from "react";
import { Translations } from "@/lib/i18n";
import CountrySelect from "@/components/CountrySelect";
import { useEventSettings } from "@/lib/useEventSettings";
import { evaluateCfpWindow } from "@/lib/cfpWindow";

export default function CFPModal({ t, onClose }: { t: Translations; onClose: () => void }) {
  const settings = useEventSettings();
  const win = evaluateCfpWindow(settings.cfp_open_date, settings.cfp_close_date);
  const closed = win.hasWindow && !win.open;
  const [formData, setFormData] = useState({
    name: "", email: "", org: "", country: "", talk_title: "", format: "", abstract: "", bio: "",
    linkedin: "", twitter: "", whatsapp: "", certifications: "", lang_presentation: "fr"
  });
  const [submitted, setSubmitted] = useState(false);
  const [wasDeferred, setWasDeferred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      const data = await res.json().catch(() => ({}));
      setWasDeferred(!!data.deferred);
      setSubmitted(true);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const formats: { slug: string; label: string }[] = [
    { slug: "talk", label: t.cfp.format1 },
    { slug: "lightning", label: t.cfp.format2 },
    { slug: "workshop", label: t.cfp.format3 },
    { slug: "panel", label: t.cfp.format4 },
  ];

  return (
    <div className="modal-backdrop">
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#0a0a0f", border: "1px solid rgba(0,255,157,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neon-green/10">
          <div>
            <h2 className="text-2xl font-black text-white">{t.cfp.form.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{t.cfp.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-neon-green transition-colors text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">✅</div>
              <p className="text-neon-green font-mono text-lg mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {t.cfp.form.success}
              </p>
              {wasDeferred && (
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-2">
                  Les soumissions pour l&apos;édition en cours sont closes — votre proposition sera conservée pour la prochaine édition.
                  <br />
                  <span className="text-gray-600">Submissions for the current edition are closed — your proposal will be kept for the next edition.</span>
                </p>
              )}
              <button onClick={onClose} className="btn-neon px-6 py-2 rounded text-sm mt-4">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {closed && (
                <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
                  <p className="font-bold mb-0.5">⏳ Soumissions closes pour l&apos;édition en cours · Submissions closed for the current edition</p>
                  <p className="text-yellow-200/70">
                    Vous pouvez toujours soumettre : votre proposition sera conservée pour la prochaine édition.
                    {" · "}You can still submit: your proposal will be kept for the next edition.
                  </p>
                </div>
              )}
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
                  <CountrySelect
                    value={formData.country}
                    onChange={v => setFormData({ ...formData, country: v })}
                    className="w-full"
                  />
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
                  {formats.map(f => <option key={f.slug} value={f.slug} className="bg-dark-800">{f.label}</option>)}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>LinkedIn</label>
                  <input
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder="linkedin.com/in/…"
                    value={formData.linkedin}
                    onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>X / Twitter</label>
                  <input
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder="@handle"
                    value={formData.twitter}
                    onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>WhatsApp</label>
                  <input
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder="+237…"
                    value={formData.whatsapp}
                    onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Certifications <span className="text-gray-600">(optionnel)</span></label>
                <textarea
                  className="cyber-input w-full px-3 py-2 rounded text-sm resize-none"
                  rows={2}
                  placeholder="Ex: OSCP, CEH, CISSP, eWPT, CRTO…"
                  value={formData.certifications}
                  onChange={e => setFormData({ ...formData, certifications: e.target.value })}
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
  );
}
