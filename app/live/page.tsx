"use client";

import { useEffect, useState } from "react";

type Lang = "fr" | "en";

const t = {
  fr: {
    checking: "Vérification de votre accès...",
    welcome: "Bienvenue",
    subtitle: "Vous êtes connecté(e) à la conférence EOCON 2026 en ligne.",
    noAccess: "Accès requis",
    noAccessDesc: "Cette page est réservée aux participants inscrits et validés à EOCON 2026.",
    getLink: "Obtenir mon lien d'accès",
    lostLink: "Lien d'accès perdu ?",
    resend: "Renvoyer le lien",
    soon: "La diffusion commencera bientôt.",
    date: "28 Novembre 2026",
    ticket: "Billet",
  },
  en: {
    checking: "Verifying your access...",
    welcome: "Welcome",
    subtitle: "You are connected to EOCON 2026 online conference.",
    noAccess: "Access required",
    noAccessDesc: "This page is reserved for registered and validated EOCON 2026 attendees.",
    getLink: "Get my access link",
    lostLink: "Lost your access link?",
    resend: "Resend link",
    soon: "The stream will begin shortly.",
    date: "November 28, 2026",
    ticket: "Ticket",
  },
};

interface SessionInfo {
  fname: string;
  lname: string;
  ticketType: string;
}

export default function LivePage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("eocon_lang") as Lang | null;
    if (saved === "en") setLang("en");
  }, []);

  useEffect(() => {
    fetch("/api/live/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setSession(data.session);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("eocon_lang", next);
  };

  const tx = t[lang];

  return (
    <div style={{ minHeight: "100vh", background: "#030408", color: "#fff", fontFamily: "'Courier New', monospace" }}>
      {/* Nav */}
      <div style={{ borderBottom: "1px solid #00ff9d33", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, color: "#00ff9d", letterSpacing: 4, marginBottom: 2 }}>&gt;_ EOCON_LIVE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#00ff9d", letterSpacing: 3 }}>EOCON 2026</div>
        </div>
        <button
          onClick={toggleLang}
          style={{ background: "transparent", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 11, letterSpacing: 2 }}
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {loading ? (
          <p style={{ color: "#666", fontSize: 13, letterSpacing: 2 }}>{tx.checking}</p>
        ) : session ? (
          <>
            {/* Authenticated view */}
            <div style={{ background: "#0a0a12", border: "1px solid #00ff9d40", borderRadius: 12, padding: 32, marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 8 }}>▸ ACCESS GRANTED</div>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 8px", color: "#00ff9d" }}>
                {tx.welcome}, {session.fname} {session.lname}
              </h1>
              <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>{tx.subtitle}</p>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#00ff9d80", padding: "4px 12px", border: "1px solid #00ff9d30", borderRadius: 6 }}>
                  📅 {tx.date}
                </span>
                <span style={{ fontSize: 11, color: "#00ff9d80", padding: "4px 12px", border: "1px solid #00ff9d30", borderRadius: 6 }}>
                  🎟 {tx.ticket}: {session.ticketType}
                </span>
              </div>
            </div>

            {/* Stream placeholder */}
            <div style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ aspectRatio: "16/9", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 40 }}>📡</div>
                <p style={{ color: "#444", fontSize: 13, letterSpacing: 2, margin: 0 }}>{tx.soon}</p>
              </div>
            </div>
          </>
        ) : (
          /* No access view */
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#00ff9d", margin: "0 0 12px" }}>{tx.noAccess}</h1>
            <p style={{ color: "#888", fontSize: 14, maxWidth: 480, margin: "0 auto 32px" }}>{tx.noAccessDesc}</p>

            <a
              href={`/live/resend?lang=${lang}`}
              style={{
                display: "inline-block",
                background: "#00ff9d",
                color: "#000",
                padding: "14px 32px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              {tx.lostLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
