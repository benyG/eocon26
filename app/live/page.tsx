"use client";

import { useEffect, useState } from "react";

type Lang = "fr" | "en";
type Theme = "dark" | "light";

const tx = {
  fr: {
    checking: "Vérification de votre accès...",
    welcome: "Bienvenue",
    subtitle: "Vous êtes connecté(e) à la conférence EOCON 2026 en ligne.",
    noAccess: "Accès requis",
    noAccessDesc: "Cette page est réservée aux participants inscrits et validés à EOCON 2026.",
    lostLink: "Lien d'accès perdu ?",
    soon: "La diffusion commencera bientôt.",
    date: "28 Novembre 2026",
    ticket: "Billet",
    lightMode: "☀ Clair",
    darkMode: "🌙 Sombre",
    accessGranted: "▸ ACCÈS ACCORDÉ",
  },
  en: {
    checking: "Verifying your access...",
    welcome: "Welcome",
    subtitle: "You are connected to EOCON 2026 online conference.",
    noAccess: "Access required",
    noAccessDesc: "This page is reserved for registered and validated EOCON 2026 attendees.",
    lostLink: "Lost your access link?",
    soon: "The stream will begin shortly.",
    date: "November 28, 2026",
    ticket: "Ticket",
    lightMode: "☀ Light",
    darkMode: "🌙 Dark",
    accessGranted: "▸ ACCESS GRANTED",
  },
};

interface SessionInfo { fname: string; lname: string; ticketType: string; }

// ── theme token maps ────────────────────────────────────────────────────────
const themes = {
  dark: {
    bg:           "#030408",
    navBorder:    "1px solid #00ff9d33",
    logoSub:      "#00ff9d",
    logoMain:     "#00ff9d",
    cardBg:       "#0a0a12",
    cardBorder:   "1px solid #00ff9d40",
    cardBorderSm: "1px solid #00ff9d20",
    accent:       "#00ff9d",
    accentMid:    "#00ff9d80",
    accentFaint:  "#00ff9d30",
    text:         "#ffffff",
    textMuted:    "#888",
    textFaint:    "#666",
    tagText:      "#00ff9d80",
    tagBorder:    "1px solid #00ff9d30",
    streamBg:     "#050508",
    streamText:   "#444",
    btnBg:        "transparent",
    btnBorder:    "1px solid #00ff9d40",
    btnText:      "#00ff9d",
    ctaBg:        "#00ff9d",
    ctaText:      "#000000",
  },
  light: {
    bg:           "#f4f6f9",
    navBorder:    "1px solid #007d4830",
    logoSub:      "#007d48",
    logoMain:     "#007d48",
    cardBg:       "#ffffff",
    cardBorder:   "1px solid #007d4840",
    cardBorderSm: "1px solid #007d4820",
    accent:       "#007d48",
    accentMid:    "#007d48",
    accentFaint:  "#007d4820",
    text:         "#111827",
    textMuted:    "#4b5563",
    textFaint:    "#9ca3af",
    tagText:      "#007d48",
    tagBorder:    "1px solid #007d4830",
    streamBg:     "#e5e7eb",
    streamText:   "#9ca3af",
    btnBg:        "transparent",
    btnBorder:    "1px solid #007d4840",
    btnText:      "#007d48",
    ctaBg:        "#007d48",
    ctaText:      "#ffffff",
  },
} as const;

export default function LivePage() {
  const [lang, setLang]       = useState<Lang>("fr");
  const [theme, setTheme]     = useState<Theme>("dark");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfo | null>(null);

  // Restore preferences
  useEffect(() => {
    const savedLang  = localStorage.getItem("eocon_lang") as Lang | null;
    const savedTheme = localStorage.getItem("eocon_live_theme") as Theme | null;
    if (savedLang === "en") setLang("en");
    if (savedTheme === "light") setTheme("light");
  }, []);

  // Suppress root layout scanlines in light mode
  useEffect(() => {
    if (theme === "light") {
      document.body.setAttribute("data-live-light", "1");
    } else {
      document.body.removeAttribute("data-live-light");
    }
    return () => document.body.removeAttribute("data-live-light");
  }, [theme]);

  // Fetch session
  useEffect(() => {
    fetch("/api/live/session")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setSession(data.session); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("eocon_lang", next);
  };

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("eocon_live_theme", next);
  };

  const t  = tx[lang];
  const th = themes[theme];

  return (
    <div style={{ minHeight: "100vh", background: th.bg, color: th.text, fontFamily: "'Courier New', monospace", transition: "background 0.2s, color 0.2s" }}>

      {/* Nav */}
      <div style={{ borderBottom: th.navBorder, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: th.cardBg, boxShadow: theme === "light" ? "0 1px 4px #00000010" : "none" }}>
        <div>
          <div style={{ fontSize: 9, color: th.logoSub, letterSpacing: 4, marginBottom: 2 }}>&gt;_ EOCON_LIVE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: th.logoMain, letterSpacing: 3 }}>EOCON 2026</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{ background: th.btnBg, border: th.btnBorder, color: th.btnText, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, letterSpacing: 1 }}
          >
            {theme === "dark" ? t.lightMode : t.darkMode}
          </button>
          {/* Lang toggle */}
          <button
            onClick={toggleLang}
            style={{ background: th.btnBg, border: th.btnBorder, color: th.btnText, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, letterSpacing: 2 }}
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {loading ? (
          <p style={{ color: th.textFaint, fontSize: 13, letterSpacing: 2 }}>{t.checking}</p>

        ) : session ? (
          <>
            {/* Authenticated view */}
            <div style={{ background: th.cardBg, border: th.cardBorder, borderRadius: 12, padding: 32, marginBottom: 32, boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
              <div style={{ fontSize: 10, color: th.accent, letterSpacing: 3, marginBottom: 8 }}>{t.accessGranted}</div>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", color: th.accent }}>
                {t.welcome}, {session.fname} {session.lname}
              </h1>
              <p style={{ color: th.textMuted, fontSize: 13, margin: "0 0 16px" }}>{t.subtitle}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: th.tagText, padding: "4px 12px", border: th.tagBorder, borderRadius: 6, background: th.accentFaint }}>
                  📅 {t.date}
                </span>
                <span style={{ fontSize: 11, color: th.tagText, padding: "4px 12px", border: th.tagBorder, borderRadius: 6, background: th.accentFaint }}>
                  🎟 {t.ticket}: {session.ticketType}
                </span>
              </div>
            </div>

            {/* Stream placeholder */}
            <div style={{ background: th.cardBg, border: th.cardBorderSm, borderRadius: 12, overflow: "hidden", boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
              <div style={{ aspectRatio: "16/9", background: th.streamBg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 40 }}>📡</div>
                <p style={{ color: th.streamText, fontSize: 13, letterSpacing: 2, margin: 0 }}>{t.soon}</p>
              </div>
            </div>
          </>

        ) : (
          /* No access view */
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: th.accent, margin: "0 0 12px" }}>{t.noAccess}</h1>
            <p style={{ color: th.textMuted, fontSize: 14, maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>{t.noAccessDesc}</p>
            <a
              href={`/live/resend?lang=${lang}`}
              style={{ display: "inline-block", background: th.ctaBg, color: th.ctaText, padding: "14px 32px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 900, letterSpacing: 2 }}
            >
              {t.lostLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
