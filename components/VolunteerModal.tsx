"use client";
import { useState, useEffect } from "react";
import { Translations } from "@/lib/i18n";
import { useEventSettings } from "@/lib/useEventSettings";
import { evaluateCfpWindow } from "@/lib/cfpWindow";

interface VolunteerModalProps {
  t: Translations;
  onClose: () => void;
  lang?: "fr" | "en";
}

export default function VolunteerModal({ t, onClose, lang = "fr" }: VolunteerModalProps) {
  const settings = useEventSettings();
  const win = evaluateCfpWindow(settings.volunteer_open_date, settings.volunteer_close_date);
  const closed = win.hasWindow && !win.open;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    role: "",
    experience: "",
    motivation: "",
    lang_expression: "fr",
    hours_per_week: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [wasDeferred, setWasDeferred] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      const data = await res.json().catch(() => ({}));
      setWasDeferred(!!data.deferred);
      setSubmitted(true);
    } catch {
      setError(
        lang === "fr"
          ? "Une erreur est survenue. Veuillez réessayer."
          : "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#0a0a0f", border: "1px solid rgba(0,255,157,0.2)" }}
      >
        {/* EOCON glitch brand */}
        <div className="pt-6 pb-2 text-center">
          <span className="glitch neon-text text-4xl font-black" data-text="EOCON" style={{ fontFamily: "'Share Tech Mono', monospace" }}>EOCON</span>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pb-4 border-b border-neon-green/10">
          <div>
            <h2 className="text-xl font-black text-white">{t.volunteer.form.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{t.volunteer.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-neon-green transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 space-y-4">
          {submitted ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <p className="text-neon-green font-mono text-lg mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {t.volunteer.form.success}
              </p>
              {wasDeferred && (
                <p className="text-gray-400 text-sm max-w-md mx-auto mb-2">
                  Les candidatures bénévoles pour l&apos;édition en cours sont closes — votre candidature sera conservée pour la prochaine édition.
                  <br />
                  <span className="text-gray-600">Volunteer applications for the current edition are closed — your application will be kept for the next edition.</span>
                </p>
              )}
              <button onClick={onClose} className="btn-neon px-6 py-2 rounded text-sm mt-4">
                {lang === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {closed && (
                <div className="rounded-lg border border-yellow-600/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
                  <p className="font-bold mb-0.5">⏳ Candidatures closes pour l&apos;édition en cours · Applications closed for the current edition</p>
                  <p className="text-yellow-200/70">
                    Vous pouvez toujours postuler : votre candidature sera conservée pour la prochaine édition.
                    {" · "}You can still apply: your application will be kept for the next edition.
                  </p>
                </div>
              )}
              {/* Nom */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.volunteer.form.name} *
                </label>
                <input
                  required
                  className="cyber-input w-full px-3 py-2 rounded text-sm"
                  placeholder={t.volunteer.form.name}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {t.volunteer.form.email} *
                  </label>
                  <input
                    required
                    type="email"
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder={t.volunteer.form.email}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {t.volunteer.form.phone}
                  </label>
                  <input
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder={t.volunteer.form.phone}
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Ville */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.volunteer.form.city}
                </label>
                <input
                  className="cyber-input w-full px-3 py-2 rounded text-sm"
                  placeholder={t.volunteer.form.city}
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.volunteer.form.role}
                </label>
                <select
                  className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="" className="bg-dark-800">
                    {lang === "fr" ? "Choisir un rôle" : "Choose a role"}
                  </option>
                  {t.volunteer.roles.map(r => (
                    <option key={r.title} value={r.title} className="bg-dark-800">
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expérience */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.volunteer.form.experience}
                </label>
                <textarea
                  rows={2}
                  className="cyber-input w-full px-3 py-2 rounded text-sm resize-none"
                  placeholder={t.volunteer.form.experience}
                  value={formData.experience}
                  onChange={e => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {t.volunteer.form.motivation} *
                </label>
                <textarea
                  required
                  rows={3}
                  className="cyber-input w-full px-3 py-2 rounded text-sm resize-none"
                  placeholder={t.volunteer.form.motivation}
                  value={formData.motivation}
                  onChange={e => setFormData({ ...formData, motivation: e.target.value })}
                />
              </div>

              {/* Langue + Heures/semaine */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {t.volunteer.form.lang_expression}
                  </label>
                  <select
                    className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent"
                    value={formData.lang_expression}
                    onChange={e => setFormData({ ...formData, lang_expression: e.target.value })}
                  >
                    <option value="fr" className="bg-dark-800">Français</option>
                    <option value="en" className="bg-dark-800">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {lang === "fr" ? "Heures / semaine" : "Hours / week"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    className="cyber-input w-full px-3 py-2 rounded text-sm"
                    placeholder="10"
                    value={formData.hours_per_week}
                    onChange={e => setFormData({ ...formData, hours_per_week: e.target.value })}
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-neon-solid px-6 py-2 rounded text-sm border-2 border-neon-green disabled:opacity-50"
              >
                {loading ? "…" : t.volunteer.form.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
