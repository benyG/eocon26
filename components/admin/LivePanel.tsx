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

const EMPTY: LiveSettings = { streams: [] };
const EMPTY_WORKSHOP: Workshop = { id: "", title: "", titleEn: "", room: "", active: true, description: "", descriptionEn: "" };

export default function LivePanel({ canWrite }: { canWrite: boolean }) {
  const [subTab, setSubTab] = useState<"dashboard" | "streams" | "qa" | "workshops">("dashboard");

  // ── Streams ──────────────────────────────────────────────────────────────
  const [settings, setSettings]     = useState<LiveSettings>(EMPTY);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [loading, setLoading]       = useState(true);

  // ── Q&A ─────────────────────────────────────────────────────────────────
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [qaLoading, setQaLoading]   = useState(false);
  const [qaFilter, setQaFilter]     = useState<"pending" | "approved" | "answered">("pending");

  // ── Dashboard ────────────────────────────────────────────────────────────
  const [stats, setStats]             = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>({ message: "", enabled: false, expiresAt: null });
  const [annSaving, setAnnSaving]     = useState(false);
  const [annSaved, setAnnSaved]       = useState(false);

  // ── Workshops & JaaS ─────────────────────────────────────────────────────
  const [workshops, setWorkshops]   = useState<Workshop[]>([]);
  const [wsLoading, setWsLoading]   = useState(false);
  const [wsSaving, setWsSaving]     = useState(false);
  const [wsSaved, setWsSaved]       = useState(false);
  const [editWs, setEditWs]         = useState<Workshop | null>(null);
  const [jaas, setJaas]             = useState<JaasConfig>({ appId: "", apiKey: "", privateKey: "" });
  const [jaasSaving, setJaasSaving] = useState(false);
  const [jaasSaved, setJaasSaved]   = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/live/settings");
      if (res.ok) {
        const data: LiveSettings = await res.json();
        setSettings(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch("/api/admin/live/questions");
      if (res.ok) setQuestions(await res.json());
    } finally {
      setQaLoading(false);
    }
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

  const saveAnnouncement = async () => {
    setAnnSaving(true); setAnnSaved(false);
    try {
      const res = await fetch("/api/admin/live/announcement", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(announcement),
      });
      if (res.ok) { setAnnSaved(true); setTimeout(() => setAnnSaved(false), 2000); }
    } finally { setAnnSaving(false); }
  };

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (subTab === "dashboard") loadDashboard(); }, [subTab, loadDashboard]);
  useEffect(() => { if (subTab === "qa") loadQuestions(); }, [subTab, loadQuestions]);
  useEffect(() => { if (subTab === "workshops") loadWorkshops(); }, [subTab, loadWorkshops]);

  // Auto-refresh dashboard every 30s while on that tab
  useEffect(() => {
    if (subTab !== "dashboard") return;
    const t = setInterval(loadDashboard, 30000);
    return () => clearInterval(t);
  }, [subTab, loadDashboard]);

  const persist = async (patch: Partial<LiveSettings>) => {
    setSaving(true); setSaved(false);
    try {
      const next = { ...settings, ...patch };
      const res = await fetch("/api/admin/live/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) { setSettings(next); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  };

  const saveStreams = () => persist({ streams: settings.streams });

  const updateStream = (id: string, patch: Partial<Stream>) => {
    setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.map((st: Stream) => st.id === id ? { ...st, ...patch } : st) }));
  };
  const addStream    = () => setSettings((s: LiveSettings) => ({ ...s, streams: [...s.streams, { id: Date.now().toString(), title: "", url: "", active: false }] }));
  const removeStream = (id: string) => setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.filter((st: Stream) => st.id !== id) }));

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

  const addWorkshop = () => {
    const ws: Workshop = { ...EMPTY_WORKSHOP, id: Date.now().toString() };
    setEditWs(ws);
  };

  const saveEditedWorkshop = (ws: Workshop) => {
    const next = workshops.some(w => w.id === ws.id)
      ? workshops.map(w => w.id === ws.id ? ws : w)
      : [...workshops, ws];
    saveWorkshops(next);
    setEditWs(null);
  };

  const removeWorkshop = (id: string) => saveWorkshops(workshops.filter(w => w.id !== id));

  const patchQuestion = async (id: number, patch: Partial<Question>) => {
    const res = await fetch(`/api/admin/live/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setQuestions(qs => qs.map(q => q.id === id ? { ...q, ...patch } : q));
  };

  const deleteQuestion = async (id: number) => {
    const res = await fetch(`/api/admin/live/questions/${id}`, { method: "DELETE" });
    if (res.ok) setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const TAB_STYLE = (active: boolean) => ({
    padding: "8px 18px", borderRadius: 6, fontSize: 12,
    fontWeight: active ? 900 : 400, cursor: "pointer" as const,
    background: active ? "#00ff9d20" : "transparent",
    border: active ? "1px solid #00ff9d40" : "1px solid transparent",
    color: active ? "#00ff9d" : "#888", letterSpacing: 1,
    fontFamily: "'Courier New', monospace",
  });

  const INPUT = {
    width: "100%", background: "#050508", border: "1px solid #00ff9d20",
    borderRadius: 6, color: "#fff", padding: "8px 12px", fontSize: 13,
    fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, outline: "none",
  };

  const SAVE_BTN = {
    background: "#00ff9d", color: "#000", padding: "8px 20px", borderRadius: 6,
    fontSize: 12, fontWeight: 900, cursor: saving ? "not-allowed" as const : "pointer" as const,
    letterSpacing: 1, border: "none",
  };

  const filteredQuestions = questions.filter(q => {
    if (qaFilter === "pending")  return !q.approved && !q.answered;
    if (qaFilter === "approved") return q.approved  && !q.answered;
    if (qaFilter === "answered") return q.answered;
    return true;
  });

  return (
    <div>
      <div className="mb-6">
        <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 4 }}>🔴 EOCON 2026</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 4px", fontFamily: "'Courier New', monospace" }}>Live Streaming</h1>
        <p style={{ color: "#666", fontSize: 12 }}>Configurez les flux vidéo et modérez les questions en direct</p>
      </div>

      <div className="mb-6 flex gap-3 items-center">
        <a href="/live" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#00ff9d", border: "1px solid #00ff9d40", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live</a>
        <a href="/live/resend" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#888", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live/resend</a>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button style={TAB_STYLE(subTab === "dashboard")} onClick={() => setSubTab("dashboard")}>
          📊 Dashboard
          {stats && stats.onlineCount > 0 && (
            <span style={{ marginLeft: 6, background: "#00ff9d", color: "#000", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>
              {stats.onlineCount}
            </span>
          )}
        </button>
        <button style={TAB_STYLE(subTab === "streams")}   onClick={() => setSubTab("streams")}>📡 Flux vidéo</button>
        <button style={TAB_STYLE(subTab === "qa")}        onClick={() => setSubTab("qa")}>
          💬 Q&amp;A
          {questions.filter(q => !q.approved && !q.answered).length > 0 && (
            <span style={{ marginLeft: 6, background: "#ff4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>
              {questions.filter(q => !q.approved && !q.answered).length}
            </span>
          )}
        </button>
        <button style={TAB_STYLE(subTab === "workshops")} onClick={() => setSubTab("workshops")}>🎓 Workshops JaaS</button>
      </div>

      {/* ── DASHBOARD ───────────────────────────────────────────────────── */}
      {subTab === "dashboard" ? (
        <div>
          {statsLoading && !stats ? (
            <p style={{ color: "#555", fontSize: 12 }}>Chargement…</p>
          ) : (
            <>
              {/* Counters */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "En ligne maintenant", value: stats?.onlineCount ?? 0, color: "#00ff9d", hint: "actifs < 3 min" },
                  { label: "Sessions valides", value: stats?.totalConnected ?? 0, color: "#4488ff", hint: "non expirées" },
                  { label: "Questions en attente", value: stats?.questions.pending ?? 0, color: "#ff4444", hint: "à modérer" },
                  { label: "Questions approuvées", value: stats?.questions.approved ?? 0, color: "#ffaa00", hint: "visibles" },
                  { label: "Questions répondues", value: stats?.questions.answered ?? 0, color: "#00aaff", hint: "archivées" },
                ].map(card => (
                  <div key={card.label} style={{ background: "#0a0a12", border: `1px solid ${card.color}30`, borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: card.color, fontFamily: "'Courier New', monospace" }}>{card.value}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{card.label}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{card.hint}</div>
                  </div>
                ))}
              </div>

              <button onClick={loadDashboard} disabled={statsLoading} style={{ fontSize: 11, color: "#555", background: "transparent", border: "1px solid #333", padding: "5px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 24, fontFamily: "'Courier New', monospace" }}>
                {statsLoading ? "…" : "↺ Rafraîchir"}
              </button>

              {/* Announcement broadcast */}
              <div style={{ background: "#0a0a12", border: "1px solid #ffaa0030", borderRadius: 10, padding: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, marginBottom: 14 }}>📢 ANNONCE BROADCAST</div>
                <textarea
                  value={announcement.message}
                  onChange={e => setAnnouncement(a => ({ ...a, message: (e.target as HTMLTextAreaElement).value }))}
                  disabled={!canWrite}
                  rows={3}
                  placeholder="Message affiché en banner sur la page /live…"
                  style={{ width: "100%", background: "#050508", border: "1px solid #ffaa0020", borderRadius: 6, color: "#fff", padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "none" as const, outline: "none", marginBottom: 10 }}
                />
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#aaa", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={announcement.enabled}
                      onChange={e => setAnnouncement(a => ({ ...a, enabled: (e.target as HTMLInputElement).checked }))}
                      disabled={!canWrite}
                      style={{ accentColor: "#ffaa00" }}
                    />
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
                    {announcement.expiresAt && (
                      <button onClick={() => setAnnouncement(a => ({ ...a, expiresAt: null }))} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 12 }}>✕</button>
                    )}
                  </div>
                  {canWrite && (
                    <button onClick={saveAnnouncement} disabled={annSaving} style={{ background: "#ffaa00", color: "#000", padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 900, cursor: "pointer", border: "none", letterSpacing: 1, marginLeft: "auto" }}>
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

              {/* Participants list */}
              {(stats?.participants ?? []).length > 0 && (
                <div style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 10, padding: 20 }}>
                  <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 14 }}>
                    PARTICIPANTS RÉCENTS ({stats?.participants.length})
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Nom", "Billet", "Vu il y a", "IP"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "4px 10px", color: "#444", fontSize: 10, letterSpacing: 1, borderBottom: "1px solid #ffffff10" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(stats?.participants ?? []).map(p => {
                          const seenMs = p.lastSeenAt ? Date.now() - new Date(p.lastSeenAt).getTime() : null;
                          const seenStr = seenMs == null ? "—"
                            : seenMs < 60000 ? "< 1 min"
                            : seenMs < 3600000 ? `${Math.floor(seenMs / 60000)} min`
                            : `${Math.floor(seenMs / 3600000)} h`;
                          const isOnline = seenMs != null && seenMs < 3 * 60 * 1000;
                          return (
                            <tr key={p.id} style={{ borderBottom: "1px solid #ffffff08" }}>
                              <td style={{ padding: "8px 10px", color: isOnline ? "#00ff9d" : "#fff" }}>
                                {isOnline && <span style={{ marginRight: 6, fontSize: 8 }}>●</span>}
                                {p.name}
                              </td>
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
            </>
          )}
        </div>

      /* ── STREAMS ─────────────────────────────────────────────────────── */
      ) : loading ? (
        <p style={{ color: "#555", fontSize: 12 }}>Chargement…</p>
      ) : subTab === "streams" ? (
        <div>
          {settings.streams.length === 0 && <p style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>Aucun flux configuré. Ajoutez un flux YouTube.</p>}

          {settings.streams.map(st => (
            <div key={st.id} style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 4 }}>TITRE DU FLUX</label>
                  <input value={st.title} onChange={e => updateStream(st.id, { title: (e.target as HTMLInputElement).value })} placeholder="Session principale" disabled={!canWrite} style={INPUT} />
                </div>
                {canWrite && <button onClick={() => removeStream(st.id)} style={{ alignSelf: "flex-end", background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", borderRadius: 6, padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>✕</button>}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 4 }}>URL YOUTUBE (EMBED)</label>
                <input value={st.url} onChange={e => updateStream(st.id, { url: (e.target as HTMLInputElement).value })} placeholder="https://www.youtube.com/embed/XXXXXXXXXX" disabled={!canWrite} style={INPUT} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: canWrite ? "pointer" : "default", fontSize: 12, color: "#888" }}>
                <input type="checkbox" checked={st.active} onChange={e => updateStream(st.id, { active: (e.target as HTMLInputElement).checked })} disabled={!canWrite} style={{ accentColor: "#00ff9d" }} />
                Flux actif (visible par les participants)
              </label>
              {st.url && (
                <div style={{ marginTop: 16, aspectRatio: "16/9", background: "#050508", borderRadius: 8, overflow: "hidden" }}>
                  <iframe src={st.url} style={{ width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              )}
            </div>
          ))}

          {canWrite && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={addStream} style={{ background: "transparent", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>+ Ajouter un flux</button>
              <button onClick={saveStreams} disabled={saving} style={SAVE_BTN}>{saved ? "✓ Sauvegardé" : saving ? "Sauvegarde…" : "Sauvegarder"}</button>
            </div>
          )}
        </div>

      /* ── PROGRAMME ──────────────────────────────────────────────────── */
      /* ── Q&A ────────────────────────────────────────────────────────── */
      ) : subTab === "qa" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {(["pending","approved","answered"] as const).map(f => (
                <button key={f} onClick={() => setQaFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" as const,
                  background: qaFilter === f ? (f === "pending" ? "#ff440020" : f === "approved" ? "#00ff9d20" : "#0066ff20") : "transparent",
                  border: `1px solid ${qaFilter === f ? (f === "pending" ? "#ff4444" : f === "approved" ? "#00ff9d" : "#0066ff") : "#333"}`,
                  color: qaFilter === f ? (f === "pending" ? "#ff6b6b" : f === "approved" ? "#00ff9d" : "#4488ff") : "#666",
                  fontFamily: "'Courier New', monospace",
                }}>
                  {f === "pending" ? "⏳ En attente" : f === "approved" ? "✓ Approuvées" : "✅ Répondues"}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    ({questions.filter(q => f === "pending" ? (!q.approved && !q.answered) : f === "approved" ? (q.approved && !q.answered) : q.answered).length})
                  </span>
                </button>
              ))}
            </div>
            <button onClick={loadQuestions} disabled={qaLoading} style={{ fontSize: 11, color: "#555", background: "transparent", border: "1px solid #333", padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>
              {qaLoading ? "…" : "↺"}
            </button>
          </div>

          {filteredQuestions.length === 0 ? (
            <p style={{ color: "#555", fontSize: 12, padding: "24px 0" }}>Aucune question dans ce filtre.</p>
          ) : (
            filteredQuestions.map(q => (
              <div key={q.id} style={{ background: "#0a0a12", border: `1px solid ${q.answered ? "#0066ff30" : q.approved ? "#00ff9d30" : "#ffffff15"}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#fff", fontSize: 13, margin: "0 0 6px", lineHeight: 1.5 }}>{q.body}</p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                      {q.displayName && <span style={{ fontSize: 10, color: "#888" }}>👤 {q.displayName}</span>}
                      <span style={{ fontSize: 10, color: "#555" }}>🕐 {new Date(q.askedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                      {q.upvotes > 0 && <span style={{ fontSize: 10, color: "#ffaa00" }}>▲ {q.upvotes}</span>}
                      {q.answered  && <span style={{ fontSize: 10, color: "#4488ff" }}>✅ Répondue</span>}
                      {q.approved && !q.answered && <span style={{ fontSize: 10, color: "#00ff9d" }}>✓ Approuvée</span>}
                    </div>
                  </div>

                  {canWrite && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {!q.approved && !q.answered && (
                        <button onClick={() => patchQuestion(q.id, { approved: true })} style={{ background: "#00ff9d20", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>
                          ✓ Approuver
                        </button>
                      )}
                      {q.approved && !q.answered && (
                        <button onClick={() => patchQuestion(q.id, { answered: true })} style={{ background: "#0066ff20", border: "1px solid #0066ff40", color: "#4488ff", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>
                          ✅ Marquer répondue
                        </button>
                      )}
                      {q.approved && (
                        <button onClick={() => patchQuestion(q.id, { approved: false })} style={{ background: "transparent", border: "1px solid #ffffff15", color: "#666", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>
                          ↩ Retirer
                        </button>
                      )}
                      <button onClick={() => deleteQuestion(q.id)} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      /* ── WORKSHOPS ──────────────────────────────────────────────────── */
      ) : (
        <div>
          {/* JaaS connection */}
          <div style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 14 }}>🔑 CONNEXION JAAS (8x8.vc)</div>

            {(["appId", "apiKey"] as const).map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 4 }}>
                  {field === "appId" ? "APP ID (vpaas-magic-cookie-xxxx)" : "API KEY ID (kid)"}
                </label>
                <input
                  value={jaas[field]}
                  onChange={e => setJaas(j => ({ ...j, [field]: (e.target as HTMLInputElement).value }))}
                  disabled={!canWrite}
                  placeholder={field === "appId" ? "vpaas-magic-cookie-xxxx" : "xxxx"}
                  style={INPUT}
                />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 4 }}>CLÉ PRIVÉE RSA (PEM)</label>
              <textarea
                value={jaas.privateKey}
                onChange={e => setJaas(j => ({ ...j, privateKey: (e.target as HTMLTextAreaElement).value }))}
                disabled={!canWrite} rows={6}
                placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                style={{ width: "100%", background: "#050508", border: "1px solid #00ff9d20", borderRadius: 6, color: "#fff", padding: "10px 12px", fontSize: 11, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "vertical" as const, outline: "none" }}
              />
            </div>

            {canWrite && (
              <button onClick={saveJaas} disabled={jaasSaving} style={SAVE_BTN}>
                {jaasSaved ? "✓ Sauvegardé" : jaasSaving ? "Sauvegarde…" : "Sauvegarder config JaaS"}
              </button>
            )}
          </div>

          {/* Workshop list */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3 }}>WORKSHOPS ({workshops.length})</div>
            {canWrite && (
              <button onClick={addWorkshop} style={{ background: "transparent", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "6px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>
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
              <div key={ws.id} style={{ background: "#0a0a12", border: `1px solid ${ws.active ? "#00ff9d20" : "#ffffff10"}`, borderRadius: 10, padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, marginBottom: 2 }}>{ws.title || "(sans titre)"}</div>
                  {ws.titleEn && <div style={{ fontSize: 11, color: "#888" }}>EN: {ws.titleEn}</div>}
                  <div style={{ fontSize: 10, color: "#555", marginTop: 4, fontFamily: "'Courier New', monospace" }}>room: {ws.room || "—"}</div>
                  {!ws.active && <span style={{ fontSize: 10, color: "#888", marginTop: 4, display: "inline-block" }}>● Inactif</span>}
                  {ws.active  && <span style={{ fontSize: 10, color: "#00ff9d", marginTop: 4, display: "inline-block" }}>🔴 Actif</span>}
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

          {/* Edit/Create workshop modal */}
          {editWs && (
            <div style={{ position: "fixed", inset: 0, background: "#000000cc", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
              <div style={{ background: "#0a0a12", border: "1px solid #00ff9d30", borderRadius: 12, padding: 28, width: 480, maxWidth: "90vw" }}>
                <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 14 }}>
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
                    <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 1, display: "block", marginBottom: 4 }}>{label}</label>
                    <input
                      value={(editWs as Record<string, string>)[field] ?? ""}
                      onChange={e => setEditWs(w => w ? { ...w, [field]: (e.target as HTMLInputElement).value } : w)}
                      style={INPUT}
                    />
                  </div>
                ))}

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888", marginBottom: 20, cursor: "pointer" }}>
                  <input type="checkbox" checked={editWs.active} onChange={e => setEditWs(w => w ? { ...w, active: (e.target as HTMLInputElement).checked } : w)} style={{ accentColor: "#00ff9d" }} />
                  Workshop actif (visible aux participants)
                </label>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => saveEditedWorkshop(editWs)} disabled={wsSaving || !editWs.title || !editWs.room} style={{ ...SAVE_BTN, opacity: (!editWs.title || !editWs.room) ? 0.5 : 1 }}>
                    {wsSaved ? "✓" : wsSaving ? "…" : "Enregistrer"}
                  </button>
                  <button onClick={() => setEditWs(null)} style={{ background: "transparent", border: "1px solid #ffffff20", color: "#888", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
