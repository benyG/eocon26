"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import CountrySelect from "@/components/CountrySelect";

type Stage = "submitted" | "reviewing" | "accepted" | "onboarding" | "confirmed" | "scheduled";

const STAGES: { key: Stage; label: string; color: string; desc: string }[] = [
  { key: "submitted",  label: "Soumissions",  color: "#888",    desc: "CFP reçus, non examinés" },
  { key: "reviewing",  label: "En révision",  color: "#0066ff", desc: "Score IA calculé, en attente de décision" },
  { key: "accepted",   label: "Acceptés",     color: "#ffaa00", desc: "Speaker créé automatiquement" },
  { key: "onboarding", label: "Onboarding",   color: "#cc00ff", desc: "Email envoyé, attente bio/photo" },
  { key: "confirmed",  label: "Confirmés",    color: "#00ff9d", desc: "Profil complet, prêt à programmer" },
  { key: "scheduled",  label: "Programmés",   color: "#ff6600", desc: "Créneau assigné dans le programme" },
];

interface CFPCard {
  id: number;
  name: string;
  email: string;
  org?: string | null;
  country?: string | null;
  talkTitle: string;
  format?: string | null;
  abstract: string;
  bio?: string | null;
  status: string;
  pipelineStage: Stage;
  notes?: string | null;
  aiScore?: number | null;
  aiAnalysis?: string | null;
  createdAt: string;
  speakerId?: number | null;
  speaker?: {
    id: number;
    photoUrl?: string | null;
    onboardingStatus?: string | null;
    isVisible: boolean;
  } | null;
}

interface SpeakerRecord {
  id: number;
  name: string;
  title: string;
  company?: string | null;
  country?: string | null;
  bio: string;
  photoUrl?: string | null;
  visualUrl?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  talkTitle?: string | null;
  talkAbstract?: string | null;
  talkFormat?: string | null;
  isKeynote: boolean;
  isVisible: boolean;
  sortOrder: number;
  onboardingStatus?: string | null;
}

interface SessionRecord {
  id: number;
  date?: string | null;
  time: string;
  endTime?: string | null;
  title: string;
  type: string;
  speakerName?: string | null;
  speakerId?: number | null;
  room?: string | null;
  description?: string | null;
  sortOrder: number;
  isVisible: boolean;
}

interface WorkshopRecord {
  id: number;
  title: string;
  description: string;
  level: string;
  duration: string;
  maxSeats?: number | null;
  instructor?: string | null;
  isVisible: boolean;
  sortOrder: number;
}

type ActiveView = "pipeline" | "speakers" | "programme" | "workshops";

export default function PipelineKanban() {
  const [view, setView] = useState<ActiveView>("pipeline");
  const [cards, setCards] = useState<CFPCard[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CFPCard | null>(null);
  const [editSpeaker, setEditSpeaker] = useState<SpeakerRecord | null>(null);
  const [editSession, setEditSession] = useState<SessionRecord | null>(null);
  const [editWorkshop, setEditWorkshop] = useState<WorkshopRecord | null>(null);
  const [scoring, setScoring] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Planning state — persisted in EventSettings
  const [planStartDate, setPlanStartDate] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        if (data.programme_start_date) setPlanStartDate(data.programme_start_date);
      })
      .catch(() => {});
  }, []);

  const savePlanStartDate = async (date: string) => {
    setPlanStartDate(date);
    fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programme_start_date: date }),
    }).catch(() => {});
  };
  type DragItem = { type: "cfp"; id: number; title: string; name: string } | { type: "session"; id: number; title: string };
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ date: string; item: DragItem } | null>(null);
  const [dropTime, setDropTime] = useState("09:00");
  const [seeding, setSeeding] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [cfpRes, spRes, sessRes, wsRes] = await Promise.all([
      fetch("/api/admin/pipeline"),
      fetch("/api/admin/speakers"),
      fetch("/api/admin/sessions"),
      fetch("/api/admin/workshops"),
    ]);
    if (cfpRes.ok) setCards(await cfpRes.json());
    if (spRes.ok) setSpeakers(await spRes.json());
    if (sessRes.ok) setSessions(await sessRes.json());
    if (wsRes.ok) setWorkshops(await wsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const moveStage = async (id: number, stage: Stage) => {
    const res = await fetch("/api/admin/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    });
    if (res.ok) {
      const updated: CFPCard = await res.json();
      setCards(prev => prev.map(c => c.id === id ? updated : c));
      setSelectedCard(updated);
    }
  };

  const rejectCFP = async (id: number) => {
    await fetch("/api/admin/pipeline", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: "rejected", pipelineStage: "submitted" } : c));
    setSelectedCard(null);
  };

  const scoreWithAI = async (card: CFPCard) => {
    setScoring(card.id);
    const res = await fetch("/api/admin/ai/score-cfp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, ...updated } : c));
      setSelectedCard(prev => prev?.id === card.id ? { ...prev, ...updated } : prev);
    }
    setScoring(null);
  };

  const uploadSpeakerPhoto = async (speakerId: number, file: File) => {
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "speakers");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      await fetch(`/api/admin/speakers/${speakerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: url }),
      });
      setSpeakers(prev => prev.map(s => s.id === speakerId ? { ...s, photoUrl: url } : s));
      if (editSpeaker?.id === speakerId) setEditSpeaker(prev => prev ? { ...prev, photoUrl: url } : prev);
    }
    setUploadingPhoto(false);
  };

  const uploadSpeakerVisual = async (speakerId: number, file: File) => {
    setUploadingPhoto(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "speaker-visuals");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      await fetch(`/api/admin/speakers/${speakerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualUrl: url }),
      });
      setSpeakers(prev => prev.map(s => s.id === speakerId ? { ...s, visualUrl: url } : s));
      if (editSpeaker?.id === speakerId) setEditSpeaker(prev => prev ? { ...prev, visualUrl: url } : prev);
    }
    setUploadingPhoto(false);
  };

  const saveSpeaker = async (sp: SpeakerRecord) => {
    const { id, ...data } = sp;
    await fetch(`/api/admin/speakers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSpeakers(prev => prev.map(s => s.id === id ? sp : s));
    setEditSpeaker(null);
  };

  const saveSession = async (sess: SessionRecord) => {
    const { id, ...data } = sess;
    await fetch(`/api/admin/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSessions(prev => prev.map(s => s.id === id ? sess : s));
    setEditSession(null);
  };

  const createSession = async () => {
    const res = await fetch("/api/admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nouvelle session", type: "talk", time: "09:00", isVisible: false, sortOrder: 999 }),
    });
    if (res.ok) { const s = await res.json(); setSessions(prev => [s, ...prev]); setEditSession(s); }
  };

  const deleteSession = async (id: number) => {
    await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.id !== id));
    setEditSession(null);
  };

  const saveWorkshop = async (ws: WorkshopRecord) => {
    const { id, ...data } = ws;
    await fetch(`/api/admin/workshops/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setWorkshops(prev => prev.map(w => w.id === id ? ws : w));
    setEditWorkshop(null);
  };

  const createWorkshop = async () => {
    const res = await fetch("/api/admin/workshops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nouvel atelier", description: "", level: "beginner", duration: "3h", isVisible: false, sortOrder: 999 }),
    });
    if (res.ok) { const w = await res.json(); setWorkshops(prev => [w, ...prev]); setEditWorkshop(w); }
  };

  const deleteWorkshop = async (id: number) => {
    await fetch(`/api/admin/workshops/${id}`, { method: "DELETE" });
    setWorkshops(prev => prev.filter(w => w.id !== id));
    setEditWorkshop(null);
  };

  const scoreColor = (s?: number | null) => !s ? "#888" : s >= 7 ? "#00ff9d" : s >= 5 ? "#ffaa00" : "#ff0066";

  const typeColor = (type: string) => {
    const c: Record<string, string> = { keynote: "#ffaa00", talk: "#0066ff", panel: "#cc00ff", workshop: "#ff6600", break: "#555", logistics: "#888" };
    return c[type] || "#888";
  };
  const fmtDate = (d: string) => {
    try { return new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }); } catch { return d; }
  };
  const planDays = planStartDate
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(planStartDate + "T00:00:00");
        d.setDate(d.getDate() + i);
        return d.toISOString().slice(0, 10);
      })
    : [];
  const day6 = planDays[5] || null;

  const handleDrop = (date: string) => {
    setDropTarget(null);
    if (!dragItem) return;
    setPendingDrop({ date, item: dragItem });
    setDragItem(null);
  };

  const confirmDrop = async () => {
    if (!pendingDrop) return;
    const { date, item } = pendingDrop;
    if (item.type === "cfp") {
      const card = cards.find(c => c.id === item.id);
      if (!card) return;
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: card.talkTitle,
          type: card.format === "keynote" ? "keynote" : "talk",
          date, time: dropTime,
          speakerName: card.name,
          speakerId: card.speakerId || null,
          isVisible: true, sortOrder: 100,
        }),
      });
      if (res.ok) {
        const s = await res.json();
        setSessions(prev => [...prev, s]);
        await moveStage(card.id, "scheduled");
      }
    } else {
      const res = await fetch(`/api/admin/sessions/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time: dropTime }),
      });
      if (res.ok) setSessions(prev => prev.map(s => s.id === item.id ? { ...s, date, time: dropTime } : s));
    }
    setPendingDrop(null);
    setDropTime("09:00");
  };

  const unscheduleSession = async (sess: SessionRecord) => {
    if (!confirm(`Retirer "${sess.title}" du programme ?`)) return;
    // Always remove the date (never delete the session — it stays in backlog)
    const res = await fetch(`/api/admin/sessions/${sess.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: null }),
    });
    if (res.ok) {
      setSessions(prev => prev.map(s => s.id === sess.id ? { ...s, date: null } : s));
      // If a CFP card was moved to "scheduled" because of this session, revert it to "confirmed"
      const linkedCard = sess.speakerId ? cards.find(c => c.speakerId === sess.speakerId && c.pipelineStage === "scheduled") : null;
      if (linkedCard) await moveStage(linkedCard.id, "confirmed");
    }
  };

  const toggleSessionVisible = async (sess: SessionRecord) => {
    const res = await fetch(`/api/admin/sessions/${sess.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !sess.isVisible }),
    });
    if (res.ok) setSessions(prev => prev.map(s => s.id === sess.id ? { ...s, isVisible: !s.isVisible } : s));
  };

  const seedSessions = async () => {
    if (!confirm("Initialiser le programme avec les sessions standard ?")) return;
    setSeeding(true);
    const r = await fetch("/api/admin/sessions/seed", { method: "POST" });
    const j = await r.json();
    if (!r.ok) alert(j.error || "Erreur");
    else { await loadAll(); }
    setSeeding(false);
  };

  // ── View tabs ────────────────────────────────────────────────────────────
  const views: { key: ActiveView; label: string }[] = [
    { key: "pipeline",   label: "Pipeline CFP" },
    { key: "speakers",   label: `Speakers (${speakers.length})` },
    { key: "programme",  label: `Programme (${sessions.length})` },
    { key: "workshops",  label: `Ateliers (${workshops.length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Speakers &amp; Programme</h1>
        {loading && <span className="text-gray-600 text-xs">Chargement...</span>}
      </div>

      {/* Sub-view selector */}
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`text-xs px-4 py-2 border-b-2 transition-all ${view === v.key ? "border-neon-green text-neon-green" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE KANBAN ──────────────────────────────────────── */}
      {view === "pipeline" && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageCards = cards.filter(c => c.pipelineStage === stage.key && c.status !== "rejected");
            return (
              <div key={stage.key} className="flex-shrink-0 w-64">
                {/* Column header */}
                <div className="rounded-t-xl px-3 py-2 mb-2" style={{ background: stage.color + "15", borderBottom: `2px solid ${stage.color}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: stage.color }}>{stage.label}</span>
                    <span className="text-xs font-mono" style={{ color: stage.color }}>{stageCards.length}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{stage.desc}</p>
                </div>
                {/* Cards */}
                <div className="space-y-2 min-h-[120px]">
                  {stageCards.map(card => (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className={`w-full text-left rounded-xl border p-3 transition-all hover:border-gray-500 ${selectedCard?.id === card.id ? "border-neon-green/50 bg-neon-green/5" : "border-gray-800 bg-black/20"}`}
                    >
                      <p className="text-white text-xs font-bold line-clamp-1">{card.name}</p>
                      <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{card.talkTitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {card.org && <span className="text-gray-600 text-xs line-clamp-1">{card.org}</span>}
                        {card.aiScore != null && (
                          <span className="text-xs font-mono ml-auto px-1.5 py-0.5 rounded" style={{ color: scoreColor(card.aiScore), background: scoreColor(card.aiScore) + "20" }}>
                            {card.aiScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {card.speaker?.photoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.speaker.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover mt-1 border border-gray-700" />
                      )}
                    </button>
                  ))}
                  {stageCards.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-800 p-4 text-center">
                      <p className="text-gray-700 text-xs">Aucun</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CARD DETAIL PANEL ──────────────────────────────────── */}
      {view === "pipeline" && selectedCard && (
        <div className="cyber-card rounded-xl p-5 border-neon-green/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-white font-bold text-base">{selectedCard.name}</h2>
              <p className="text-gray-500 text-xs">{selectedCard.org} · {selectedCard.country}</p>
            </div>
            <button onClick={() => setSelectedCard(null)} className="text-gray-600 hover:text-white">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Talk</p>
              <p className="text-white text-sm font-bold">{selectedCard.talkTitle}</p>
              <p className="text-gray-500 text-xs mt-1 line-clamp-3">{selectedCard.abstract}</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Format</p>
                <p className="text-gray-400 text-xs">{selectedCard.format || "—"}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs uppercase tracking-wider mb-1">Score IA</p>
                {selectedCard.aiScore != null ? (
                  <span className="text-sm font-mono font-bold" style={{ color: scoreColor(selectedCard.aiScore) }}>{selectedCard.aiScore.toFixed(1)}/10</span>
                ) : (
                  <button onClick={() => scoreWithAI(selectedCard)} disabled={scoring === selectedCard.id} className="text-xs px-2 py-1 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff30" }}>
                    {scoring === selectedCard.id ? "Analyse..." : "✨ Scorer avec IA"}
                  </button>
                )}
              </div>
              {selectedCard.aiAnalysis && <p className="text-gray-600 text-xs italic">{selectedCard.aiAnalysis}</p>}
            </div>
          </div>

          {/* Stage actions */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-gray-600 text-xs uppercase tracking-wider mb-3">Faire avancer dans le pipeline</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.filter(s => s.key !== selectedCard.pipelineStage).map(s => (
                <button
                  key={s.key}
                  onClick={() => moveStage(selectedCard.id, s.key)}
                  className="text-xs px-3 py-1.5 rounded transition-all"
                  style={{ background: s.color + "15", color: s.color, border: `1px solid ${s.color}40` }}
                >
                  → {s.label}
                </button>
              ))}
              {selectedCard.status !== "rejected" && (
                <button
                  onClick={() => { if (confirm(`Rejeter la soumission de ${selectedCard.name} ?`)) rejectCFP(selectedCard.id); }}
                  className="text-xs px-3 py-1.5 rounded transition-all"
                  style={{ background: "#ff006615", color: "#ff0066", border: "1px solid #ff006640" }}
                >
                  ✕ Rejeter
                </button>
              )}
            </div>
            {selectedCard.speakerId && (
              <div className="mt-3 p-2 rounded-lg border border-gray-800">
                <p className="text-xs text-neon-green">✓ Speaker créé (ID #{selectedCard.speakerId}) — visible dans l&apos;onglet Speakers</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejected CFPs collapsed */}
      {view === "pipeline" && (() => {
        const rejected = cards.filter(c => c.status === "rejected");
        return rejected.length > 0 ? (
          <details className="cyber-card rounded-xl p-3">
            <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-400">Soumissions rejetées ({rejected.length})</summary>
            <div className="mt-3 space-y-1">
              {rejected.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-1 border-b border-gray-800/50">
                  <span className="text-gray-600 text-xs flex-1">{c.name} — {c.talkTitle}</span>
                  <button onClick={() => moveStage(c.id, "submitted")} className="text-xs text-gray-700 hover:text-gray-400">↩ Réintégrer</button>
                </div>
              ))}
            </div>
          </details>
        ) : null;
      })()}

      {/* ── SPEAKERS LIST ──────────────────────────────────────── */}
      {view === "speakers" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={async () => {
                const res = await fetch("/api/admin/speakers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Nouveau Speaker", title: "Expert", bio: "", edition: "2026", isVisible: false, sortOrder: 999 }) });
                if (res.ok) { const s = await res.json(); setSpeakers(prev => [s, ...prev]); setEditSpeaker(s); }
              }}
              className="btn-neon px-4 py-2 rounded text-xs"
            >+ Ajouter Speaker</button>
          </div>

          {speakers.map(sp => (
            <div key={sp.id} className={`cyber-card rounded-xl p-4 flex items-center gap-4 ${editSpeaker?.id === sp.id ? "border-neon-green/40" : ""}`}>
              {/* Photo */}
              <div className="relative shrink-0">
                {sp.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sp.photoUrl} alt={sp.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-700" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-gray-600 text-xl">👤</div>
                )}
                <label className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neon-green/20 border border-neon-green/40 flex items-center justify-center cursor-pointer text-neon-green text-xs hover:bg-neon-green/40 transition-colors" title="Changer la photo">
                  📷
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadSpeakerPhoto(sp.id, f); e.target.value = ""; }} disabled={uploadingPhoto} />
                </label>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm">{sp.name}</span>
                  {sp.isKeynote && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#ffaa0020", color: "#ffaa00" }}>Keynote</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${sp.isVisible ? "text-neon-green bg-neon-green/10" : "text-gray-600 bg-gray-800"}`}>{sp.isVisible ? "Visible" : "Caché"}</span>
                </div>
                <p className="text-gray-500 text-xs">{sp.title}{sp.company ? ` · ${sp.company}` : ""}{sp.country ? ` · ${sp.country}` : ""}</p>
                {sp.talkTitle && <p className="text-gray-400 text-xs mt-0.5 italic line-clamp-1">"{sp.talkTitle}"</p>}
                {sp.onboardingStatus && (
                  <span className="text-xs mt-1 inline-block px-1.5 py-0.5 rounded" style={{
                    color: sp.onboardingStatus === "completed" ? "#00ff9d" : sp.onboardingStatus === "sent" ? "#0066ff" : "#888",
                    background: sp.onboardingStatus === "completed" ? "#00ff9d10" : sp.onboardingStatus === "sent" ? "#0066ff10" : "#88888810",
                  }}>
                    Onboarding : {sp.onboardingStatus === "completed" ? "Complété ✓" : sp.onboardingStatus === "sent" ? "Email envoyé" : "En attente"}
                  </span>
                )}
              </div>
              <button onClick={() => setEditSpeaker(editSpeaker?.id === sp.id ? null : sp)} className="text-xs px-3 py-1.5 rounded shrink-0" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>
                {editSpeaker?.id === sp.id ? "Fermer" : "Éditer"}
              </button>
            </div>
          ))}

          {/* Speaker edit form */}
          {editSpeaker && (
            <div className="cyber-card rounded-xl p-5 border-neon-green/30">
              <h3 className="text-white font-bold mb-4 text-sm">Édition — {editSpeaker.name}</h3>

              {/* Photo + Visual uploads */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Profile photo */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Photo de profil</p>
                  <div className="flex items-center gap-3">
                    {editSpeaker.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editSpeaker.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-700" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600">👤</div>
                    )}
                    <label className="cursor-pointer border border-dashed border-gray-700 rounded-lg px-3 py-2 hover:border-gray-500 transition-colors">
                      <span className="text-gray-500 text-xs">{uploadingPhoto ? "Upload..." : "📷 Photo"}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" ref={fileRef}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadSpeakerPhoto(editSpeaker.id, f).then(() => setEditSpeaker(prev => prev ? { ...prev, photoUrl: speakers.find(s => s.id === editSpeaker.id)?.photoUrl || prev.photoUrl } : null)); e.target.value = ""; }}
                        disabled={uploadingPhoto} />
                    </label>
                  </div>
                </div>
                {/* Communication visual */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Visuel communication
                    <span className="ml-1 text-gray-600">(infographiste)</span>
                  </p>
                  <div className="flex items-center gap-3">
                    {editSpeaker.visualUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editSpeaker.visualUrl} alt="Visuel" className="w-16 h-16 rounded-lg object-cover border-2 border-neon-green/40" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-800 border-2 border-dashed border-neon-green/20 flex items-center justify-center text-xs text-gray-600 text-center p-1">🎨</div>
                    )}
                    <label className="cursor-pointer border border-dashed border-neon-green/30 rounded-lg px-3 py-2 hover:border-neon-green/60 transition-colors">
                      <span className="text-neon-green/60 text-xs">{uploadingPhoto ? "Upload..." : "🎨 Visuel réseaux"}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadSpeakerVisual(editSpeaker.id, f).then(() => setEditSpeaker(prev => prev ? { ...prev, visualUrl: speakers.find(s => s.id === editSpeaker.id)?.visualUrl || prev.visualUrl } : null)); e.target.value = ""; }}
                        disabled={uploadingPhoto} />
                    </label>
                  </div>
                  {editSpeaker.visualUrl && (
                    <p className="text-xs text-neon-green/40 mt-1">✓ Sera utilisé dans les posts auto</p>
                  )}
                  {!editSpeaker.visualUrl && editSpeaker.photoUrl && (
                    <p className="text-xs text-gray-600 mt-1">Fallback: photo de profil</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "name", label: "Nom complet", type: "text" },
                  { key: "title", label: "Titre / Poste", type: "text" },
                  { key: "company", label: "Organisation", type: "text" },
                  { key: "linkedin", label: "LinkedIn URL", type: "text" },
                  { key: "twitter", label: "X/Twitter URL", type: "text" },
                  { key: "talkTitle", label: "Titre du talk", type: "text" },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      value={(editSpeaker[f.key] as string) || ""}
                      onChange={e => setEditSpeaker(prev => prev ? { ...prev, [f.key]: e.target.value } : prev)}
                      className="cyber-input w-full text-xs rounded px-3 py-2 text-white"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Format</label>
                  <select
                    value={editSpeaker.talkFormat || ""}
                    onChange={e => setEditSpeaker(prev => prev ? { ...prev, talkFormat: e.target.value } : prev)}
                    className="cyber-input w-full text-xs rounded px-3 py-2 text-white bg-transparent"
                  >
                    <option value="" className="bg-dark-800">— Choisir —</option>
                    <option value="talk" className="bg-dark-800">Talk (30–45 min)</option>
                    <option value="keynote" className="bg-dark-800">Keynote</option>
                    <option value="workshop" className="bg-dark-800">Workshop / Atelier</option>
                    <option value="panel" className="bg-dark-800">Panel / Table ronde</option>
                    <option value="lightning" className="bg-dark-800">Lightning Talk (10–15 min)</option>
                    <option value="autre" className="bg-dark-800">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pays</label>
                  <CountrySelect
                    value={(editSpeaker.country as string) || ""}
                    onChange={v => setEditSpeaker(prev => prev ? { ...prev, country: v } : prev)}
                    className="w-full text-xs"
                  />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <label className="text-xs text-gray-500 block">Bio</label>
                <textarea value={editSpeaker.bio} onChange={e => setEditSpeaker(prev => prev ? { ...prev, bio: e.target.value } : prev)} className="cyber-input w-full text-xs rounded px-3 py-2 h-20 resize-none text-white" />
                <label className="text-xs text-gray-500 block">Abstract du talk</label>
                <textarea value={editSpeaker.talkAbstract || ""} onChange={e => setEditSpeaker(prev => prev ? { ...prev, talkAbstract: e.target.value } : prev)} className="cyber-input w-full text-xs rounded px-3 py-2 h-20 resize-none text-white" />
              </div>
              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editSpeaker.isVisible} onChange={e => setEditSpeaker(prev => prev ? { ...prev, isVisible: e.target.checked } : prev)} className="accent-neon-green" />
                  <span className="text-xs text-gray-400">Visible sur le site</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editSpeaker.isKeynote} onChange={e => setEditSpeaker(prev => prev ? { ...prev, isKeynote: e.target.checked } : prev)} className="accent-neon-green" />
                  <span className="text-xs text-gray-400">Keynote</span>
                </label>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ordre d&apos;affichage</label>
                  <input type="number" value={editSpeaker.sortOrder} onChange={e => setEditSpeaker(prev => prev ? { ...prev, sortOrder: parseInt(e.target.value) || 0 } : prev)} className="cyber-input w-16 text-xs rounded px-2 py-1 text-white" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => saveSpeaker(editSpeaker)} className="btn-neon px-4 py-2 rounded text-xs">💾 Sauvegarder</button>
                <button onClick={async () => { if (confirm(`Supprimer ${editSpeaker.name} ?`)) { await fetch(`/api/admin/speakers/${editSpeaker.id}`, { method: "DELETE" }); setSpeakers(prev => prev.filter(s => s.id !== editSpeaker.id)); setEditSpeaker(null); } }} className="text-xs px-3 py-2 rounded" style={{ color: "#ff0066", border: "1px solid #ff006640" }}>Supprimer</button>
                <button onClick={() => setEditSpeaker(null)} className="text-xs text-gray-500 px-3 py-2">Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PROGRAMME ──────────────────────────────────────────── */}
      {view === "programme" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 shrink-0">Date de début :</label>
              <input
                type="date"
                value={planStartDate}
                onChange={e => savePlanStartDate(e.target.value)}
                className="cyber-input text-xs rounded px-3 py-1.5 text-white"
                style={{ colorScheme: "dark" }}
              />
            </div>
            {planStartDate && planDays.length === 7 && (
              <span className="text-xs text-gray-500">{fmtDate(planDays[0])} → {fmtDate(planDays[6])}</span>
            )}
            <button onClick={seedSessions} disabled={seeding} className="ml-auto text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-gray-200 disabled:opacity-50">
              {seeding ? "…" : "⚙ Seed sessions"}
            </button>
          </div>

          {/* Backlog */}
          <div className="cyber-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neon-green">Backlog</h3>
              <span className="text-gray-600 text-xs">— glissez vers une journée</span>
            </div>
            {cards.filter(c => c.pipelineStage === "confirmed").length === 0 && sessions.filter(s => !s.date).length === 0 ? (
              <p className="text-gray-600 text-xs py-2">Aucun speaker confirmé ni session non planifiée.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cards.filter(c => c.pipelineStage === "confirmed").map(card => (
                  <div
                    key={`cfp-${card.id}`}
                    draggable
                    onDragStart={() => setDragItem({ type: "cfp", id: card.id, title: card.talkTitle, name: card.name })}
                    onDragEnd={() => setDragItem(null)}
                    className="border border-neon-green/40 rounded-lg px-3 py-2 cursor-grab hover:border-neon-green/80 transition-all select-none"
                    style={{ background: "#00ff9d08", maxWidth: 200 }}
                  >
                    <p className="text-white font-bold text-xs truncate">{card.name}</p>
                    <p className="text-gray-500 text-xs truncate">{card.talkTitle}</p>
                    {card.format && <span className="text-neon-green/50 text-xs">{card.format}</span>}
                  </div>
                ))}
                {sessions.filter(s => !s.date).map(sess => (
                  <div
                    key={`sess-${sess.id}`}
                    draggable
                    onDragStart={() => setDragItem({ type: "session", id: sess.id, title: sess.title })}
                    onDragEnd={() => setDragItem(null)}
                    className="border border-gray-700 rounded-lg px-3 py-2 cursor-grab hover:border-gray-500 transition-all select-none"
                    style={{ maxWidth: 200 }}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-xs px-1 py-0.5 rounded uppercase" style={{ color: typeColor(sess.type), background: typeColor(sess.type) + "20", fontSize: "9px" }}>{sess.type}</span>
                      {!sess.isVisible && <span className="text-gray-600 text-xs">🙈</span>}
                    </div>
                    <p className="text-gray-200 font-bold text-xs truncate">{sess.title}</p>
                    {sess.speakerName && <p className="text-gray-500 text-xs truncate">{sess.speakerName}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7-day grid */}
          {!planStartDate ? (
            <p className="text-gray-600 text-xs text-center py-8 border border-dashed border-gray-800 rounded-xl">
              Choisissez une date de début pour afficher le planning.
            </p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3" style={{ minWidth: `${7 * 216}px` }}>
                {planDays.map((day, i) => {
                  const dated = sessions.filter(s => s.date === day);
                  const daySessions = dated;
                  const isDropZone = dropTarget === day;
                  return (
                    <div
                      key={day}
                      className={`shrink-0 rounded-xl border-2 transition-all ${isDropZone ? "border-neon-green/70 bg-neon-green/5" : "border-gray-800"}`}
                      style={{ width: 208 }}
                      onDragOver={e => { e.preventDefault(); setDropTarget(day); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                      onDrop={() => handleDrop(day)}
                    >
                      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white">J{i + 1}</span>
                          {i === 5 && <span className="ml-1 text-xs text-gray-600">(défaut seed)</span>}
                          <div className="text-gray-500 text-xs">{fmtDate(day)}</div>
                        </div>
                        <span className="text-gray-700 text-xs font-mono">{daySessions.length}</span>
                      </div>
                      <div className="p-2 space-y-1.5 min-h-[140px]">
                        {daySessions.sort((a, b) => a.time.localeCompare(b.time)).map(sess => (
                          <div key={sess.id} className="rounded-lg p-2 text-xs" style={{ background: typeColor(sess.type) + "12", border: `1px solid ${typeColor(sess.type)}30` }}>
                            <div className="flex items-start gap-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="font-mono text-xs shrink-0" style={{ color: typeColor(sess.type) }}>{sess.time}</span>
                                  <span className="uppercase shrink-0" style={{ color: typeColor(sess.type), fontSize: "9px" }}>{sess.type}</span>
                                </div>
                                <p className="text-white font-bold text-xs truncate">{sess.title}</p>
                                {sess.speakerName && <p className="text-gray-500 text-xs truncate">{sess.speakerName}</p>}
                              </div>
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button onClick={() => toggleSessionVisible(sess)} title={sess.isVisible ? "Masquer" : "Publier"} className="text-xs leading-none p-0.5 hover:bg-white/10 rounded">
                                  {sess.isVisible ? "👁" : "🙈"}
                                </button>
                                <button onClick={() => unscheduleSession(sess)} title="Retirer" className="text-xs leading-none p-0.5 hover:bg-red-900/30 rounded text-gray-600 hover:text-red-400">✕</button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {daySessions.length === 0 && (
                          <div className="h-16 flex items-center justify-center border border-dashed border-gray-800 rounded-lg">
                            <span className="text-gray-700 text-xs">{dragItem ? "↓ Déposer" : "vide"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drop time picker modal */}
          {pendingDrop && (
            <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
              <div className="cyber-card rounded-xl p-6 max-w-sm w-full border-neon-green/30">
                <h3 className="text-white font-bold mb-1 text-sm">Programmer la session</h3>
                <p className="text-gray-400 text-xs mb-4">
                  <span className="text-white">{pendingDrop.item.type === "cfp" ? (pendingDrop.item as { name: string }).name : pendingDrop.item.title}</span>
                  {" → "}J{planDays.indexOf(pendingDrop.date) + 1} ({fmtDate(pendingDrop.date)})
                </p>
                <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-1">Heure de début</label>
                  <input type="time" value={dropTime} onChange={e => setDropTime(e.target.value)} className="cyber-input w-full text-sm rounded px-3 py-2 text-white" />
                </div>
                <div className="flex gap-2">
                  <button onClick={confirmDrop} className="btn-neon px-4 py-2 rounded text-xs flex-1">✓ Confirmer</button>
                  <button onClick={() => { setPendingDrop(null); setDropTime("09:00"); }} className="text-gray-500 text-xs px-3 py-2 hover:text-gray-300">Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WORKSHOPS ──────────────────────────────────────────── */}
      {view === "workshops" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Les ateliers affichés ici sont publiés directement sur le site.</p>
            <button onClick={createWorkshop} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter atelier</button>
          </div>

          {workshops.map(ws => (
            <div key={ws.id} className={`cyber-card rounded-xl p-4 ${editWorkshop?.id === ws.id ? "border-neon-green/40" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: ws.level === "advanced" ? "#ff0066" : ws.level === "intermediate" ? "#ffaa00" : "#00ff9d", background: ws.level === "advanced" ? "#ff006615" : ws.level === "intermediate" ? "#ffaa0015" : "#00ff9d15" }}>{ws.level}</span>
                    <span className="text-white font-bold text-sm">{ws.title}</span>
                    {!ws.isVisible && <span className="text-gray-600 text-xs">(caché)</span>}
                  </div>
                  <p className="text-gray-500 text-xs">{ws.instructor && `Animé par ${ws.instructor} · `}{ws.duration}{ws.maxSeats ? ` · ${ws.maxSeats} places` : ""}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{ws.description}</p>
                </div>
                <button onClick={() => setEditWorkshop(editWorkshop?.id === ws.id ? null : ws)} className="text-xs px-3 py-1 rounded shrink-0" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>
                  {editWorkshop?.id === ws.id ? "Fermer" : "Éditer"}
                </button>
              </div>

              {editWorkshop?.id === ws.id && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: "title", label: "Titre" },
                      { key: "instructor", label: "Animateur" },
                      { key: "duration", label: "Durée (ex: 3h)" },
                    ] as { key: keyof WorkshopRecord; label: string }[]).map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                        <input type="text" value={(editWorkshop[f.key] as string) || ""} onChange={e => setEditWorkshop(prev => prev ? { ...prev, [f.key]: e.target.value } : prev)} className="cyber-input w-full text-xs rounded px-3 py-2 text-white" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Places max</label>
                      <input type="number" value={editWorkshop.maxSeats || ""} onChange={e => setEditWorkshop(prev => prev ? { ...prev, maxSeats: parseInt(e.target.value) || null } : prev)} className="cyber-input w-full text-xs rounded px-3 py-2 text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Niveau</label>
                    <select value={editWorkshop.level} onChange={e => setEditWorkshop(prev => prev ? { ...prev, level: e.target.value } : prev)} className="cyber-input text-xs rounded px-3 py-2 text-black">
                      <option value="beginner">Débutant</option>
                      <option value="intermediate">Intermédiaire</option>
                      <option value="advanced">Avancé</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Description</label>
                    <textarea value={editWorkshop.description} onChange={e => setEditWorkshop(prev => prev ? { ...prev, description: e.target.value } : prev)} className="cyber-input w-full text-xs rounded px-3 py-2 h-20 resize-none text-white" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editWorkshop.isVisible} onChange={e => setEditWorkshop(prev => prev ? { ...prev, isVisible: e.target.checked } : prev)} className="accent-neon-green" />
                      <span className="text-xs text-gray-400">Visible sur le site</span>
                    </label>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Ordre</label>
                      <input type="number" value={editWorkshop.sortOrder} onChange={e => setEditWorkshop(prev => prev ? { ...prev, sortOrder: parseInt(e.target.value) || 0 } : prev)} className="cyber-input w-16 text-xs rounded px-2 py-1 text-white" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveWorkshop(editWorkshop)} className="btn-neon px-4 py-2 rounded text-xs">💾 Sauvegarder</button>
                    <button onClick={() => { if (confirm("Supprimer cet atelier ?")) deleteWorkshop(editWorkshop.id); }} className="text-xs px-3 py-2 rounded" style={{ color: "#ff0066", border: "1px solid #ff006640" }}>Supprimer</button>
                    <button onClick={() => setEditWorkshop(null)} className="text-xs text-gray-500 px-3 py-2">Annuler</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
