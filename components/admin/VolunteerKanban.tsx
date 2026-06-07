"use client";
import { useState, useEffect, useCallback } from "react";

type VolunteerStage = "submitted" | "reviewing" | "shortlisted" | "accepted" | "onboarding" | "confirmed" | "rejected";

const STAGES: { key: VolunteerStage; label: string; color: string; desc: string }[] = [
  { key: "submitted",   label: "Soumissions",  color: "#888",    desc: "Candidatures reçues" },
  { key: "reviewing",   label: "En révision",  color: "#0066ff", desc: "Examen en cours" },
  { key: "shortlisted", label: "Présélectionnés", color: "#cc00ff", desc: "Candidats retenus" },
  { key: "accepted",    label: "Acceptés",     color: "#ffaa00", desc: "Email envoyé, en attente de confirmation" },
  { key: "onboarding",  label: "Onboarding",   color: "#00ccff", desc: "Briefing / formation en cours" },
  { key: "confirmed",   label: "Confirmés",    color: "#00ff9d", desc: "Rôle confirmé" },
  { key: "rejected",    label: "Refusés",      color: "#ff0066", desc: "Non retenus" },
];

const ROLES = [
  "Accueil & Inscription",
  "Support Sessions",
  "Support CTF",
  "Médias & Réseaux Sociaux",
  "Logistique",
];

interface Volunteer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  role?: string | null;
  experience?: string | null;
  motivation: string;
  langExpression?: string | null;
  status: string;
  volunteerStage: VolunteerStage;
  assignedRole?: string | null;
  createdAt: string;
}

export default function VolunteerKanban() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<VolunteerStage | null>(null);
  const [savingRole, setSavingRole] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/volunteer-pipeline");
    if (res.ok) setVolunteers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveStage = async (id: number, stage: VolunteerStage, assignedRole?: string) => {
    const body: Record<string, unknown> = { id, volunteerStage: stage };
    if (assignedRole !== undefined) body.assignedRole = assignedRole;
    const res = await fetch("/api/admin/volunteer-pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated: Volunteer = await res.json();
      setVolunteers(prev => prev.map(v => v.id === id ? updated : v));
      setSelected(prev => prev?.id === id ? updated : prev);
    }
  };

  const handleDrop = async (stage: VolunteerStage) => {
    if (dragging === null) return;
    await moveStage(dragging, stage);
    setDragging(null);
    setDropTarget(null);
  };

  const saveAssignedRole = async () => {
    if (!selected) return;
    setSavingRole(true);
    await moveStage(selected.id, selected.volunteerStage, selected.assignedRole || "");
    setSavingRole(false);
  };

  const filtered = search
    ? volunteers.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.email.toLowerCase().includes(search.toLowerCase()) ||
        (v.role || "").toLowerCase().includes(search.toLowerCase())
      )
    : volunteers;

  if (loading) return <div className="text-gray-500 text-sm p-4">Chargement…</div>;

  return (
    <div className="flex gap-4 h-full">
      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="mb-3">
          <input
            type="text"
            placeholder="Rechercher un bénévole…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cyber-input text-xs rounded px-3 py-1.5 text-white w-64"
          />
        </div>
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 200}px` }}>
          {STAGES.map(stage => {
            const cards = filtered.filter(v => v.volunteerStage === stage.key);
            const isTarget = dropTarget === stage.key;
            return (
              <div
                key={stage.key}
                className={`shrink-0 rounded-xl border-2 transition-all ${isTarget ? "border-neon-green/70 bg-neon-green/5" : "border-gray-800"}`}
                style={{ width: 192 }}
                onDragOver={e => { e.preventDefault(); setDropTarget(stage.key); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null); }}
                onDrop={() => handleDrop(stage.key)}
              >
                <div className="px-3 py-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                    <span className="text-xs font-bold text-white truncate">{stage.label}</span>
                    <span className="ml-auto text-xs text-gray-500">{cards.length}</span>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[120px]">
                  {cards.map(v => (
                    <div
                      key={v.id}
                      draggable
                      onDragStart={() => setDragging(v.id)}
                      onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                      onClick={() => setSelected(v)}
                      className={`rounded-lg border p-2 cursor-pointer transition-all ${
                        selected?.id === v.id ? "border-neon-green/60 bg-neon-green/5" : "border-gray-700 bg-gray-900 hover:border-gray-500"
                      } ${dragging === v.id ? "opacity-50" : ""}`}
                    >
                      <div className="text-xs font-semibold text-white truncate">{v.name}</div>
                      <div className="text-xs text-gray-500 truncate">{v.role || "—"}</div>
                      {v.assignedRole && (
                        <div className="text-xs mt-1 px-1.5 py-0.5 rounded" style={{ background: "#00ff9d20", color: "#00ff9d", fontSize: 10 }}>
                          {v.assignedRole}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 shrink-0 rounded-xl border border-gray-700 bg-gray-900 p-4 overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-bold text-white">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
          </div>

          <div className="space-y-2 text-xs">
            <div><span className="text-gray-500">Email :</span> <span className="text-white">{selected.email}</span></div>
            {selected.phone && <div><span className="text-gray-500">Tél :</span> <span className="text-white">{selected.phone}</span></div>}
            {selected.city && <div><span className="text-gray-500">Ville :</span> <span className="text-white">{selected.city}</span></div>}
            <div><span className="text-gray-500">Rôle souhaité :</span> <span className="text-white">{selected.role || "—"}</span></div>
            <div><span className="text-gray-500">Langue :</span> <span className="text-white">{selected.langExpression || "fr"}</span></div>
            <div>
              <span className="text-gray-500 block mb-1">Motivation :</span>
              <p className="text-gray-300 leading-relaxed">{selected.motivation}</p>
            </div>
            {selected.experience && (
              <div>
                <span className="text-gray-500 block mb-1">Expérience :</span>
                <p className="text-gray-300 leading-relaxed">{selected.experience}</p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-gray-700 pt-4 space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Étape</label>
              <select
                value={selected.volunteerStage}
                onChange={e => moveStage(selected.id, e.target.value as VolunteerStage)}
                className="cyber-input w-full text-xs rounded px-3 py-2 text-white bg-transparent"
              >
                {STAGES.map(s => (
                  <option key={s.key} value={s.key} className="bg-gray-900">{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Rôle assigné</label>
              <select
                value={selected.assignedRole || ""}
                onChange={e => setSelected(prev => prev ? { ...prev, assignedRole: e.target.value } : prev)}
                className="cyber-input w-full text-xs rounded px-3 py-2 text-white bg-transparent"
              >
                <option value="" className="bg-gray-900">— Aucun —</option>
                {ROLES.map(r => (
                  <option key={r} value={r} className="bg-gray-900">{r}</option>
                ))}
              </select>
              <button
                onClick={saveAssignedRole}
                disabled={savingRole}
                className="mt-1.5 text-xs btn-neon px-3 py-1.5 rounded w-full disabled:opacity-50"
              >
                {savingRole ? "…" : "💾 Sauvegarder le rôle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
