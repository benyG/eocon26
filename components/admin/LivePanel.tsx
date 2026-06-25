"use client";

import { useState, useEffect, useCallback } from "react";

interface Stream {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

interface ProgrammeItem {
  time: string;
  title: string;
  speaker?: string;
  room?: string;
}

interface LiveSettings {
  streams: Stream[];
  programme: ProgrammeItem[];
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

const EMPTY: LiveSettings = { streams: [], programme: [] };

export default function LivePanel({ canWrite }: { canWrite: boolean }) {
  const [subTab, setSubTab] = useState<"streams" | "programme" | "qa">("streams");

  // ── Streams + Programme ──────────────────────────────────────────────────
  const [settings, setSettings]     = useState<LiveSettings>(EMPTY);
  const [programmeRaw, setProgrammeRaw] = useState("[]");
  const [jsonError, setJsonError]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [loading, setLoading]       = useState(true);

  // ── Q&A ─────────────────────────────────────────────────────────────────
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [qaLoading, setQaLoading]   = useState(false);
  const [qaFilter, setQaFilter]     = useState<"pending" | "approved" | "answered">("pending");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/live/settings");
      if (res.ok) {
        const data: LiveSettings = await res.json();
        setSettings(data);
        setProgrammeRaw(JSON.stringify(data.programme ?? [], null, 2));
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

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (subTab === "qa") loadQuestions(); }, [subTab, loadQuestions]);

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

  const saveStreams   = () => persist({ streams: settings.streams });
  const saveProgramme = () => {
    try {
      const parsed: ProgrammeItem[] = JSON.parse(programmeRaw);
      setJsonError(""); persist({ programme: parsed });
    } catch { setJsonError("JSON invalide — vérifiez la syntaxe"); }
  };

  const updateStream = (id: string, patch: Partial<Stream>) => {
    setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.map((st: Stream) => st.id === id ? { ...st, ...patch } : st) }));
  };
  const addStream    = () => setSettings((s: LiveSettings) => ({ ...s, streams: [...s.streams, { id: Date.now().toString(), title: "", url: "", active: false }] }));
  const removeStream = (id: string) => setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.filter((st: Stream) => st.id !== id) }));

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

  let parsedProgramme: ProgrammeItem[] = [];
  try { parsedProgramme = JSON.parse(programmeRaw); } catch { /* invalid */ }

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
        <p style={{ color: "#666", fontSize: 12 }}>Configurez les flux vidéo, le programme et modérez les questions en direct</p>
      </div>

      <div className="mb-6 flex gap-3 items-center">
        <a href="/live" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#00ff9d", border: "1px solid #00ff9d40", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live</a>
        <a href="/live/resend" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#888", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live/resend</a>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={TAB_STYLE(subTab === "streams")}   onClick={() => setSubTab("streams")}>📡 Flux vidéo</button>
        <button style={TAB_STYLE(subTab === "programme")} onClick={() => setSubTab("programme")}>📋 Programme du jour</button>
        <button style={TAB_STYLE(subTab === "qa")}        onClick={() => setSubTab("qa")}>
          💬 Q&A
          {questions.filter(q => !q.approved && !q.answered).length > 0 && (
            <span style={{ marginLeft: 6, background: "#ff4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>
              {questions.filter(q => !q.approved && !q.answered).length}
            </span>
          )}
        </button>
      </div>

      {/* ── STREAMS ─────────────────────────────────────────────────────── */}
      {loading ? (
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
      ) : subTab === "programme" ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 6 }}>PROGRAMME DU JOUR (JSON)</label>
            <p style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Tableau d{"'"}objets : [{"{"}"time", "title", "speaker", "room"{"}"}]</p>
            <textarea
              value={programmeRaw}
              onChange={e => { setProgrammeRaw((e.target as HTMLTextAreaElement).value); setJsonError(""); }}
              disabled={!canWrite} rows={14}
              placeholder={`[\n  { "time": "09:00", "title": "Keynote ouverture", "speaker": "John Doe", "room": "Salle A" }\n]`}
              style={{ width: "100%", background: "#050508", border: `1px solid ${jsonError ? "#ff4444" : "#00ff9d20"}`, borderRadius: 8, color: "#fff", padding: "12px 16px", fontSize: 12, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "vertical" as const, outline: "none" }}
            />
            {jsonError && <p style={{ color: "#ff6b6b", fontSize: 11, marginTop: 4 }}>{jsonError}</p>}
          </div>
          {canWrite && <button onClick={saveProgramme} disabled={saving} style={{ ...SAVE_BTN, marginBottom: 24 }}>{saved ? "✓ Sauvegardé" : saving ? "Sauvegarde…" : "Sauvegarder"}</button>}

          {parsedProgramme.length > 0 && (
            <div style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 12 }}>APERÇU PROGRAMME</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Heure","Titre","Intervenant","Salle"].map(h => <th key={h} style={{ textAlign: "left", fontSize: 10, color: "#555", letterSpacing: 2, padding: "4px 8px", borderBottom: "1px solid #00ff9d15" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {parsedProgramme.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ffffff08" }}>
                      <td style={{ padding: "8px", fontSize: 12, color: "#00ff9d", fontFamily: "'Courier New', monospace", whiteSpace: "nowrap" }}>{item.time}</td>
                      <td style={{ padding: "8px", fontSize: 12, color: "#fff" }}>{item.title}</td>
                      <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{item.speaker || "—"}</td>
                      <td style={{ padding: "8px", fontSize: 11, color: "#888" }}>{item.room || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      /* ── Q&A ────────────────────────────────────────────────────────── */
      ) : (
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
      )}
    </div>
  );
}
