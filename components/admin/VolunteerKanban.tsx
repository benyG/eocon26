"use client";
import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/lib/adminLangContext";

type VolStage = "submitted" | "reviewing" | "shortlisted" | "accepted" | "onboarding" | "confirmed" | "rejected";

const STAGES: { key: VolStage; label: { fr: string; en: string }; color: string; desc: { fr: string; en: string } }[] = [
  { key: "submitted",   label: { fr: "Candidatures",    en: "Applications" },   color: "#888",    desc: { fr: "Reçues, non examinées",           en: "Received, not reviewed" } },
  { key: "reviewing",   label: { fr: "En révision",     en: "Reviewing" },       color: "#0066ff", desc: { fr: "En cours d'examen",               en: "Under review" } },
  { key: "shortlisted", label: { fr: "Présélectionnés", en: "Shortlisted" },     color: "#ffaa00", desc: { fr: "Email de confirmation envoyé",    en: "Confirmation email sent" } },
  { key: "accepted",    label: { fr: "Acceptés",        en: "Accepted" },        color: "#00ff9d", desc: { fr: "Rôle assigné, email envoyé",       en: "Role assigned, email sent" } },
  { key: "onboarding",  label: { fr: "Onboarding",      en: "Onboarding" },      color: "#cc00ff", desc: { fr: "Briefing envoyé",                 en: "Briefing sent" } },
  { key: "confirmed",   label: { fr: "Confirmés",       en: "Confirmed" },       color: "#00ccff", desc: { fr: "Présence confirmée",              en: "Attendance confirmed" } },
  { key: "rejected",    label: { fr: "Refusés",         en: "Rejected" },        color: "#ff3333", desc: { fr: "Email de refus envoyé",           en: "Rejection email sent" } },
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

export default function VolunteerKanban({ canWrite = true }: { canWrite?: boolean } = {}) {
  const __ = useLang();
  const [cards, setCards] = useState<VolCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VolCard | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<VolStage | null>(null);
  const [assignRole, setAssignRole] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<VolCard>>({});
  const [saving, setSaving] = useState(false);

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

  const startEdit = () => {
    if (!selected) return;
    setEditForm({
      name: selected.name, email: selected.email, phone: selected.phone,
      city: selected.city, role: selected.role, experience: selected.experience,
      motivation: selected.motivation, linkedin: selected.linkedin, whatsapp: selected.whatsapp,
      hoursPerWeek: selected.hoursPerWeek, langExpression: selected.langExpression,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/admin/volunteer-pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, ...editForm }),
    });
    if (res.ok) {
      const updated: VolCard = await res.json();
      setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelected(updated);
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white font-mono">{__("Bénévoles — Pipeline", "Volunteers — Pipeline")}</h2>
          <p className="text-xs text-gray-500 font-mono">{cards.length} {__("candidatures · notifications automatiques à chaque étape", "applications · automatic notifications at each stage")}</p>
        </div>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white font-mono">{loading ? "…" : __("↻ Actualiser", "↻ Refresh")}</button>
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
                  <span className="text-xs font-bold font-mono" style={{ color: stage.color }}>{__(stage.label.fr, stage.label.en)}</span>
                  <span className="text-xs text-gray-600 font-mono bg-gray-800 rounded-full px-1.5">{stageCount(stage.key)}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 leading-tight">{__(stage.desc.fr, stage.desc.en)}</p>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {cards.filter(c => c.volunteerStage === stage.key).map(card => (
                  <div
                    key={card.id}
                    draggable={canWrite}
                    onDragStart={() => canWrite && setDragId(card.id)}
                    onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                    onClick={() => { setSelected(card); setAssignRole(card.assignedRole || card.role || ""); setEditing(false); }}
                    className={`rounded p-2 cursor-pointer border transition-all hover:border-opacity-60 ${dragId === card.id ? "opacity-40" : ""}`}
                    style={{ borderColor: `${stage.color}40`, backgroundColor: "var(--card)" }}
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
          <div
            className="w-full max-w-md h-full overflow-y-auto p-6 space-y-4 border-l"
            style={{ background: "var(--panel)", borderColor: "var(--bdr)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              {editing ? (
                <div className="flex-1 space-y-1.5">
                  <input
                    value={editForm.name || ""}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="cyber-input w-full text-sm font-black rounded px-2 py-1"
                    style={{ color: "var(--txt)" }}
                    placeholder={__("Nom", "Name")}
                  />
                  <input
                    value={editForm.email || ""}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="cyber-input w-full text-xs rounded px-2 py-1"
                    placeholder="Email"
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-black font-mono" style={{ color: "var(--txt)" }}>{selected.name}</h3>
                  <p className="text-xs" style={{ color: "var(--txt-dim)" }}>{selected.email}</p>
                </div>
              )}
              <div className="flex items-center gap-2 shrink-0">
                {canWrite && !editing && (
                  <button onClick={startEdit} className="text-xs px-2 py-1 rounded border font-mono" style={{ borderColor: "var(--bdr-2)", color: "var(--txt-dim)" }}>
                    ✏️ {__("Éditer", "Edit")}
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-lg leading-none" style={{ color: "var(--txt-mute)" }}>✕</button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["phone", __("Téléphone", "Phone")],
                    ["city", __("Ville", "City")],
                    ["role", __("Rôle souhaité", "Desired role")],
                    ["hoursPerWeek", __("Heures/sem.", "Hours/week")],
                    ["linkedin", "LinkedIn"],
                    ["whatsapp", "WhatsApp"],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs font-mono block mb-1" style={{ color: "var(--txt-dim)" }}>{label}</label>
                      <input
                        value={(editForm[key] as string) || ""}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        className="cyber-input w-full text-xs rounded px-2 py-1.5"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-mono block mb-1" style={{ color: "var(--txt-dim)" }}>{__("Langue", "Language")}</label>
                    <select
                      value={editForm.langExpression || "fr"}
                      onChange={e => setEditForm(f => ({ ...f, langExpression: e.target.value }))}
                      className="cyber-input w-full text-xs rounded px-2 py-1.5"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-mono block mb-1" style={{ color: "var(--txt-dim)" }}>{__("Expérience", "Experience")}</label>
                  <textarea
                    value={editForm.experience || ""}
                    onChange={e => setEditForm(f => ({ ...f, experience: e.target.value }))}
                    rows={3}
                    className="cyber-input w-full text-xs rounded px-2 py-1.5 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono block mb-1" style={{ color: "var(--txt-dim)" }}>{__("Motivation", "Motivation")}</label>
                  <textarea
                    value={editForm.motivation || ""}
                    onChange={e => setEditForm(f => ({ ...f, motivation: e.target.value }))}
                    rows={3}
                    className="cyber-input w-full text-xs rounded px-2 py-1.5 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex-1 text-xs py-2 rounded font-bold font-mono disabled:opacity-50"
                    style={{ background: "var(--ac-bg)", color: "var(--ac)", border: "1px solid var(--ac-bdr)" }}
                  >
                    {saving ? "…" : __("Enregistrer", "Save")}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 text-xs py-2 rounded font-mono"
                    style={{ border: "1px solid var(--bdr-2)", color: "var(--txt-dim)" }}
                  >
                    {__("Annuler", "Cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    [__("Ville", "City"), selected.city],
                    [__("Téléphone", "Phone"), selected.phone],
                    [__("Rôle souhaité", "Desired role"), selected.role],
                    [__("Rôle assigné", "Assigned role"), selected.assignedRole],
                    [__("Heures/sem.", "Hours/week"), selected.hoursPerWeek],
                    [__("Langue", "Language"), selected.langExpression === "en" ? "English" : "Français"],
                    ["LinkedIn", selected.linkedin],
                    ["WhatsApp", selected.whatsapp],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string}>
                      <p style={{ color: "var(--txt-mute)" }}>{k}</p>
                      <p style={{ color: "var(--txt)" }}>{v}</p>
                    </div>
                  ))}
                </div>

                {selected.experience && (
                  <div>
                    <p className="text-xs font-mono mb-1" style={{ color: "var(--txt-dim)" }}>{__("Expérience", "Experience")}</p>
                    <p className="text-xs leading-relaxed rounded p-2" style={{ color: "var(--txt-2)", background: "var(--card)" }}>{selected.experience}</p>
                  </div>
                )}
                {selected.motivation && (
                  <div>
                    <p className="text-xs font-mono mb-1" style={{ color: "var(--txt-dim)" }}>{__("Motivation", "Motivation")}</p>
                    <p className="text-xs leading-relaxed rounded p-2" style={{ color: "var(--txt-2)", background: "var(--card)" }}>{selected.motivation}</p>
                  </div>
                )}
              </>
            )}

            {/* Role assignment */}
            {canWrite && !editing && (
              <div>
                <label className="text-xs font-mono block mb-1" style={{ color: "var(--txt-dim)" }}>{__("Rôle à assigner", "Role to assign")}</label>
                <select
                  value={assignRole}
                  onChange={e => setAssignRole(e.target.value)}
                  className="cyber-input w-full text-xs rounded px-3 py-2"
                  style={{ color: "var(--txt)", background: "transparent" }}
                >
                  <option value="">{__("— Choisir —", "— Choose —")}</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* Stage actions */}
            {!editing &&
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-mono">{__("Actions — étape actuelle :", "Actions — current stage:")} <span className="text-white">{(() => { const s = STAGES.find(s => s.key === selected.volunteerStage); return s ? __(s.label.fr, s.label.en) : ""; })()}</span></p>
              {canWrite && (
                <div className="grid grid-cols-2 gap-2">
                  {STAGES.filter(s => s.key !== selected.volunteerStage && s.key !== "submitted").map(s => (
                    <button
                      key={s.key}
                      onClick={() => moveStage(selected.id, s.key, assignRole || undefined)}
                      className="text-xs px-2 py-1.5 rounded border font-mono transition-colors hover:opacity-80"
                      style={{ borderColor: `${s.color}60`, color: s.color, backgroundColor: `${s.color}10` }}
                    >
                      → {__(s.label.fr, s.label.en)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
