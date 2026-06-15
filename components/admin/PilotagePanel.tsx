"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

type Status = "backlog" | "todo" | "in_progress" | "blocked" | "review" | "done";

const STATUSES: { key: Status; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "#888" },
  { key: "todo", label: "À faire", color: "#0066ff" },
  { key: "in_progress", label: "En cours", color: "#ffaa00" },
  { key: "blocked", label: "Bloqué", color: "#ff3333" },
  { key: "review", label: "Revue", color: "#cc00ff" },
  { key: "done", label: "Fait", color: "#00ff9d" },
];

const PHASES: { n: number; label: string; color: string }[] = [
  { n: 1, label: "🔵 Fondations", color: "#3b82f6" },
  { n: 2, label: "🟡 Construction", color: "#eab308" },
  { n: 3, label: "🟠 Finalisation", color: "#f97316" },
  { n: 4, label: "🔴 Semaine Online", color: "#ef4444" },
  { n: 5, label: "⚫ Jour J", color: "#9ca3af" },
  { n: 6, label: "🟢 Post-événement", color: "#22c55e" },
];
const phaseColor = (n: number) => PHASES.find((p) => p.n === n)?.color || "#888";

const SUBTEAMS = ["Contenu", "Sponsors", "Tech", "Logistique", "Volontaires", "Général"];
const PRIORITIES = ["low", "medium", "high", "critical"];

const POLES = [
  "Coordo Global", "Resp. Partenaire/Sponsor", "Resp. Programme & Speaker",
  "Resp. Communication & Marketing", "Resp. Plateforme Cloud (CTF)", "Resp. Site Web",
  "Resp. Budget", "R Réseaux des Volontaires", "R Infographie", "Resp. Prog AV Live Streaming",
  "Coordonnateur Local", "Resp. Logistique", "Resp. Technique/AV Salle", "Resp. Protocole & Accueil",
  "Resp. Prise Vidéo Caméra", "Resp. Partenaires Locaux", "Resp. Animation/Présentation",
  "Référent Sécurité & Incidents",
];

interface Task {
  id: number;
  title: string;
  description?: string | null;
  phase: number;
  pole: string;
  subTeam?: string | null;
  status: Status;
  priority: string;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  dueDate?: string | null;
  isMilestone: boolean;
  notes?: string | null;
}

interface Meeting {
  id: number;
  title: string;
  type: string;
  subTeam?: string | null;
  scheduledAt: string;
  location?: string | null;
  agenda?: string | null;
  attendees?: string | null;
}

interface Member { id: number; name: string; role: string; email?: string | null; }

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function isOverdue(t: Task) {
  return !!t.dueDate && t.status !== "done" && new Date(t.dueDate).getTime() < Date.now();
}
function daysUntil(d?: string | null) {
  if (!d) return Infinity;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function PilotagePanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [view, setView] = useState<"kanban" | "meetings">("kanban");

  // filters
  const [fPhase, setFPhase] = useState("");
  const [fPole, setFPole] = useState("");
  const [fSubTeam, setFSubTeam] = useState("");
  const [fAssignee, setFAssignee] = useState("");
  const [fLate, setFLate] = useState(false);
  const [fSoon, setFSoon] = useState(false);

  // drag + detail
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [edit, setEdit] = useState<Partial<Task>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, mRes, memRes] = await Promise.all([
        fetch("/api/admin/pilotage/tasks"),
        fetch("/api/admin/pilotage/meetings"),
        fetch("/api/admin/team"),
      ]);
      if (tRes.ok) setTasks(await tRes.json());
      if (mRes.ok) setMeetings(await mRes.json());
      if (memRes.ok) setMembers(await memRes.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => tasks.filter((t) => {
    if (fPhase && t.phase !== Number(fPhase)) return false;
    if (fPole && t.pole !== fPole) return false;
    if (fSubTeam && t.subTeam !== fSubTeam) return false;
    if (fAssignee && t.assigneeEmail !== fAssignee) return false;
    if (fLate && !isOverdue(t)) return false;
    if (fSoon && !(daysUntil(t.dueDate) <= 30 && t.status !== "done")) return false;
    return true;
  }), [tasks, fPhase, fPole, fSubTeam, fAssignee, fLate, fSoon]);

  const kpi = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const milestonesAtRisk = tasks.filter((t) => t.isMilestone && t.status !== "done" && (isOverdue(t) || daysUntil(t.dueDate) <= 7)).length;
    const nextMeeting = meetings
      .filter((m) => new Date(m.scheduledAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
    return { total, done, pct, milestonesAtRisk, nextMeeting };
  }, [tasks, meetings]);

  const patchTask = async (id: number, data: Partial<Task>) => {
    const res = await fetch(`/api/admin/pilotage/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated: Task = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (selected?.id === id) setSelected(updated);
      return updated;
    }
    return null;
  };

  const handleDrop = (status: Status) => {
    if (dragId !== null) {
      const card = tasks.find((t) => t.id === dragId);
      if (card && card.status !== status) patchTask(dragId, { status });
    }
    setDragId(null);
    setDropTarget(null);
  };

  const openDetail = (t: Task) => { setSelected(t); setEdit({ ...t, dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "" }); };

  const saveDetail = async () => {
    if (!selected) return;
    await patchTask(selected.id, {
      title: edit.title, description: edit.description, phase: edit.phase, pole: edit.pole,
      subTeam: edit.subTeam, priority: edit.priority, status: edit.status, notes: edit.notes,
      isMilestone: edit.isMilestone, assigneeName: edit.assigneeName, assigneeEmail: edit.assigneeEmail,
      dueDate: edit.dueDate || null,
    });
    setSelected(null);
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    const res = await fetch(`/api/admin/pilotage/tasks/${id}`, { method: "DELETE" });
    if (res.ok) { setTasks((prev) => prev.filter((t) => t.id !== id)); setSelected(null); }
  };

  const createTask = async () => {
    const res = await fetch("/api/admin/pilotage/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nouvelle tâche", pole: POLES[0], phase: 1, status: "todo" }),
    });
    if (res.ok) { const t = await res.json(); setTasks((prev) => [...prev, t]); openDetail(t); }
  };

  const seed = async (force = false) => {
    if (force && !confirm("Réinitialiser : toutes les tâches/réunions seront remplacées par la feuille de route. Continuer ?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/pilotage/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.status === 409) {
        if (confirm("Des tâches existent déjà. Réinitialiser à partir de la feuille de route ?")) { await seed(true); }
      } else if (res.ok) {
        const r = await res.json();
        alert(`Importé : ${r.tasks} tâches, ${r.meetings} réunions.`);
        await load();
      } else {
        alert("Échec de l'import.");
      }
    } finally {
      setSeeding(false);
    }
  };

  const assigneeOptions = members.filter((m) => m.email);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black text-white">🎯 Pilotage global</h1>
          <p className="text-xs text-gray-500 font-mono">{tasks.length} tâches · {meetings.length} réunions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setView(view === "kanban" ? "meetings" : "kanban")} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:text-white font-mono">
            {view === "kanban" ? "📅 Réunions" : "📋 Kanban"}
          </button>
          <button onClick={createTask} className="text-xs px-3 py-1.5 rounded border border-neon-green/50 text-neon-green font-mono">+ Tâche</button>
          <button onClick={() => seed(false)} disabled={seeding} className="text-xs px-3 py-1.5 rounded bg-neon-green text-black font-bold font-mono">
            {seeding ? "…" : "↻ Feuille de route"}
          </button>
          <button onClick={load} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white font-mono">{loading ? "…" : "↻"}</button>
        </div>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono">Avancement</p>
          <p className="text-2xl font-black text-neon-green">{kpi.pct}%</p>
          <p className="text-xs text-gray-600">{kpi.done}/{kpi.total} faites</p>
        </div>
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono">Jalons à risque</p>
          <p className="text-2xl font-black" style={{ color: kpi.milestonesAtRisk ? "#ff3333" : "#00ff9d" }}>{kpi.milestonesAtRisk}</p>
          <p className="text-xs text-gray-600">en retard ou &lt; 7 j</p>
        </div>
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono">Prochaine réunion</p>
          <p className="text-sm font-bold text-white truncate">{kpi.nextMeeting?.title || "—"}</p>
          <p className="text-xs text-gray-600">{kpi.nextMeeting ? fmtDate(kpi.nextMeeting.scheduledAt) : ""}</p>
        </div>
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono mb-1">Par phase</p>
          <div className="flex gap-1 flex-wrap">
            {PHASES.map((p) => (
              <span key={p.n} className="text-xs font-mono px-1.5 rounded" style={{ background: `${p.color}22`, color: p.color }}>
                P{p.n}:{tasks.filter((t) => t.phase === p.n).length}
              </span>
            ))}
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <select value={fPhase} onChange={(e) => setFPhase(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white">
              <option value="" className="bg-dark-800">Toutes phases</option>
              {PHASES.map((p) => <option key={p.n} value={p.n} className="bg-dark-800">{p.label}</option>)}
            </select>
            <select value={fPole} onChange={(e) => setFPole(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white max-w-[180px]">
              <option value="" className="bg-dark-800">Tous pôles</option>
              {POLES.map((p) => <option key={p} value={p} className="bg-dark-800">{p}</option>)}
            </select>
            <select value={fSubTeam} onChange={(e) => setFSubTeam(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white">
              <option value="" className="bg-dark-800">Toutes sous-équipes</option>
              {SUBTEAMS.map((s) => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
            </select>
            <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white">
              <option value="" className="bg-dark-800">Tous responsables</option>
              {assigneeOptions.map((m) => <option key={m.id} value={m.email!} className="bg-dark-800">{m.name}</option>)}
            </select>
            <label className="flex items-center gap-1 text-gray-400 cursor-pointer"><input type="checkbox" checked={fLate} onChange={(e) => setFLate(e.target.checked)} /> En retard</label>
            <label className="flex items-center gap-1 text-gray-400 cursor-pointer"><input type="checkbox" checked={fSoon} onChange={(e) => setFSoon(e.target.checked)} /> 30 prochains jours</label>
          </div>

          {/* Kanban */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ minWidth: `${STATUSES.length * 220}px` }}>
              {STATUSES.map((col) => {
                const cards = filtered.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="flex-shrink-0 w-52 rounded-lg border transition-colors"
                    style={{ borderColor: col.color, borderWidth: dropTarget === col.key ? 2 : 1, backgroundColor: dropTarget === col.key ? `${col.color}10` : "transparent" }}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget(col.key); }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={() => handleDrop(col.key)}
                  >
                    <div className="p-2 border-b border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-bold font-mono" style={{ color: col.color }}>{col.label}</span>
                      <span className="text-xs text-gray-600 font-mono bg-gray-800 rounded-full px-1.5">{cards.length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[140px]">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={() => setDragId(card.id)}
                          onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                          onClick={() => openDetail(card)}
                          className={`rounded p-2 cursor-pointer border-l-4 border border-gray-800 transition-all hover:border-gray-600 ${dragId === card.id ? "opacity-40" : ""}`}
                          style={{ borderLeftColor: phaseColor(card.phase), backgroundColor: "#0d0d0d" }}
                        >
                          <p className="text-xs font-bold text-white leading-snug">
                            {card.isMilestone && <span title="Jalon">⚠️ </span>}{card.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{card.pole}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs truncate" style={{ color: card.assigneeName ? "#00ccff" : "#555" }}>{card.assigneeName || "non assigné"}</span>
                            <span className="text-xs font-mono" style={{ color: isOverdue(card) ? "#ff3333" : "#888" }}>{fmtDate(card.dueDate)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <MeetingsView meetings={meetings} reload={load} />
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md h-full bg-[#0a0a0a] border-l border-gray-800 overflow-y-auto p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-neon-green font-mono">Éditer la tâche</h3>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white text-lg">✕</button>
            </div>

            <label className="block text-xs text-gray-500">Titre</label>
            <textarea rows={2} value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">Phase</label>
                <select value={edit.phase ?? 1} onChange={(e) => setEdit({ ...edit, phase: Number(e.target.value) })} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white">
                  {PHASES.map((p) => <option key={p.n} value={p.n} className="bg-dark-800">{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Statut</label>
                <select value={edit.status || "todo"} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white">
                  {STATUSES.map((s) => <option key={s.key} value={s.key} className="bg-dark-800">{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Pôle</label>
                <select value={edit.pole || ""} onChange={(e) => setEdit({ ...edit, pole: e.target.value })} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white">
                  {POLES.map((p) => <option key={p} value={p} className="bg-dark-800">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Sous-équipe</label>
                <select value={edit.subTeam || ""} onChange={(e) => setEdit({ ...edit, subTeam: e.target.value })} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white">
                  <option value="" className="bg-dark-800">—</option>
                  {SUBTEAMS.map((s) => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Priorité</label>
                <select value={edit.priority || "medium"} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white">
                  {PRIORITIES.map((p) => <option key={p} value={p} className="bg-dark-800">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Échéance</label>
                <input type="date" value={(edit.dueDate as string) || ""} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500">Responsable</label>
              <select
                value={edit.assigneeEmail || ""}
                onChange={(e) => {
                  const m = members.find((x) => x.email === e.target.value);
                  setEdit({ ...edit, assigneeEmail: e.target.value || null, assigneeName: m?.name || null });
                }}
                className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white"
              >
                <option value="" className="bg-dark-800">— non assigné —</option>
                {assigneeOptions.map((m) => <option key={m.id} value={m.email!} className="bg-dark-800">{m.name} ({m.role})</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!edit.isMilestone} onChange={(e) => setEdit({ ...edit, isMilestone: e.target.checked })} /> Jalon ⚠️
            </label>

            <label className="block text-xs text-gray-500">Notes</label>
            <textarea rows={3} value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" />

            <div className="flex gap-2 pt-2">
              <button onClick={saveDetail} className="flex-1 btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Enregistrer</button>
              {selected.status !== "done" && (
                <button onClick={() => patchTask(selected.id, { status: "done" }).then(() => setSelected(null))} className="px-3 py-2 rounded text-xs border border-neon-green/50 text-neon-green font-mono">✓ Fait</button>
              )}
              <button onClick={() => deleteTask(selected.id)} className="px-3 py-2 rounded text-xs border border-red-900 text-red-400 font-mono">Suppr.</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingsView({ meetings, reload }: { meetings: Meeting[]; reload: () => void }) {
  const sorted = [...meetings].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const now = Date.now();
  const del = async (id: number) => {
    if (!confirm("Supprimer cette réunion ?")) return;
    const res = await fetch(`/api/admin/pilotage/meetings/${id}`, { method: "DELETE" });
    if (res.ok) reload();
  };
  return (
    <div className="space-y-2">
      {sorted.map((m) => {
        const upcoming = new Date(m.scheduledAt).getTime() >= now;
        return (
          <div key={m.id} className="cyber-card rounded-lg p-3 flex items-start gap-3" style={{ opacity: upcoming ? 1 : 0.5 }}>
            <div className="text-center shrink-0 w-16">
              <p className="text-xs font-mono" style={{ color: m.type === "collective" ? "#00ff9d" : "#00ccff" }}>{m.type === "collective" ? "Collectif" : "Sous-éq."}</p>
              <p className="text-xs text-gray-500">{fmtDate(m.scheduledAt)}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{m.title}</p>
              {m.subTeam && <p className="text-xs text-gray-500">{m.subTeam}</p>}
              {m.agenda && <p className="text-xs text-gray-400 mt-0.5">{m.agenda}</p>}
              {m.location && <p className="text-xs text-gray-600 mt-0.5">📍 {m.location}</p>}
            </div>
            <button onClick={() => del(m.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">✕</button>
          </div>
        );
      })}
      {!meetings.length && <p className="text-gray-600 text-xs py-8 text-center">Aucune réunion — importez la feuille de route.</p>}
    </div>
  );
}
