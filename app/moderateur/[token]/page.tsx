"use client";

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import { use } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionData {
  id: number; title: string; date: string | null; time: string | null;
  endTime: string | null; type: string | null; room: string | null;
  description: string | null; mode: string | null; liveUrl: string | null;
}
interface SpeakerData {
  id: number; name: string; title: string | null; company: string | null;
  country: string | null; bio: string | null; photoUrl: string | null;
  linkedin: string | null; twitter: string | null;
  talkTitle: string | null; talkAbstract: string | null; talkFormat: string | null;
}
interface NextSession { id: number; title: string; time: string | null; speakerName: string | null; type: string | null; }
interface Question {
  id: number; body: string; displayName: string | null;
  approved: boolean; answered: boolean; upvotes: number;
  adminNote: string | null; askedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad2(n: number) { return String(n).padStart(2, "0"); }

function formatElapsed(ms: number): string {
  if (ms < 0) return "–";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return `${pad2(m)}:${pad2(sec)}`;
}

function sessionStartMs(date: string | null, time: string | null): number | null {
  if (!date || !time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const d = new Date(`${date}T${pad2(parseInt(match[1]))}:${match[2]}:00`);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function sessionEndMs(date: string | null, endTime: string | null): number | null {
  return sessionStartMs(date, endTime);
}

function buildIntroScript(sp: SpeakerData, session: SessionData, lang: "fr" | "en", modName: string): string {
  const firstName = sp.name.split(" ")[0];
  const abstractSnippet = sp.talkAbstract
    ? sp.talkAbstract.replace(/\s+/g, " ").trim().slice(0, 180) + (sp.talkAbstract.length > 180 ? "…" : "")
    : "";
  const role = [sp.title, sp.company].filter(Boolean).join(lang === "fr" ? " chez " : " at ");

  if (lang === "en") {
    return [
      `Welcome everyone! I'm ${modName || "[YOUR NAME]"}, moderating this session.`,
      ``,
      `Please welcome ${sp.name}${role ? `, ${role}` : ""}${sp.country ? `, from ${sp.country}` : ""}.`,
      ``,
      sp.talkTitle ? `Today, ${firstName} will present: « ${sp.talkTitle} »` : "",
      ``,
      abstractSnippet ? abstractSnippet : "",
      ``,
      `The floor is yours, ${firstName}. Welcome!`,
    ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
  }

  return [
    `Bonjour à toutes et à tous ! Je suis ${modName || "[VOTRE NOM]"}, modérateur${modName ? "" : "(trice)"} de cette session.`,
    ``,
    `J'ai le plaisir de vous présenter ${sp.name}${role ? `, ${role}` : ""}${sp.country ? `, ${sp.country}` : ""}.`,
    ``,
    sp.talkTitle ? `${firstName} va nous parler de : « ${sp.talkTitle} »` : "",
    ``,
    abstractSnippet ? abstractSnippet : "",
    ``,
    `La parole est à toi, ${firstName}. Bienvenue !`,
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

function buildRunsheet(session: SessionData, nextSess: NextSession | null, lang: "fr" | "en"): { offset: string; label: string; emoji: string }[] {
  const dur = (session.time && session.endTime)
    ? (() => {
        const [sh, sm] = session.time.split(":").map(Number);
        const [eh, em] = session.endTime.split(":").map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })()
    : 45;
  const qaDur = Math.min(15, Math.floor(dur * 0.3));
  const talkDur = dur - qaDur;

  if (lang === "en") return [
    { offset: "H−15 min", emoji: "🎙", label: "Welcome speaker in Restream Studio · test audio & video" },
    { offset: "H−5 min",  emoji: "📡", label: "Confirm YouTube embed is live on /live" },
    { offset: "H+0",      emoji: "▶️",  label: "Introduction — read your intro script" },
    { offset: `H+${talkDur - 5} min`, emoji: "⏱", label: `Signal to speaker: "5 minutes remaining"` },
    { offset: `H+${talkDur} min`,     emoji: "❓", label: `Open Q&A — announce to participants` },
    { offset: `H+${dur} min`,         emoji: "🏁", label: `Close session · thank speaker${nextSess ? ` · announce: "${nextSess.title}"` : ""}` },
  ];

  return [
    { offset: "H−15 min", emoji: "🎙", label: "Accueillir le speaker dans Restream Studio · tester audio & vidéo" },
    { offset: "H−5 min",  emoji: "📡", label: "Vérifier que l'embed YouTube est bien visible sur /live" },
    { offset: "H+0",      emoji: "▶️",  label: "Introduction — lire votre script d'intro" },
    { offset: `H+${talkDur - 5} min`, emoji: "⏱", label: `Signaler au speaker : « 5 minutes restantes »` },
    { offset: `H+${talkDur} min`,     emoji: "❓", label: `Ouvrir la Q&A — l'annoncer aux participants` },
    { offset: `H+${dur} min`,         emoji: "🏁", label: `Clôturer · remercier le speaker${nextSess ? ` · annoncer : « ${nextSess.title} »` : ""}` },
  ];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const C = {
  bg: "#07070e", surface: "#0a0a16", border: "#ffffff10",
  accent: "#4488ff", green: "#00ff9d", orange: "#ffaa00",
  red: "#ff4444", dim: "#555", text: "#ccc", white: "#fff",
};

const card = (accent = C.accent): CSSProperties => ({
  background: C.surface, border: `1px solid ${accent}20`,
  borderRadius: 10, padding: 16,
});

const tag = (color: string, bg?: string): CSSProperties => ({
  fontSize: 10, color, background: bg ?? `${color}15`,
  border: `1px solid ${color}30`, borderRadius: 4,
  padding: "2px 8px", letterSpacing: 1, whiteSpace: "nowrap",
});

const btn = (color: string, disabled = false): CSSProperties => ({
  fontSize: 11, color: disabled ? C.dim : color,
  background: disabled ? "transparent" : `${color}15`,
  border: `1px solid ${disabled ? "#333" : `${color}40`}`,
  borderRadius: 5, padding: "5px 12px", cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap", fontFamily: "'Courier New', monospace",
});

// ── Main component ────────────────────────────────────────────────────────────

export default function ModeratorCockpit({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [lang, setLang]             = useState<"fr" | "en">("fr");
  const [modName, setModName]       = useState("");
  const [session, setSession]       = useState<SessionData | null>(null);
  const [speaker, setSpeaker]       = useState<SpeakerData | null>(null);
  const [nextSession, setNextSession] = useState<NextSession | null>(null);
  const [techContact, setTechContact] = useState("");
  const [livePageUrl, setLivePageUrl] = useState("");
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [qaLoading, setQaLoading]   = useState(false);
  const [introScript, setIntroScript] = useState("");
  const [copied, setCopied]         = useState(false);
  const [checked, setChecked]       = useState<Record<number, boolean>>({});
  const [now, setNow]               = useState(Date.now());
  const qaInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load session data ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/moderateur/session?token=${token}`);
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Erreur inconnue"); setLoading(false); return; }
      setSession(data.session);
      setSpeaker(data.speaker);
      setNextSession(data.nextSession);
      setTechContact(data.techContact);
      setLivePageUrl(data.livePageUrl);
      setLoading(false);
    })();
  }, [token]);

  // ── Build intro script when data / lang / modName changes ─────────────────
  useEffect(() => {
    if (speaker && session) setIntroScript(buildIntroScript(speaker, session, lang, modName));
  }, [speaker, session, lang, modName]);

  // ── Load questions (poll every 10 s) ──────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch(`/api/moderateur/questions?token=${token}`);
      if (res.ok) setQuestions(await res.json());
    } finally { setQaLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!session) return;
    loadQuestions();
    qaInterval.current = setInterval(loadQuestions, 10000);
    return () => { if (qaInterval.current) clearInterval(qaInterval.current); };
  }, [session, loadQuestions]);

  // ── Live clock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Q&A actions ───────────────────────────────────────────────────────────
  const qaAction = async (id: number, patch: { approved?: boolean; answered?: boolean; hidden?: boolean }) => {
    await fetch(`/api/moderateur/questions/${id}?token=${token}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    setQuestions((qs: Question[]) => qs.map((q: Question) => q.id === id ? { ...q, ...patch } : q));
  };

  // ── Timer math ─────────────────────────────────────────────────────────────
  const startMs  = session ? sessionStartMs(session.date, session.time) : null;
  const endMs    = session ? sessionEndMs(session.date, session.endTime) : null;
  const elapsed  = startMs ? now - startMs : null;
  const remaining = endMs ? endMs - now : null;
  const isLive   = elapsed !== null && elapsed >= 0 && (remaining === null || remaining > 0);
  const minsLeft = remaining !== null ? Math.ceil(remaining / 60000) : null;

  const pendingQs   = questions.filter((q: Question) => !q.approved && !q.answered);
  const approvedQs  = questions.filter((q: Question) => q.approved && !q.answered);
  const answeredQs  = questions.filter((q: Question) => q.answered);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", color: C.dim }}>
      Chargement du cockpit…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 14, color: C.red }}>{error}</div>
      <div style={{ fontSize: 11, color: C.dim }}>Contactez l&apos;équipe EOCON pour obtenir un nouveau lien.</div>
    </div>
  );

  if (!session) return null;

  const runsheet = buildRunsheet(session, nextSession, lang);

  const TRANSLATIONS: Record<"fr" | "en", {
    cockpit: string; live: string; waiting: string; elapsed: string; remaining: string;
    speaker: string; intro: string; copy: string; copied: string; edit: string;
    qa: string; pending: string; approved: string; answered: string;
    approve: string; reject: string; answered_btn: string; hide: string;
    runsheet: string; nextSession: string; tech: string; live_page: string;
    your_name: string; no_qs: string; lang_toggle: string;
  }> = {
    fr: {
      cockpit: "Cockpit Modérateur",
      live: "EN DIRECT", waiting: "En attente du démarrage",
      elapsed: "Écoulé", remaining: "Restant",
      speaker: "Speaker", intro: "Script d'intro",
      copy: "📋 Copier", copied: "✓ Copié",
      edit: "Modifier",
      qa: "Q&A en direct", pending: "En attente", approved: "Approuvées", answered: "Répondues",
      approve: "✓ Approuver", reject: "✗ Rejeter", answered_btn: "Répondue",
      hide: "Masquer",
      runsheet: "Runsheet",
      nextSession: "Session suivante",
      tech: "Contact technique",
      live_page: "→ /live",
      your_name: "Votre nom (pour le script)",
      no_qs: "Aucune question pour le moment.",
      lang_toggle: "EN",
    },
    en: {
      cockpit: "Moderator Cockpit",
      live: "LIVE", waiting: "Waiting for session start",
      elapsed: "Elapsed", remaining: "Remaining",
      speaker: "Speaker", intro: "Intro script",
      copy: "📋 Copy", copied: "✓ Copied",
      edit: "Edit",
      qa: "Live Q&A", pending: "Pending", approved: "Approved", answered: "Answered",
      approve: "✓ Approve", reject: "✗ Reject", answered_btn: "Answered",
      hide: "Hide",
      runsheet: "Runsheet",
      nextSession: "Next session",
      tech: "Technical contact",
      live_page: "→ /live",
      your_name: "Your name (for script)",
      no_qs: "No questions yet.",
      lang_toggle: "FR",
    },
  };
  const t = TRANSLATIONS[lang as "fr" | "en"];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Courier New', monospace", color: C.text, fontSize: 13 }}>

      {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
      <div style={{ background: "#050510", borderBottom: "1px solid #ffffff10", padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 3, flexShrink: 0 }}>EOCON 2026 · {t.cockpit}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: C.white, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.title}</div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
            {session.type?.toUpperCase()} {session.time && `· ${session.time}${session.endTime ? `–${session.endTime}` : ""}`} {session.room && `· ${session.room}`}
          </div>
        </div>

        {/* Timer */}
        <div style={{ display: "flex", gap: 20, flexShrink: 0, alignItems: "center" }}>
          {isLive ? (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.green, letterSpacing: 2 }}>{t.elapsed}</div>
                <div style={{ fontSize: 20, color: C.green, fontWeight: 900 }}>{formatElapsed(elapsed ?? 0)}</div>
              </div>
              {remaining !== null && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: minsLeft !== null && minsLeft <= 5 ? C.red : C.orange, letterSpacing: 2 }}>{t.remaining}</div>
                  <div style={{ fontSize: 20, color: minsLeft !== null && minsLeft <= 5 ? C.red : C.orange, fontWeight: 900 }}>{formatElapsed(remaining)}</div>
                </div>
              )}
              <div style={tag(C.green)}>● {t.live}</div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: C.dim }}>{t.waiting}{startMs && elapsed !== null ? ` (${formatElapsed(-elapsed)})` : ""}</div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          {livePageUrl && (
            <a href={livePageUrl} target="_blank" rel="noopener noreferrer" style={btn(C.accent)}>{t.live_page}</a>
          )}
          <button onClick={() => setLang(l => l === "fr" ? "en" : "fr")} style={btn(C.dim)}>
            {t.lang_toggle}
          </button>
        </div>
      </div>

      {/* Alerte timer */}
      {isLive && minsLeft !== null && minsLeft <= 5 && minsLeft > 0 && (
        <div style={{ background: "#ff440015", border: "1px solid #ff444030", padding: "8px 20px", fontSize: 12, color: C.red, textAlign: "center", letterSpacing: 1 }}>
          ⚠️ {minsLeft} minute{minsLeft > 1 ? "s" : ""} {lang === "fr" ? "restante" : "remaining"}{minsLeft > 1 && lang === "fr" ? "s" : ""}
        </div>
      )}

      {/* ══ BODY ══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 16, padding: 16, maxWidth: 1400, margin: "0 auto" }}>

        {/* ── COL 1 : SPEAKER + INTRO ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Votre nom */}
          <div style={card(C.dim)}>
            <label style={{ fontSize: 9, color: C.dim, letterSpacing: 2, display: "block", marginBottom: 6 }}>{t.your_name.toUpperCase()}</label>
            <input
              value={modName}
              onChange={e => setModName((e.target as HTMLInputElement).value)}
              placeholder={lang === "fr" ? "ex: Sophie Martin" : "e.g. Sophie Martin"}
              style={{ width: "100%", background: "#050508", border: "1px solid #ffffff15", borderRadius: 5, color: C.white, padding: "6px 10px", fontSize: 12, fontFamily: "'Courier New', monospace", boxSizing: "border-box", outline: "none" }}
            />
          </div>

          {/* Speaker card */}
          {speaker ? (
            <div style={card(C.accent)}>
              <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3, marginBottom: 12 }}>{t.speaker.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                {speaker.photoUrl && (
                  <img src={speaker.photoUrl} alt={speaker.name} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${C.accent}30` }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, color: C.white, fontWeight: 700 }}>{speaker.name}</div>
                  {speaker.title && <div style={{ fontSize: 11, color: C.dim }}>{speaker.title}</div>}
                  {speaker.company && <div style={{ fontSize: 11, color: C.dim }}>{speaker.company}</div>}
                  {speaker.country && <div style={{ fontSize: 11, color: C.dim }}>🌍 {speaker.country}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {speaker.linkedin && <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: C.accent, textDecoration: "none" }}>🔵 LinkedIn</a>}
                    {speaker.twitter && <a href={speaker.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#4488cc", textDecoration: "none" }}>🐦 Twitter</a>}
                  </div>
                </div>
              </div>

              {speaker.talkTitle && (
                <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: C.accent, letterSpacing: 2, marginBottom: 4 }}>TALK</div>
                  <div style={{ fontSize: 12, color: C.white, fontWeight: 700 }}>{speaker.talkTitle}</div>
                  {speaker.talkFormat && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{speaker.talkFormat}</div>}
                </div>
              )}

              {speaker.bio && (
                <div>
                  <div style={{ fontSize: 9, color: C.dim, letterSpacing: 2, marginBottom: 4 }}>BIO</div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6, maxHeight: 80, overflow: "hidden", position: "relative" }}>
                    {speaker.bio.slice(0, 250)}{speaker.bio.length > 250 ? "…" : ""}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...card(C.dim), fontSize: 11, color: C.dim }}>
              {lang === "fr" ? "Aucun speaker associé à cette session." : "No speaker linked to this session."}
            </div>
          )}

          {/* Intro script */}
          {speaker && (
            <div style={card(C.green)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: C.green, letterSpacing: 3 }}>{t.intro.toUpperCase()}</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(introScript).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={btn(copied ? C.green : C.dim)}>
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <textarea
                value={introScript}
                onChange={e => setIntroScript((e.target as HTMLTextAreaElement).value)}
                style={{ width: "100%", background: "#050508", border: "1px solid #00ff9d15", borderRadius: 6, color: C.white, padding: "10px 12px", fontSize: 12, fontFamily: "'Courier New', monospace", lineHeight: 1.7, resize: "vertical", minHeight: 180, boxSizing: "border-box", outline: "none" }}
              />
              <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>
                {lang === "fr" ? "Modifiable librement · les changements ne sont pas sauvegardés" : "Freely editable · changes are not saved"}
              </div>
            </div>
          )}

          {/* Session suivante */}
          {nextSession && (
            <div style={{ ...card(C.orange), display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, color: C.orange, letterSpacing: 3, marginBottom: 4 }}>{t.nextSession.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: C.white, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nextSession.title}</div>
                {nextSession.speakerName && <div style={{ fontSize: 11, color: C.dim }}>{nextSession.speakerName}</div>}
                {nextSession.time && <div style={{ fontSize: 10, color: C.orange }}>{nextSession.time}</div>}
              </div>
              <div style={tag(C.orange)}>{nextSession.type?.toUpperCase()}</div>
            </div>
          )}

          {/* Contact tech */}
          {techContact && (
            <div style={{ ...card(C.red), fontSize: 11 }}>
              <div style={{ fontSize: 9, color: C.red, letterSpacing: 3, marginBottom: 6 }}>{t.tech.toUpperCase()} 🚨</div>
              <div style={{ color: C.white, fontWeight: 700 }}>{techContact}</div>
            </div>
          )}
        </div>

        {/* ── COL 2 : Q&A ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={card(C.accent)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: C.accent, letterSpacing: 3 }}>{t.qa.toUpperCase()}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={tag(C.orange)}>{pendingQs.length} {t.pending}</span>
                  <span style={tag(C.green)}>{approvedQs.length} {t.approved}</span>
                  <span style={tag(C.dim)}>{answeredQs.length} {t.answered}</span>
                </div>
                <button onClick={loadQuestions} disabled={qaLoading} style={btn(C.dim, qaLoading)}>
                  {qaLoading ? "…" : "↺"}
                </button>
              </div>
            </div>

            {/* Pending */}
            {pendingQs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.orange, letterSpacing: 2, marginBottom: 8 }}>▼ {t.pending.toUpperCase()}</div>
                {pendingQs.map(q => (
                  <div key={q.id} style={{ background: `${C.orange}08`, border: `1px solid ${C.orange}20`, borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: C.white, lineHeight: 1.5, flex: 1 }}>{q.body}</div>
                      <span style={{ fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>▲{q.upvotes}</span>
                    </div>
                    {q.displayName && <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>— {q.displayName}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => qaAction(q.id, { approved: true })} style={btn(C.green)}>{t.approve}</button>
                      <button onClick={() => qaAction(q.id, { hidden: true })} style={btn(C.red)}>{t.reject}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Approved */}
            {approvedQs.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: C.green, letterSpacing: 2, marginBottom: 8 }}>✓ {t.approved.toUpperCase()}</div>
                {approvedQs.map(q => (
                  <div key={q.id} style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: C.white, lineHeight: 1.5, flex: 1 }}>{q.body}</div>
                      <span style={{ fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>▲{q.upvotes}</span>
                    </div>
                    {q.displayName && <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>— {q.displayName}</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => qaAction(q.id, { answered: true })} style={btn(C.accent)}>{t.answered_btn}</button>
                      <button onClick={() => qaAction(q.id, { approved: false })} style={btn(C.dim)}>{lang === "fr" ? "Annuler" : "Unapprove"}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Answered */}
            {answeredQs.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: C.dim, letterSpacing: 2, marginBottom: 8 }}>✔ {t.answered.toUpperCase()}</div>
                {answeredQs.map(q => (
                  <div key={q.id} style={{ background: "#050508", border: "1px solid #ffffff08", borderRadius: 6, padding: "8px 12px", marginBottom: 6, opacity: 0.6 }}>
                    <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{q.body}</div>
                    {q.displayName && <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>— {q.displayName}</div>}
                  </div>
                ))}
              </div>
            )}

            {pendingQs.length === 0 && approvedQs.length === 0 && answeredQs.length === 0 && (
              <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: "20px 0" }}>{t.no_qs}</div>
            )}
          </div>
        </div>
      </div>

      {/* ══ RUNSHEET ══════════════════════════════════════════════════════════ */}
      <div style={{ padding: "0 16px 24px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={card(C.orange)}>
          <div style={{ fontSize: 9, color: C.orange, letterSpacing: 3, marginBottom: 14 }}>{t.runsheet.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {runsheet.map((step, i) => (
              <div key={i}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: checked[i] ? `${C.green}08` : "#050508", border: `1px solid ${checked[i] ? `${C.green}30` : "#ffffff08"}`, borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}
                onClick={() => setChecked(c => ({ ...c, [i]: !c[i] }))}>
                <div style={{ fontSize: 14, flexShrink: 0 }}>{checked[i] ? "✅" : step.emoji}</div>
                <div style={{ fontSize: 10, color: C.orange, width: 80, flexShrink: 0, fontWeight: 700 }}>{step.offset}</div>
                <div style={{ fontSize: 12, color: checked[i] ? C.dim : C.text, textDecoration: checked[i] ? "line-through" : "none", flex: 1 }}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
