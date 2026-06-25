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

const EMPTY: LiveSettings = { streams: [], programme: [] };

export default function LivePanel({ canWrite }: { canWrite: boolean }) {
  const [subTab, setSubTab] = useState<"streams" | "programme">("streams");
  const [settings, setSettings] = useState<LiveSettings>(EMPTY);
  const [programmeRaw, setProgrammeRaw] = useState("[]");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const persist = async (patch: Partial<LiveSettings>) => {
    setSaving(true);
    setSaved(false);
    try {
      const next = { ...settings, ...patch };
      const res = await fetch("/api/admin/live/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSettings(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveStreams = () => persist({ streams: settings.streams });

  const saveProgramme = () => {
    try {
      const parsed: ProgrammeItem[] = JSON.parse(programmeRaw);
      setJsonError("");
      persist({ programme: parsed });
    } catch {
      setJsonError("JSON invalide — vérifiez la syntaxe");
    }
  };

  const updateStream = (id: string, patch: Partial<Stream>) => {
    setSettings((s: LiveSettings) => ({
      ...s,
      streams: s.streams.map((st: Stream) => st.id === id ? { ...st, ...patch } : st),
    }));
  };

  const addStream = () => {
    setSettings((s: LiveSettings) => ({
      ...s,
      streams: [...s.streams, { id: Date.now().toString(), title: "", url: "", active: false }],
    }));
  };

  const removeStream = (id: string) => {
    setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.filter((st: Stream) => st.id !== id) }));
  };

  const TAB_STYLE = (active: boolean) => ({
    padding: "8px 18px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 900 : 400,
    cursor: "pointer" as const,
    background: active ? "#00ff9d20" : "transparent",
    border: active ? "1px solid #00ff9d40" : "1px solid transparent",
    color: active ? "#00ff9d" : "#888",
    letterSpacing: 1,
    fontFamily: "'Courier New', monospace",
  });

  let parsedProgramme: ProgrammeItem[] = [];
  try { parsedProgramme = JSON.parse(programmeRaw); } catch { /* invalid */ }

  const INPUT = {
    width: "100%",
    background: "#050508",
    border: "1px solid #00ff9d20",
    borderRadius: 6,
    color: "#fff",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    boxSizing: "border-box" as const,
    outline: "none",
  };

  const SAVE_BTN = {
    background: "#00ff9d",
    color: "#000",
    padding: "8px 20px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 900,
    cursor: saving ? "not-allowed" : "pointer",
    letterSpacing: 1,
    border: "none",
  };

  return (
    <div>
      <div className="mb-6">
        <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 4 }}>🔴 EOCON 2026</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 4px", fontFamily: "'Courier New', monospace" }}>Live Streaming</h1>
        <p style={{ color: "#666", fontSize: 12 }}>Configurez les flux vidéo et le programme diffusé aux participants en ligne</p>
      </div>

      <div className="mb-6 flex gap-3 items-center">
        <a href="/live" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#00ff9d", border: "1px solid #00ff9d40", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>
          → Page /live
        </a>
        <a href="/live/resend" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#888", border: "1px solid #333", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>
          → Page /live/resend
        </a>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={TAB_STYLE(subTab === "streams")} onClick={() => setSubTab("streams")}>📡 Flux vidéo</button>
        <button style={TAB_STYLE(subTab === "programme")} onClick={() => setSubTab("programme")}>📋 Programme du jour</button>
      </div>

      {loading ? (
        <p style={{ color: "#555", fontSize: 12 }}>Chargement…</p>
      ) : subTab === "streams" ? (
        <div>
          {settings.streams.length === 0 && (
            <p style={{ color: "#555", fontSize: 12, marginBottom: 16 }}>Aucun flux configuré. Ajoutez un flux YouTube.</p>
          )}

          {settings.streams.map(st => (
            <div key={st.id} style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 4 }}>TITRE DU FLUX</label>
                  <input
                    value={st.title}
                    onChange={e => updateStream(st.id, { title: e.target.value })}
                    placeholder="Session principale"
                    disabled={!canWrite}
                    style={INPUT}
                  />
                </div>
                {canWrite && (
                  <button onClick={() => removeStream(st.id)} style={{ alignSelf: "flex-end", background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", borderRadius: 6, padding: "8px 14px", fontSize: 11, cursor: "pointer" }}>
                    ✕
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 4 }}>URL YOUTUBE (EMBED)</label>
                <input
                  value={st.url}
                  onChange={e => updateStream(st.id, { url: e.target.value })}
                  placeholder="https://www.youtube.com/embed/XXXXXXXXXX"
                  disabled={!canWrite}
                  style={INPUT}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: canWrite ? "pointer" : "default", fontSize: 12, color: "#888" }}>
                <input type="checkbox" checked={st.active} onChange={e => updateStream(st.id, { active: e.target.checked })} disabled={!canWrite} style={{ accentColor: "#00ff9d" }} />
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
              <button onClick={addStream} style={{ background: "transparent", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "8px 16px", borderRadius: 6, fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
                + Ajouter un flux
              </button>
              <button onClick={saveStreams} disabled={saving} style={SAVE_BTN}>
                {saved ? "✓ Sauvegardé" : saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, display: "block", marginBottom: 6 }}>PROGRAMME DU JOUR (JSON)</label>
            <p style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Tableau d{"'"}objets : [{"{"}"time", "title", "speaker", "room"{"}"}]</p>
            <textarea
              value={programmeRaw}
              onChange={e => { setProgrammeRaw(e.target.value); setJsonError(""); }}
              disabled={!canWrite}
              rows={14}
              placeholder={`[\n  { "time": "09:00", "title": "Keynote ouverture", "speaker": "John Doe", "room": "Salle A" }\n]`}
              style={{ width: "100%", background: "#050508", border: `1px solid ${jsonError ? "#ff4444" : "#00ff9d20"}`, borderRadius: 8, color: "#fff", padding: "12px 16px", fontSize: 12, fontFamily: "'Courier New', monospace", boxSizing: "border-box", resize: "vertical", outline: "none" }}
            />
            {jsonError && <p style={{ color: "#ff6b6b", fontSize: 11, marginTop: 4 }}>{jsonError}</p>}
          </div>

          {canWrite && (
            <button onClick={saveProgramme} disabled={saving} style={{ ...SAVE_BTN, marginBottom: 24 }}>
              {saved ? "✓ Sauvegardé" : saving ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          )}

          {parsedProgramme.length > 0 && (
            <div style={{ background: "#0a0a12", border: "1px solid #00ff9d20", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 3, marginBottom: 12 }}>APERÇU PROGRAMME</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Heure", "Titre", "Intervenant", "Salle"].map(h => (
                      <th key={h} style={{ textAlign: "left", fontSize: 10, color: "#555", letterSpacing: 2, padding: "4px 8px", borderBottom: "1px solid #00ff9d15" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
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
      )}
    </div>
  );
}
