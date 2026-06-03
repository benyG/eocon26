"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Tab = "dashboard" | "speakers" | "sponsors" | "sessions" | "workshops" | "cfp" | "volunteers" | "registrations" | "newsletter" | "team" | "past-speakers";

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

function Avatar({ photoUrl, name, size = 12 }: { photoUrl?: string; name: string; size?: number }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-bold shrink-0 text-sm`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function PhotoUploadField({
  value,
  folder,
  onChange,
}: {
  value: string;
  folder: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const json = await res.json();
        onChange(json.url as string);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        className="cyber-input flex-1 px-3 py-2 rounded text-xs"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://..."
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="btn-neon px-3 py-2 rounded text-xs shrink-0"
        disabled={uploading}
      >
        {uploading ? "..." : "Upload"}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
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
      } else if (t === "team") {
        const res = await fetch("/api/admin/team");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, team: json })); }
      } else if (t === "workshops") {
        const res = await fetch("/api/admin/workshops");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, workshops: json })); }
      } else if (t === "past-speakers") {
        const res = await fetch("/api/admin/past-speakers");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, "past-speakers": json })); }
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

  const cancelForm = () => { setShowForm(false); setForm({}); setEditing(null); };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "speakers", label: "Speakers", count: stats.speakers },
    { id: "sponsors", label: "Sponsors", count: stats.sponsors },
    { id: "sessions", label: "Schedule" },
    { id: "cfp", label: "CFP", count: stats.cfp },
    { id: "volunteers", label: "Bénévoles", count: stats.volunteers },
    { id: "registrations", label: "Inscriptions", count: stats.registrations },
    { id: "newsletter", label: "Newsletter", count: stats.subscribers },
    { id: "team", label: "Équipe" },
    { id: "workshops", label: "Ateliers", count: stats.workshops },
    { id: "past-speakers", label: "Anciens Intervenants", count: stats.pastSpeakers },
  ];

  // Group sessions by date
  const sessionsByDate = (() => {
    const sessions = (data.sessions || []) as Record<string, unknown>[];
    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const s of sessions) {
      const key = (s.date as string) || "Sans date";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Sans date") return 1;
      if (b === "Sans date") return -1;
      return a.localeCompare(b);
    });
    return { groups, sortedKeys };
  })();

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
        <aside className="w-52 min-h-screen border-r border-neon-green/10 bg-black/40 p-4 space-y-1 shrink-0">
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
        <main className="flex-1 p-6 min-w-0">

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Dashboard</h1>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                <StatCard label="Speakers" value={stats.speakers || 0} />
                <StatCard label="Sponsors" value={stats.sponsors || 0} color="#ffd700" />
                <StatCard label="Sessions" value={stats.sessions || 0} color="#0066ff" />
                <StatCard label="CFP" value={stats.cfp || 0} color="#cc00ff" />
                <StatCard label="Bénévoles" value={stats.volunteers || 0} color="#ff6600" />
                <StatCard label="Inscriptions" value={stats.registrations || 0} color="#ff0066" />
                <StatCard label="Newsletter" value={stats.subscribers || 0} color="#ffaa00" />
                <StatCard label="Équipe" value={stats.team || 0} color="#00ccff" />
                <StatCard label="Anciens intervenants" value={stats.pastSpeakers || 0} color="#aa88ff" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { tab: "speakers", label: "Gérer les Speakers", desc: "Ajouter, éditer et ordonner les intervenants 2026" },
                  { tab: "sponsors", label: "Gérer les Sponsors", desc: "Logos, tiers et liens des sponsors" },
                  { tab: "sessions", label: "Éditer le Programme", desc: "Créer et ordonner les sessions par date" },
                  { tab: "cfp", label: "Propositions de Talks", desc: "Examiner et statuer sur les CFP reçus" },
                  { tab: "volunteers", label: "Candidatures Bénévoles", desc: "Gérer les candidatures reçues" },
                  { tab: "registrations", label: "Inscriptions", desc: "Liste complète des participants inscrits" },
                  { tab: "team", label: "Équipe d'organisation", desc: "Gérer les membres de l'équipe organisatrice" },
                  { tab: "past-speakers", label: "Anciens Intervenants", desc: "Archive des intervenants des éditions précédentes" },
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
                  <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier le Speaker" : "Nouveau Speaker"}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { key: "name", label: "Nom *" },
                      { key: "title", label: "Titre / Poste *" },
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
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">Chargement...</p> : (
                <div className="space-y-2">
                  {((data.speakers || []) as Record<string, unknown>[]).map((s) => (
                    <div key={s.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-4">
                      <Avatar photoUrl={s.photoUrl as string} name={s.name as string} size={12} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{s.name as string}</span>
                          {!!s.isKeynote && <span className="text-xs px-1.5 py-0.5 rounded bg-neon-green/20 text-neon-green">Keynote</span>}
                          {!s.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Masqué</span>}
                        </div>
                        <p className="text-gray-500 text-xs">{s.title as string}{s.company ? ` · ${s.company}` : ""}{s.country ? ` · ${s.country}` : ""}</p>
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
                  <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier le Sponsor" : "Nouveau Sponsor"}</h3>
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
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
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

          {/* SESSIONS — Calendar UI */}
          {tab === "sessions" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Programme</h1>
                <button onClick={() => { setForm({ isVisible: true, type: "talk", sortOrder: 0, date: "", time: "", endTime: "" }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter</button>
              </div>

              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier la Session" : "Nouvelle Session"}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Date</label>
                      <input type="date" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.date as string) || ""} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Heure début (HH:MM)</label>
                      <input type="text" placeholder="09:00" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.time as string) || ""} onChange={e => setForm({ ...form, time: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Heure fin (HH:MM)</label>
                      <input type="text" placeholder="10:00" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.endTime as string) || ""} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Titre *</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.title as string) || ""} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={(form.type as string) || "talk"} onChange={e => setForm({ ...form, type: e.target.value })}>
                        {SESSION_TYPES.map(t => <option key={t} value={t} className="bg-dark-800">{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Intervenant</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.speakerName as string) || ""} onChange={e => setForm({ ...form, speakerName: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Salle</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.room as string) || ""} onChange={e => setForm({ ...form, room: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ordre</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.description as string) || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Visible depuis (datetime)</label>
                      <input type="datetime-local" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.displayFrom as string) || ""} onChange={e => setForm({ ...form, displayFrom: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Visible jusqu'à (datetime)</label>
                      <input type="datetime-local" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.displayUntil as string) || ""} onChange={e => setForm({ ...form, displayUntil: e.target.value })} />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                        Visible sur le site
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/sessions")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">Chargement...</p> : (
                <div className="space-y-8">
                  {sessionsByDate.sortedKeys.map(dateKey => (
                    <div key={dateKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-neon-green/10" />
                        <h2 className="text-neon-green text-xs font-bold uppercase tracking-widest px-2">
                          {dateKey === "Sans date" ? "Sans date" : new Date(dateKey + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </h2>
                        <div className="h-px flex-1 bg-neon-green/10" />
                      </div>
                      <div className="space-y-2">
                        {sessionsByDate.groups[dateKey]
                          .sort((a, b) => {
                            const timeA = (a.time as string) || "";
                            const timeB = (b.time as string) || "";
                            if (timeA !== timeB) return timeA.localeCompare(timeB);
                            return ((a.sortOrder as number) || 0) - ((b.sortOrder as number) || 0);
                          })
                          .map(s => (
                            <div
                              key={s.id as number}
                              className="flex gap-3 items-center rounded-lg p-3"
                              style={{ background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${typeColors[s.type as string] || "#444"}` }}
                            >
                              <div className="shrink-0 w-20 text-right">
                                <span className="text-neon-green/60 text-xs font-mono">{(s.time as string) || "--:--"}</span>
                                {!!(s.endTime as string) && <span className="block text-gray-600 text-xs font-mono">{s.endTime as string}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-white text-sm font-bold">{s.title as string}</span>
                                {!!(s.speakerName as string) && <span className="text-gray-500 text-xs ml-2">— {s.speakerName as string}</span>}
                                {!!(s.room as string) && <span className="text-gray-600 text-xs ml-2">· {s.room as string}</span>}
                              </div>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded shrink-0"
                                style={{ background: (typeColors[s.type as string] || "#444") + "20", color: typeColors[s.type as string] || "#888" }}
                              >
                                {s.type as string}
                              </span>
                              {!s.isVisible && <span className="text-xs text-gray-600 shrink-0">Masqué</span>}
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => { setForm({ ...s }); setEditing(s.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">Éditer</button>
                                <button onClick={() => del("/api/admin/sessions", s.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">Suppr.</button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                  {!data.sessions?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucune session — cliquez sur + Ajouter</p>}
                </div>
              )}
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

          {/* TEAM */}
          {tab === "team" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Équipe d&apos;organisation</h1>
                <button
                  onClick={() => { setForm({ isVisible: true, sortOrder: 0 }); setEditing(null); setShowForm(true); }}
                  className="btn-neon px-4 py-2 rounded text-xs"
                >
                  + Ajouter
                </button>
              </div>

              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier le Membre" : "Nouveau Membre"}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nom *</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.name as string) || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rôle *</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.role as string) || ""} onChange={e => setForm({ ...form, role: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">LinkedIn URL</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.linkedin as string) || ""} onChange={e => setForm({ ...form, linkedin: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Twitter @handle</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.twitter as string) || ""} onChange={e => setForm({ ...form, twitter: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ordre d&apos;affichage</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                        Visible sur le site
                      </label>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Photo</label>
                      <PhotoUploadField
                        value={(form.photoUrl as string) || ""}
                        folder="team"
                        onChange={url => setForm({ ...form, photoUrl: url })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Biographie</label>
                      <textarea rows={3} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.bio as string) || ""} onChange={e => setForm({ ...form, bio: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/team")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">Chargement...</p> : (
                <div className="space-y-2">
                  {((data.team || []) as Record<string, unknown>[]).map(m => (
                    <div key={m.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-4">
                      <Avatar photoUrl={m.photoUrl as string} name={m.name as string} size={12} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{m.name as string}</span>
                          {!m.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Masqué</span>}
                        </div>
                        <p className="text-neon-green/70 text-xs">{m.role as string}</p>
                        {!!(m.bio as string) && <p className="text-gray-500 text-xs mt-0.5 truncate">{m.bio as string}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setForm({ ...m }); setEditing(m.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green transition-colors px-2 py-1 border border-gray-700 rounded">Éditer</button>
                        <button onClick={() => del("/api/admin/team", m.id as number)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-900 rounded">Suppr.</button>
                      </div>
                    </div>
                  ))}
                  {!data.team?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun membre — cliquez sur + Ajouter</p>}
                </div>
              )}
            </div>
          )}

          {/* WORKSHOPS */}
          {tab === "workshops" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Ateliers</h1>
                <button onClick={() => { setForm({ level: "beginner", duration: "3h", isVisible: true, sortOrder: 0 }); setEditing(null); setShowForm(true); }} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">+ Ajouter</button>
              </div>
              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Titre</label>
                      <input className="cyber-input w-full px-3 py-2 rounded text-sm" value={(form.title as string) || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Description</label>
                      <textarea className="cyber-input w-full px-3 py-2 rounded text-sm" rows={3} value={(form.description as string) || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Niveau</label>
                      <select className="cyber-input w-full px-3 py-2 rounded text-sm" value={(form.level as string) || "beginner"} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                        <option value="beginner">Débutant</option>
                        <option value="intermediate">Intermédiaire</option>
                        <option value="advanced">Avancé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Durée</label>
                      <input className="cyber-input w-full px-3 py-2 rounded text-sm" value={(form.duration as string) || "3h"} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="3h" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Formateur</label>
                      <input className="cyber-input w-full px-3 py-2 rounded text-sm" value={(form.instructor as string) || ""} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} placeholder="Nom du formateur" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Places max</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-sm" value={(form.maxSeats as number) || ""} onChange={e => setForm(f => ({ ...f, maxSeats: e.target.value ? Number(e.target.value) : null }))} placeholder="Ex: 20" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Ordre</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-sm" value={(form.sortOrder as number) ?? 0} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm(f => ({ ...f, isVisible: e.target.checked }))} id="w-vis" />
                      <label htmlFor="w-vis" className="text-xs text-gray-400">Visible</label>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => save("/api/admin/workshops")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={cancelForm} className="px-4 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">Annuler</button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {((data.workshops || []) as Record<string, unknown>[]).map((w) => {
                  const levelColor: Record<string, string> = { beginner: "#00ff9d", intermediate: "#ffaa00", advanced: "#ff0066" };
                  const color = levelColor[w.level as string] || "#888";
                  return (
                    <div key={w.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: color + "15", border: `1px solid ${color}30` }}>🛠</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-sm">{w.title as string}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ color, background: color + "20", fontFamily: "'Share Tech Mono', monospace" }}>{w.level as string}</span>
                          <span className="text-gray-500 text-xs font-mono">⏱ {w.duration as string}</span>
                          {!!w.instructor && <span className="text-neon-green/50 text-xs">🎓 {w.instructor as string}</span>}
                          {!w.isVisible && <span className="text-xs text-gray-600">Masqué</span>}
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5 truncate">{w.description as string}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setForm({ ...w }); setEditing(w.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green transition-colors px-2 py-1 border border-gray-700 rounded">Éditer</button>
                        <button onClick={() => del("/api/admin/workshops", w.id as number)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-900 rounded">Suppr.</button>
                      </div>
                    </div>
                  );
                })}
                {!data.workshops?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun atelier — cliquez sur + Ajouter</p>}
              </div>
            </div>
          )}

          {/* PAST-SPEAKERS */}
          {tab === "past-speakers" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Anciens Intervenants</h1>
                <button
                  onClick={() => { setForm({ isVisible: true, sortOrder: 0, edition: "2024" }); setEditing(null); setShowForm(true); }}
                  className="btn-neon px-4 py-2 rounded text-xs"
                >
                  + Ajouter
                </button>
              </div>

              {showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier l'Intervenant" : "Nouvel Ancien Intervenant"}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nom *</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.name as string) || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Rôle / Titre</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.role as string) || ""} onChange={e => setForm({ ...form, role: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Entreprise</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.company as string) || ""} onChange={e => setForm({ ...form, company: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pays</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.country as string) || ""} onChange={e => setForm({ ...form, country: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Édition (ex: 2024)</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.edition as string) || ""} onChange={e => setForm({ ...form, edition: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ordre d&apos;affichage</label>
                      <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Photo</label>
                      <PhotoUploadField
                        value={(form.photoUrl as string) || ""}
                        folder="past-speakers"
                        onChange={url => setForm({ ...form, photoUrl: url })}
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                        <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
                        Visible sur le site
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/past-speakers")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">Chargement...</p> : (
                <div className="space-y-2">
                  {((data["past-speakers"] || []) as Record<string, unknown>[]).map(ps => (
                    <div key={ps.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-4">
                      <Avatar photoUrl={ps.photoUrl as string} name={ps.name as string} size={12} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold text-sm">{ps.name as string}</span>
                          {!!(ps.edition as string) && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green/70">{ps.edition as string}</span>
                          )}
                          {!ps.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Masqué</span>}
                        </div>
                        <p className="text-gray-400 text-xs">
                          {(ps.role as string) || ""}
                          {(ps.company as string) ? ` · ${ps.company}` : ""}
                          {(ps.country as string) ? ` · ${ps.country}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setForm({ ...ps }); setEditing(ps.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green transition-colors px-2 py-1 border border-gray-700 rounded">Éditer</button>
                        <button onClick={() => del("/api/admin/past-speakers", ps.id as number)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-900 rounded">Suppr.</button>
                      </div>
                    </div>
                  ))}
                  {!data["past-speakers"]?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun ancien intervenant — cliquez sur + Ajouter</p>}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
