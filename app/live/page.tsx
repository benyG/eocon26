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
    qaTitle: "💬 Questions en direct",
    qaPlaceholder: "Posez votre question aux speakers…",
    qaName: "Votre prénom (optionnel)",
    qaSubmit: "Envoyer",
    qaSubmitting: "Envoi…",
    qaSent: "Question envoyée — en attente de modération.",
    qaCooldown: "Veuillez patienter 30 secondes entre chaque question.",
    qaError: "Erreur — réessayez.",
    qaNoQuestions: "Aucune question approuvée pour le moment.",
    qaAnswered: "✅ Répondue",
    workshopsTitle: "🎓 Ateliers en direct",
    workshopJoin: "Rejoindre",
    workshopNoAccess: "Vos billets n'incluent pas les ateliers.",
    workshopInactive: "Cet atelier n'est pas encore disponible.",
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
    qaTitle: "💬 Live Q&A",
    qaPlaceholder: "Ask a question to the speakers…",
    qaName: "Your first name (optional)",
    qaSubmit: "Send",
    qaSubmitting: "Sending…",
    qaSent: "Question sent — awaiting moderation.",
    qaCooldown: "Please wait 30 seconds between questions.",
    qaError: "Error — please try again.",
    qaNoQuestions: "No approved questions yet.",
    qaAnswered: "✅ Answered",
    workshopsTitle: "🎓 Live Workshops",
    workshopJoin: "Join",
    workshopNoAccess: "Your ticket does not include workshops.",
    workshopInactive: "This workshop is not yet available.",
  },
};

interface SessionInfo { fname: string; lname: string; ticketType: string; includesWorkshops: boolean; includesSessions: boolean; }

interface Workshop {
  id: string;
  title: string;
  titleEn: string;
  room: string;
  active: boolean;
  description?: string;
  descriptionEn?: string;
}

interface Stream {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

interface ProgrammeItem {
  id: number;
  time: string;
  endTime?: string | null;
  title: string;
  type: string;
  speakerName?: string | null;
  room?: string | null;
  mode?: string | null;
  liveUrl?: string | null;
}

interface LiveData {
  streams: Stream[];
  programme: ProgrammeItem[];
  workshops: Workshop[];
}

interface Question {
  id: number;
  body: string;
  displayName: string | null;
  answered: boolean;
  upvotes: number;
  askedAt: string;
}

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
  const [liveData, setLiveData] = useState<LiveData>({ streams: [], programme: [], workshops: [] });

  // Q&A state
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [qaBody, setQaBody]         = useState("");
  const [qaName, setQaName]         = useState("");
  const [qaStatus, setQaStatus]     = useState<"idle" | "sending" | "sent" | "cooldown" | "error">("idle");

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

  // Fetch session + live config in parallel
  useEffect(() => {
    Promise.all([
      fetch("/api/live/session").then(r => r.json()).catch(() => ({})),
      fetch("/api/live/programme").then(r => r.json()).catch(() => ({ streams: [], programme: [] })),
    ]).then(([sessionData, prog]) => {
      if (sessionData.ok) setSession(sessionData.session);
      setLiveData({ streams: prog.streams ?? [], programme: prog.programme ?? [], workshops: prog.workshops ?? [] });
    }).finally(() => setLoading(false));
  }, []);

  // SSE for Q&A — only connect once session is confirmed
  useEffect(() => {
    if (!session) return;
    let es: EventSource | null = null;

    const connect = () => {
      es = new EventSource("/api/live/questions/stream");
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; questions: Question[] };
          if (msg.type === "snapshot") {
            setQuestions(msg.questions);
          } else if (msg.type === "new") {
            setQuestions((prev: Question[]) => [...prev, ...msg.questions]);
          }
        } catch { /* ignore parse errors */ }
      };
      es.onerror = () => {
        es?.close();
        // Reconnect after 5s
        setTimeout(connect, 5000);
      };
    };
    connect();
    return () => { es?.close(); };
  }, [session]);

  const submitQuestion = async () => {
    if (!qaBody.trim()) return;
    setQaStatus("sending");
    try {
      const res = await fetch("/api/live/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: qaBody.trim(), displayName: qaName.trim() }),
      });
      if (res.status === 429) { setQaStatus("cooldown"); setTimeout(() => setQaStatus("idle"), 5000); return; }
      if (!res.ok) { setQaStatus("error"); setTimeout(() => setQaStatus("idle"), 3000); return; }
      setQaStatus("sent");
      setQaBody("");
      setTimeout(() => setQaStatus("idle"), 4000);
    } catch {
      setQaStatus("error");
      setTimeout(() => setQaStatus("idle"), 3000);
    }
  };

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

            {/* Live streams */}
            {liveData.streams.filter(s => s.active).length > 0 ? (
              liveData.streams.filter(s => s.active).map(st => (
                <div key={st.id} style={{ background: th.cardBg, border: th.cardBorderSm, borderRadius: 12, overflow: "hidden", marginBottom: 24, boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
                  {st.title && (
                    <div style={{ padding: "12px 20px", borderBottom: th.cardBorderSm }}>
                      <span style={{ fontSize: 11, color: th.accent, letterSpacing: 2 }}>🔴 {st.title}</span>
                    </div>
                  )}
                  <div style={{ aspectRatio: "16/9", background: th.streamBg }}>
                    <iframe
                      src={st.url}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ background: th.cardBg, border: th.cardBorderSm, borderRadius: 12, overflow: "hidden", boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
                <div style={{ aspectRatio: "16/9", background: th.streamBg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 40 }}>📡</div>
                  <p style={{ color: th.streamText, fontSize: 13, letterSpacing: 2, margin: 0 }}>{t.soon}</p>
                </div>
              </div>
            )}

            {/* Programme du jour */}
            {liveData.programme.length > 0 && (
              <div style={{ background: th.cardBg, border: th.cardBorderSm, borderRadius: 12, padding: 24, marginTop: 24, boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
                <div style={{ fontSize: 10, color: th.accent, letterSpacing: 3, marginBottom: 16 }}>
                  {lang === "fr" ? "📋 PROGRAMME DU JOUR" : "📋 TODAY'S PROGRAMME"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {liveData.programme.map((item: ProgrammeItem) => {
                    const typeColor: Record<string, string> = {
                      keynote: "#ff6600", talk: "#4488ff", workshop: "#aa44ff",
                      panel: "#00aaff", break: th.textFaint, logistics: th.textFaint,
                    };
                    const color = typeColor[item.type] ?? th.accent;
                    return (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderBottom: `1px solid ${th.accentFaint}`, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: th.accent, fontFamily: "'Courier New', monospace", whiteSpace: "nowrap", minWidth: 44 }}>
                          {item.time}{item.endTime ? `–${item.endTime}` : ""}
                        </span>
                        <span style={{ fontSize: 9, color: color, border: `1px solid ${color}40`, borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
                          {item.type}
                        </span>
                        <span style={{ fontSize: 13, color: th.text, fontWeight: 600, flex: 1, minWidth: 120 }}>{item.title}</span>
                        {item.speakerName && <span style={{ fontSize: 11, color: th.textMuted, whiteSpace: "nowrap" }}>{item.speakerName}</span>}
                        {item.room && <span style={{ fontSize: 10, color: th.textFaint, whiteSpace: "nowrap" }}>🚪 {item.room}</span>}
                        {item.liveUrl && (
                          <a
                            href={item.liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, background: th.ctaBg, color: th.ctaText, padding: "4px 12px", borderRadius: 5, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}
                          >
                            {lang === "fr" ? "Rejoindre" : "Join"}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Workshops */}
            {liveData.workshops.length > 0 && (
              <div style={{ background: th.cardBg, border: th.cardBorderSm, borderRadius: 12, padding: 24, marginTop: 24, boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
                <div style={{ fontSize: 10, color: th.accent, letterSpacing: 3, marginBottom: 16 }}>{t.workshopsTitle}</div>
                {!session?.includesWorkshops ? (
                  <p style={{ color: th.textMuted, fontSize: 13 }}>{t.workshopNoAccess}</p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {liveData.workshops.map((w: Workshop) => (
                      <div
                        key={w.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "14px 18px",
                          background: theme === "dark" ? "#050508" : th.bg,
                          border: th.cardBorderSm,
                          borderRadius: 8,
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: th.text, marginBottom: 2 }}>
                            {lang === "fr" ? w.title : (w.titleEn || w.title)}
                          </div>
                          {(w.description || w.descriptionEn) && (
                            <div style={{ fontSize: 12, color: th.textMuted, marginBottom: 4 }}>
                              {lang === "fr" ? w.description : (w.descriptionEn || w.description)}
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: th.textFaint }}>🚪 {w.room}</div>
                        </div>
                        {w.active ? (
                          <a
                            href={`/api/live/workshop/join?id=${encodeURIComponent(w.id)}`}
                            style={{
                              background: th.ctaBg,
                              color: th.ctaText,
                              padding: "8px 20px",
                              borderRadius: 6,
                              textDecoration: "none",
                              fontSize: 12,
                              fontWeight: 900,
                              letterSpacing: 1,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {t.workshopJoin}
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: th.textFaint, flexShrink: 0 }}>
                            {t.workshopInactive}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Q&A */}
            <div style={{ background: th.cardBg, border: th.cardBorderSm, borderRadius: 12, padding: 24, marginTop: 24, boxShadow: theme === "light" ? "0 2px 12px #00000010" : "none" }}>
              <div style={{ fontSize: 10, color: th.accent, letterSpacing: 3, marginBottom: 16 }}>{t.qaTitle}</div>

              {/* Submit form */}
              <div style={{ marginBottom: 20 }}>
                <input
                  value={qaName}
                  onChange={e => setQaName((e.target as HTMLInputElement).value)}
                  placeholder={t.qaName}
                  maxLength={80}
                  style={{ width: "100%", padding: "8px 12px", background: theme === "dark" ? "#050508" : th.bg, border: `1px solid ${th.cardBorderSm.replace("1px solid ","")}`, borderRadius: 6, color: th.text, fontSize: 12, fontFamily: "'Courier New', monospace", boxSizing: "border-box", outline: "none", marginBottom: 8 }}
                />
                <textarea
                  value={qaBody}
                  onChange={e => setQaBody((e.target as HTMLTextAreaElement).value)}
                  placeholder={t.qaPlaceholder}
                  maxLength={500}
                  rows={3}
                  disabled={qaStatus === "sending"}
                  style={{ width: "100%", padding: "10px 12px", background: theme === "dark" ? "#050508" : th.bg, border: `1px solid ${th.cardBorderSm.replace("1px solid ","")}`, borderRadius: 6, color: th.text, fontSize: 13, fontFamily: "'Courier New', monospace", boxSizing: "border-box", resize: "none", outline: "none", marginBottom: 8 }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={submitQuestion}
                    disabled={!qaBody.trim() || qaStatus === "sending"}
                    style={{ background: th.ctaBg, color: th.ctaText, border: "none", borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 900, cursor: (!qaBody.trim() || qaStatus === "sending") ? "not-allowed" : "pointer", letterSpacing: 1, opacity: (!qaBody.trim() || qaStatus === "sending") ? 0.6 : 1 }}
                  >
                    {qaStatus === "sending" ? t.qaSubmitting : t.qaSubmit}
                  </button>
                  {qaStatus === "sent"     && <span style={{ fontSize: 12, color: th.accent }}>{t.qaSent}</span>}
                  {qaStatus === "cooldown" && <span style={{ fontSize: 12, color: "#ffaa00" }}>{t.qaCooldown}</span>}
                  {qaStatus === "error"    && <span style={{ fontSize: 12, color: "#ff6b6b" }}>{t.qaError}</span>}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: th.textMuted }}>{qaBody.length}/500</span>
                </div>
              </div>

              {/* Approved questions feed */}
              <div style={{ borderTop: `1px solid ${th.accentFaint}`, paddingTop: 16 }}>
                {questions.length === 0 ? (
                  <p style={{ color: th.textMuted, fontSize: 12 }}>{t.qaNoQuestions}</p>
                ) : (
                  [...questions].reverse().map(q => (
                    <div key={q.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${th.accentFaint}` }}>
                      <p style={{ color: th.text, fontSize: 13, margin: "0 0 4px", lineHeight: 1.5 }}>{q.body}</p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {q.displayName && <span style={{ fontSize: 10, color: th.textMuted }}>👤 {q.displayName}</span>}
                        <span style={{ fontSize: 10, color: th.textFaint }}>{new Date(q.askedAt).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                        {q.answered && <span style={{ fontSize: 10, color: th.accent }}>{t.qaAnswered}</span>}
                      </div>
                    </div>
                  ))
                )}
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
