"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function LivePanel({ canWrite }: { canWrite: boolean }) {
  const [mode, setMode] = useState<"live" | "config">("live");
  const [qaFilter, setQaFilter] = useState<"pending" | "approved" | "answered">("pending");

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
      if (res.ok) setRestreamStatus(await res.json());
    } finally { setRestreamLoading(false); }
  }, []);

  const loadRestreamConfig = useCallback(async () => {
    const res = await fetch("/api/admin/live/restream");
    if (res.ok) {
      const data = await res.json() as { configured: boolean; tokenPreview: string };
      if (data.tokenPreview) setRestreamToken(data.tokenPreview);
    }
  }, []);

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
    const full = restreamStatus?.rtmpUrl ?? "";
    if (!full) return;
    await navigator.clipboard.writeText(full).catch(() => {});
    setRtmpCopied(true);
    setTimeout(() => setRtmpCopied(false), 2000);
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
  useEffect(() => { if (mode === "config") loadWorkshops(); }, [mode, loadWorkshops]);

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
        <p style={{ color: "#555", fontSize: 12 }}>Diffusion YouTube · Ateliers JaaS · Q&A temps réel</p>
      </div>

      {/* Quick links */}
      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <a href="/live" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#00ff9d", border: "1px solid #00ff9d40", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live</a>
        <a href="/live/resend" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#888", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ /live/resend</a>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, alignItems: "center" }}>
        <button style={MODE_BTN(mode === "live", "#ff4444")} onClick={() => setMode("live")}>
          🔴 En direct
          {(stats?.onlineCount ?? 0) > 0 && (
            <span style={{ marginLeft: 8, background: "#ff4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{stats!.onlineCount}</span>
          )}
          {pendingCount > 0 && (
            <span style={{ marginLeft: 4, background: "#ffaa00", color: "#000", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{pendingCount} Q</span>
          )}
        </button>
        <button style={MODE_BTN(mode === "config", "#4488ff")} onClick={() => setMode("config")}>
          ⚙️ Configuration
        </button>
      </div>

      {/* ══ MODE EN DIRECT ══════════════════════════════════════════════════ */}
      {mode === "live" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "En ligne", value: stats?.onlineCount ?? 0, color: "#00ff9d", hint: "< 3 min" },
              { label: "Sessions actives", value: stats?.totalConnected ?? 0, color: "#4488ff", hint: "non expirées" },
              { label: "Q en attente", value: stats?.questions.pending ?? 0, color: "#ff4444", hint: "à modérer" },
              { label: "Q approuvées", value: stats?.questions.approved ?? 0, color: "#ffaa00", hint: "affichées" },
              { label: "Q répondues", value: stats?.questions.answered ?? 0, color: "#00aaff", hint: "archivées" },
            ].map(card => (
              <div key={card.label} style={{ background: "#0a0a12", border: `1px solid ${card.color}30`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: card.color, fontFamily: "'Courier New', monospace" }}>{card.value}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{card.label}</div>
                <div style={{ fontSize: 10, color: "#555" }}>{card.hint}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { loadDashboard(); loadRestreamStatus(); }} disabled={statsLoading} style={{ fontSize: 11, color: "#555", background: "transparent", border: "1px solid #333", padding: "5px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 20, fontFamily: "'Courier New', monospace" }}>
            {statsLoading ? "…" : "↺ Rafraîchir"}
          </button>

          {/* Restream live status */}
          {restreamStatus && (
            <div style={{ background: "#0a0a12", border: `1px solid ${restreamStatus.anyLive ? "#ff444040" : "#ffffff10"}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: restreamStatus.anyLive ? "#ff4444" : "#555", boxShadow: restreamStatus.anyLive ? "0 0 8px #ff4444" : "none" }} />
                  <span style={{ fontSize: 11, color: restreamStatus.anyLive ? "#ff6b6b" : "#666", fontFamily: "'Courier New', monospace", letterSpacing: 2 }}>
                    RESTREAM {restreamStatus.anyLive ? "— EN DIRECT" : "— HORS LIGNE"}
                  </span>
                  {restreamStatus.error && <span style={{ fontSize: 10, color: "#ff6b6b" }}>⚠ {restreamStatus.error}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {restreamStatus.anyLive && restreamStatus.youtubeEmbedUrl && (
                    <button
                      onClick={() => navigator.clipboard.writeText(restreamStatus.youtubeEmbedUrl!).catch(() => {})}
                      style={{ fontSize: 10, color: "#00ff9d", background: "#00ff9d15", border: "1px solid #00ff9d40", padding: "4px 10px", borderRadius: 5, cursor: "pointer", letterSpacing: 1 }}>
                      📋 Copier embed YouTube
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
                <p style={{ fontSize: 12, color: "#555" }}>Token non configuré — allez dans ⚙️ Configuration pour connecter Restream.</p>
              ) : (restreamStatus.channels ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "#555" }}>Aucun canal connecté dans Restream.</p>
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
                        <div style={{ fontSize: 11, color: "#ffaa00" }}>👁 {ch.viewerCount.toLocaleString()} spectateurs</div>
                      )}
                      {!ch.isActive && <div style={{ fontSize: 10, color: "#555" }}>Inactif</div>}
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
            <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, marginBottom: 14 }}>📢 ANNONCE BROADCAST</div>
            <textarea
              value={announcement.message}
              onChange={e => setAnnouncement(a => ({ ...a, message: (e.target as HTMLTextAreaElement).value }))}
              disabled={!canWrite} rows={3}
              placeholder="Message affiché en banner sur la page /live…"
              style={{ width: "100%", background: "#050508", border: "1px solid #ffaa0020", borderRadius: 6, color: "#fff", padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "none" as const, outline: "none", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#aaa", cursor: "pointer" }}>
                <input type="checkbox" checked={announcement.enabled} onChange={e => setAnnouncement(a => ({ ...a, enabled: (e.target as HTMLInputElement).checked }))} disabled={!canWrite} style={{ accentColor: "#ffaa00" }} />
                Activer l&apos;annonce
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#666" }}>
                <span>Expire le :</span>
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
                  {annSaved ? "✓ Sauvegardé" : annSaving ? "…" : "Sauvegarder"}
                </button>
              )}
            </div>
            {announcement.enabled && announcement.message && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#ffaa0015", border: "1px solid #ffaa0040", borderRadius: 6, fontSize: 12, color: "#ffaa00" }}>
                Aperçu : {announcement.message}
              </div>
            )}
          </div>

          {/* Q&A moderation */}
          <div style={{ background: "#0a0a12", border: "1px solid #ffffff10", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 10, color: "#fff", letterSpacing: 3, marginBottom: 16 }}>💬 MODÉRATION Q&amp;A</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(["pending","approved","answered"] as const).map(f => (
                <button key={f} onClick={() => setQaFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  background: qaFilter === f ? (f === "pending" ? "#ff440020" : f === "approved" ? "#00ff9d20" : "#0066ff20") : "transparent",
                  border: `1px solid ${qaFilter === f ? (f === "pending" ? "#ff4444" : f === "approved" ? "#00ff9d" : "#0066ff") : "#333"}`,
                  color: qaFilter === f ? (f === "pending" ? "#ff6b6b" : f === "approved" ? "#00ff9d" : "#4488ff") : "#666",
                  fontFamily: "'Courier New', monospace",
                }}>
                  {f === "pending" ? "⏳ En attente" : f === "approved" ? "✓ Approuvées" : "✅ Répondues"}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>({questions.filter(q => f === "pending" ? (!q.approved && !q.answered) : f === "approved" ? (q.approved && !q.answered) : q.answered).length})</span>
                </button>
              ))}
              <button onClick={loadQuestions} disabled={qaLoading} style={{ fontSize: 11, color: "#555", background: "transparent", border: "1px solid #333", padding: "5px 10px", borderRadius: 6, cursor: "pointer", marginLeft: "auto" }}>
                {qaLoading ? "…" : "↺"}
              </button>
            </div>

            {filteredQuestions.length === 0 ? (
              <p style={{ color: "#555", fontSize: 12, padding: "16px 0" }}>Aucune question dans ce filtre.</p>
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
                        {q.answered && <span style={{ fontSize: 10, color: "#4488ff" }}>✅ Répondue</span>}
                        {q.approved && !q.answered && <span style={{ fontSize: 10, color: "#00ff9d" }}>✓ Approuvée</span>}
                      </div>
                    </div>
                    {canWrite && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!q.approved && !q.answered && (
                          <button onClick={() => patchQuestion(q.id, { approved: true })} style={{ background: "#00ff9d20", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✓ Approuver</button>
                        )}
                        {q.approved && !q.answered && (
                          <button onClick={() => patchQuestion(q.id, { answered: true })} style={{ background: "#0066ff20", border: "1px solid #0066ff40", color: "#4488ff", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✅ Répondue</button>
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
              <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 14 }}>PARTICIPANTS RÉCENTS ({stats?.participants.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>{["Nom","Billet","Vu il y a","IP"].map(h => (
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

          {/* ── ÉTAPE 1 · SESSIONS ─────────────────────────────────────────── */}
          <StepHeader n={1} label="Sessions — Diffusion YouTube" color="#4488ff" />

          <ArchBox color="#4488ff" icon="📡" title="COMMENT ÇA MARCHE">
            <p style={{ margin: "0 0 8px" }}>
              Pour les <strong style={{ color: "#fff" }}>talks, panels et keynotes</strong>, les participants voient un <strong style={{ color: "#fff" }}>embed YouTube</strong> sur <code style={{ color: "#4488ff" }}>/live</code>.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              Le speaker peut utiliser <strong style={{ color: "#fff" }}>n&apos;importe quel outil</strong> pour sa salle privée — Zoom, Google Meet, Teams, Jitsi, <strong style={{ color: "#fff" }}>Restream</strong>, OBS — tant que l&apos;outil envoie le flux vers YouTube via RTMP.
            </p>
            <p style={{ margin: 0, color: "#666" }}>
              👉 Dans le <strong style={{ color: "#aaa" }}>Pipeline speakers</strong>, chaque session a un champ <code style={{ color: "#4488ff" }}>Lien live</code> : collez-y l&apos;URL d&apos;embed YouTube de cette session.
            </p>
          </ArchBox>

          {/* Restream config */}
          <div style={{ background: "#0a0a12", border: `1px solid ${restreamStatus?.configured ? "#ff444030" : "#ffffff10"}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🎬</span>
                <div>
                  <div style={{ fontSize: 11, color: "#ff6b6b", letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>RESTREAM — OPTION PRIORITAIRE</div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 1 }}>Invitez les speakers directement dans Restream Studio — ils présentent en visio et Restream diffuse vers YouTube + Facebook + Twitch simultanément.</div>
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
                  placeholder="Collez ici votre access token Restream…"
                  disabled={!canWrite}
                  style={{ ...INPUT_STYLE, border: "1px solid #ff444025" }}
                />
                <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
                  Obtenez votre token sur{" "}
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
                    {restreamTokenSaved ? "✓ Sauvegardé" : restreamTokenSaving ? "…" : "Connecter"}
                  </button>
                  {restreamStatus?.configured && (
                    <button
                      onClick={() => saveRestreamToken("")}
                      style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "8px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Déconnecter
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
                    <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 2, marginBottom: 8 }}>🔗 RTMP — À CONFIGURER DANS OBS / ZOOM / RESTREAM STUDIO</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <code style={{ flex: 1, fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace", wordBreak: "break-all", background: "#050508", border: "1px solid #4488ff15", borderRadius: 5, padding: "6px 10px" }}>
                        rtmp://live.restream.io/live/
                      </code>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <code style={{ flex: 1, fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace", wordBreak: "break-all", background: "#050508", border: "1px solid #4488ff15", borderRadius: 5, padding: "6px 10px" }}>
                        {showRtmpKey ? restreamStatus.streamKey : "•".repeat(Math.min((restreamStatus.streamKey?.length ?? 0), 28))}
                      </code>
                      <button onClick={() => setShowRtmpKey(v => !v)} style={{ fontSize: 10, color: "#888", background: "transparent", border: "1px solid #333", padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {showRtmpKey ? "Masquer" : "Afficher"}
                      </button>
                      <button onClick={copyRtmp} style={{ fontSize: 10, color: rtmpCopied ? "#00ff9d" : "#888", background: rtmpCopied ? "#00ff9d15" : "transparent", border: `1px solid ${rtmpCopied ? "#00ff9d40" : "#333"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {rtmpCopied ? "✓ Copié" : "📋 Copier URL complète"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Connected channels */}
                {(restreamStatus.channels ?? []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 2, marginBottom: 8 }}>CANAUX CONNECTÉS ({restreamStatus.channels!.length})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {restreamStatus.channels!.map(ch => (
                        <div key={ch.id} style={{ background: "#07070e", border: `1px solid ${ch.isLive ? "#ff444030" : "#ffffff08"}`, borderRadius: 7, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{PLATFORM_ICON[ch.type] ?? "📺"}</span>
                            <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.displayName}</span>
                            {ch.isLive && <span style={{ fontSize: 9, background: "#ff4444", color: "#fff", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>LIVE</span>}
                          </div>
                          <div style={{ fontSize: 10, color: ch.isActive ? "#00ff9d" : "#555" }}>{ch.isActive ? "● Actif" : "○ Inactif"}</div>
                          {ch.embedUrl && (
                            <button
                              onClick={() => navigator.clipboard.writeText(ch.embedUrl!).catch(() => {})}
                              style={{ fontSize: 10, color: "#4488ff", background: "transparent", border: "none", padding: 0, cursor: "pointer", marginTop: 4 }}>
                              📋 Copier embed URL
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
                <strong style={{ color: "#ff6b6b" }}>Pourquoi Restream en priorité ?</strong><br />
                • Le speaker rejoint <strong style={{ color: "#aaa" }}>Restream Studio</strong> (web, sans install) — vous l&apos;invitez par lien<br />
                • Restream diffuse automatiquement vers <strong style={{ color: "#aaa" }}>YouTube Live, Facebook, Twitch</strong>…<br />
                • Vous récupérez l&apos;URL embed YouTube générée et la collez dans le champ <em>Lien live</em> de la session<br />
                • Les participants voient le live YouTube sur <code style={{ color: "#ff6b6b" }}>/live</code> — sans aucune friction
              </div>
            )}
          </div>

          {/* Today's sessions status */}
          {loading ? (
            <p style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>Chargement des sessions…</p>
          ) : (
            <div style={{ background: "#0a0a12", border: "1px solid #4488ff20", borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 3 }}>SESSIONS DU JOUR — {today}</div>
                <a href="#pipeline" style={{ fontSize: 11, color: "#4488ff", border: "1px solid #4488ff30", padding: "4px 10px", borderRadius: 5, textDecoration: "none", letterSpacing: 1 }}
                   onClick={e => { e.preventDefault(); document.querySelector("[data-tab='cfp']")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); }}>
                  → Pipeline speakers
                </a>
              </div>
              {sessions.length === 0 ? (
                <p style={{ color: "#555", fontSize: 12 }}>Aucune session programmée aujourd&apos;hui ({today}).</p>
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
                          <span style={{ color: "#ff6b6b" }}>⚠ Lien manquant</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {sessions.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 11, color: "#555" }}>
                  {sessions.filter(s => s.liveUrl).length}/{sessions.length} sessions avec lien live configuré
                </div>
              )}
            </div>
          )}

          {/* Extra streams */}
          <div style={{ background: "#0a0a12", border: "1px solid #4488ff15", borderRadius: 10, padding: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: "#4488ff", letterSpacing: 3, marginBottom: 4 }}>FLUX SUPPLÉMENTAIRES</div>
            <p style={{ fontSize: 11, color: "#555", marginBottom: 16 }}>Streams additionnels affichés sur /live (multi-salle, stream de secours, plénière parallèle…)</p>

            {settings.streams.length === 0 && <p style={{ color: "#555", fontSize: 12, marginBottom: 12 }}>Aucun flux supplémentaire.</p>}

            {settings.streams.map(st => (
              <div key={st.id} style={{ background: "#07070e", border: "1px solid #4488ff15", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>TITRE</label>
                    <input value={st.title} onChange={e => updateStream(st.id, { title: (e.target as HTMLInputElement).value })} placeholder="Salle B — Ateliers" disabled={!canWrite} style={INPUT_STYLE} />
                  </div>
                  {canWrite && <button onClick={() => removeStream(st.id)} style={{ alignSelf: "flex-end", background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", borderRadius: 6, padding: "8px 12px", fontSize: 11, cursor: "pointer" }}>✕</button>}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: "#4488ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>URL EMBED YOUTUBE / RESTREAM</label>
                  <input value={st.url} onChange={e => updateStream(st.id, { url: (e.target as HTMLInputElement).value })} placeholder="https://www.youtube.com/embed/XXXXXXXXXX" disabled={!canWrite} style={INPUT_STYLE} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: canWrite ? "pointer" : "default", fontSize: 12, color: "#888" }}>
                  <input type="checkbox" checked={st.active} onChange={e => updateStream(st.id, { active: (e.target as HTMLInputElement).checked })} disabled={!canWrite} style={{ accentColor: "#4488ff" }} />
                  Flux actif (visible par les participants)
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
                <button onClick={addStream} style={{ background: "transparent", border: "1px solid #4488ff40", color: "#4488ff", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>+ Ajouter un flux</button>
                <button onClick={saveStreams} disabled={saving} style={SAVE_BTN_STYLE(saving)}>{saved ? "✓ Sauvegardé" : saving ? "Sauvegarde…" : "Sauvegarder"}</button>
              </div>
            )}
          </div>

          {/* ── ÉTAPE 2 · ATELIERS JAAS ────────────────────────────────────── */}
          <StepHeader n={2} label="Ateliers — Rooms JaaS" color="#9b59ff" />

          <ArchBox color="#9b59ff" icon="🎓" title="COMMENT ÇA MARCHE">
            <p style={{ margin: "0 0 8px" }}>
              Pour les <strong style={{ color: "#fff" }}>ateliers / workshops</strong>, les participants rejoignent <strong style={{ color: "#fff" }}>directement</strong> la salle JaaS — pas de YouTube.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              Le participant clique <em>Rejoindre</em> sur <code style={{ color: "#9b59ff" }}>/live</code> et se retrouve dans la room vidéo avec le formateur, en pair-à-pair (WebRTC).
            </p>
            <p style={{ margin: 0, color: "#666" }}>
              Contrairement aux sessions, <strong style={{ color: "#aaa" }}>les ateliers ont besoin de JaaS</strong> car les participants interagissent directement (Zoom/Meet ne peuvent pas être embarqués pour un usage à grande échelle sans licences par participant).
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
              <label style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>CLÉ PRIVÉE RSA (PEM)</label>
              <textarea value={jaas.privateKey} onChange={e => setJaas(j => ({ ...j, privateKey: (e.target as HTMLTextAreaElement).value }))}
                disabled={!canWrite} rows={5}
                placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                style={{ width: "100%", background: "#050508", border: "1px solid #9b59ff20", borderRadius: 6, color: "#fff", padding: "10px 12px", fontSize: 11, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "vertical" as const, outline: "none" }} />
            </div>
            {canWrite && (
              <button onClick={saveJaas} disabled={jaasSaving} style={{ ...SAVE_BTN_STYLE(jaasSaving), background: "#9b59ff", color: "#fff" }}>
                {jaasSaved ? "✓ Sauvegardé" : jaasSaving ? "Sauvegarde…" : "Sauvegarder config JaaS"}
              </button>
            )}
          </div>

          {/* Workshop list */}
          <div style={{ background: "#0a0a12", border: "1px solid #9b59ff15", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 3 }}>WORKSHOPS ({workshops.length})</div>
              {canWrite && (
                <button onClick={addWorkshop} style={{ background: "transparent", border: "1px solid #9b59ff40", color: "#9b59ff", padding: "6px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>
                  + Ajouter workshop
                </button>
              )}
            </div>

            {wsLoading ? (
              <p style={{ color: "#555", fontSize: 12 }}>Chargement…</p>
            ) : workshops.length === 0 ? (
              <p style={{ color: "#555", fontSize: 12 }}>Aucun workshop configuré.</p>
            ) : (
              workshops.map(ws => (
                <div key={ws.id} style={{ background: "#07070e", border: `1px solid ${ws.active ? "#9b59ff30" : "#ffffff10"}`, borderRadius: 8, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, marginBottom: 2 }}>{ws.title || "(sans titre)"}</div>
                    {ws.titleEn && <div style={{ fontSize: 11, color: "#888" }}>EN: {ws.titleEn}</div>}
                    <div style={{ fontSize: 10, color: "#555", marginTop: 4, fontFamily: "'Courier New', monospace" }}>room: {ws.room || "—"}</div>
                    <span style={{ fontSize: 10, color: ws.active ? "#9b59ff" : "#888", marginTop: 4, display: "inline-block" }}>{ws.active ? "🟣 Actif" : "● Inactif"}</span>
                  </div>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditWs(ws)} style={{ background: "transparent", border: "1px solid #ffffff20", color: "#888", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>Éditer</button>
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
              {workshops.some(w => w.id === editWs.id) ? "MODIFIER WORKSHOP" : "NOUVEAU WORKSHOP"}
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
              Workshop actif (visible aux participants)
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveEditedWorkshop(editWs)} disabled={wsSaving || !editWs.title || !editWs.room}
                style={{ ...SAVE_BTN_STYLE(wsSaving || !editWs.title || !editWs.room), background: "#9b59ff", color: "#fff" }}>
                {wsSaved ? "✓" : wsSaving ? "…" : "Enregistrer"}
              </button>
              <button onClick={() => setEditWs(null)} style={{ background: "transparent", border: "1px solid #ffffff20", color: "#888", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
