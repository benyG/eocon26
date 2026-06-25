"use client";

import { useState, useEffect, useCallback } from "react";
import StreamingGuide from "./StreamingGuide";
import { useLang } from "@/lib/adminLangContext";

interface Stream {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

interface LiveSettings {
  streams: Stream[];
}

interface Question {
  id: number;
  body: string;
  displayName: string | null;
  approved: boolean;
  answered: boolean;
  upvotes: number;
  adminNote: string | null;
  askedAt: string;
}

interface Workshop {
  id: string;
  title: string;
  titleEn: string;
  room: string;
  active: boolean;
  description?: string;
  descriptionEn?: string;
}

interface JaasConfig {
  appId: string;
  apiKey: string;
  privateKey: string;
}

interface Participant {
  id: number;
  name: string;
  ticketType: string;
  lastSeenAt: string | null;
  ipAddress: string | null;
}

interface LiveStats {
  onlineCount: number;
  totalConnected: number;
  participants: Participant[];
  questions: { pending: number; approved: number; answered: number; total: number };
}

interface Announcement {
  message: string;
  enabled: boolean;
  expiresAt: string | null;
}

interface RestreamChannel {
  id: number;
  displayName: string;
  type: string;
  isActive: boolean;
  isLive: boolean;
  viewerCount: number;
  embedUrl: string | null;
}

interface RestreamStatus {
  configured: boolean;
  error?: string;
  channels?: RestreamChannel[];
  streamKey?: string;
  rtmpUrl?: string;
  anyLive?: boolean;
  youtubeEmbedUrl?: string | null;
}

interface Session {
  id: number;
  title: string;
  time: string | null;
  date: string | null;
  type: string | null;
  speakerName: string | null;
  liveUrl: string | null;
}

const EMPTY: LiveSettings = { streams: [] };
const EMPTY_WORKSHOP: Workshop = { id: "", title: "", titleEn: "", room: "", active: true, description: "", descriptionEn: "" };

const PLATFORM_ICON: Record<string, string> = {
  youtube: "▶️", facebook: "📘", twitch: "💜", linkedin: "🔵",
  twitter: "🐦", kick: "🟢", tiktok: "🎵", instagram: "📸",
};

const INPUT_STYLE = {
  width: "100%", background: "#050508", border: "1px solid #00ff9d20",
  borderRadius: 6, color: "#fff", padding: "8px 12px", fontSize: 13,
  fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, outline: "none",
};

const SAVE_BTN_STYLE = (disabled: boolean) => ({
  background: "#00ff9d", color: "#000", padding: "8px 20px", borderRadius: 6,
  fontSize: 12, fontWeight: 900, cursor: disabled ? "not-allowed" as const : "pointer" as const,
  letterSpacing: 1, border: "none", opacity: disabled ? 0.6 : 1,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ArchBox({ color, icon, title, children }: { color: string; icon: string; title: string; children?: any }) {
  return (
    <div style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
      <div style={{ fontSize: 10, color, letterSpacing: 3, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function StepHeader({ n, label, color = "#00ff9d" }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color, fontFamily: "'Courier New', monospace", flexShrink: 0 }}>
        {n}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: `${color}15` }} />
    </div>
  );
}

interface TeamMember { id: number; name: string; role: string; email: string | null; }
interface AcceptedSpeaker { id: number; name: string; title: string | null; talkTitle: string | null; cfpSubmission: { email: string } | null; }

interface RestreamCaption { id: number; text: string; secondaryText?: string; active: boolean; }
interface RestreamTicker  { id: number; text: string; active: boolean; }
interface Overlays { captions: RestreamCaption[]; tickers: RestreamTicker[]; }
interface StreamingTeamConfig {
  sessionTitle: string; sessionTime: string; sessionId?: number; studioLink: string;
  moderator: { name: string; email: string; lang: "fr" | "en" } | null;
  speakers: { name: string; email: string; lang: "fr" | "en" }[];
  techContact: string;
}
const EMPTY_TEAM: StreamingTeamConfig = { sessionTitle: "", sessionTime: "", studioLink: "", moderator: null, speakers: [], techContact: "" };

export default function LivePanel({ canWrite }: { canWrite: boolean }) {
  const __ = useLang();
  const [mode, setMode] = useState<"live" | "config">("live");
  const [qaFilter, setQaFilter] = useState<"pending" | "approved" | "answered">("pending");
  const [showGuide, setShowGuide] = useState(false);

  // ── Streams ───────────────────────────────────────────────────────────────
  const [settings, setSettings]   = useState<LiveSettings>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);

  // ── Sessions today ────────────────────────────────────────────────────────
  const [sessions, setSessions]   = useState<Session[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  // ── Q&A ───────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qaLoading, setQaLoading] = useState(false);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const [stats, setStats]           = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>({ message: "", enabled: false, expiresAt: null });
  const [annSaving, setAnnSaving]   = useState(false);
  const [annSaved, setAnnSaved]     = useState(false);

  // ── Restream ──────────────────────────────────────────────────────────────
  const [restreamStatus, setRestreamStatus]   = useState<RestreamStatus | null>(null);
  const [restreamLoading, setRestreamLoading] = useState(false);
  const [restreamToken, setRestreamToken]     = useState("");
  const [restreamTokenSaved, setRestreamTokenSaved] = useState(false);
  const [restreamTokenSaving, setRestreamTokenSaving] = useState(false);
  const [showRtmpKey, setShowRtmpKey]         = useState(false);
  const [rtmpCopied, setRtmpCopied]           = useState(false);
  const [keyCopied, setKeyCopied]             = useState(false);

  // ── Streaming team ────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers]       = useState<TeamMember[]>([]);
  const [acceptedSpeakers, setAcceptedSpeakers] = useState<AcceptedSpeaker[]>([]);
  const [streamingTeam, setStreamingTeam]   = useState<StreamingTeamConfig>(EMPTY_TEAM);
  const [teamSaving, setTeamSaving]         = useState(false);
  const [teamSaved, setTeamSaved]           = useState(false);
  const [inviteSending, setInviteSending]   = useState<Record<string, boolean>>({});
  const [inviteSent, setInviteSent]         = useState<Record<string, boolean>>({});

  // ── Overlays (captions & tickers) ────────────────────────────────────────
  // ── Moderator token ───────────────────────────────────────────────────────
  const [modTokenLoading, setModTokenLoading] = useState(false);
  const [modTokenUrl, setModTokenUrl]     = useState<string | null>(null);
  const [modTokenCopied, setModTokenCopied] = useState(false);

  // ── Overlays (captions & tickers) ────────────────────────────────────────
  const [overlays, setOverlays]           = useState<Overlays>({ captions: [], tickers: [] });
  const [overlaysLoading, setOverlaysLoading] = useState(false);
  const [overlaysBulking, setOverlaysBulking] = useState(false);
  const [overlaysBulkResult, setOverlaysBulkResult] = useState<string | null>(null);
  const [overlayPerSpeaker, setOverlayPerSpeaker] = useState<Record<number, boolean>>({});

  // ── Workshops & JaaS ──────────────────────────────────────────────────────
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsSaving, setWsSaving]   = useState(false);
  const [wsSaved, setWsSaved]     = useState(false);
  const [editWs, setEditWs]       = useState<Workshop | null>(null);
  const [jaas, setJaas]           = useState<JaasConfig>({ appId: "", apiKey: "", privateKey: "" });
  const [jaasSaving, setJaasSaving] = useState(false);
  const [jaasSaved, setJaasSaved] = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        fetch("/api/admin/live/settings"),
        fetch("/api/admin/sessions"),
      ]);
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (sessionsRes.ok) {
        const all: Session[] = await sessionsRes.json();
        setSessions(all.filter(s => s.date === today));
      }
    } finally { setLoading(false); }
  }, [today]);

  const loadRestreamStatus = useCallback(async () => {
    setRestreamLoading(true);
    try {
      const res = await fetch("/api/admin/live/restream/status");
      const data = await res.json().catch(() => null);
      if (data) setRestreamStatus(data);
    } finally { setRestreamLoading(false); }
  }, []);

  const loadRestreamConfig = useCallback(async () => {
    const res = await fetch("/api/admin/live/restream");
    if (res.ok) {
      const data = await res.json() as { configured: boolean; tokenPreview: string };
      if (data.tokenPreview) setRestreamToken(data.tokenPreview);
    }
  }, []);

  const loadStreamingTeam = useCallback(async () => {
    try {
      const [teamRes, speakersRes, stRes] = await Promise.all([
        fetch("/api/admin/team"),
        fetch("/api/admin/speakers"),
        fetch("/api/admin/live/streaming-team"),
      ]);
      if (teamRes.ok) setTeamMembers(await teamRes.json());
      if (speakersRes.ok) {
        const all = await speakersRes.json() as AcceptedSpeaker[];
        setAcceptedSpeakers(all);
      }
      if (stRes.ok) {
        const data = await stRes.json();
        if (data) setStreamingTeam(data);
      }
    } catch { /* non-blocking */ }
  }, []);

  const loadOverlays = useCallback(async () => {
    setOverlaysLoading(true);
    try {
      const res = await fetch("/api/admin/live/restream/overlays");
      const data = await res.json().catch(() => null);
      if (data && !data.error) setOverlays(data);
    } finally { setOverlaysLoading(false); }
  }, []);

  const overlayAction = async (action: string, params: Record<string, unknown> = {}) => {
    const res = await fetch("/api/admin/live/restream/overlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    return res.json().catch(() => null);
  };

  const saveStreamingTeam = async () => {
    setTeamSaving(true); setTeamSaved(false);
    try {
      const res = await fetch("/api/admin/live/streaming-team", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(streamingTeam),
      });
      if (res.ok) { setTeamSaved(true); setTimeout(() => setTeamSaved(false), 2000); }
    } finally { setTeamSaving(false); }
  };

  const sendInvite = async (key: string, type: "speaker" | "moderator", to: string, name: string, lang: "fr" | "en") => {
    if (!to) return;
    setInviteSending(s => ({ ...s, [key]: true }));
    try {
      const res = await fetch("/api/admin/live/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, to, name, lang,
          sessionTitle: streamingTeam.sessionTitle || "Session EOCON 2026",
          sessionTime: streamingTeam.sessionTime || "",
          studioLink: streamingTeam.studioLink || "https://studio.restream.io",
        }),
      });
      if (res.ok) { setInviteSent(s => ({ ...s, [key]: true })); setTimeout(() => setInviteSent(s => ({ ...s, [key]: false })), 5000); }
    } finally { setInviteSending(s => ({ ...s, [key]: false })); }
  };

  const saveRestreamToken = async (newToken: string) => {
    setRestreamTokenSaving(true); setRestreamTokenSaved(false);
    try {
      const res = await fetch("/api/admin/live/restream", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newToken }),
      });
      if (res.ok) {
        setRestreamTokenSaved(true);
        setTimeout(() => setRestreamTokenSaved(false), 2500);
        loadRestreamStatus();
      }
    } finally { setRestreamTokenSaving(false); }
  };

  const copyRtmp = async () => {
    const url = restreamStatus?.rtmpUrl ?? "";
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    setRtmpCopied(true);
    setTimeout(() => setRtmpCopied(false), 2000);
  };

  const copyStreamKey = async () => {
    const key = restreamStatus?.streamKey ?? "";
    if (!key) return;
    await navigator.clipboard.writeText(key).catch(() => {});
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const loadQuestions = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch("/api/admin/live/questions");
      if (res.ok) setQuestions(await res.json());
    } finally { setQaLoading(false); }
  }, []);

  const loadWorkshops = useCallback(async () => {
    setWsLoading(true);
    try {
      const [wsRes, jaasRes] = await Promise.all([
        fetch("/api/admin/live/workshops"),
        fetch("/api/admin/live/jaas"),
      ]);
      if (wsRes.ok)   setWorkshops(await wsRes.json());
      if (jaasRes.ok) setJaas(await jaasRes.json());
    } finally { setWsLoading(false); }
  }, []);

  const loadDashboard = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statsRes, annRes] = await Promise.all([
        fetch("/api/admin/live/stats"),
        fetch("/api/admin/live/announcement"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (annRes.ok)   setAnnouncement(await annRes.json());
    } finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); loadRestreamConfig(); }, [loadSettings, loadRestreamConfig]);
  useEffect(() => { loadDashboard(); loadQuestions(); loadRestreamStatus(); }, [loadDashboard, loadQuestions, loadRestreamStatus]);
  useEffect(() => { if (mode === "config") { loadWorkshops(); loadStreamingTeam(); loadOverlays(); } }, [mode, loadWorkshops, loadStreamingTeam, loadOverlays]);

  useEffect(() => {
    if (mode !== "live") return;
    const t = setInterval(() => { loadDashboard(); loadRestreamStatus(); }, 30000);
    return () => clearInterval(t);
  }, [mode, loadDashboard, loadRestreamStatus]);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const saveStreams = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/admin/live/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  };

  const updateStream = (id: string, patch: Partial<Stream>) =>
    setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.map((st: Stream) => st.id === id ? { ...st, ...patch } : st) }));
  const addStream    = () => setSettings((s: LiveSettings) => ({ ...s, streams: [...s.streams, { id: Date.now().toString(), title: "", url: "", active: false }] }));
  const removeStream = (id: string) => setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.filter((st: Stream) => st.id !== id) }));

  const saveAnnouncement = async () => {
    setAnnSaving(true); setAnnSaved(false);
    try {
      const res = await fetch("/api/admin/live/announcement", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(announcement),
      });
      if (res.ok) { setAnnSaved(true); setTimeout(() => setAnnSaved(false), 2000); }
    } finally { setAnnSaving(false); }
  };

  const saveWorkshops = async (list: Workshop[]) => {
    setWsSaving(true); setWsSaved(false);
    try {
      const res = await fetch("/api/admin/live/workshops", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(list),
      });
      if (res.ok) { setWorkshops(list); setWsSaved(true); setTimeout(() => setWsSaved(false), 2000); }
    } finally { setWsSaving(false); }
  };

  const saveJaas = async () => {
    setJaasSaving(true); setJaasSaved(false);
    try {
      const res = await fetch("/api/admin/live/jaas", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jaas),
      });
      if (res.ok) { setJaasSaved(true); setTimeout(() => setJaasSaved(false), 2000); }
    } finally { setJaasSaving(false); }
  };

  const addWorkshop        = () => setEditWs({ ...EMPTY_WORKSHOP, id: Date.now().toString() });
  const saveEditedWorkshop = (ws: Workshop) => {
    const next = workshops.some(w => w.id === ws.id) ? workshops.map(w => w.id === ws.id ? ws : w) : [...workshops, ws];
    saveWorkshops(next);
    setEditWs(null);
  };
  const removeWorkshop = (id: string) => saveWorkshops(workshops.filter(w => w.id !== id));

  const patchQuestion = async (id: number, patch: Partial<Question>) => {
    const res = await fetch(`/api/admin/live/questions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (res.ok) setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  };
  const deleteQuestion = async (id: number) => {
    const res = await fetch(`/api/admin/live/questions/${id}`, { method: "DELETE" });
    if (res.ok) setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const filteredQuestions = questions.filter(q => {
    if (qaFilter === "pending")  return !q.approved && !q.answered;
    if (qaFilter === "approved") return q.approved && !q.answered;
    return q.answered;
  });

  const pendingCount = questions.filter(q => !q.approved && !q.answered).length;

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const MODE_BTN = (active: boolean, col: string) => ({
    padding: "9px 22px", borderRadius: 8, fontSize: 12, fontWeight: active ? 900 : 400,
    cursor: "pointer" as const, fontFamily: "'Courier New', monospace", letterSpacing: 1,
    background: active ? `${col}18` : "transparent",
    border: `1px solid ${active ? col : "#333"}`,
    color: active ? col : "#555",
    transition: "all .15s",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 4 }}>🔴 EOCON 2026</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 4px", fontFamily: "'Courier New', monospace" }}>Live Streaming</h1>
        <p style={{ color: "#555", fontSize: 12 }}>{__("Diffusion YouTube · Ateliers JaaS · Q&A temps réel", "YouTube Broadcast · JaaS Workshops · Real-time Q&A")}</p>
      </div>

      {/* Quick links */}
      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <a href="/live" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#00ff9d", border: "1px solid #00ff9d40", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live</a>
        <a href="/live/resend" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#888", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ /live/resend</a>
        <button onClick={() => setShowGuide(true)} style={{ fontSize: 11, color: "#ffaa00", border: "1px solid #ffaa0040", padding: "6px 14px", borderRadius: 6, cursor: "pointer", background: "transparent", letterSpacing: 1 }}>
          📖 {__("Guide opérateur", "Operator Guide")}
        </button>
        <a href="https://studio.restream.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#ff6b6b", border: "1px solid #ff444030", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Restream Studio</a>
      </div>

      {/* Guide modal */}
      {showGuide && <StreamingGuide onClose={() => setShowGuide(false)} />}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, alignItems: "center" }}>
        <button style={MODE_BTN(mode === "live", "#ff4444")} onClick={() => setMode("live")}>
          🔴 {__("En direct", "Live")}
          {(stats?.onlineCount ?? 0) > 0 && (
            <span style={{ marginLeft: 8, background: "#ff4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{stats!.onlineCount}</span>
          )}
          {pendingCount > 0 && (
            <span style={{ marginLeft: 4, background: "#ffaa00", color: "#000", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{pendingCount} Q</span>
          )}
        </button>
        <button style={MODE_BTN(mode === "config", "#4488ff")} onClick={() => setMode("config")}>
          ⚙️ {__("Configuration", "Configuration")}
        </button>
      </div>

      {/* ══ MODE EN DIRECT ══════════════════════════════════════════════════ */}
      {mode === "live" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: __("En ligne", "Online"), value: stats?.onlineCount ?? 0, color: "#00ff9d", hint: __("< 3 min", "< 3 min") },
              { label: __("Sessions actives", "Active sessions"), value: stats?.totalConnected ?? 0, color: "#4488ff", hint: __("non expirées", "not expired") },
              { label: __("Q en attente", "Q pending"), value: stats?.questions.pending ?? 0, color: "#ff4444", hint: __("à modérer", "to moderate") },
              { label: __("Q approuvées", "Q approved"), value: stats?.questions.approved ?? 0, color: "#ffaa00", hint: __("affichées", "displayed") },
              { label: __("Q répondues", "Q answered"), value: stats?.questions.answered ?? 0, color: "#00aaff", hint: __("archivées", "archived") },
            ].map(card => (
              <div key={card.label} style={{ background: "#0a0a12", border: `1px solid ${card.color}30`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: card.color, fontFamily: "'Courier New', monospace" }}>{card.value}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{card.label}</div>
                <div style={{ fontSize: 10, color: "#555" }}>{card.hint}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { loadDashboard(); loadRestreamStatus(); }} disabled={statsLoading} style={{ fontSize: 11, color: "#555", background: "transparent", border: "1px solid #333", padding: "5px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 20, fontFamily: "'Courier New', monospace" }}>
            {statsLoading ? "…" : `↺ ${__("Rafraîchir", "Refresh")}`}
          </button>

          {/* Restream live status */}
          {restreamStatus && (
            <div style={{ background: "#0a0a12", border: `1px solid ${restreamStatus.anyLive ? "#ff444040" : "#ffffff10"}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: restreamStatus.anyLive ? "#ff4444" : "#555", boxShadow: restreamStatus.anyLive ? "0 0 8px #ff4444" : "none" }} />
                  <span style={{ fontSize: 11, color: restreamStatus.anyLive ? "#ff6b6b" : "#666", fontFamily: "'Courier New', monospace", letterSpacing: 2 }}>
                    RESTREAM {restreamStatus.anyLive ? `— ${__("EN DIRECT", "LIVE")}` : `— ${__("HORS LIGNE", "OFFLINE")}`}
                  </span>
                  {restreamStatus.error && <span style={{ fontSize: 10, color: "#ff6b6b" }}>⚠ {restreamStatus.error}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {restreamStatus.anyLive && restreamStatus.youtubeEmbedUrl && (
                    <button
                      onClick={() => navigator.clipboard.writeText(restreamStatus.youtubeEmbedUrl!).catch(() => {})}
                      style={{ fontSize: 10, color: "#00ff9d", background: "#00ff9d15", border: "1px solid #00ff9d40", padding: "4px 10px", borderRadius: 5, cursor: "pointer", letterSpacing: 1 }}>
                      📋 {__("Copier embed YouTube", "Copy YouTube embed")}
                    </button>
                  )}
                  <button onClick={loadRestreamStatus} disabled={restreamLoading} style={{ fontSize: 10, color: "#555", background: "transparent", border: "1px solid #333", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>
                    {restreamLoading ? "…" : "↺"}
                  </button>
                  <a href="https://studio.restream.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#888", background: "transparent", border: "1px solid #333", padding: "4px 10px", borderRadius: 5, textDecoration: "none", letterSpacing: 1 }}>
                    → Studio
                  </a>
                </div>
              </div>

              {!restreamStatus.configured ? (
                <p style={{ fontSize: 12, color: "#555" }}>{__("Token non configuré — allez dans ⚙️ Configuration pour connecter Restream.", "Token not configured — go to ⚙️ Configuration to connect Restream.")}</p>
              ) : (restreamStatus.channels ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "#555" }}>{__("Aucun canal connecté dans Restream.", "No channel connected in Restream.")}</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {(restreamStatus.channels ?? []).map(ch => (
                    <div key={ch.id} style={{ background: "#070710", border: `1px solid ${ch.isLive ? "#ff444030" : "#ffffff08"}`, borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{PLATFORM_ICON[ch.type] ?? "📺"}</span>
                        <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{ch.displayName}</span>
                        {ch.isLive && <span style={{ fontSize: 9, background: "#ff4444", color: "#fff", borderRadius: 4, padding: "1px 5px", letterSpacing: 1, marginLeft: "auto" }}>LIVE</span>}
                      </div>
                      {ch.isLive && ch.viewerCount > 0 && (
                        <div style={{ fontSize: 11, color: "#ffaa00" }}>👁 {ch.viewerCount.toLocaleString()} {__("spectateurs", "viewers")}</div>
                      )}
                      {!ch.isActive && <div style={{ fontSize: 10, color: "#555" }}>{__("Inactif", "Inactive")}</div>}
                      {ch.isLive && ch.embedUrl && (
                        <a href={ch.embedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#4488ff", textDecoration: "none", display: "block", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ↗ Embed
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Announcement */}
          <div style={{ background: "#0a0a12", border: "1px solid #ffaa0030", borderRadius: 10, padding: 20, marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, marginBottom: 14 }}>📢 {__("ANNONCE BROADCAST", "BROADCAST ANNOUNCEMENT")}</div>
            <textarea
              value={announcement.message}
              onChange={e => setAnnouncement(a => ({ ...a, message: (e.target as HTMLTextAreaElement).value }))}
              disabled={!canWrite} rows={3}
              placeholder={__("Message affiché en banner sur la page /live…", "Message displayed as a banner on the /live page…")}
              style={{ width: "100%", background: "#050508", border: "1px solid #ffaa0020", borderRadius: 6, color: "#fff", padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "none" as const, outline: "none", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#aaa", cursor: "pointer" }}>
                <input type="checkbox" checked={announcement.enabled} onChange={e => setAnnouncement(a => ({ ...a, enabled: (e.target as HTMLInputElement).checked }))} disabled={!canWrite} style={{ accentColor: "#ffaa00" }} />
                {__("Activer l'annonce", "Enable announcement")}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#666" }}>
                <span>{__("Expire le :", "Expires on:")}</span>
                <input
                  type="datetime-local"
                  value={announcement.expiresAt ? announcement.expiresAt.slice(0, 16) : ""}
                  onChange={e => setAnnouncement(a => ({ ...a, expiresAt: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value).toISOString() : null }))}
                  disabled={!canWrite}
                  style={{ background: "#050508", border: "1px solid #333", borderRadius: 4, color: "#aaa", padding: "3px 8px", fontSize: 11, fontFamily: "'Courier New', monospace" }}
                />
                {announcement.expiresAt && <button onClick={() => setAnnouncement(a => ({ ...a, expiresAt: null }))} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>✕</button>}
              </div>
              {canWrite && (
                <button onClick={saveAnnouncement} disabled={annSaving} style={{ ...SAVE_BTN_STYLE(annSaving), background: "#ffaa00", marginLeft: "auto" }}>
                  {annSaved ? `✓ ${__("Sauvegardé", "Saved")}` : annSaving ? "…" : __("Sauvegarder", "Save")}
                </button>
              )}
            </div>
            {announcement.enabled && announcement.message && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#ffaa0015", border: "1px solid #ffaa0040", borderRadius: 6, fontSize: 12, color: "#ffaa00" }}>
                {__("Aperçu", "Preview")} : {announcement.message}
              </div>
            )}
          </div>

          {/* Q&A moderation */}
          <div style={{ background: "#0a0a12", border: "1px solid #ffffff10", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 10, color: "#fff", letterSpacing: 3, marginBottom: 16 }}>💬 {__("MODÉRATION Q&A", "Q&A MODERATION")}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(["pending","approved","answered"] as const).map(f => (
                <button key={f} onClick={() => setQaFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  background: qaFilter === f ? (f === "pending" ? "#ff440020" : f === "approved" ? "#00ff9d20" : "#0066ff20") : "transparent",
                  border: `1px solid ${qaFilter === f ? (f === "pending" ? "#ff4444" : f === "approved" ? "#00ff9d" : "#0066ff") : "#333"}`,
                  color: qaFilter === f ? (f === "pending" ? "#ff6b6b" : f === "approved" ? "#00ff9d" : "#4488ff") : "#666",
                  fontFamily: "'Courier New', monospace",
                }}>
                  {f === "pending" ? `⏳ ${__("En attente", "Pending")}` : f === "approved" ? `✓ ${__("Approuvées", "Approved")}` : `✅ ${__("Répondues", "Answered")}`}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>({questions.filter(q => f === "pending" ? (!q.approved && !q.answered) : f === "approved" ? (q.approved && !q.answered) : q.answered).length})</span>
                </button>
              ))}
              <button onClick={loadQuestions} disabled={qaLoading} style={{ fontSize: 11, color: "#555", background: "transparent", border: "1px solid #333", padding: "5px 10px", borderRadius: 6, cursor: "pointer", marginLeft: "auto" }}>
                {qaLoading ? "…" : "↺"}
              </button>
            </div>

            {filteredQuestions.length === 0 ? (
              <p style={{ color: "#555", fontSize: 12, padding: "16px 0" }}>{__("Aucune question dans ce filtre.", "No questions in this filter.")}</p>
            ) : (
              filteredQuestions.map(q => (
                <div key={q.id} style={{ background: "#070710", border: `1px solid ${q.answered ? "#0066ff30" : q.approved ? "#00ff9d30" : "#ffffff15"}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "#fff", fontSize: 13, margin: "0 0 6px", lineHeight: 1.5 }}>{q.body}</p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {q.displayName && <span style={{ fontSize: 10, color: "#888" }}>👤 {q.displayName}</span>}
                        <span style={{ fontSize: 10, color: "#555" }}>🕐 {new Date(q.askedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {q.upvotes > 0 && <span style={{ fontSize: 10, color: "#ffaa00" }}>▲ {q.upvotes}</span>}
                        {q.answered && <span style={{ fontSize: 10, color: "#4488ff" }}>✅ {__("Répondue", "Answered")}</span>}
                        {q.approved && !q.answered && <span style={{ fontSize: 10, color: "#00ff9d" }}>✓ {__("Approuvée", "Approved")}</span>}
                      </div>
                    </div>
                    {canWrite && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!q.approved && !q.answered && (
                          <button onClick={() => patchQuestion(q.id, { approved: true })} style={{ background: "#00ff9d20", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✓ {__("Approuver", "Approve")}</button>
                        )}
                        {q.approved && !q.answered && (
                          <button onClick={() => patchQuestion(q.id, { answered: true })} style={{ background: "#0066ff20", border: "1px solid #0066ff40", color: "#4488ff", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✅ {__("Répondue", "Answered")}</button>
                        )}
                        {q.approved && (
                          <button onClick={() => patchQuestion(q.id, { approved: false })} style={{ background: "transparent", border: "1px solid #ffffff15", color: "#666", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>↩</button>
                        )}
                        <button onClick={() => deleteQuestion(q.id)} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Participants */}
          {(stats?.participants ?? []).length > 0 && (
            <div style={{ background: "#0a0a12", border: "1px solid #00ff9d15", borderRadius: 10, padding: 20, marginTop: 20 }}>
              <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 14 }}>{__("PARTICIPANTS RÉCENTS", "RECENT PARTICIPANTS")} ({stats?.participants.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>{[__("Nom","Name"), __("Billet","Ticket"), __("Vu il y a","Last seen"), "IP"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "4px 10px", color: "#444", fontSize: 10, letterSpacing: 1, borderBottom: "1px solid #ffffff10" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {(stats?.participants ?? []).map(p => {
                      const seenMs = p.lastSeenAt ? Date.now() - new Date(p.lastSeenAt).getTime() : null;
                      const seenStr = seenMs == null ? "—" : seenMs < 60000 ? "< 1 min" : seenMs < 3600000 ? `${Math.floor(seenMs/60000)} min` : `${Math.floor(seenMs/3600000)} h`;
                      const isOnline = seenMs != null && seenMs < 3*60*1000;
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #ffffff08" }}>
                          <td style={{ padding: "8px 10px", color: isOnline ? "#00ff9d" : "#fff" }}>{isOnline && <span style={{ marginRight: 6, fontSize: 8 }}>●</span>}{p.name}</td>
                          <td style={{ padding: "8px 10px", color: "#888", fontSize: 11 }}>{p.ticketType}</td>
                          <td style={{ padding: "8px 10px", color: isOnline ? "#00ff9d" : "#555", fontFamily: "'Courier New', monospace", fontSize: 11 }}>{seenStr}</td>
                          <td style={{ padding: "8px 10px", color: "#444", fontSize: 10, fontFamily: "'Courier New', monospace" }}>{p.ipAddress ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MODE CONFIGURATION ══════════════════════════════════════════════ */}
      {mode === "config" && (
        <div>

          {/* ── ÉTAPE 0 · ÉQUIPE & INVITATIONS ────────────────────────────── */}
          <StepHeader n={0} label={__("Équipe streaming & invitations", "Streaming team & invitations")} color="#ffaa00" />

          <div style={{ background: "#0a0a12", border: "1px solid #ffaa0020", borderRadius: 10, padding: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, marginBottom: 16 }}>👥 {__("CONSTITUER L'ÉQUIPE POUR LA SESSION", "BUILD THE SESSION TEAM")}</div>

            {/* Session info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("TITRE DE LA SESSION", "SESSION TITLE")}</label>
                <select
                  value={streamingTeam.sessionId ?? ""}
                  onChange={e => {
                    const sid = parseInt((e.target as HTMLSelectElement).value);
                    const sess = sessions.find(s => s.id === sid);
                    if (sess) setStreamingTeam(t => ({ ...t, sessionId: sid, sessionTitle: sess.title, sessionTime: sess.time || "" }));
                  }}
                  style={{ ...INPUT_STYLE, cursor: "pointer" }}
                  disabled={!canWrite}
                >
                  <option value="">— {__("Sélectionner une session", "Select a session")} —</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.time ? `${s.time} · ` : ""}{s.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("HEURE", "TIME")}</label>
                <input value={streamingTeam.sessionTime} onChange={e => setStreamingTeam(t => ({ ...t, sessionTime: (e.target as HTMLInputElement).value }))} placeholder="09:00" disabled={!canWrite} style={INPUT_STYLE} />
              </div>
            </div>

            {/* Lien cockpit modérateur */}
            {streamingTeam.sessionId && canWrite && (
              <div style={{ background: "#070710", border: "1px solid #4488ff20", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2, marginBottom: 8 }}>🔑 {__("LIEN COCKPIT MODÉRATEUR (valable 48 h)", "MODERATOR COCKPIT LINK (valid 48 h)")}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    disabled={modTokenLoading}
                    onClick={async () => {
                      setModTokenLoading(true); setModTokenUrl(null);
                      try {
                        const res = await fetch("/api/admin/sessions/moderator-token", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sessionId: streamingTeam.sessionId }),
                        });
                        const data = await res.json();
                        if (data.url) setModTokenUrl(data.url);
                      } finally { setModTokenLoading(false); }
                    }}
                    style={{ fontSize: 11, color: modTokenLoading ? "#555" : "#4488ff", background: "#4488ff10", border: "1px solid #4488ff30", padding: "6px 14px", borderRadius: 6, cursor: modTokenLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                    {modTokenLoading ? __("Génération…", "Generating…") : modTokenUrl ? `↺ ${__("Régénérer", "Regenerate")}` : __("Générer le lien", "Generate link")}
                  </button>
                  {modTokenUrl && (
                    <>
                      <code style={{ flex: 1, fontSize: 10, color: "#4488ff", background: "#050508", border: "1px solid #4488ff15", borderRadius: 5, padding: "5px 10px", wordBreak: "break-all" as const, minWidth: 0 }}>
                        {modTokenUrl}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(modTokenUrl).catch(() => {}); setModTokenCopied(true); setTimeout(() => setModTokenCopied(false), 2000); }}
                        style={{ fontSize: 10, color: modTokenCopied ? "#00ff9d" : "#4488ff", background: modTokenCopied ? "#00ff9d10" : "transparent", border: `1px solid ${modTokenCopied ? "#00ff9d30" : "#4488ff30"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                        {modTokenCopied ? `✓ ${__("Copié", "Copied")}` : `📋 ${__("Copier", "Copy")}`}
                      </button>
                      <a href={modTokenUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#888", background: "transparent", border: "1px solid #333", padding: "5px 10px", borderRadius: 5, textDecoration: "none", whiteSpace: "nowrap" as const }}>
                        → {__("Ouvrir", "Open")}
                      </a>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 6 }}>{__("À envoyer au modérateur · donne accès au cockpit (speaker, script d'intro, Q&A, runsheet) sans login admin.", "Send to the moderator · grants access to the cockpit (speaker, intro script, Q&A, runsheet) without admin login.")}</div>
              </div>
            )}

            {/* Studio link */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("LIEN RESTREAM STUDIO (guest invite link)", "RESTREAM STUDIO LINK (guest invite link)")}</label>
              <input value={streamingTeam.studioLink} onChange={e => setStreamingTeam(t => ({ ...t, studioLink: (e.target as HTMLInputElement).value }))} placeholder="https://studio.restream.io/guest/…" disabled={!canWrite} style={INPUT_STYLE} />
              <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>{__("Généré dans Restream Studio → + Inviter → Guest link", "Generated in Restream Studio → + Invite → Guest link")}</div>
            </div>

            {/* Tech contact */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("CONTACT TECHNICIEN (nom ou téléphone)", "TECH CONTACT (name or phone)")}</label>
              <input value={streamingTeam.techContact} onChange={e => setStreamingTeam(t => ({ ...t, techContact: (e.target as HTMLInputElement).value }))} placeholder={__("ex: Jean Dupont — +237 6XX XXX XXX", "e.g. Jean Dupont — +237 6XX XXX XXX")} disabled={!canWrite} style={INPUT_STYLE} />
            </div>

            {/* Moderator */}
            <div style={{ background: "#070710", border: "1px solid #4488ff20", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2, marginBottom: 10 }}>🎙 {__("MODÉRATEUR", "MODERATOR")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto", gap: 8, alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 4 }}>{__("Nom", "Name")}</label>
                  <select
                    value={streamingTeam.moderator?.name ?? ""}
                    onChange={e => {
                      const val = (e.target as HTMLSelectElement).value;
                      const member = teamMembers.find(m => m.name === val);
                      if (member) setStreamingTeam(t => ({ ...t, moderator: { name: member.name, email: member.email || "", lang: t.moderator?.lang || "fr" } }));
                      else setStreamingTeam(t => ({ ...t, moderator: t.moderator ? { ...t.moderator, name: val } : { name: val, email: "", lang: "fr" } }));
                    }}
                    style={{ ...INPUT_STYLE, cursor: "pointer" }}
                    disabled={!canWrite}
                  >
                    <option value="">— {__("Équipe EOCON", "EOCON Team")} —</option>
                    {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 4 }}>Email</label>
                  <input value={streamingTeam.moderator?.email ?? ""} onChange={e => setStreamingTeam(t => ({ ...t, moderator: t.moderator ? { ...t.moderator, email: (e.target as HTMLInputElement).value } : { name: "", email: (e.target as HTMLInputElement).value, lang: "fr" } }))} placeholder="email@exemple.com" disabled={!canWrite} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 4 }}>{__("Langue", "Language")}</label>
                  <select value={streamingTeam.moderator?.lang ?? "fr"} onChange={e => setStreamingTeam(t => ({ ...t, moderator: t.moderator ? { ...t.moderator, lang: (e.target as HTMLSelectElement).value as "fr" | "en" } : { name: "", email: "", lang: (e.target as HTMLSelectElement).value as "fr" | "en" } }))} style={{ ...INPUT_STYLE, cursor: "pointer" }} disabled={!canWrite}>
                    <option value="fr">FR</option>
                    <option value="en">EN</option>
                  </select>
                </div>
                {canWrite && streamingTeam.moderator?.email && (
                  <button
                    onClick={() => sendInvite("moderator", "moderator", streamingTeam.moderator!.email, streamingTeam.moderator!.name, streamingTeam.moderator!.lang)}
                    disabled={inviteSending["moderator"]}
                    style={{ background: inviteSent["moderator"] ? "#00ff9d20" : "#4488ff20", border: `1px solid ${inviteSent["moderator"] ? "#00ff9d40" : "#4488ff40"}`, color: inviteSent["moderator"] ? "#00ff9d" : "#4488ff", padding: "8px 12px", borderRadius: 6, fontSize: 10, cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap" as const }}>
                    {inviteSent["moderator"] ? `✓ ${__("Envoyé", "Sent")}` : inviteSending["moderator"] ? "…" : `📨 ${__("Briefing", "Briefing")}`}
                  </button>
                )}
              </div>
            </div>

            {/* Speakers */}
            <div style={{ background: "#070710", border: "1px solid #ffaa0020", borderRadius: 8, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 2 }}>👤 SPEAKER(S)</div>
                {canWrite && (
                  <button onClick={() => setStreamingTeam(t => ({ ...t, speakers: [...t.speakers, { name: "", email: "", lang: "fr" }] }))} style={{ fontSize: 10, color: "#ffaa00", background: "transparent", border: "1px solid #ffaa0030", padding: "3px 10px", borderRadius: 4, cursor: "pointer" }}>+ Speaker</button>
                )}
              </div>
              {streamingTeam.speakers.length === 0 && <p style={{ fontSize: 11, color: "#555" }}>{__("Aucun speaker sélectionné.", "No speaker selected.")}</p>}
              {streamingTeam.speakers.map((sp, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto auto", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 4 }}>{__("Nom", "Name")}</label>}
                    <select
                      value={sp.name}
                      onChange={e => {
                        const val = (e.target as HTMLSelectElement).value;
                        const found = acceptedSpeakers.find(s => s.name === val);
                        const email = found?.cfpSubmission?.email || "";
                        setStreamingTeam(t => { const sps = [...t.speakers]; sps[idx] = { ...sps[idx], name: val, email: email || sps[idx].email }; return { ...t, speakers: sps }; });
                      }}
                      style={{ ...INPUT_STYLE, cursor: "pointer" }}
                      disabled={!canWrite}
                    >
                      <option value="">— {__("Speakers acceptés", "Accepted speakers")} —</option>
                      {acceptedSpeakers.map(s => <option key={s.id} value={s.name}>{s.name}{s.title ? ` (${s.title})` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 4 }}>Email</label>}
                    <input value={sp.email} onChange={e => setStreamingTeam(t => { const sps = [...t.speakers]; sps[idx] = { ...sps[idx], email: (e.target as HTMLInputElement).value }; return { ...t, speakers: sps }; })} placeholder="email@exemple.com" disabled={!canWrite} style={INPUT_STYLE} />
                  </div>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 10, color: "#666", display: "block", marginBottom: 4 }}>{__("Langue", "Language")}</label>}
                    <select value={sp.lang} onChange={e => setStreamingTeam(t => { const sps = [...t.speakers]; sps[idx] = { ...sps[idx], lang: (e.target as HTMLSelectElement).value as "fr" | "en" }; return { ...t, speakers: sps }; })} style={{ ...INPUT_STYLE, cursor: "pointer" }} disabled={!canWrite}>
                      <option value="fr">FR</option>
                      <option value="en">EN</option>
                    </select>
                  </div>
                  {canWrite && sp.email && (
                    <button
                      onClick={() => sendInvite(`speaker-${idx}`, "speaker", sp.email, sp.name || `Speaker ${idx + 1}`, sp.lang)}
                      disabled={inviteSending[`speaker-${idx}`]}
                      style={{ background: inviteSent[`speaker-${idx}`] ? "#00ff9d20" : "#ffaa0015", border: `1px solid ${inviteSent[`speaker-${idx}`] ? "#00ff9d40" : "#ffaa0040"}`, color: inviteSent[`speaker-${idx}`] ? "#00ff9d" : "#ffaa00", padding: "8px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                      {inviteSent[`speaker-${idx}`] ? "✓" : inviteSending[`speaker-${idx}`] ? "…" : "📨"}
                    </button>
                  )}
                  {canWrite && (
                    <button onClick={() => setStreamingTeam(t => ({ ...t, speakers: t.speakers.filter((_, i) => i !== idx) }))} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "8px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer" }}>✕</button>
                  )}
                </div>
              ))}
            </div>

            {canWrite && (
              <button onClick={saveStreamingTeam} disabled={teamSaving} style={SAVE_BTN_STYLE(teamSaving)}>
                {teamSaved ? `✓ ${__("Sauvegardé", "Saved")}` : teamSaving ? __("Sauvegarde…", "Saving…") : __("Sauvegarder l'équipe", "Save team")}
              </button>
            )}
          </div>

          {/* ── ÉTAPE 1 · SESSIONS ─────────────────────────────────────────── */}
          <StepHeader n={1} label={__("Sessions — Diffusion YouTube", "Sessions — YouTube Broadcast")} color="#4488ff" />

          <ArchBox color="#4488ff" icon="📡" title={__("COMMENT ÇA MARCHE", "HOW IT WORKS")}>
            <p style={{ margin: "0 0 8px" }}>
              {__("Pour les", "For")} <strong style={{ color: "#fff" }}>{__("talks, panels et keynotes", "talks, panels and keynotes")}</strong>, {__("les participants voient un", "participants see a")} <strong style={{ color: "#fff" }}>{__("embed YouTube", "YouTube embed")}</strong> {__("sur", "on")} <code style={{ color: "#4488ff" }}>/live</code>.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              {__("Le speaker peut utiliser", "The speaker can use")} <strong style={{ color: "#fff" }}>{__("n'importe quel outil", "any tool")}</strong> {__("pour sa salle privée — Zoom, Google Meet, Teams, Jitsi,", "for their private room — Zoom, Google Meet, Teams, Jitsi,")} <strong style={{ color: "#fff" }}>Restream</strong>, OBS — {__("tant que l'outil envoie le flux vers YouTube via RTMP.", "as long as the tool sends the stream to YouTube via RTMP.")}
            </p>
            <p style={{ margin: 0, color: "#666" }}>
              👉 {__("Dans le", "In the")} <strong style={{ color: "#aaa" }}>{__("Pipeline speakers", "Speakers Pipeline")}</strong>, {__("chaque session a un champ", "each session has a field")} <code style={{ color: "#4488ff" }}>{__("Lien live", "Live link")}</code> : {__("collez-y l'URL d'embed YouTube de cette session.", "paste the YouTube embed URL for that session.")}
            </p>
          </ArchBox>

          {/* Restream config */}
          <div style={{ background: "#0a0a12", border: `1px solid ${restreamStatus?.configured ? "#ff444030" : "#ffffff10"}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🎬</span>
                <div>
                  <div style={{ fontSize: 11, color: "#ff6b6b", letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>RESTREAM — {__("OPTION PRIORITAIRE", "PRIORITY OPTION")}</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>{__("Invitez les speakers directement dans Restream Studio — ils présentent en visio et Restream diffuse vers YouTube + Facebook + Twitch simultanément.", "Invite speakers directly into Restream Studio — they present via video and Restream broadcasts to YouTube + Facebook + Twitch simultaneously.")}</div>
                </div>
              </div>
              <a href="https://restream.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#ff6b6b", border: "1px solid #ff444030", padding: "4px 10px", borderRadius: 5, textDecoration: "none", letterSpacing: 1 }}>
                → restream.io
              </a>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "flex-end", marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: "#ff6b6b", letterSpacing: 2, display: "block", marginBottom: 4 }}>ACCESS TOKEN (OAuth Bearer)</label>
                <input
                  type="password"
                  value={restreamToken}
                  onChange={e => setRestreamToken((e.target as HTMLInputElement).value)}
                  placeholder={__("Collez ici votre access token Restream…", "Paste your Restream access token here…")}
                  disabled={!canWrite}
                  style={{ ...INPUT_STYLE, border: "1px solid #ff444025" }}
                />
                <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
                  {__("Obtenez votre token sur", "Get your token at")}{" "}
                  <a href="https://restream.io/settings/api" target="_blank" rel="noopener noreferrer" style={{ color: "#ff6b6b" }}>restream.io/settings/api</a>
                  {" "}→ <em>Personal Access Token</em>
                </div>
              </div>
              {canWrite && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => saveRestreamToken(restreamToken)}
                    disabled={restreamTokenSaving || !restreamToken}
                    style={{ ...SAVE_BTN_STYLE(restreamTokenSaving || !restreamToken), background: "#ff4444" }}>
                    {restreamTokenSaved ? `✓ ${__("Sauvegardé", "Saved")}` : restreamTokenSaving ? "…" : __("Connecter", "Connect")}
                  </button>
                  {restreamStatus?.configured && (
                    <button
                      onClick={() => saveRestreamToken("")}
                      style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "8px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      {__("Déconnecter", "Disconnect")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {restreamStatus?.configured && !restreamStatus?.error && (
              <>
                {/* RTMP URL + stream key */}
                {restreamStatus.rtmpUrl && (
                  <div style={{ background: "#07070e", border: "1px solid #ffffff08", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 2, marginBottom: 8 }}>🔗 RTMP — {__("À CONFIGURER DANS OBS / ZOOM / RESTREAM STUDIO", "TO CONFIGURE IN OBS / ZOOM / RESTREAM STUDIO")}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: "#666", width: 80, flexShrink: 0 }}>{__("URL serveur", "Server URL")}</div>
                      <code style={{ flex: 1, fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace", wordBreak: "break-all", background: "#050508", border: "1px solid #4488ff15", borderRadius: 5, padding: "6px 10px" }}>
                        {restreamStatus.rtmpUrl}
                      </code>
                      <button onClick={copyRtmp} style={{ fontSize: 10, color: rtmpCopied ? "#00ff9d" : "#888", background: rtmpCopied ? "#00ff9d15" : "transparent", border: `1px solid ${rtmpCopied ? "#00ff9d40" : "#333"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {rtmpCopied ? `✓ ${__("Copié", "Copied")}` : `📋 ${__("Copier URL", "Copy URL")}`}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 10, color: "#666", width: 80, flexShrink: 0 }}>{__("Clé stream", "Stream key")}</div>
                      <code style={{ flex: 1, fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace", wordBreak: "break-all", background: "#050508", border: "1px solid #4488ff15", borderRadius: 5, padding: "6px 10px" }}>
                        {showRtmpKey ? restreamStatus.streamKey : "•".repeat(Math.min((restreamStatus.streamKey?.length ?? 0), 28))}
                      </code>
                      <button onClick={() => setShowRtmpKey(v => !v)} style={{ fontSize: 10, color: "#888", background: "transparent", border: "1px solid #333", padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {showRtmpKey ? __("Masquer", "Hide") : __("Afficher", "Show")}
                      </button>
                      <button onClick={copyStreamKey} style={{ fontSize: 10, color: keyCopied ? "#00ff9d" : "#888", background: keyCopied ? "#00ff9d15" : "transparent", border: `1px solid ${keyCopied ? "#00ff9d40" : "#333"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {keyCopied ? `✓ ${__("Copié", "Copied")}` : `📋 ${__("Copier clé", "Copy key")}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Connected channels */}
                {(restreamStatus.channels ?? []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 2, marginBottom: 8 }}>{__("CANAUX CONNECTÉS", "CONNECTED CHANNELS")} ({restreamStatus.channels!.length})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {restreamStatus.channels!.map(ch => (
                        <div key={ch.id} style={{ background: "#07070e", border: `1px solid ${ch.isLive ? "#ff444030" : "#ffffff08"}`, borderRadius: 7, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{PLATFORM_ICON[ch.type] ?? "📺"}</span>
                            <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.displayName}</span>
                            {ch.isLive && <span style={{ fontSize: 9, background: "#ff4444", color: "#fff", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>LIVE</span>}
                          </div>
                          <div style={{ fontSize: 10, color: ch.isActive ? "#00ff9d" : "#555" }}>{ch.isActive ? `● ${__("Actif", "Active")}` : `○ ${__("Inactif", "Inactive")}`}</div>
                          {ch.embedUrl && (
                            <button
                              onClick={() => navigator.clipboard.writeText(ch.embedUrl!).catch(() => {})}
                              style={{ fontSize: 10, color: "#4488ff", background: "transparent", border: "none", padding: 0, cursor: "pointer", marginTop: 4 }}>
                              📋 {__("Copier embed URL", "Copy embed URL")}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {restreamStatus?.error && (
              <div style={{ fontSize: 11, color: "#ff6b6b", background: "#ff000015", border: "1px solid #ff000030", borderRadius: 6, padding: "8px 12px" }}>
                ⚠ {restreamStatus.error}
              </div>
            )}

            {!restreamStatus?.configured && (
              <div style={{ background: "#07070e", border: "1px solid #ff444015", borderRadius: 8, padding: 14, fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                <strong style={{ color: "#ff6b6b" }}>{__("Pourquoi Restream en priorité ?", "Why Restream first?")}</strong><br />
                • {__("Le speaker rejoint", "The speaker joins")} <strong style={{ color: "#aaa" }}>Restream Studio</strong> {__("(web, sans install) — vous l'invitez par lien", "(web, no install required) — you invite them by link")}<br />
                • {__("Restream diffuse automatiquement vers", "Restream automatically broadcasts to")} <strong style={{ color: "#aaa" }}>YouTube Live, Facebook, Twitch</strong>…<br />
                • {__("Vous récupérez l'URL embed YouTube générée et la collez dans le champ", "You copy the generated YouTube embed URL and paste it into the field")} <em>{__("Lien live", "Live link")}</em> {__("de la session", "of the session")}<br />
                • {__("Les participants voient le live YouTube sur", "Participants see the YouTube live on")} <code style={{ color: "#ff6b6b" }}>/live</code> — {__("sans aucune friction", "without any friction")}
              </div>
            )}
          </div>

          {/* Today's sessions status */}
          {loading ? (
            <p style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>{__("Chargement des sessions…", "Loading sessions…")}</p>
          ) : (
            <div style={{ background: "#0a0a12", border: "1px solid #4488ff20", borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 3 }}>{__("SESSIONS DU JOUR", "TODAY'S SESSIONS")} — {today}</div>
                <a href="#pipeline" style={{ fontSize: 11, color: "#4488ff", border: "1px solid #4488ff30", padding: "4px 10px", borderRadius: 5, textDecoration: "none", letterSpacing: 1 }}
                   onClick={e => { e.preventDefault(); document.querySelector("[data-tab='cfp']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); }}>
                  → {__("Pipeline speakers", "Speakers Pipeline")}
                </a>
              </div>
              {sessions.length === 0 ? (
                <p style={{ color: "#555", fontSize: 12 }}>{__("Aucune session programmée aujourd'hui", "No session scheduled today")} ({today}).</p>
              ) : (
                sessions.map(s => {
                  const hasLink = !!s.liveUrl;
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasLink ? "#00ff9d" : "#ff4444", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                          {s.time && <span style={{ marginRight: 10 }}>🕐 {s.time}</span>}
                          {s.speakerName && <span style={{ marginRight: 10 }}>👤 {s.speakerName}</span>}
                          {s.type && <span style={{ color: "#666" }}>{s.type}</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, flexShrink: 0 }}>
                        {hasLink ? (
                          <span style={{ color: "#00ff9d", display: "flex", alignItems: "center", gap: 4 }}>
                            <span>✓</span>
                            <a href={s.liveUrl!} target="_blank" rel="noopener noreferrer" style={{ color: "#00ff9d50", fontSize: 10, textDecoration: "none", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", whiteSpace: "nowrap" }}>{s.liveUrl}</a>
                          </span>
                        ) : (
                          <span style={{ color: "#ff6b6b" }}>⚠ {__("Lien manquant", "Link missing")}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {sessions.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 11, color: "#555" }}>
                  {sessions.filter(s => s.liveUrl).length}/{sessions.length} {__("sessions avec lien live configuré", "sessions with live link configured")}
                </div>
              )}
            </div>
          )}

          {/* Extra streams */}
          <div style={{ background: "#0a0a12", border: "1px solid #4488ff15", borderRadius: 10, padding: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 3, marginBottom: 4 }}>{__("FLUX SUPPLÉMENTAIRES", "ADDITIONAL STREAMS")}</div>
            <p style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>{__("Streams additionnels affichés sur /live (multi-salle, stream de secours, plénière parallèle…)", "Additional streams displayed on /live (multi-room, backup stream, parallel plenary…)")}</p>

            {settings.streams.length === 0 && <p style={{ color: "#555", fontSize: 12, marginBottom: 12 }}>{__("Aucun flux supplémentaire.", "No additional streams.")}</p>}

            {settings.streams.map(st => (
              <div key={st.id} style={{ background: "#07070e", border: "1px solid #4488ff15", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("TITRE", "TITLE")}</label>
                    <input value={st.title} onChange={e => updateStream(st.id, { title: (e.target as HTMLInputElement).value })} placeholder={__("Salle B — Ateliers", "Room B — Workshops")} disabled={!canWrite} style={INPUT_STYLE} />
                  </div>
                  {canWrite && <button onClick={() => removeStream(st.id)} style={{ alignSelf: "flex-end", background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", borderRadius: 6, padding: "8px 12px", fontSize: 11, cursor: "pointer" }}>✕</button>}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("URL EMBED YOUTUBE / RESTREAM", "YOUTUBE / RESTREAM EMBED URL")}</label>
                  <input value={st.url} onChange={e => updateStream(st.id, { url: (e.target as HTMLInputElement).value })} placeholder="https://www.youtube.com/embed/XXXXXXXXXX" disabled={!canWrite} style={INPUT_STYLE} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: canWrite ? "pointer" : "default", fontSize: 12, color: "#888" }}>
                  <input type="checkbox" checked={st.active} onChange={e => updateStream(st.id, { active: (e.target as HTMLInputElement).checked })} disabled={!canWrite} style={{ accentColor: "#4488ff" }} />
                  {__("Flux actif (visible par les participants)", "Active stream (visible to participants)")}
                </label>
                {st.url && (
                  <div style={{ marginTop: 14, aspectRatio: "16/9", background: "#050508", borderRadius: 8, overflow: "hidden" }}>
                    <iframe src={st.url} style={{ width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                )}
              </div>
            ))}

            {canWrite && (
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button onClick={addStream} style={{ background: "transparent", border: "1px solid #4488ff40", color: "#4488ff", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>+ {__("Ajouter un flux", "Add a stream")}</button>
                <button onClick={saveStreams} disabled={saving} style={SAVE_BTN_STYLE(saving)}>{saved ? `✓ ${__("Sauvegardé", "Saved")}` : saving ? __("Sauvegarde…", "Saving…") : __("Sauvegarder", "Save")}</button>
              </div>
            )}
          </div>

          {/* ── ÉTAPE 2 · OVERLAYS RESTREAM ────────────────────────────────── */}
          <StepHeader n={2} label={__("Overlays Restream — Captions & Tickers", "Restream Overlays — Captions & Tickers")} color="#ff6b35" />

          <ArchBox color="#ff6b35" icon="🎨" title={__("COMMENT ÇA MARCHE", "HOW IT WORKS")}>
            <p style={{ margin: "0 0 8px" }}>
              {__("Les", "The")} <strong style={{ color: "#fff" }}>Captions</strong> {__("affichent le nom + titre du speaker en bas de l'écran dans Restream Studio.", "display the speaker's name + title at the bottom of the screen in Restream Studio.")}
              {" "}{__("Les", "The")} <strong style={{ color: "#fff" }}>Tickers</strong> {__("font défiler le titre de la session en bandeau.", "scroll the session title as a banner.")}
            </p>
            <p style={{ margin: 0, color: "#666" }}>
              {__("Créez-les ici en un clic par speaker ou en masse — sans doublons. Activez/désactivez depuis cette page ou directement dans Restream Studio.", "Create them here in one click per speaker or in bulk — without duplicates. Enable/disable from this page or directly in Restream Studio.")}
            </p>
          </ArchBox>

          {/* Header : Rafraîchir + Tout créer */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <button onClick={loadOverlays} disabled={overlaysLoading}
              style={{ fontSize: 11, color: "#888", background: "transparent", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>
              {overlaysLoading ? "…" : `↺ ${__("Rafraîchir", "Refresh")}`}
            </button>
            {canWrite && (
              <button
                disabled={overlaysBulking || !restreamStatus?.configured}
                onClick={async () => {
                  setOverlaysBulking(true); setOverlaysBulkResult(null);
                  try {
                    const r = await overlayAction("bulk_all");
                    if (r?.error) setOverlaysBulkResult(`❌ ${r.error}`);
                    else setOverlaysBulkResult(`✓ ${r.captionsCreated} caption(s) + ${r.tickersCreated} ticker(s) ${__("créés", "created")} — ${r.skipped} ${__("doublon(s) ignoré(s)", "duplicate(s) skipped")}`);
                    await loadOverlays();
                  } finally { setOverlaysBulking(false); }
                }}
                style={{ fontSize: 11, color: overlaysBulking ? "#555" : "#ff6b35", background: "#ff6b3510", border: "1px solid #ff6b3540", padding: "6px 16px", borderRadius: 6, cursor: overlaysBulking ? "not-allowed" : "pointer", fontWeight: 700 }}>
                {overlaysBulking ? __("Création en cours…", "Creating…") : `⚡ ${__("Tout créer automatiquement (sans doublons)", "Create all automatically (no duplicates)")}`}
              </button>
            )}
            {overlaysBulkResult && (
              <span style={{ fontSize: 11, color: overlaysBulkResult.startsWith("✓") ? "#00ff9d" : "#ff4444" }}>{overlaysBulkResult}</span>
            )}
          </div>

          {/* Captions existantes */}
          <div style={{ background: "#0a0a12", border: "1px solid #ff6b3520", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#ff6b35", letterSpacing: 3, marginBottom: 12 }}>
              🖼 CAPTIONS ({overlays.captions.length})
              <span style={{ color: "#555", marginLeft: 12, fontWeight: 400, letterSpacing: 1 }}>{__("texte principal + texte secondaire affiché sous le speaker", "primary text + secondary text displayed under the speaker")}</span>
            </div>
            {overlays.captions.length === 0 && (
              <div style={{ fontSize: 12, color: "#444", fontStyle: "italic" }}>{__("Aucune caption — utilisez les boutons ci-dessous pour en créer.", "No captions — use the buttons below to create some.")}</div>
            )}
            {overlays.captions.map(cap => (
              <div key={cap.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "#050508", border: `1px solid ${cap.active ? "#ff6b3540" : "#ffffff08"}`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: cap.active ? "#ff6b35" : "#ccc", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cap.text}</div>
                  {cap.secondaryText && <div style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cap.secondaryText}</div>}
                </div>
                <span style={{ fontSize: 10, color: cap.active ? "#ff6b35" : "#444", background: cap.active ? "#ff6b3515" : "transparent", border: `1px solid ${cap.active ? "#ff6b3530" : "#333"}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {cap.active ? `● ${__("ACTIF", "ACTIVE")}` : `○ ${__("inactif", "inactive")}`}
                </span>
                {canWrite && (
                  <>
                    <button onClick={async () => { await overlayAction("update_caption", { id: cap.id, active: !cap.active }); loadOverlays(); }}
                      style={{ fontSize: 10, color: cap.active ? "#888" : "#ff6b35", background: "transparent", border: "1px solid #333", padding: "4px 10px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {cap.active ? __("Désactiver", "Disable") : __("Activer", "Enable")}
                    </button>
                    <button onClick={async () => { await overlayAction("delete_caption", { id: cap.id }); loadOverlays(); }}
                      style={{ fontSize: 10, color: "#ff4444", background: "transparent", border: "1px solid #ff444420", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Tickers existants */}
          <div style={{ background: "#0a0a12", border: "1px solid #ff6b3520", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#ff6b35", letterSpacing: 3, marginBottom: 12 }}>
              📰 TICKERS ({overlays.tickers.length})
              <span style={{ color: "#555", marginLeft: 12, fontWeight: 400, letterSpacing: 1 }}>{__("bandeau défilant affiché en bas du stream", "scrolling banner displayed at the bottom of the stream")}</span>
            </div>
            {overlays.tickers.length === 0 && (
              <div style={{ fontSize: 12, color: "#444", fontStyle: "italic" }}>{__("Aucun ticker — utilisez les boutons ci-dessous pour en créer.", "No tickers — use the buttons below to create some.")}</div>
            )}
            {overlays.tickers.map(tick => (
              <div key={tick.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "#050508", border: `1px solid ${tick.active ? "#ff6b3540" : "#ffffff08"}`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ flex: 1, fontSize: 12, color: tick.active ? "#ff6b35" : "#ccc", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tick.text}</div>
                <span style={{ fontSize: 10, color: tick.active ? "#ff6b35" : "#444", background: tick.active ? "#ff6b3515" : "transparent", border: `1px solid ${tick.active ? "#ff6b3530" : "#333"}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {tick.active ? `● ${__("ACTIF", "ACTIVE")}` : `○ ${__("inactif", "inactive")}`}
                </span>
                {canWrite && (
                  <>
                    <button onClick={async () => { await overlayAction("update_ticker", { id: tick.id, active: !tick.active }); loadOverlays(); }}
                      style={{ fontSize: 10, color: tick.active ? "#888" : "#ff6b35", background: "transparent", border: "1px solid #333", padding: "4px 10px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {tick.active ? __("Désactiver", "Disable") : __("Activer", "Enable")}
                    </button>
                    <button onClick={async () => { await overlayAction("delete_ticker", { id: tick.id }); loadOverlays(); }}
                      style={{ fontSize: 10, color: "#ff4444", background: "transparent", border: "1px solid #ff444420", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Créer par speaker */}
          {acceptedSpeakers.length > 0 && (
            <div style={{ background: "#0a0a12", border: "1px solid #ff6b3520", borderRadius: 10, padding: 16, marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: "#ff6b35", letterSpacing: 3, marginBottom: 14 }}>👤 {__("CRÉER PAR SPEAKER", "CREATE PER SPEAKER")}</div>
              {acceptedSpeakers.map(sp => {
                const captionText = [sp.name, sp.title].filter(Boolean).join(", ");
                const tickerText  = sp.talkTitle || sp.name;
                const loading     = overlayPerSpeaker[sp.id] ?? false;
                return (
                  <div key={sp.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10, background: "#050508", border: "1px solid #ffffff08", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{sp.name}</div>
                      {sp.title && <div style={{ fontSize: 11, color: "#666" }}>{sp.title}</div>}
                      <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                        Caption : <span style={{ color: "#aaa" }}>&quot;{captionText}&quot;</span>
                        {sp.talkTitle && <> · Ticker : <span style={{ color: "#aaa" }}>&quot;{tickerText}&quot;</span></>}
                      </div>
                    </div>
                    {canWrite && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button disabled={loading}
                          onClick={async () => {
                            setOverlayPerSpeaker(s => ({ ...s, [sp.id]: true }));
                            await overlayAction("create_caption", { text: captionText, secondaryText: sp.talkTitle || undefined });
                            await loadOverlays();
                            setOverlayPerSpeaker(s => ({ ...s, [sp.id]: false }));
                          }}
                          style={{ fontSize: 10, color: "#ff6b35", background: "#ff6b3510", border: "1px solid #ff6b3530", padding: "4px 10px", borderRadius: 5, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                          + Caption
                        </button>
                        <button disabled={loading}
                          onClick={async () => {
                            setOverlayPerSpeaker(s => ({ ...s, [sp.id]: true }));
                            await overlayAction("create_ticker", { text: tickerText });
                            await loadOverlays();
                            setOverlayPerSpeaker(s => ({ ...s, [sp.id]: false }));
                          }}
                          style={{ fontSize: 10, color: "#ff6b35", background: "#ff6b3510", border: "1px solid #ff6b3530", padding: "4px 10px", borderRadius: 5, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                          + Ticker
                        </button>
                        <button disabled={loading}
                          onClick={async () => {
                            setOverlayPerSpeaker(s => ({ ...s, [sp.id]: true }));
                            await overlayAction("bulk_speaker", { speakerId: sp.id });
                            await loadOverlays();
                            setOverlayPerSpeaker(s => ({ ...s, [sp.id]: false }));
                          }}
                          style={{ fontSize: 10, color: loading ? "#555" : "#00ff9d", background: loading ? "transparent" : "#00ff9d10", border: `1px solid ${loading ? "#333" : "#00ff9d30"}`, padding: "4px 10px", borderRadius: 5, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                          {loading ? "…" : `⚡ ${__("Les deux", "Both")}`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ÉTAPE 3 · ATELIERS JAAS ────────────────────────────────────── */}
          <StepHeader n={3} label={__("Ateliers — Rooms JaaS", "Workshops — JaaS Rooms")} color="#9b59ff" />

          <ArchBox color="#9b59ff" icon="🎓" title={__("COMMENT ÇA MARCHE", "HOW IT WORKS")}>
            <p style={{ margin: "0 0 8px" }}>
              {__("Pour les", "For")} <strong style={{ color: "#fff" }}>{__("ateliers / workshops", "workshops")}</strong>, {__("les participants rejoignent", "participants join")} <strong style={{ color: "#fff" }}>{__("directement", "directly")}</strong> {__("la salle JaaS — pas de YouTube.", "the JaaS room — no YouTube.")}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              {__("Le participant clique", "The participant clicks")} <em>{__("Rejoindre", "Join")}</em> {__("sur", "on")} <code style={{ color: "#9b59ff" }}>/live</code> {__("et se retrouve dans la room vidéo avec le formateur, en pair-à-pair (WebRTC).", "and enters the video room with the trainer, peer-to-peer (WebRTC).")}
            </p>
            <p style={{ margin: 0, color: "#666" }}>
              {__("Contrairement aux sessions,", "Unlike sessions,")} <strong style={{ color: "#aaa" }}>{__("les ateliers ont besoin de JaaS", "workshops need JaaS")}</strong> {__("car les participants interagissent directement (Zoom/Meet ne peuvent pas être embarqués pour un usage à grande échelle sans licences par participant).", "because participants interact directly (Zoom/Meet cannot be embedded for large-scale use without per-participant licences).")}
            </p>
          </ArchBox>

          {/* JaaS credentials */}
          <div style={{ background: "#0a0a12", border: "1px solid #9b59ff20", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 3, marginBottom: 14 }}>🔑 CREDENTIALS JAAS (8x8.vc)</div>

            {(["appId", "apiKey"] as const).map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>
                  {field === "appId" ? "APP ID (vpaas-magic-cookie-xxxx)" : "API KEY ID (kid)"}
                </label>
                <input value={jaas[field]} onChange={e => setJaas(j => ({ ...j, [field]: (e.target as HTMLInputElement).value }))} disabled={!canWrite}
                  placeholder={field === "appId" ? "vpaas-magic-cookie-xxxx" : "xxxx"} style={INPUT_STYLE} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("CLÉ PRIVÉE RSA (PEM)", "RSA PRIVATE KEY (PEM)")}</label>
              <textarea value={jaas.privateKey} onChange={e => setJaas(j => ({ ...j, privateKey: (e.target as HTMLTextAreaElement).value }))}
                disabled={!canWrite} rows={5}
                placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                style={{ width: "100%", background: "#050508", border: "1px solid #9b59ff20", borderRadius: 6, color: "#fff", padding: "10px 12px", fontSize: 11, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "vertical" as const, outline: "none" }} />
            </div>
            {canWrite && (
              <button onClick={saveJaas} disabled={jaasSaving} style={{ ...SAVE_BTN_STYLE(jaasSaving), background: "#9b59ff", color: "#fff" }}>
                {jaasSaved ? `✓ ${__("Sauvegardé", "Saved")}` : jaasSaving ? __("Sauvegarde…", "Saving…") : __("Sauvegarder config JaaS", "Save JaaS config")}
              </button>
            )}
          </div>

          {/* Workshop list */}
          <div style={{ background: "#0a0a12", border: "1px solid #9b59ff15", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 3 }}>WORKSHOPS ({workshops.length})</div>
              {canWrite && (
                <button onClick={addWorkshop} style={{ background: "transparent", border: "1px solid #9b59ff40", color: "#9b59ff", padding: "6px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>
                  + {__("Ajouter workshop", "Add workshop")}
                </button>
              )}
            </div>

            {wsLoading ? (
              <p style={{ color: "#555", fontSize: 12 }}>{__("Chargement…", "Loading…")}</p>
            ) : workshops.length === 0 ? (
              <p style={{ color: "#555", fontSize: 12 }}>{__("Aucun workshop configuré.", "No workshop configured.")}</p>
            ) : (
              workshops.map(ws => (
                <div key={ws.id} style={{ background: "#07070e", border: `1px solid ${ws.active ? "#9b59ff30" : "#ffffff10"}`, borderRadius: 8, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 2 }}>{ws.title || `(${__("sans titre", "no title")})`}</div>
                    {ws.titleEn && <div style={{ fontSize: 11, color: "#888" }}>EN: {ws.titleEn}</div>}
                    <div style={{ fontSize: 10, color: "#555", marginTop: 4, fontFamily: "'Courier New', monospace" }}>room: {ws.room || "—"}</div>
                    <span style={{ fontSize: 10, color: ws.active ? "#9b59ff" : "#888", marginTop: 4, display: "inline-block" }}>{ws.active ? `🟣 ${__("Actif", "Active")}` : `● ${__("Inactif", "Inactive")}`}</span>
                  </div>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditWs(ws)} style={{ background: "transparent", border: "1px solid #ffffff20", color: "#888", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>{__("Éditer", "Edit")}</button>
                      <button onClick={() => removeWorkshop(ws.id)} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Workshop edit modal */}
      {editWs && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#0a0a12", border: "1px solid #9b59ff30", borderRadius: 12, padding: 28, width: 480, maxWidth: "90vw" }}>
            <div style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 3, marginBottom: 14 }}>
              {workshops.some(w => w.id === editWs.id) ? __("MODIFIER WORKSHOP", "EDIT WORKSHOP") : __("NOUVEAU WORKSHOP", "NEW WORKSHOP")}
            </div>
            {[
              { field: "title",         label: "Titre FR *" },
              { field: "titleEn",       label: "Title EN *" },
              { field: "room",          label: "Room ID (JaaS room name)" },
              { field: "description",   label: "Description FR" },
              { field: "descriptionEn", label: "Description EN" },
            ].map(({ field, label }) => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
                <input
                  value={(editWs as unknown as Record<string, string>)[field] ?? ""}
                  onChange={e => setEditWs(w => w ? { ...w, [field]: (e.target as HTMLInputElement).value } : w)}
                  style={INPUT_STYLE}
                />
              </div>
            ))}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888", marginBottom: 20, cursor: "pointer" }}>
              <input type="checkbox" checked={editWs.active} onChange={e => setEditWs(w => w ? { ...w, active: (e.target as HTMLInputElement).checked } : w)} style={{ accentColor: "#9b59ff" }} />
              {__("Workshop actif (visible aux participants)", "Active workshop (visible to participants)")}
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveEditedWorkshop(editWs)} disabled={wsSaving || !editWs.title || !editWs.room}
                style={{ ...SAVE_BTN_STYLE(wsSaving || !editWs.title || !editWs.room), background: "#9b59ff", color: "#fff" }}>
                {wsSaved ? "✓" : wsSaving ? "…" : __("Enregistrer", "Save")}
              </button>
              <button onClick={() => setEditWs(null)} style={{ background: "transparent", border: "1px solid #ffffff20", color: "#888", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>{__("Annuler", "Cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
