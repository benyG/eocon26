"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Lang = "fr" | "en";

const t = {
  fr: {
    title: "Accès à la conférence en ligne",
    desc: "Entrez votre adresse email d'inscription pour recevoir votre lien d'accès personnel.",
    email: "Adresse email",
    emailPlaceholder: "votre@email.com",
    send: "Envoyer le lien d'accès",
    sending: "Envoi en cours...",
    successTitle: "Email envoyé !",
    successDesc: "Si cette adresse est associée à une inscription validée, vous recevrez votre lien dans quelques secondes.",
    back: "← Retour à la conférence",
    errorInvalid: "Veuillez entrer une adresse email valide.",
    errorNotvalidated: "Votre inscription n'est pas encore validée. Contactez-nous à contact@eyesopensecurity.com",
    errorCooldown: "Veuillez patienter avant de renvoyer.",
    errorGeneric: "Une erreur est survenue. Veuillez réessayer.",
    invalidLink: "Lien invalide ou expiré. Demandez un nouveau lien ci-dessous.",
  },
  en: {
    title: "Online conference access",
    desc: "Enter your registration email address to receive your personal access link.",
    email: "Email address",
    emailPlaceholder: "your@email.com",
    send: "Send access link",
    sending: "Sending...",
    successTitle: "Email sent!",
    successDesc: "If this address is associated with a validated registration, you will receive your link within seconds.",
    back: "← Back to conference",
    errorInvalid: "Please enter a valid email address.",
    errorNotvalidated: "Your registration is not yet validated. Contact us at contact@eyesopensecurity.com",
    errorCooldown: "Please wait before resending.",
    errorGeneric: "An error occurred. Please try again.",
    invalidLink: "Invalid or expired link. Request a new one below.",
  },
};

function ResendForm() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>("fr");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const qLang = searchParams.get("lang") as Lang | null;
    const stored = localStorage.getItem("eocon_lang") as Lang | null;
    if (qLang === "en" || stored === "en") setLang("en");
  }, [searchParams]);

  const tx = t[lang];
  const errorParam = searchParams.get("error");

  const toggleLang = () => {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("eocon_lang", next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) { setError(tx.errorInvalid); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/live/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) setError(tx.errorCooldown);
        else if (data.error?.includes("not validated") || data.error?.includes("pas encore validée")) setError(tx.errorNotvalidated);
        else setError(data.error || tx.errorGeneric);
        return;
      }
      setSuccess(true);
    } catch {
      setError(tx.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

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

      <div style={{ maxWidth: 520, margin: "64px auto", padding: "0 24px" }}>
        <div style={{ background: "#0a0a12", border: "1px solid #00ff9d30", borderRadius: 12, padding: 40 }}>
          <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 12 }}>🔐 EOCON 2026 ONLINE</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "0 0 12px" }}>{tx.title}</h1>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 28px", lineHeight: 1.6 }}>{tx.desc}</p>

          {errorParam && (
            <div style={{ background: "#1a0a0a", border: "1px solid #ff444440", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0 }}>{tx.invalidLink}</p>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <h2 style={{ color: "#00ff9d", fontSize: 18, margin: "0 0 8px" }}>{tx.successTitle}</h2>
              <p style={{ color: "#888", fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>{tx.successDesc}</p>
              <a href="/live" style={{ color: "#00ff9d", fontSize: 12, textDecoration: "none" }}>{tx.back}</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", fontSize: 11, color: "#00ff9d", letterSpacing: 2, marginBottom: 8 }}>
                {tx.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tx.emailPlaceholder}
                required
                style={{
                  width: "100%", padding: "12px 16px", background: "#050508", border: "1px solid #00ff9d30",
                  borderRadius: 8, color: "#fff", fontSize: 14, fontFamily: "inherit",
                  outline: "none", boxSizing: "border-box", marginBottom: 16,
                }}
              />
              {error && (
                <div style={{ background: "#1a0a0a", border: "1px solid #ff444440", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  <p style={{ color: "#ff6b6b", fontSize: 12, margin: 0 }}>{error}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "14px", background: loading ? "#00ff9d60" : "#00ff9d",
                  color: "#000", border: "none", borderRadius: 8, fontSize: 13,
                  fontWeight: 900, letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {loading ? tx.sending : tx.send}
              </button>
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <a href="/live" style={{ color: "#555", fontSize: 11, textDecoration: "none" }}>{tx.back}</a>
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
