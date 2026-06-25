"use client";
import { useState, useEffect, useCallback } from "react";

type VolStage = "submitted" | "reviewing" | "shortlisted" | "accepted" | "onboarding" | "confirmed" | "rejected";

const STAGES: { key: VolStage; label: string; color: string; desc: string }[] = [
  { key: "submitted",   label: "Candidatures",   color: "#888",    desc: "Reçues, non examinées" },
  { key: "reviewing",   label: "En révision",    color: "#0066ff", desc: "En cours d'examen" },
  { key: "shortlisted", label: "Présélectionnés", color: "#ffaa00", desc: "Email de confirmation envoyé" },
  { key: "accepted",    label: "Acceptés",        color: "#00ff9d", desc: "Rôle assigné, email envoyé" },
  { key: "onboarding",  label: "Onboarding",      color: "#cc00ff", desc: "Briefing envoyé" },
  { key: "confirmed",   label: "Confirmés",       color: "#00ccff", desc: "Présence confirmée" },
  { key: "rejected",    label: "Refusés",         color: "#ff3333", desc: "Email de refus envoyé" },
];

const ROLES = [
  "Accueil & Inscription",
  "Support Sessions",
  "Modérateur de session",
  "Support streaming",
  "Ambassadeur réseaux sociaux",
  "Support CTF",
  "Médias & Réseaux Sociaux",
  "Logistique",
];

interface VolCard {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  role?: string | null;
  assignedRole?: string | null;
  experience?: string | null;
  motivation?: string | null;
  status: string;
  volunteerStage: VolStage;
  langExpression?: string | null;
  linkedin?: string | null;
  whatsapp?: string | null;
  hoursPerWeek?: string | null;
  createdAt: string;
}

export default function VolunteerKanban() {
  const [cards, setCards] = useState<VolCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VolCard | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<VolStage | null>(null);
  const [assignRole, setAssignRole] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/volunteer-pipeline");
    if (res.ok) setCards(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveStage = async (id: number, stage: VolStage, role?: string) => {
    const res = await fetch("/api/admin/volunteer-pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage, assignedRole: role }),
    });
    if (res.ok) {
      const updated: VolCard = await res.json();
      setCards(prev => prev.map(c => c.id === id ? updated : c));
      setSelected(updated);
    }
  };

  const handleDrop = (stage: VolStage) => {
    if (dragId === null) return;
    const card = cards.find(c => c.id === dragId);
    if (!card || card.volunteerStage === stage) { setDragId(null); setDropTarget(null); return; }
    if ((stage === "accepted" || stage === "onboarding") && !card.assignedRole && !assignRole) {
      setSelected(card);
      setAssignRole(card.role || "");
      setDropTarget(null);
      setDragId(null);
      return;
    }
    moveStage(dragId, stage, assignRole || undefined);
    setDragId(null);
    setDropTarget(null);
    setAssignRole("");
  };

  const stageCount = (s: VolStage) => cards.filter(c => c.volunteerStage === s).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white font-mono">Bénévoles — Pipeline</h2>
          <p className="text-xs text-gray-500 font-mono">{cards.length} candidatures · notifications automatiques à chaque étape</p>
        </div>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white font-mono">{loading ? "…" : "↻ Actualiser"}</button>
      </div>

      {/* Kanban columns */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 200}px` }}>
          {STAGES.map(stage => (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-48 rounded-lg border transition-colors ${dropTarget === stage.key ? "border-opacity-100" : "border-opacity-30"}`}
              style={{ borderColor: stage.color, backgroundColor: dropTarget === stage.key ? `${stage.color}10` : "transparent" }}
              onDragOver={e => { e.preventDefault(); setDropTarget(stage.key); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className="p-2 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono" style={{ color: stage.color }}>{stage.label}</span>
                  <span className="text-xs text-gray-600 font-mono bg-gray-800 rounded-full px-1.5">{stageCount(stage.key)}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 leading-tight">{stage.desc}</p>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {cards.filter(c => c.volunteerStage === stage.key).map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDragId(card.id)}
                    onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                    onClick={() => { setSelected(card); setAssignRole(card.assignedRole || card.role || ""); }}
                    className={`rounded p-2 cursor-pointer border transition-all hover:border-opacity-60 ${dragId === card.id ? "opacity-40" : ""}`}
                    style={{ borderColor: `${stage.color}40`, backgroundColor: "#0d0d0d" }}
                  >
                    <p className="text-xs font-bold text-white font-mono truncate">{card.name}</p>
                    <p className="text-xs text-gray-500 truncate">{card.role || "—"}</p>
                    {card.assignedRole && card.assignedRole !== card.role && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: stage.color }}>→ {card.assignedRole}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-gray-600 font-mono">{card.langExpression === "en" ? "🇬🇧" : "🇫🇷"}</span>
                      {card.hoursPerWeek && <span className="text-xs text-gray-600 font-mono">{card.hoursPerWeek}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail / action panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md h-full bg-[#0a0a0a] border-l border-gray-800 overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-white font-mono">{selected.name}</h3>
                <p className="text-xs text-gray-500">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white text-lg">✕</button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                ["Ville", selected.city],
                ["Téléphone", selected.phone],
                ["Rôle souhaité", selected.role],
                ["Rôle assigné", selected.assignedRole],
                ["Heures/sem.", selected.hoursPerWeek],
                ["Langue", selected.langExpression === "en" ? "English" : "Français"],
                ["LinkedIn", selected.linkedin],
                ["WhatsApp", selected.whatsapp],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-gray-600">{k}</p>
                  <p className="text-white">{v}</p>
                </div>
              ))}
            </div>

            {selected.experience && (
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">Expérience</p>
                <p className="text-xs text-gray-300 leading-relaxed bg-gray-900 rounded p-2">{selected.experience}</p>
              </div>
            )}
            {selected.motivation && (
              <div>
                <p className="text-xs text-gray-500 font-mono mb-1">Motivation</p>
                <p className="text-xs text-gray-300 leading-relaxed bg-gray-900 rounded p-2">{selected.motivation}</p>
              </div>
            )}

            {/* Role assignment */}
            <div>
              <label className="text-xs text-gray-500 font-mono block mb-1">Rôle à assigner</label>
              <select
                value={assignRole}
                onChange={e => setAssignRole(e.target.value)}
                className="cyber-input w-full text-xs rounded px-3 py-2 text-white bg-transparent"
              >
                <option value="" className="bg-dark-800">— Choisir —</option>
                {ROLES.map(r => <option key={r} value={r} className="bg-dark-800">{r}</option>)}
              </select>
            </div>

            {/* Stage actions */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-mono">Actions — étape actuelle : <span className="text-white">{STAGES.find(s => s.key === selected.volunteerStage)?.label}</span></p>
              <div className="grid grid-cols-2 gap-2">
                {STAGES.filter(s => s.key !== selected.volunteerStage && s.key !== "submitted").map(s => (
                  <button
                    key={s.key}
                    onClick={() => moveStage(selected.id, s.key, assignRole || undefined)}
                    className="text-xs px-2 py-1.5 rounded border font-mono transition-colors hover:opacity-80"
                    style={{ borderColor: `${s.color}60`, color: s.color, backgroundColor: `${s.color}10` }}
                  >
                    → {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
