"use client";
import { useState, useEffect, useCallback, useRef } from "react";

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

              {/* Photo upload */}
              <div className="flex items-center gap-4 mb-4">
                {editSpeaker.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={editSpeaker.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-neon-green/30" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600">👤</div>
                )}
                <label className="cursor-pointer border border-dashed border-gray-700 rounded-lg px-4 py-2 hover:border-gray-500 transition-colors">
                  <span className="text-gray-500 text-xs">{uploadingPhoto ? "Upload..." : "📷 Changer la photo (JPG/PNG/WEBP)"}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" ref={fileRef} onChange={e => { const f = e.target.files?.[0]; if (f) uploadSpeakerPhoto(editSpeaker.id, f).then(() => setEditSpeaker(prev => prev ? { ...prev, photoUrl: speakers.find(s => s.id === editSpeaker.id)?.photoUrl || prev.photoUrl } : null)); e.target.value = ""; }} disabled={uploadingPhoto} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "name", label: "Nom complet", type: "text" },
                  { key: "title", label: "Titre / Poste", type: "text" },
                  { key: "company", label: "Organisation", type: "text" },
                  { key: "country", label: "Pays", type: "text" },
                  { key: "linkedin", label: "LinkedIn URL", type: "text" },
                  { key: "twitter", label: "X/Twitter URL", type: "text" },
                  { key: "talkTitle", label: "Titre du talk", type: "text" },
                  { key: "talkFormat", label: "Format (talk/keynote/panel)", type: "text" },
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">Le programme affiché ici est exactement celui publié sur le site. Toute modification est immédiate.</p>
            <button onClick={createSession} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter session</button>
          </div>

          {/* Group by date */}
          {(() => {
            const groups: Record<string, SessionRecord[]> = {};
            sessions.forEach(s => { const k = s.date || "Sans date"; if (!groups[k]) groups[k] = []; groups[k].push(s); });
            const keys = Object.keys(groups).sort((a, b) => a === "Sans date" ? 1 : b === "Sans date" ? -1 : a.localeCompare(b));
            return keys.map(date => (
              <div key={date}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 mt-4">{date}</h3>
                <div className="space-y-2">
                  {groups[date].sort((a, b) => a.sortOrder - b.sortOrder || a.time.localeCompare(b.time)).map(sess => (
                    <div key={sess.id} className={`cyber-card rounded-xl p-3 flex items-center gap-4 ${editSession?.id === sess.id ? "border-neon-green/40" : ""}`}>
                      <span className="font-mono text-xs text-gray-400 w-14 shrink-0">{sess.time}{sess.endTime ? `–${sess.endTime}` : ""}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded uppercase tracking-wider`} style={{ color: sess.type === "keynote" ? "#ffaa00" : sess.type === "break" ? "#888" : "#0066ff", background: sess.type === "keynote" ? "#ffaa0015" : sess.type === "break" ? "#88888815" : "#0066ff15" }}>{sess.type}</span>
                          <span className="text-white text-sm font-bold line-clamp-1">{sess.title}</span>
                          {!sess.isVisible && <span className="text-gray-600 text-xs">(caché)</span>}
                        </div>
                        {sess.speakerName && <p className="text-gray-500 text-xs mt-0.5">{sess.speakerName}{sess.room ? ` · ${sess.room}` : ""}</p>}
                      </div>
                      <button onClick={() => setEditSession(editSession?.id === sess.id ? null : sess)} className="text-xs px-3 py-1 rounded shrink-0" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>
                        {editSession?.id === sess.id ? "Fermer" : "Éditer"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}

          {/* Session edit form */}
          {editSession && (
            <div className="cyber-card rounded-xl p-5 border-neon-green/30">
              <h3 className="text-white font-bold mb-4 text-sm">Édition session — {editSession.title}</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {([
                  { key: "title", label: "Titre", col: 3 },
                  { key: "speakerName", label: "Nom du speaker", col: 1 },
                  { key: "date", label: "Date (YYYY-MM-DD)", col: 1 },
                  { key: "time", label: "Début (HH:MM)", col: 1 },
                  { key: "endTime", label: "Fin (HH:MM)", col: 1 },
                  { key: "room", label: "Salle", col: 1 },
                ] as { key: keyof SessionRecord; label: string; col: number }[]).map(f => (
                  <div key={f.key} className={`col-span-${f.col}`}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={(editSession[f.key] as string) || ""}
                      onChange={e => setEditSession(prev => prev ? { ...prev, [f.key]: e.target.value || null } : prev)}
                      className="cyber-input w-full text-xs rounded px-3 py-2 text-white"
                    />
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1">Type</label>
                <select value={editSession.type} onChange={e => setEditSession(prev => prev ? { ...prev, type: e.target.value } : prev)} className="cyber-input text-xs rounded px-3 py-2 text-black">
                  {["keynote", "talk", "panel", "workshop", "break", "logistics"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1">Speaker</label>
                <select
                  value={editSession.speakerId || ""}
                  onChange={e => {
                    const id = parseInt(e.target.value) || null;
                    const sp = speakers.find(s => s.id === id);
                    setEditSession(prev => prev ? { ...prev, speakerId: id, speakerName: sp?.name || prev.speakerName } : prev);
                  }}
                  className="cyber-input text-xs rounded px-3 py-2 text-black w-full"
                >
                  <option value="">— Speaker manuel —</option>
                  {speakers.map(sp => <option key={sp.id} value={sp.id}>{sp.name}{sp.talkTitle ? ` — ${sp.talkTitle}` : ""}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1">Description</label>
                <textarea value={editSession.description || ""} onChange={e => setEditSession(prev => prev ? { ...prev, description: e.target.value } : prev)} className="cyber-input w-full text-xs rounded px-3 py-2 h-16 resize-none text-white" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editSession.isVisible} onChange={e => setEditSession(prev => prev ? { ...prev, isVisible: e.target.checked } : prev)} className="accent-neon-green" />
                  <span className="text-xs text-gray-400">Visible sur le site</span>
                </label>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ordre</label>
                  <input type="number" value={editSession.sortOrder} onChange={e => setEditSession(prev => prev ? { ...prev, sortOrder: parseInt(e.target.value) || 0 } : prev)} className="cyber-input w-16 text-xs rounded px-2 py-1 text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveSession(editSession)} className="btn-neon px-4 py-2 rounded text-xs">💾 Sauvegarder</button>
                <button onClick={() => { if (confirm("Supprimer cette session ?")) deleteSession(editSession.id); }} className="text-xs px-3 py-2 rounded" style={{ color: "#ff0066", border: "1px solid #ff006640" }}>Supprimer</button>
                <button onClick={() => setEditSession(null)} className="text-xs text-gray-500 px-3 py-2">Annuler</button>
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
