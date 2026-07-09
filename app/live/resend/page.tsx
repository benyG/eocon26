"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Lang = "fr" | "en";
type Theme = "dark" | "light";

const tx = {
  fr: {
    title: "Accès à la convention en ligne",
    desc: "Entrez votre adresse email d'inscription pour recevoir votre lien d'accès personnel.",
    email: "Adresse email",
    emailPlaceholder: "votre@email.com",
    send: "Envoyer le lien d'accès",
    sending: "Envoi en cours...",
    successTitle: "Email envoyé !",
    successDesc: "Si cette adresse est associée à une inscription validée, vous recevrez votre lien dans quelques secondes.",
    back: "← Retour à la convention",
    errorInvalid: "Veuillez entrer une adresse email valide.",
    errorNotvalidated: "Votre inscription n'est pas encore validée. Contactez-nous à contact@eyesopensecurity.com",
    errorCooldown: "Veuillez patienter avant de renvoyer.",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
    invalidLink: "Lien invalide ou expiré. Demandez un nouveau lien ci-dessous.",
    lightMode: "☀ Clair",
    darkMode: "🌙 Sombre",
  },
  en: {
    title: "Online convention access",
    desc: "Enter your registration email address to receive your personal access link.",
    email: "Email address",
    emailPlaceholder: "your@email.com",
    send: "Send access link",
    sending: "Sending...",
    successTitle: "Email sent!",
    successDesc: "If this address is associated with a validated registration, you will receive your link within seconds.",
    back: "← Back to convention",
    errorInvalid: "Please enter a valid email address.",
    errorNotvalidated: "Your registration is not yet validated. Contact us at contact@eyesopensecurity.com",
    errorCooldown: "Please wait before resending.",
    errorGeneric: "An error occurred. Please try again.",
    invalidLink: "Invalid or expired link. Request a new one below.",
    lightMode: "☀ Light",
    darkMode: "🌙 Dark",
  },
};

const themes = {
  dark: {
    bg:          "#030408",
    cardBg:      "#0a0a12",
    cardBorder:  "1px solid #00ff9d30",
    navBorder:   "1px solid #00ff9d33",
    accent:      "#00ff9d",
    text:        "#ffffff",
    textMuted:   "#888888",
    btnBg:       "transparent",
    btnBorder:   "1px solid #00ff9d40",
    btnText:     "#00ff9d",
    inputBg:     "#050508",
    inputBorder: "1px solid #00ff9d30",
    inputText:   "#fff",
    ctaBg:       "#00ff9d",
    ctaText:     "#000",
    errBg:       "#1a0a0a",
    errBorder:   "1px solid #ff444440",
    errText:     "#ff6b6b",
    linkText:    "#555",
    backText:    "#00ff9d",
  },
  light: {
    bg:          "#f4f6f9",
    cardBg:      "#ffffff",
    cardBorder:  "1px solid #007d4830",
    navBorder:   "1px solid #007d4820",
    accent:      "#007d48",
    text:        "#111827",
    textMuted:   "#4b5563",
    btnBg:       "transparent",
    btnBorder:   "1px solid #007d4840",
    btnText:     "#007d48",
    inputBg:     "#f9fafb",
    inputBorder: "1px solid #d1d5db",
    inputText:   "#111827",
    ctaBg:       "#007d48",
    ctaText:     "#fff",
    errBg:       "#fff1f1",
    errBorder:   "1px solid #fca5a540",
    errText:     "#dc2626",
    linkText:    "#9ca3af",
    backText:    "#007d48",
  },
} as const;

function ResendForm() {
  const searchParams = useSearchParams();
  const [lang,    setLang]    = useState<Lang>("fr");
  const [theme,   setTheme]   = useState<Theme>("dark");
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const qLang    = searchParams.get("lang") as Lang | null;
    const stored   = localStorage.getItem("eocon_lang") as Lang | null;
    const storedTh = localStorage.getItem("eocon_live_theme") as Theme | null;
    if (qLang === "en" || stored === "en") setLang("en");
    if (storedTh === "light") setTheme("light");
  }, [searchParams]);

  useEffect(() => {
    if (theme === "light") document.body.setAttribute("data-live-light", "1");
    else document.body.removeAttribute("data-live-light");
    return () => document.body.removeAttribute("data-live-light");
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("eocon_live_theme", next);
  };

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("eocon_lang", next);
  };

  const t  = tx[lang];
  const th = themes[theme];
  const errorParam = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError(t.errorInvalid); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/live/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) setError(t.errorCooldown);
        else if (data.error?.includes("not validated") || data.error?.includes("pas encore")) setError(t.errorNotvalidated);
        else setError(data.error || t.errorGeneric);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: th.bg, color: th.text, fontFamily: "'Courier New', monospace", transition: "background 0.2s" }}>
      {/* Nav */}
      <div style={{ borderBottom: th.navBorder, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: th.cardBg, boxShadow: theme === "light" ? "0 1px 4px #00000010" : "none" }}>
        <div>
          <div style={{ fontSize: 9, color: th.accent, letterSpacing: 4, marginBottom: 2 }}>&gt;_ EOCON_LIVE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: th.accent, letterSpacing: 3 }}>EOCON 2026</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleTheme} style={{ background: th.btnBg, border: th.btnBorder, color: th.btnText, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, letterSpacing: 1 }}>
            {theme === "dark" ? t.lightMode : t.darkMode}
          </button>
          <button onClick={toggleLang} style={{ background: th.btnBg, border: th.btnBorder, color: th.btnText, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, letterSpacing: 2 }}>
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "64px auto", padding: "0 24px" }}>
        <div style={{ background: th.cardBg, border: th.cardBorder, borderRadius: 12, padding: 40, boxShadow: theme === "light" ? "0 4px 20px #00000012" : "none" }}>
          <div style={{ fontSize: 10, color: th.accent, letterSpacing: 3, marginBottom: 12 }}>🔐 EOCON 2026 ONLINE</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: th.text, margin: "0 0 12px" }}>{t.title}</h1>
          <p style={{ color: th.textMuted, fontSize: 13, margin: "0 0 28px", lineHeight: 1.6 }}>{t.desc}</p>

          {errorParam && (
            <div style={{ background: th.errBg, border: th.errBorder, borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ color: th.errText, fontSize: 12, margin: 0 }}>{t.invalidLink}</p>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ color: th.accent, fontSize: 18, margin: "0 0 8px" }}>{t.successTitle}</h2>
              <p style={{ color: th.textMuted, fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>{t.successDesc}</p>
              <a href="/live" style={{ color: th.backText, fontSize: 12, textDecoration: "none" }}>{t.back}</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", fontSize: 11, color: th.accent, letterSpacing: 2, marginBottom: 8 }}>{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                style={{ width: "100%", padding: "12px 16px", background: th.inputBg, border: th.inputBorder, borderRadius: 8, color: th.inputText, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 16 }}
              />
              {error && (
                <div style={{ background: th.errBg, border: th.errBorder, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <p style={{ color: th.errText, fontSize: 12, margin: 0 }}>{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", padding: "14px", background: loading ? th.ctaBg + "90" : th.ctaBg, color: th.ctaText, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 900, letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {loading ? t.sending : t.send}
              </button>
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <a href="/live" style={{ color: th.linkText, fontSize: 11, textDecoration: "none" }}>{t.back}</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResendPage() {
  return (
    <Suspense>
      <ResendForm />
    </Suspense>
  );
}
