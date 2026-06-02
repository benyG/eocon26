"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Tab = "dashboard" | "speakers" | "sponsors" | "sessions" | "cfp" | "volunteers" | "registrations" | "newsletter";

const TIER_ORDER = ["PLATINUM", "GOLD", "SILVER", "BRONZE"];
const SESSION_TYPES = ["keynote", "talk", "workshop", "panel", "break", "logistics"];
const typeColors: Record<string, string> = {
  keynote: "#00ff9d", talk: "#0066ff", workshop: "#ff6600",
  panel: "#cc00ff", break: "#444", logistics: "#888",
};

function StatCard({ label, value, color = "#00ff9d" }: { label: string; value: number; color?: string }) {
  return (
    <div className="cyber-card rounded-xl p-5 text-center">
      <div className="text-3xl font-black font-mono mb-1" style={{ color, fontFamily: "'Share Tech Mono', monospace" }}>{value}</div>
      <div className="text-gray-500 text-xs uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = { pending: "#ffaa00", accepted: "#00ff9d", rejected: "#ff0066" };
  return (
    <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: (colors[status] || "#888") + "20", color: colors[status] || "#888", fontFamily: "'Share Tech Mono', monospace" }}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  };

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === "speakers") {
        const res = await fetch("/api/admin/speakers");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, speakers: json })); }
      } else if (t === "sponsors") {
        const res = await fetch("/api/admin/sponsors");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, sponsors: json })); }
      } else if (t === "sessions") {
        const res = await fetch("/api/admin/sessions");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, sessions: json })); }
      } else if (["cfp", "volunteers", "registrations", "newsletter"].includes(t)) {
        const typeMap: Record<string, string> = { cfp: "cfp", volunteers: "volunteer", registrations: "registration", newsletter: "newsletter" };
        const res = await fetch(`/api/admin/submissions?type=${typeMap[t]}`);
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, [t]: json })); }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab !== "dashboard") fetchData(tab); }, [tab, fetchData]);

  const save = async (endpoint: string) => {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `${endpoint}/${editing}` : endpoint;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setEditing(null); setForm({}); fetchData(tab); fetchStats(); }
  };

  const del = async (endpoint: string, id: number) => {
    if (!confirm("Supprimer ?")) return;
    await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    fetchData(tab);
    fetchStats();
  };

  const updateStatus = async (type: string, id: number, status: string) => {
    await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, status }) });
    fetchData(tab);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "speakers", label: "Speakers", count: stats.speakers },
    { id: "sponsors", label: "Sponsors", count: stats.sponsors },
    { id: "sessions", label: "Schedule" },
    { id: "cfp", label: "CFP", count: stats.cfp },
    { id: "volunteers", label: "Bénévoles", count: stats.volunteers },
    { id: "registrations", label: "Inscriptions", count: stats.registrations },
    { id: "newsletter", label: "Newsletter", count: stats.subscribers },
  ];

  return (
    <div className="min-h-screen bg-dark-900" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {/* Top bar */}
      <div className="border-b border-neon-green/20 bg-black/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <span className="text-neon-green font-mono text-sm font-bold">&gt; EOCON_ADMIN</span>
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" className="text-gray-500 hover:text-neon-green text-xs transition-colors">↗ Voir le site</a>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 transition-colors">Déconnexion</button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-48 min-h-screen border-r border-neon-green/10 bg-black/40 p-4 space-y-1 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-all flex items-center justify-between ${tab === t.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-gray-300"}`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && <span className="text-neon-green/60 text-xs">{t.count}</span>}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">
          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Dashboard</h1>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <StatCard label="Speakers" value={stats.speakers || 0} />
                <StatCard label="Sponsors" value={stats.sponsors || 0} color="#ffd700" />
                <StatCard label="CFP" value={stats.cfp || 0} color="#0066ff" />
                <StatCard label="Bénévoles" value={stats.volunteers || 0} color="#cc00ff" />
                <StatCard label="Inscriptions" value={stats.registrations || 0} color="#ff6600" />
                <StatCard label="Newsletter" value={stats.subscribers || 0} color="#ff0066" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { tab: "speakers", label: "Gérer les Speakers", desc: "Ajouter, éditer et ordonner les intervenants 2026" },
                  { tab: "sponsors", label: "Gérer les Sponsors", desc: "Logos, tiers et liens des sponsors" },
                  { tab: "sessions", label: "Éditer le Programme", desc: "Créer et ordonner les sessions de la journée" },
                  { tab: "cfp", label: "Propositions de Talks", desc: "Examiner et statuer sur les CFP reçus" },
                  { tab: "volunteers", label: "Candidatures Bénévoles", desc: "Gérer les candidatures reçues" },
                  { tab: "registrations", label: "Inscriptions", desc: "Liste complète des participants inscrits" },
                ].map(item => (
                  <button key={item.tab} onClick={() => setTab(item.tab as Tab)} className="cyber-card rounded-xl p-5 text-left hover:border-neon-green/50 transition-all">
                    <div className="text-neon-green font-bold text-sm mb-1">{item.label}</div>
                    <div className="text-gray-500 text-xs">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SPEAKERS */}
          {tab === "speakers" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Speakers</h1>
                <button onClick={() => { setForm({ isVisible: true, isKeynote: false, edition: "2026", sortOrder: 0 }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter</button>
              </div>

              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier" : "Nouveau Speaker"}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { key: "name", label: "Nom *", required: true },
                      { key: "title", label: "Titre / Poste *", required: true },
                      { key: "company", label: "Entreprise" },
                      { key: "country", label: "Pays" },
                      { key: "photoUrl", label: "URL Photo" },
                      { key: "linkedin", label: "LinkedIn URL" },
                      { key: "twitter", label: "Twitter @handle" },
                      { key: "talkTitle", label: "Titre du Talk" },
                      { key: "talkFormat", label: "Format" },
                      { key: "edition", label: "Édition" },
                      { key: "sortOrder", label: "Ordre d'affichage", type: "number" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input type={f.type || "text"} className="cyber-input w-full px-3 py-2 rounded text-xs"
                          value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Biographie *</label>
                      <textarea rows={3} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none"
                        value={(form.bio as string) || ""} onChange={e => setForm({ ...form, bio: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Résumé du Talk</label>
                      <textarea rows={3} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none"
                        value={(form.talkAbstract as string) || ""} onChange={e => setForm({ ...form, talkAbstract: e.target.value })} />
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={!!form.isKeynote} onChange={e => setForm({ ...form, isKeynote: e.target.checked })} />
                        Keynote Speaker
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                        Visible
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/speakers")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={() => { setShowForm(false); setForm({}); setEditing(null); }} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">Chargement...</p> : (
                <div className="space-y-2">
                  {((data.speakers || []) as Record<string, unknown>[]).map((s) => (
                    <div key={s.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-4">
                      {s.photoUrl ? <img src={s.photoUrl as string} alt={s.name as string} className="w-12 h-12 rounded-full object-cover shrink-0" /> : (
                        <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-bold shrink-0 text-sm">
                          {(s.name as string).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{s.name as string}</span>
                          {!!s.isKeynote && <span className="text-xs px-1.5 py-0.5 rounded bg-neon-green/20 text-neon-green">Keynote</span>}
                          {!s.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Masqué</span>}
                        </div>
                        <p className="text-gray-500 text-xs">{s.title as string}{s.company ? ` · ${s.company}` : ""} {s.country ? `· ${s.country}` : ""}</p>
                        {!!s.talkTitle && <p className="text-neon-green/60 text-xs mt-0.5 truncate">🎤 {s.talkTitle as string}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setForm({ ...s }); setEditing(s.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green transition-colors px-2 py-1 border border-gray-700 rounded">Éditer</button>
                        <button onClick={() => del("/api/admin/speakers", s.id as number)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-900 rounded">Suppr.</button>
                      </div>
                    </div>
                  ))}
                  {!(data.speakers?.length) && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun speaker — cliquez sur + Ajouter</p>}
                </div>
              )}
            </div>
          )}

          {/* SPONSORS */}
          {tab === "sponsors" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Sponsors</h1>
                <button onClick={() => { setForm({ isVisible: true, tier: "GOLD", sortOrder: 0 }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter</button>
              </div>

              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[{ key: "name", label: "Nom du Sponsor *" }, { key: "website", label: "Site Web" }, { key: "logoUrl", label: "URL du Logo" }].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Tier</label>
                      <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={(form.tier as string) || "GOLD"} onChange={e => setForm({ ...form, tier: e.target.value })}>
                        {TIER_ORDER.map(t => <option key={t} value={t} className="bg-dark-800">{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ordre</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                      Visible sur le site
                    </label>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/sponsors")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={() => { setShowForm(false); setForm({}); setEditing(null); }} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {TIER_ORDER.map(tier => {
                const tierSponsors = ((data.sponsors || []) as Record<string, unknown>[]).filter(s => s.tier === tier);
                if (!tierSponsors.length) return null;
                const colors: Record<string, string> = { PLATINUM: "#e5e4e2", GOLD: "#ffd700", SILVER: "#c0c0c0", BRONZE: "#cd7f32" };
                return (
                  <div key={tier} className="mb-6">
                    <h3 className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: colors[tier] }}>◆ {tier}</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tierSponsors.map(s => (
                        <div key={s.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-3">
                          {s.logoUrl ? <img src={s.logoUrl as string} alt={s.name as string} className="w-12 h-12 object-contain rounded shrink-0 bg-white/5 p-1" /> : (
                            <div className="w-12 h-12 rounded border border-dashed border-gray-700 flex items-center justify-center text-gray-600 text-xs shrink-0">LOGO</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">{s.name as string}</p>
                            {!!s.website && <p className="text-gray-500 text-xs truncate">{s.website as string}</p>}
                            {!s.isVisible && <span className="text-xs text-gray-600">Masqué</span>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => { setForm({ ...s }); setEditing(s.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">Éditer</button>
                            <button onClick={() => del("/api/admin/sponsors", s.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">Suppr.</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!data.sponsors?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun sponsor</p>}
            </div>
          )}

          {/* SESSIONS */}
          {tab === "sessions" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Programme</h1>
                <button onClick={() => { setForm({ isVisible: true, type: "talk", sortOrder: 0 }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter</button>
              </div>

              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[{ key: "time", label: "Heure (ex: 09:00) *" }, { key: "title", label: "Titre *" }, { key: "speakerName", label: "Speaker" }, { key: "room", label: "Salle" }].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={(form.type as string) || "talk"} onChange={e => setForm({ ...form, type: e.target.value })}>
                        {SESSION_TYPES.map(t => <option key={t} value={t} className="bg-dark-800">{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ordre</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.description as string) || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                      Visible
                    </label>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/sessions")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={() => { setShowForm(false); setForm({}); setEditing(null); }} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {((data.sessions || []) as Record<string, unknown>[]).map(s => (
                  <div key={s.id as number} className="flex gap-3 items-center rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${typeColors[s.type as string] || "#444"}` }}>
                    <span className="text-neon-green/60 text-xs w-12 shrink-0 font-mono">{s.time as string}</span>
                    <div className="flex-1">
                      <span className="text-white text-sm">{s.title as string}</span>
                      {!!s.speakerName && <span className="text-gray-500 text-xs ml-2">— {s.speakerName as string}</span>}
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ background: (typeColors[s.type as string] || "#444") + "20", color: typeColors[s.type as string] || "#888" }}>{s.type as string}</span>
                    {!s.isVisible && <span className="text-xs text-gray-600 shrink-0">Masqué</span>}
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setForm({ ...s }); setEditing(s.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">Éditer</button>
                      <button onClick={() => del("/api/admin/sessions", s.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">Suppr.</button>
                    </div>
                  </div>
                ))}
                {!data.sessions?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucune session</p>}
              </div>
            </div>
          )}

          {/* CFP */}
          {tab === "cfp" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Propositions de Talks ({(data.cfp || []).length})</h1>
              <div className="space-y-3">
                {((data.cfp || []) as Record<string, unknown>[]).map(s => (
                  <div key={s.id as number} className="cyber-card rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="text-white font-bold">{s.name as string} <span className="text-gray-500 font-normal text-sm">— {s.email as string}</span></p>
                        <p className="text-neon-green text-sm mt-0.5">🎤 {s.talkTitle as string}</p>
                        {!!s.org && <p className="text-gray-500 text-xs">{s.org as string}{s.country ? ` · ${s.country}` : ""}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge status={s.status as string} />
                        <select className="cyber-input text-xs px-2 py-1 rounded bg-transparent" value={s.status as string}
                          onChange={e => updateStatus("cfp", s.id as number, e.target.value)}>
                          <option value="pending" className="bg-dark-800">pending</option>
                          <option value="accepted" className="bg-dark-800">accepted</option>
                          <option value="rejected" className="bg-dark-800">rejected</option>
                        </select>
                      </div>
                    </div>
                    {!!s.format && <span className="text-xs px-2 py-0.5 rounded bg-neon-green/10 text-neon-green/70 mr-2">{s.format as string}</span>}
                    <p className="text-gray-400 text-xs mt-2 line-clamp-3">{s.abstract as string}</p>
                    <p className="text-gray-600 text-xs mt-2">{new Date(s.createdAt as string).toLocaleDateString("fr-FR")}</p>
                  </div>
                ))}
                {!data.cfp?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucune soumission</p>}
              </div>
            </div>
          )}

          {/* VOLUNTEERS */}
          {tab === "volunteers" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Bénévoles ({(data.volunteers || []).length})</h1>
              <div className="space-y-3">
                {((data.volunteers || []) as Record<string, unknown>[]).map(v => (
                  <div key={v.id as number} className="cyber-card rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white font-bold">{v.name as string} <span className="text-gray-500 font-normal text-sm">— {v.email as string}</span></p>
                        {!!v.role && <p className="text-neon-green/70 text-sm">Rôle souhaité : {v.role as string}</p>}
                        {!!v.city && <p className="text-gray-500 text-xs">{v.city as string}</p>}
                        <p className="text-gray-400 text-xs mt-2">{v.motivation as string}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge status={v.status as string} />
                        <select className="cyber-input text-xs px-2 py-1 rounded bg-transparent" value={v.status as string}
                          onChange={e => updateStatus("volunteer", v.id as number, e.target.value)}>
                          <option value="pending" className="bg-dark-800">pending</option>
                          <option value="accepted" className="bg-dark-800">accepted</option>
                          <option value="rejected" className="bg-dark-800">rejected</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-2">{new Date(v.createdAt as string).toLocaleDateString("fr-FR")}</p>
                  </div>
                ))}
                {!data.volunteers?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucune candidature</p>}
              </div>
            </div>
          )}

          {/* REGISTRATIONS */}
          {tab === "registrations" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Inscriptions ({(data.registrations || []).length})</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neon-green/10 text-gray-500 text-left">
                      {["Nom", "Email", "Organisation", "Pays", "Ticket", "Statut", "Date"].map(h => (
                        <th key={h} className="py-2 px-3 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {((data.registrations || []) as Record<string, unknown>[]).map(r => (
                      <tr key={r.id as number} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 px-3 text-white">{r.fname as string} {r.lname as string}</td>
                        <td className="py-2 px-3 text-gray-400">{r.email as string}</td>
                        <td className="py-2 px-3 text-gray-500">{(r.org as string) || "—"}</td>
                        <td className="py-2 px-3 text-gray-500">{(r.country as string) || "—"}</td>
                        <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green/70">{r.ticketType as string}</span></td>
                        <td className="py-2 px-3"><Badge status={r.status as string} /></td>
                        <td className="py-2 px-3 text-gray-600">{new Date(r.createdAt as string).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.registrations?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucune inscription</p>}
              </div>
            </div>
          )}

          {/* NEWSLETTER */}
          {tab === "newsletter" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Newsletter ({(data.newsletter || []).length} abonnés)</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neon-green/10 text-gray-500 text-left">
                      <th className="py-2 px-3 font-normal">#</th>
                      <th className="py-2 px-3 font-normal">Email</th>
                      <th className="py-2 px-3 font-normal">Date d&apos;inscription</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((data.newsletter || []) as Record<string, unknown>[]).map((s, i) => (
                      <tr key={s.id as number} className="border-b border-gray-800 hover:bg-white/[0.02]">
                        <td className="py-2 px-3 text-gray-600">{i + 1}</td>
                        <td className="py-2 px-3 text-neon-green/70">{s.email as string}</td>
                        <td className="py-2 px-3 text-gray-600">{new Date(s.createdAt as string).toLocaleDateString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.newsletter?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun abonné</p>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
