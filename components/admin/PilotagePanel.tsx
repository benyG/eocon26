"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLang } from "@/lib/adminLangContext";

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

interface MeetingAttendee { name: string; email: string; }

interface Meeting {
  id: number;
  title: string;
  type: string;
  subTeam?: string | null;
  scheduledAt: string;
  location?: string | null;
  agenda?: string | null;
  attendees?: string | null; // JSON: [{name, email}]
  convenerEmail?: string | null;
  convenerName?: string | null;
}

interface MeetingForm {
  title: string;
  type: string;
  subTeam: string;
  scheduledAt: string; // datetime-local format YYYY-MM-DDTHH:mm
  location: string;
  agenda: string;
  convenerEmail: string;
  attendeeEmails: string[];
}

interface Member { id: number; name: string; role: string; email?: string | null; }

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDayOfWeek(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { weekday: "short" });
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // Format local time as YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseAttendees(raw?: string | null): MeetingAttendee[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as MeetingAttendee[]; } catch { return []; }
}

function isOverdue(t: Task) {
  return !!t.dueDate && t.status !== "done" && new Date(t.dueDate).getTime() < Date.now();
}
function daysUntil(d?: string | null) {
  if (!d) return Infinity;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function endOfCurrentWeek(): Date {
  const now = new Date();
  // ISO week ends on Sunday
  const daysToSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysToSunday);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function emptyMeetingForm(): MeetingForm {
  return { title: "", type: "collective", subTeam: "", scheduledAt: "", location: "", agenda: "", convenerEmail: "", attendeeEmails: [] };
}

export default function PilotagePanel({ canWrite = true, canReadKanban, canWriteKanban, canReadMeetings, canWriteMeetings, currentUserEmail }: { canWrite?: boolean; canReadKanban?: boolean; canWriteKanban?: boolean; canReadMeetings?: boolean; canWriteMeetings?: boolean; currentUserEmail?: string }) {
  const __ = useLang();
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
  const [fThisWeekAndBefore, setFThisWeekAndBefore] = useState(false);

  // Pre-filter to current user's email once it's available (runs once on mount)
  const assigneeInitialized = useRef(false);
  useEffect(() => {
    if (currentUserEmail && !assigneeInitialized.current) {
      setFAssignee(currentUserEmail);
      assigneeInitialized.current = true;
    }
  }, [currentUserEmail]);

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

  const filtered = useMemo(() => {
    const weekEnd = fThisWeekAndBefore ? endOfCurrentWeek() : null;
    return tasks.filter((t) => {
      if (fPhase && t.phase !== Number(fPhase)) return false;
      if (fPole && t.pole !== fPole) return false;
      if (fSubTeam && t.subTeam !== fSubTeam) return false;
      if (fAssignee && t.assigneeEmail !== fAssignee) return false;
      if (fLate && !isOverdue(t)) return false;
      if (fSoon && !(daysUntil(t.dueDate) <= 30 && t.status !== "done")) return false;
      if (weekEnd) {
        // Show only non-done tasks due on or before end of current week
        if (t.status === "done") return false;
        if (!t.dueDate || new Date(t.dueDate) > weekEnd) return false;
      }
      return true;
    });
  }, [tasks, fPhase, fPole, fSubTeam, fAssignee, fLate, fSoon, fThisWeekAndBefore]);

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
    if (!confirm(__("Supprimer cette tâche ?", "Delete this task?"))) return;
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
    if (force && !confirm(__("Réinitialiser : toutes les tâches/réunions seront remplacées par la feuille de route. Continuer ?", "Reset: all tasks/meetings will be replaced by the roadmap. Continue?"))) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/pilotage/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.status === 409) {
        if (confirm(__("Des tâches existent déjà. Réinitialiser à partir de la feuille de route ?", "Tasks already exist. Reset from the roadmap?"))) { await seed(true); }
      } else if (res.ok) {
        const r = await res.json();
        alert(`${__("Importé", "Imported")} : ${r.tasks} ${__("tâches", "tasks")}, ${r.meetings} ${__("réunions", "meetings")}.`);
        await load();
      } else {
        alert(__("Échec de l'import.", "Import failed."));
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
          <h1 className="text-2xl font-black text-white">🎯 {__("Pilotage global", "Global Dashboard")}</h1>
          <p className="text-xs text-gray-500 font-mono">{tasks.length} {__("tâches", "tasks")} · {meetings.length} {__("réunions", "meetings")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(canReadKanban !== false || canWrite) && (
            <button onClick={() => setView("kanban")} className={`px-5 py-2.5 text-sm font-semibold rounded border font-mono transition-colors ${view === "kanban" ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-300 hover:text-white"}`}>
              📋 {__("Plan kanban", "Kanban board")}
            </button>
          )}
          {(canReadMeetings !== false || canWrite) && (
            <button onClick={() => setView("meetings")} className={`px-5 py-2.5 text-sm font-semibold rounded border font-mono transition-colors ${view === "meetings" ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-300 hover:text-white"}`}>
              📅 {__("Réunions", "Meetings")}
            </button>
          )}
          {(canWriteKanban !== false ? canWriteKanban : canWrite) && view === "kanban" && <button onClick={createTask} className="text-sm px-5 py-2.5 rounded border border-neon-green/50 text-neon-green font-semibold font-mono">+ {__("Tâche", "Task")}</button>}
          {canWrite && (
            <button onClick={() => seed(false)} disabled={seeding} className="text-xs px-3 py-1.5 rounded bg-neon-green text-black font-bold font-mono">
              {seeding ? "…" : `↻ ${__("Feuille de route", "Roadmap")}`}
            </button>
          )}
          <button onClick={load} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white font-mono">{loading ? "…" : "↻"}</button>
        </div>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono">{__("Avancement", "Progress")}</p>
          <p className="text-2xl font-black text-neon-green">{kpi.pct}%</p>
          <p className="text-xs text-gray-600">{kpi.done}/{kpi.total} {__("faites", "done")}</p>
        </div>
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono">{__("Jalons à risque", "Milestones at risk")}</p>
          <p className="text-2xl font-black" style={{ color: kpi.milestonesAtRisk ? "#ff3333" : "#00ff9d" }}>{kpi.milestonesAtRisk}</p>
          <p className="text-xs text-gray-600">{__("en retard ou < 7 j", "overdue or < 7 d")}</p>
        </div>
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono">{__("Prochaine réunion", "Next meeting")}</p>
          <p className="text-sm font-bold text-white truncate">{kpi.nextMeeting?.title || "—"}</p>
          <p className="text-xs text-gray-600">{kpi.nextMeeting ? fmtDate(kpi.nextMeeting.scheduledAt) : ""}</p>
        </div>
        <div className="cyber-card rounded-lg p-3">
          <p className="text-xs text-gray-500 font-mono mb-1">{__("Par phase", "By phase")}</p>
          <div className="flex gap-1 flex-wrap">
            {PHASES.map((p) => (
              <span key={p.n} className="text-xs font-mono px-1.5 rounded" style={{ background: `${p.color}22`, color: p.color }}>
                P{p.n}:{tasks.filter((t) => t.phase === p.n).length}
              </span>
            ))}
          </div>
        </div>
      </div>

      {view === "kanban" && (canReadKanban !== false || canWrite) ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <select value={fPhase} onChange={(e) => setFPhase(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white">
              <option value="" className="bg-dark-800">{__("Toutes phases", "All phases")}</option>
              {PHASES.map((p) => <option key={p.n} value={p.n} className="bg-dark-800">{p.label}</option>)}
            </select>
            <select value={fPole} onChange={(e) => setFPole(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white max-w-[180px]">
              <option value="" className="bg-dark-800">{__("Tous pôles", "All poles")}</option>
              {POLES.map((p) => <option key={p} value={p} className="bg-dark-800">{p}</option>)}
            </select>
            <select value={fSubTeam} onChange={(e) => setFSubTeam(e.target.value)} className="cyber-input rounded px-2 py-1 bg-transparent text-white">
              <option value="" className="bg-dark-800">{__("Toutes sous-équipes", "All sub-teams")}</option>
              {SUBTEAMS.map((s) => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
            </select>
            <select
              value={fAssignee}
              onChange={(e) => setFAssignee(e.target.value)}
              className={`cyber-input rounded px-2 py-1 bg-transparent text-white ${fAssignee === currentUserEmail && currentUserEmail ? "border-neon-green/40 text-neon-green" : ""}`}
            >
              <option value="" className="bg-dark-800">{__("Tous responsables", "All assignees")}</option>
              {assigneeOptions.map((m) => <option key={m.id} value={m.email!} className="bg-dark-800">{m.name}{m.email === currentUserEmail ? ` (${__("moi", "me")})` : ""}</option>)}
            </select>
            {currentUserEmail && fAssignee !== currentUserEmail && (
              <button
                onClick={() => setFAssignee(currentUserEmail)}
                className="text-xs px-2 py-1 rounded border border-neon-green/30 text-neon-green/70 hover:text-neon-green hover:border-neon-green/60 font-mono transition-colors"
                title={__("Filtrer mes tâches", "Filter my tasks")}
              >
                👤 {__("Mes tâches", "My tasks")}
              </button>
            )}
            <label className="flex items-center gap-1 text-gray-400 cursor-pointer"><input type="checkbox" checked={fLate} onChange={(e) => setFLate(e.target.checked)} /> {__("En retard", "Overdue")}</label>
            <label className="flex items-center gap-1 text-gray-400 cursor-pointer"><input type="checkbox" checked={fSoon} onChange={(e) => setFSoon(e.target.checked)} /> {__("30 prochains jours", "Next 30 days")}</label>
            <label className="flex items-center gap-1 cursor-pointer" style={{ color: fThisWeekAndBefore ? "#00ff9d" : "#9ca3af" }}>
              <input
                type="checkbox"
                checked={fThisWeekAndBefore}
                onChange={(e) => setFThisWeekAndBefore(e.target.checked)}
              />
              📅 {__("Semaine en cours & antérieures", "Current week & earlier")}
            </label>
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
                    onDragOver={canWrite ? (e) => { e.preventDefault(); setDropTarget(col.key); } : undefined}
                    onDragLeave={canWrite ? () => setDropTarget(null) : undefined}
                    onDrop={canWrite ? () => handleDrop(col.key) : undefined}
                  >
                    <div className="p-2 border-b border-gray-800 flex items-center justify-between">
                      <span className="text-xs font-bold font-mono" style={{ color: col.color }}>{col.label}</span>
                      <span className="text-xs text-gray-600 font-mono bg-gray-800 rounded-full px-1.5">{cards.length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[140px]">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          draggable={canWrite}
                          onDragStart={canWrite ? () => setDragId(card.id) : undefined}
                          onDragEnd={canWrite ? () => { setDragId(null); setDropTarget(null); } : undefined}
                          onClick={() => openDetail(card)}
                          className={`rounded p-2 cursor-pointer border-l-4 border border-gray-800 transition-all hover:border-gray-600 ${dragId === card.id ? "opacity-40" : ""}`}
                          style={{ borderLeftColor: phaseColor(card.phase), backgroundColor: "#0d0d0d" }}
                        >
                          <p className="text-xs font-bold text-white leading-snug">
                            {card.isMilestone && <span title={__("Jalon", "Milestone")}>⚠️ </span>}{card.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{card.pole}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs truncate" style={{ color: card.assigneeName ? "#00ccff" : "#555" }}>{card.assigneeName || __("non assigné", "unassigned")}</span>
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
      ) : view === "meetings" && (canReadMeetings !== false || canWrite) ? (
        <MeetingsView meetings={meetings} reload={load} canWrite={canWriteMeetings !== undefined ? canWriteMeetings : canWrite} members={members} currentUserEmail={currentUserEmail} />
      ) : null}

      {/* Detail drawer — tasks */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md h-full bg-[#0a0a0a] border-l border-gray-800 overflow-y-auto p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-neon-green font-mono">{canWrite ? __("Éditer la tâche", "Edit task") : __("Détail de la tâche", "Task detail")}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white text-lg">✕</button>
            </div>
            {!canWrite && <p className="text-xs text-yellow-500 font-mono bg-yellow-500/10 rounded px-2 py-1">{__("Accès lecture seule", "Read-only access")}</p>}

            <label className="block text-xs text-gray-500">{__("Titre", "Title")}</label>
            <textarea rows={2} value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} disabled={!canWrite} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none disabled:opacity-60 disabled:cursor-not-allowed" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">{__("Phase", "Phase")}</label>
                <select value={edit.phase ?? 1} onChange={(e) => setEdit({ ...edit, phase: Number(e.target.value) })} disabled={!canWrite} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  {PHASES.map((p) => <option key={p.n} value={p.n} className="bg-dark-800">{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">{__("Statut", "Status")}</label>
                <select value={edit.status || "todo"} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })} disabled={!canWrite} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  {STATUSES.map((s) => <option key={s.key} value={s.key} className="bg-dark-800">{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">{__("Pôle", "Pole")}</label>
                <select value={edit.pole || ""} onChange={(e) => setEdit({ ...edit, pole: e.target.value })} disabled={!canWrite} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  {POLES.map((p) => <option key={p} value={p} className="bg-dark-800">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">{__("Sous-équipe", "Sub-team")}</label>
                <select value={edit.subTeam || ""} onChange={(e) => setEdit({ ...edit, subTeam: e.target.value })} disabled={!canWrite} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  <option value="" className="bg-dark-800">—</option>
                  {SUBTEAMS.map((s) => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">{__("Priorité", "Priority")}</label>
                <select value={edit.priority || "medium"} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} disabled={!canWrite} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  {PRIORITIES.map((p) => <option key={p} value={p} className="bg-dark-800">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">{__("Échéance", "Due date")}</label>
                <input type="date" value={(edit.dueDate as string) || ""} onChange={(e) => setEdit({ ...edit, dueDate: e.target.value })} disabled={!canWrite} className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500">{__("Responsable", "Assignee")}</label>
              <select
                value={edit.assigneeEmail || ""}
                onChange={(e) => {
                  const m = members.find((x) => x.email === e.target.value);
                  setEdit({ ...edit, assigneeEmail: e.target.value || null, assigneeName: m?.name || null });
                }}
                disabled={!canWrite}
                className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-dark-800">— {__("non assigné", "unassigned")} —</option>
                {assigneeOptions.map((m) => <option key={m.id} value={m.email!} className="bg-dark-800">{m.name} ({m.role})</option>)}
              </select>
            </div>

            <label className={`flex items-center gap-2 text-xs cursor-pointer ${canWrite ? "text-gray-400" : "text-gray-600 cursor-not-allowed"}`}>
              <input type="checkbox" checked={!!edit.isMilestone} onChange={(e) => setEdit({ ...edit, isMilestone: e.target.checked })} disabled={!canWrite} /> {__("Jalon", "Milestone")} ⚠️
            </label>

            <label className="block text-xs text-gray-500">{__("Notes", "Notes")}</label>
            <textarea rows={3} value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} disabled={!canWrite} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none disabled:opacity-60 disabled:cursor-not-allowed" />

            {canWrite && (
              <div className="flex gap-2 pt-2">
                <button onClick={saveDetail} className="flex-1 btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">{__("Enregistrer", "Save")}</button>
                {selected.status !== "done" && (
                  <button onClick={() => patchTask(selected.id, { status: "done" }).then(() => setSelected(null))} className="px-3 py-2 rounded text-xs border border-neon-green/50 text-neon-green font-mono">✓ {__("Fait", "Done")}</button>
                )}
                <button onClick={() => deleteTask(selected.id)} className="px-3 py-2 rounded text-xs border border-red-900 text-red-400 font-mono">{__("Suppr.", "Del.")}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MeetingsView ────────────────────────────────────────────────────────────

function MeetingsView({
  meetings,
  reload,
  canWrite = true,
  members,
  currentUserEmail,
}: {
  meetings: Meeting[];
  reload: () => void;
  canWrite?: boolean;
  members: Member[];
  currentUserEmail?: string;
}) {
  const __ = useLang();
  const [editTarget, setEditTarget] = useState<Meeting | "new" | null>(null);
  const [form, setForm] = useState<MeetingForm>(emptyMeetingForm());
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);
  const [meetDropdownOpen, setMeetDropdownOpen] = useState(false);
  const meetDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (meetDropdownRef.current && !meetDropdownRef.current.contains(e.target as Node)) {
        setMeetDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const generateJitsiLink = () => {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const url = `https://meet.jit.si/EOCON-${code}`;
    setForm((f) => ({ ...f, location: url }));
    setMeetDropdownOpen(false);
  };

  const openGoogleMeet = () => {
    window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
    setMeetDropdownOpen(false);
  };

  const membersWithEmail = members.filter((m) => m.email);

  function openCreate() {
    const base = emptyMeetingForm();
    if (currentUserEmail) base.convenerEmail = currentUserEmail;
    setForm(base);
    setEditTarget("new");
  }

  function openEdit(m: Meeting) {
    const attendees = parseAttendees(m.attendees);
    setForm({
      title: m.title,
      type: m.type,
      subTeam: m.subTeam || "",
      scheduledAt: toDatetimeLocal(m.scheduledAt),
      location: m.location || "",
      agenda: m.agenda || "",
      convenerEmail: m.convenerEmail || "",
      attendeeEmails: attendees.map((a) => a.email),
    });
    setEditTarget(m);
  }

  async function save() {
    if (!form.title || !form.scheduledAt) return;
    setSaving(true);
    const convener = membersWithEmail.find((m) => m.email === form.convenerEmail);
    const attendees = membersWithEmail
      .filter((m) => m.email && form.attendeeEmails.includes(m.email))
      .map((m) => ({ name: m.name, email: m.email! }));

    const body = {
      title: form.title,
      type: form.type,
      subTeam: form.subTeam || null,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      location: form.location || null,
      agenda: form.agenda || null,
      convenerEmail: form.convenerEmail || null,
      convenerName: convener?.name || null,
      attendees: attendees.length ? JSON.stringify(attendees) : null,
    };

    const isNew = editTarget === "new";
    const url = isNew
      ? "/api/admin/pilotage/meetings"
      : `/api/admin/pilotage/meetings/${(editTarget as Meeting).id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) { setEditTarget(null); reload(); }
  }

  async function del(id: number) {
    if (!confirm(__("Supprimer cette réunion ?", "Delete this meeting?"))) return;
    const res = await fetch(`/api/admin/pilotage/meetings/${id}`, { method: "DELETE" });
    if (res.ok) reload();
  }

  async function sendReminders() {
    setSendingReminders(true);
    setReminderResult(null);
    try {
      const res = await fetch("/api/admin/pilotage/meetings/reminders", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReminderResult(`✓ ${data.sent} ${__("email(s) envoyé(s)", "email(s) sent")}, ${data.skipped} ${__("ignoré(s)", "skipped")}.`);
      } else {
        setReminderResult(`✗ ${__("Erreur lors de l'envoi des rappels.", "Error sending reminders.")}`);
      }
    } catch {
      setReminderResult(`✗ ${__("Impossible d'envoyer les rappels.", "Unable to send reminders.")}`);
    } finally {
      setSendingReminders(false);
    }
  }

  const sorted = [...meetings].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const now = Date.now();

  return (
    <div className="space-y-3">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {reminderResult && (
            <span className={`text-xs font-mono ${reminderResult.startsWith("✓") ? "text-neon-green" : "text-red-400"}`}>
              {reminderResult}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <button
              onClick={sendReminders}
              disabled={sendingReminders}
              className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white font-mono disabled:opacity-50"
              title={__("Envoie les rappels J-1 et J0 pour les réunions d'aujourd'hui et demain", "Sends D-1 and D0 reminders for today's and tomorrow's meetings")}
            >
              {sendingReminders ? "…" : `🔔 ${__("Envoyer rappels", "Send reminders")}`}
            </button>
          )}
          {canWrite && (
            <button onClick={openCreate} className="text-xs px-3 py-1.5 rounded border border-neon-green/50 text-neon-green font-mono">
              + {__("Réunion", "Meeting")}
            </button>
          )}
        </div>
      </div>

      {/* Meeting cards */}
      {sorted.map((m) => {
        const upcoming = new Date(m.scheduledAt).getTime() >= now;
        const attendees = parseAttendees(m.attendees);
        return (
          <div
            key={m.id}
            className="cyber-card rounded-lg p-4 transition-opacity"
            style={{ opacity: upcoming ? 1 : 0.5 }}
          >
            <div className="flex items-start gap-3">
              {/* Date badge */}
              <div className="shrink-0 text-center w-16 pt-0.5">
                <p className="text-xs font-mono mb-0.5" style={{ color: m.type === "collective" ? "#00ff9d" : "#00ccff" }}>
                  {m.type === "collective" ? __("Collectif", "Collective") : __("Sous-éq.", "Sub-team")}
                </p>
                <p className="text-xs text-gray-400 font-mono">{fmtDayOfWeek(m.scheduledAt)}</p>
                <p className="text-xs text-gray-500">{fmtDate(m.scheduledAt)}</p>
                <p className="text-xs text-gray-600 font-mono">{fmtTime(m.scheduledAt)}</p>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-sm font-bold text-white leading-tight">{m.title}</p>
                {m.subTeam && (
                  <span className="inline-block text-xs font-mono px-2 py-0.5 rounded" style={{ background: "#00ccff15", color: "#00ccff" }}>
                    {m.subTeam}
                  </span>
                )}
                {m.agenda && <p className="text-xs text-gray-400 line-clamp-2 whitespace-pre-line">{m.agenda}</p>}
                {m.location && <p className="text-xs text-gray-600">📍 {m.location}</p>}

                {/* People */}
                <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                  {m.convenerName && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "#fbbf2415", color: "#fbbf24", border: "1px solid #fbbf2430" }}>
                      👤 {m.convenerName}
                    </span>
                  )}
                  {attendees.map((a) => (
                    <span key={a.email} className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: "#3b82f615", color: "#93c5fd", border: "1px solid #3b82f630" }}>
                      {a.name}
                    </span>
                  ))}
                  {!m.convenerName && !attendees.length && (
                    <span className="text-xs text-gray-700 font-mono italic">{__("Aucun participant renseigné", "No participants listed")}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canWrite && (
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(m)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded hover:border-gray-500 transition-colors"
                    title={__("Modifier", "Edit")}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-900/50 rounded hover:border-red-700 transition-colors"
                    title={__("Supprimer", "Delete")}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {!meetings.length && (
        <p className="text-gray-600 text-xs py-10 text-center font-mono">
          {__("Aucune réunion planifiée — créez-en une ou importez la feuille de route.", "No meetings scheduled — create one or import the roadmap.")}
        </p>
      )}

      {/* Create / Edit drawer */}
      {editTarget !== null && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setEditTarget(null)}>
          <div
            className="w-full max-w-md h-full bg-[#0a0a0a] border-l border-gray-800 overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-neon-green font-mono">
                {editTarget === "new" ? __("Nouvelle réunion", "New meeting") : __("Modifier la réunion", "Edit meeting")}
              </h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-600 hover:text-white text-lg">✕</button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{__("Titre", "Title")} *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="cyber-input w-full px-3 py-2 rounded text-xs"
                placeholder={__("Réunion de coordination…", "Coordination meeting…")}
              />
            </div>

            {/* Type + subTeam */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{__("Type", "Type")}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white"
                >
                  <option value="collective" className="bg-dark-800">{__("Collectif", "Collective")}</option>
                  <option value="subteam" className="bg-dark-800">{__("Sous-équipe", "Sub-team")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{__("Sous-équipe", "Sub-team")}</label>
                <select
                  value={form.subTeam}
                  onChange={(e) => setForm((f) => ({ ...f, subTeam: e.target.value }))}
                  disabled={form.type !== "subteam"}
                  className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white disabled:opacity-40"
                >
                  <option value="" className="bg-dark-800">—</option>
                  {SUBTEAMS.map((s) => <option key={s} value={s} className="bg-dark-800">{s}</option>)}
                </select>
              </div>
            </div>

            {/* Date/time */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{__("Date et heure", "Date and time")} *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                className="cyber-input w-full px-3 py-2 rounded text-xs"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{__("Lieu / lien de la rencontre", "Location / meeting link")}</label>
              <div className="flex gap-1.5 items-center">
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="cyber-input flex-1 px-3 py-2 rounded text-xs"
                  placeholder={__("Salle A, lien Zoom, Google Meet…", "Room A, Zoom link, Google Meet…")}
                />
                {/* Quick video link dropdown */}
                <div className="relative shrink-0" ref={meetDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setMeetDropdownOpen((o) => !o)}
                    title={__("Générer un lien visio", "Generate a video link")}
                    className="cyber-input px-2.5 py-2 rounded text-base hover:text-neon-green hover:border-neon-green/50 transition-colors"
                  >
                    📹
                  </button>
                  {meetDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 cyber-card rounded-lg border border-gray-700 shadow-xl min-w-[190px] overflow-hidden">
                      <button
                        type="button"
                        onClick={generateJitsiLink}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                      >
                        <span className="text-base">🔵</span>
                        <div>
                          <p className="text-white font-semibold">Jitsi ({__("instantané", "instant")})</p>
                          <p className="text-gray-500" style={{ fontSize: "10px" }}>{__("Génère et colle le lien", "Generates and pastes the link")}</p>
                        </div>
                      </button>
                      <div className="border-t border-gray-800" />
                      <button
                        type="button"
                        onClick={openGoogleMeet}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                      >
                        <span className="text-base">🟢</span>
                        <div>
                          <p className="text-white font-semibold">Google Meet</p>
                          <p className="text-gray-500" style={{ fontSize: "10px" }}>{__("Ouvre le navigateur", "Opens the browser")}</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {form.location?.startsWith("https://") && (
                <a href={form.location} target="_blank" rel="noreferrer" className="text-neon-green/70 text-xs font-mono mt-1 block truncate hover:text-neon-green">
                  ↗ {form.location}
                </a>
              )}
            </div>

            {/* Agenda */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{__("Ordre du jour", "Agenda")}</label>
              <textarea
                rows={3}
                value={form.agenda}
                onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
                className="cyber-input w-full px-3 py-2 rounded text-xs resize-none"
                placeholder={__("Points à aborder…", "Topics to cover…")}
              />
            </div>

            {/* Convener */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                👤 {__("Convocateur", "Convener")}
                <span className="text-gray-700 ml-1">({__("responsable d'organiser la rencontre", "responsible for organizing the meeting")})</span>
              </label>
              <select
                value={form.convenerEmail}
                onChange={(e) => setForm((f) => ({ ...f, convenerEmail: e.target.value }))}
                className="cyber-input w-full px-2 py-1.5 rounded text-xs bg-transparent text-white"
              >
                <option value="" className="bg-dark-800">— {__("sélectionner", "select")} —</option>
                {membersWithEmail.map((m) => (
                  <option key={m.id} value={m.email!} className="bg-dark-800">
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">
                {__("Convoqués", "Invitees")}
                <span className="text-gray-700 ml-1">({__("reçoivent rappel J-1 et J0", "receive D-1 and D0 reminders")})</span>
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-800 rounded p-2">
                {membersWithEmail.length === 0 && (
                  <p className="text-xs text-gray-600 py-2 text-center">
                    {__("Aucun membre avec email configuré dans l'équipe.", "No team member with a configured email.")}
                  </p>
                )}
                {membersWithEmail.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white py-0.5 px-1 rounded hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={form.attendeeEmails.includes(m.email!)}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          attendeeEmails: e.target.checked
                            ? [...f.attendeeEmails, m.email!]
                            : f.attendeeEmails.filter((x) => x !== m.email),
                        }));
                      }}
                    />
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-600 truncate">({m.role})</span>
                  </label>
                ))}
              </div>
              {form.attendeeEmails.length > 0 && (
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  {form.attendeeEmails.length} {__("personne(s) convoquée(s)", "person/people invited")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving || !form.title || !form.scheduledAt}
                className="flex-1 btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green disabled:opacity-50"
              >
                {saving ? "…" : editTarget === "new" ? __("Créer la réunion", "Create meeting") : __("Enregistrer", "Save")}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white"
              >
                {__("Annuler", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
