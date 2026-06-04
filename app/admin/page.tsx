"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PROFILES } from "@/lib/adminProfiles";

type Tab = "dashboard" | "speakers" | "sponsors" | "sessions" | "workshops" | "cfp" | "volunteers" | "registrations" | "newsletter" | "team" | "past-speakers" | "users" | "onboarding" | "communication" | "sponsor-pipeline" | "budget" | "logistics" | "certificates" | "export" | "prospection" | "tickets" | "sponsor-packages";

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

function AdminUsersPanel() {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ profileId: "coordinateur_cfp" });
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const selectedProfile = ADMIN_PROFILES.find(p => p.id === (form.profileId as string));

  const saveUser = async () => {
    if (!form.name || !form.email) return;
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const d = await res.json() as { name: string; email: string; tempPassword: string };
      setCreated({ name: d.name, email: d.email, tempPassword: d.tempPassword });
      setShowForm(false);
      setForm({ profileId: "coordinateur_cfp" });
      await loadUsers();
    }
    setLoading(false);
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive } : u));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Utilisateurs Admin</h1>
          <p className="text-gray-500 text-xs mt-1">Les utilisateurs reçoivent leurs identifiants par email à la création.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-sm">+ Nouvel utilisateur</button>
      </div>

      {created && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-md w-full">
            <h3 className="text-white font-bold mb-4">✅ Utilisateur créé</h3>
            <p className="text-gray-400 text-sm mb-4">Un email a été envoyé à <strong className="text-white">{created.email}</strong> avec les identifiants.</p>
            <div className="bg-black/50 border border-neon-green/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Mot de passe temporaire</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black font-mono" style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>{created.tempPassword}</span>
                <button onClick={() => navigator.clipboard.writeText(created.tempPassword)} className="text-xs text-gray-500 hover:text-white transition-colors px-2">Copier</button>
              </div>
            </div>
            <button onClick={() => setCreated(null)} className="btn-neon w-full py-2 rounded text-sm">Fermer</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="cyber-card rounded-xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4 text-sm">Nouveau compte administrateur</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom complet</label>
              <input className="cyber-input w-full text-sm rounded px-3 py-2" placeholder="Jean Mbarga" value={(form.name as string) || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <input type="email" className="cyber-input w-full text-sm rounded px-3 py-2" placeholder="jean@eyesopensecurity.com" value={(form.email as string) || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">Profil de rôle</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ADMIN_PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setForm(f => ({ ...f, profileId: profile.id }))}
                  className={`p-3 rounded-lg border text-left transition-all ${form.profileId === profile.id ? "border-opacity-60" : "border-gray-800 hover:border-gray-600"}`}
                  style={form.profileId === profile.id ? { borderColor: profile.color, background: profile.color + "15" } : {}}
                >
                  <p className="text-xs font-bold" style={{ color: form.profileId === profile.id ? profile.color : "#888" }}>{profile.name}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{profile.description}</p>
                </button>
              ))}
            </div>
          </div>
          {selectedProfile && (
            <div className="mb-4 p-3 rounded-lg border border-gray-800">
              <p className="text-xs text-gray-500 mb-2">Accès inclus</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedProfile.permissions).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-0.5 rounded" style={{ background: v === "write" ? "#00ff9d15" : "#0066ff15", color: v === "write" ? "#00ff9d" : "#0066ff" }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveUser} disabled={loading || !form.name || !form.email} className="btn-neon px-4 py-2 rounded text-sm">
              {loading ? "Création..." : "Créer et envoyer les identifiants"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white transition-colors">Annuler</button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Profils disponibles</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ADMIN_PROFILES.map(profile => (
            <div key={profile.id} className="cyber-card rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: profile.color }} />
                <span className="text-white text-xs font-bold">{profile.name}</span>
              </div>
              <p className="text-gray-600 text-xs">{profile.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">Comptes existants ({users.length})</h3>
        <div className="space-y-2">
          {users.map(u => {
            const profile = ADMIN_PROFILES.find(p => p.id === (u.profileId as string));
            return (
              <div key={u.id as number} className="cyber-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: (profile?.color || "#888") + "20", color: profile?.color || "#888" }}>
                    {(u.name as string).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">{u.name as string}</p>
                    <p className="text-gray-500 text-xs">{u.email as string}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {profile && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: profile.color + "20", color: profile.color }}>
                      {profile.name}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "bg-neon-green/10 text-neon-green" : "bg-gray-800 text-gray-600"}`}>
                    {u.isActive ? "Actif" : "Inactif"}
                  </span>
                  <button onClick={() => toggleActive(u.id as number, !(u.isActive as boolean))} className="text-xs text-gray-600 hover:text-white transition-colors">
                    {u.isActive ? "Désactiver" : "Activer"}
                  </button>
                </div>
              </div>
            );
          })}
          {!users.length && <p className="text-gray-600 text-xs py-8 text-center">Aucun utilisateur créé</p>}
        </div>
      </div>
    </div>
  );
}

function AiScoreBadge({ score, analysis }: { score: number | null; analysis: string | null }) {
  if (score === null) return null;
  const color = score >= 7 ? "#00ff9d" : score >= 5 ? "#ffaa00" : "#ff0066";
  let parsed: { summary?: string; recommendation?: string } = {};
  try { parsed = JSON.parse(analysis || "{}"); } catch { /* ignore */ }
  return (
    <div className="flex items-center gap-1" title={parsed.summary || ""}>
      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ background: color + "20", color, fontFamily: "'Share Tech Mono', monospace" }}>
        IA {score.toFixed(1)}/10
      </span>
      {parsed.recommendation && (
        <span className="text-xs text-gray-600">{parsed.recommendation}</span>
      )}
    </div>
  );
}

function ProspectionPanel({ leads, onRefresh }: { leads: Record<string, unknown>[]; onRefresh: () => void }) {
  const [searchTab, setSearchTab] = useState<"apollo" | "places">("apollo");
  const [apolloKeywords, setApolloKeywords] = useState("cybersecurity,technology,telecom,finance");
  const [placesQuery, setPlacesQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Record<string, unknown> | null>(null);
  const [emailResult, setEmailResult] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "added">("all");

  useEffect(() => {
    fetch("/api/admin/sponsor-packages").then(r => r.json()).then(setPackages).catch(() => {});
  }, []);

  const runApolloSearch = async () => {
    setSearching(true);
    await fetch("/api/admin/ai/apollo-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: apolloKeywords.split(",").map(k => k.trim()).filter(Boolean) }),
    });
    await onRefresh();
    setSearching(false);
  };

  const runPlacesSearch = async () => {
    if (!placesQuery.trim()) return;
    setSearching(true);
    await fetch("/api/admin/ai/places-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: placesQuery }),
    });
    await onRefresh();
    setSearching(false);
  };

  const generateEmail = async (lead: Record<string, unknown>) => {
    setEmailTarget(lead);
    setEmailResult(null);
    setGeneratingEmail(true);
    const pkg = packages.find(p => p.tier === lead.recommendedPackage);
    const res = await fetch("/api/admin/ai/sponsor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org: lead.org,
        contact: lead.contactName,
        contactTitle: lead.contactTitle,
        package: lead.recommendedPackage,
        packagePrice: pkg ? `${(pkg.price as number).toLocaleString("fr-FR")} FCFA` : undefined,
        sector: lead.sector,
        mode: "prospect",
      }),
    });
    if (res.ok) setEmailResult(await res.json());
    setGeneratingEmail(false);
  };

  const addToPipeline = async (lead: Record<string, unknown>) => {
    await fetch("/api/admin/ai/prospect-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, addedToPipeline: true }),
    });
    onRefresh();
  };

  const scoreColor = (s: number | null | undefined) => {
    if (s === null || s === undefined) return "#555";
    return s >= 7 ? "#00ff9d" : s >= 5 ? "#ffaa00" : "#ff0066";
  };

  const seen = new Set<string>();
  const deduped = leads.filter(l => {
    const key = (l.org as string).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const filtered = deduped.filter(l => {
    if (filter === "pending") return !l.addedToPipeline;
    if (filter === "added") return !!l.addedToPipeline;
    return true;
  });

  const pending = deduped.filter(l => !l.addedToPipeline).length;
  const added = deduped.filter(l => !!l.addedToPipeline).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Prospection Sponsors IA</h1>
        <p className="text-gray-500 text-xs mt-1">Workflow : Recherche → Leads → Scoring IA → Email personnalisé → Pipeline</p>
      </div>

      {emailTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{emailTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{emailTarget.sector as string} · Package recommandé : <span style={{ color: "#00ff9d" }}>{(emailTarget.recommendedPackage as string) || "—"}</span></p>
              </div>
              <button onClick={() => { setEmailTarget(null); setEmailResult(null); }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {generatingEmail && <p className="text-gray-500 text-xs text-center py-8">Génération de l&apos;email personnalisé...</p>}
            {emailResult && (
              <div className="space-y-4">
                {[
                  { lang: "Français", subject: emailResult.subjectFr, body: emailResult.bodyFr },
                  { lang: "English", subject: emailResult.subjectEn, body: emailResult.bodyEn },
                ].map(e => (
                  <div key={e.lang} className="border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase">{e.lang}</span>
                      <button onClick={() => navigator.clipboard.writeText(`Objet : ${e.subject}\n\n${e.body}`)} className="text-xs hover:underline" style={{ color: "#00ff9d" }}>Copier</button>
                    </div>
                    <p className="text-white text-xs font-bold mb-2">Objet : {e.subject}</p>
                    <p className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed">{e.body}</p>
                  </div>
                ))}
                <button
                  onClick={() => addToPipeline(emailTarget)}
                  className="w-full py-2 rounded text-sm font-bold transition-all"
                  style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d40" }}
                >
                  + Ajouter au pipeline sponsors
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cyber-card rounded-xl p-5 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00ff9d" }}>
          Étape 1 — Recherche de prospects
        </h2>
        <div className="flex gap-2 mb-4">
          {(["apollo", "places"] as const).map(t => (
            <button key={t} onClick={() => setSearchTab(t)} className={`text-xs px-4 py-2 rounded transition-all ${searchTab === t ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 border border-gray-800"}`}>
              {t === "apollo" ? "🌍 Apollo.io — Grandes entreprises" : "📍 Google Places — PME locales"}
            </button>
          ))}
        </div>
        {searchTab === "apollo" ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Secteurs / mots-clés (séparés par virgules)</label>
              <input value={apolloKeywords} onChange={e => setApolloKeywords(e.target.value)} className="cyber-input w-full text-xs rounded px-3 py-2" placeholder="cybersecurity,technology,telecom,finance,banking" />
            </div>
            <button onClick={runApolloSearch} disabled={searching} className="btn-neon px-5 py-2 rounded text-xs self-end shrink-0">
              {searching ? "Recherche..." : "🔍 Lancer"}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Recherche (ex: entreprise tech Douala, banque Cameroun)</label>
              <input value={placesQuery} onChange={e => setPlacesQuery(e.target.value)} className="cyber-input w-full text-xs rounded px-3 py-2" placeholder="banque Douala, opérateur télécom Cameroun..." onKeyDown={e => e.key === "Enter" && runPlacesSearch()} />
            </div>
            <button onClick={runPlacesSearch} disabled={searching || !placesQuery.trim()} className="btn-neon px-5 py-2 rounded text-xs self-end shrink-0">
              {searching ? "Recherche..." : "🔍 Lancer"}
            </button>
          </div>
        )}
        <p className="text-gray-700 text-xs mt-2">
          Apollo.io couvre les entreprises de +50 employés en Afrique · Google Places couvre les PME locales de Douala
        </p>
      </div>

      <div className="cyber-card rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0066ff" }}>
            Étapes 2 &amp; 3 — Leads ({deduped.length}) · Scoring IA
          </h2>
          <div className="flex gap-2">
            {(["all", "pending", "added"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded transition-all ${filter === f ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"}`}>
                {f === "all" ? `Tous (${deduped.length})` : f === "pending" ? `À traiter (${pending})` : `En pipeline (${added})`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-gray-600 text-xs py-8 text-center">
            {deduped.length === 0 ? "Aucun prospect. Lancez une recherche ci-dessus." : "Aucun prospect dans ce filtre."}
          </p>
        )}

        <div className="space-y-3">
          {filtered.sort((a, b) => ((b.aiScore as number) || 0) - ((a.aiScore as number) || 0)).map(lead => (
            <div key={lead.id as number} className={`border rounded-xl p-4 transition-all ${lead.addedToPipeline ? "border-gray-800 opacity-60" : "border-gray-700 hover:border-gray-500"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: lead.source === "apollo" ? "#0066ff15" : "#cc00ff15", color: lead.source === "apollo" ? "#0066ff" : "#cc00ff" }}>
                      {lead.source as string}
                    </span>
                    {lead.aiScore !== null && lead.aiScore !== undefined && (
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ background: scoreColor(lead.aiScore as number) + "20", color: scoreColor(lead.aiScore as number) }}>
                        Score {(lead.aiScore as number).toFixed(1)}/10
                      </span>
                    )}
                    {!!(lead.recommendedPackage as string) && (
                      <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "#ffaa0040", color: "#ffaa00" }}>
                        {lead.recommendedPackage as string}
                      </span>
                    )}
                    {!!lead.addedToPipeline && <span className="text-xs text-neon-green">✓ En pipeline</span>}
                  </div>
                  <p className="text-white font-bold text-sm">{lead.org as string}</p>
                  {(!!lead.sector || !!lead.city) && (
                    <p className="text-gray-500 text-xs mt-0.5">{lead.sector as string}{lead.city ? ` · ${lead.city}` : ""}</p>
                  )}
                  {!!lead.contactName && (
                    <p className="text-xs mt-1" style={{ color: "#00ff9d" }}>
                      👤 {lead.contactName as string}{lead.contactTitle ? ` — ${lead.contactTitle}` : ""}
                    </p>
                  )}
                  {!!lead.contactEmail && (
                    <p className="text-gray-400 text-xs">✉ {lead.contactEmail as string}</p>
                  )}
                  {!!lead.website && (
                    <a href={lead.website as string} target="_blank" rel="noreferrer" className="text-xs hover:underline block mt-0.5" style={{ color: "#0066ff" }}>
                      🌐 {lead.website as string}
                    </a>
                  )}
                  {!lead.contactEmail && lead.source === "google_places" && (
                    <p className="text-gray-700 text-xs mt-0.5 italic">Email non disponible via Google Places — consulter le site web</p>
                  )}
                  {!!lead.aiScoreReason && (
                    <p className="text-gray-600 text-xs mt-1 italic">{lead.aiScoreReason as string}</p>
                  )}
                </div>
                {!lead.addedToPipeline && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => generateEmail(lead)}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}
                    >
                      ✉ Générer email
                    </button>
                    <button
                      onClick={() => addToPipeline(lead)}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}
                    >
                      + Pipeline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {packages.length > 0 && (
        <div className="cyber-card rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500">Packages de sponsoring disponibles</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {packages.map(pkg => {
              const perks = JSON.parse((pkg.perksFr as string) || "[]") as string[];
              return (
                <div key={pkg.id as number} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: (pkg.highlightColor as string) || "#888" }}>{pkg.tier as string}</span>
                    <span className="text-xs font-mono text-white">{(pkg.price as number) > 0 ? `${(pkg.price as number).toLocaleString("fr-FR")} FCFA` : "Échange"}</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-2">{pkg.nameFr as string}</p>
                  <ul className="space-y-0.5">
                    {perks.slice(0, 3).map((p, i) => (
                      <li key={i} className="text-gray-600 text-xs flex gap-1"><span style={{ color: (pkg.highlightColor as string) || "#888" }}>·</span>{p}</li>
                    ))}
                    {perks.length > 3 && <li className="text-gray-700 text-xs">+{perks.length - 3} avantages...</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


// ---- Communication Panel ----

function CommunicationPanel() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [platforms, setPlatforms] = useState({ linkedin: true, twitter: false, instagram: false });
  const [lang, setLang] = useState<"fr" | "en" | "both">("both");
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [linkedinPosts, setLinkedinPosts] = useState<Record<string, unknown>[]>([]);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  // Email templates
  const [templates, setTemplates] = useState<Record<string, unknown>[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState<Record<string, unknown>>({});
  const [sending, setSending] = useState<number | null>(null);
  // Dynamic context
  const [contextType, setContextType] = useState<"speaker" | "session" | "workshop" | "sponsor" | "countdown" | "cfp" | "inscriptions" | "ctf" | "custom">("speaker");
  const [contextData, setContextData] = useState<{
    speakers: Record<string, unknown>[];
    sessions: Record<string, unknown>[];
    workshops: Record<string, unknown>[];
    sponsors: Record<string, unknown>[];
    registrationCount: number;
    daysUntil: number;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const generateBriefFromContext = (type: string, item: Record<string, unknown> | null, data: typeof contextData): string => {
    if (!data) return "";
    switch (type) {
      case "speaker":
        if (!item) return "";
        return `Annonce de la conférence de ${item.name as string}, ${item.title as string}${item.company ? ` chez ${item.company}` : ""}${item.country ? ` (${item.country})` : ""}. Talk : "${item.talkTitle || "à confirmer"}". ${item.isKeynote ? "Keynote speaker de l'événement. " : ""}Créer de l'enthousiasme et mettre en avant son expertise pour EOCON 2026.`;
      case "session":
        if (!item) return "";
        return `Mise en avant de la session "${item.title as string}"${item.speakerName ? ` par ${item.speakerName}` : ""}${item.date ? ` le ${item.date}` : ""}${item.time ? ` à ${item.time}` : ""}. ${item.description ? `Contexte : ${(item.description as string).slice(0, 150)}...` : ""}`;
      case "workshop":
        if (!item) return "";
        return `Annonce du workshop "${item.title as string}"${item.instructor ? ` animé par ${item.instructor}` : ""}, niveau ${item.level as string}, durée ${item.duration as string}. ${(item.description as string).slice(0, 150)}... Inviter les participants à s'inscrire.`;
      case "sponsor":
        if (!item) return "";
        return `Mise en avant et remerciement de ${item.name as string}, partenaire ${item.tier as string} d'EOCON 2026. Valoriser leur soutien et leur engagement pour la cybersécurité en Afrique.`;
      case "countdown":
        return `Compte à rebours EOCON 2026 : J-${data.daysUntil} ! Créer l'urgence et l'excitation. ${data.daysUntil <= 7 ? "Derniers rappels pratiques (lieu, programme)." : data.daysUntil <= 30 ? "Rappeler les points clés de l'événement." : "Présenter les highlights du programme à venir."}`;
      case "cfp":
        return "Annonce liée au Call for Papers (CFP) d'EOCON 2026. Préciser s'il s'agit de l'ouverture, d'un rappel de deadline, ou de l'annonce des résultats de sélection.";
      case "inscriptions":
        return `Les inscriptions pour EOCON 2026 sont ouvertes ! ${data.registrationCount > 0 ? `Déjà ${data.registrationCount} participants inscrits. ` : ""}Inviter à s'inscrire, mettre en avant les types de billets disponibles (Standard, Student, VIP, Early Bird).`;
      case "ctf":
        return "Annonce du CTF (Capture The Flag) EOCON 2026 — EOCTF. Présenter le challenge cybersécurité, inviter les participants à s'inscrire à la compétition, mettre en avant les lots et le niveau attendu.";
      case "custom":
        return "";
      default:
        return "";
    }
  };

  const loadLinkedinPosts = useCallback(async () => {
    const res = await fetch("/api/admin/ai/social-posts");
    if (res.ok) setLinkedinPosts(await res.json());
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/email-templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  const loadContext = useCallback(async () => {
    const res = await fetch("/api/admin/communication-context");
    if (res.ok) setContextData(await res.json());
  }, []);

  useEffect(() => { loadLinkedinPosts(); loadTemplates(); loadContext(); }, [loadLinkedinPosts, loadTemplates, loadContext]);

  // Calendar helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Posts by date for calendar dots
  const postsByDate: Record<string, number> = {};
  linkedinPosts.forEach(p => {
    const d = p.scheduledAt || p.publishedAt;
    if (d) {
      const key = new Date(d as string).toISOString().slice(0, 10);
      postsByDate[key] = (postsByDate[key] || 0) + 1;
    }
  });

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "socials");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      setPostImage(url);
    }
    setUploadingImage(false);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDay(date);
    setGeneratedPosts(null);
    setPanelOpen(true);
    setPostImage(null);
    setScheduleDate(date.toISOString().slice(0, 10) + "T10:00");
    const newBrief = generateBriefFromContext(contextType, selectedItem, contextData);
    setBrief(newBrief);
  };

  const generatePosts = async () => {
    if (!brief.trim()) return;
    setGenerating(true);
    const res = await fetch("/api/admin/ai/generate-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief, contextType, contextItem: selectedItem }),
    });
    if (res.ok) setGeneratedPosts(await res.json());
    setGenerating(false);
  };

  const savePosts = async () => {
    if (!generatedPosts || !selectedDay) return;
    setSaving(true);
    const entries: { platform: string; lang: string; content: string }[] = [];
    if (platforms.linkedin) {
      if (lang !== "en") entries.push({ platform: "linkedin", lang: "fr", content: generatedPosts.linkedin_fr || "" });
      if (lang !== "fr") entries.push({ platform: "linkedin", lang: "en", content: generatedPosts.linkedin_en || "" });
    }
    if (platforms.twitter) {
      if (lang !== "en") entries.push({ platform: "twitter", lang: "fr", content: generatedPosts.twitter_fr || "" });
      if (lang !== "fr") entries.push({ platform: "twitter", lang: "en", content: generatedPosts.twitter_en || "" });
    }
    if (platforms.instagram) {
      if (lang !== "en") entries.push({ platform: "instagram", lang: "fr", content: generatedPosts.instagram_fr || "" });
      if (lang !== "fr") entries.push({ platform: "instagram", lang: "en", content: generatedPosts.instagram_en || "" });
    }
    for (const entry of entries) {
      // Save post via generate-posts then PATCH with imageUrl + scheduledAt
      const saveRes = await fetch("/api/admin/ai/generate-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: entry.content,
          contextType,
          contextItem: selectedItem,
          platform: entry.platform,
          lang: entry.lang,
          saveOnly: true,
          content: entry.content,
          imageUrl: postImage || undefined,
          scheduledAt: scheduleDate || undefined,
        }),
      });
      if (!saveRes.ok) {
        // Fallback: create via social-posts PATCH on existing draft
        const freshRes = await fetch("/api/admin/ai/social-posts");
        if (freshRes.ok) {
          const fresh = await freshRes.json() as Record<string, unknown>[];
          const match = fresh.find(p => p.platform === entry.platform && p.lang === entry.lang && p.status === "draft");
          if (match) {
            await fetch("/api/admin/ai/social-posts", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: match.id, content: entry.content, imageUrl: postImage || undefined, scheduledAt: scheduleDate || undefined }),
            });
          }
        }
      }
    }
    await loadLinkedinPosts();
    setPanelOpen(false);
    setGeneratedPosts(null);
    setSaving(false);
  };

  const publishNow = async (id: number) => {
    setPublishing(id);
    await fetch("/api/admin/ai/publish-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadLinkedinPosts();
    setPublishing(null);
  };

  const schedulePost = async (id: number) => {
    if (!scheduleDate) return;
    await fetch("/api/admin/ai/publish-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scheduledAt: scheduleDate }),
    });
    setScheduleId(null);
    setScheduleDate("");
    await loadLinkedinPosts();
  };

  const sendTemplate = async (id: number) => {
    setSending(id);
    await fetch("/api/admin/email-templates/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: id }),
    });
    setSending(null);
    await loadTemplates();
  };

  const saveTemplate = async () => {
    await fetch("/api/admin/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templateForm),
    });
    setShowTemplateForm(false);
    setTemplateForm({});
    await loadTemplates();
  };

  const statusColors: Record<string, string> = { draft: "#888", scheduled: "#ffaa00", published: "#00ff9d", failed: "#ff0066" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Communication</h1>

      {/* Calendar + Panel */}
      <div className="flex gap-4">
        {/* Calendar */}
        <div className="cyber-card rounded-xl p-5 flex-1 min-w-0">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); }} className="text-gray-500 hover:text-white px-2">←</button>
            <span className="text-white font-bold text-sm">{monthNames[currentMonth]} {currentYear}</span>
            <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); }} className="text-gray-500 hover:text-white px-2">→</button>
          </div>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map(d => (
              <div key={d} className="text-center text-gray-600 text-xs py-1">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const hasPost = postsByDate[dateKey] || 0;
              const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
              const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === currentMonth && selectedDay?.getFullYear() === currentYear;
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`relative aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-all ${
                    isSelected ? "bg-neon-green/20 text-neon-green border border-neon-green/50" :
                    isToday ? "bg-white/10 text-white border border-white/20" :
                    "text-gray-500 hover:bg-white/[0.05] hover:text-gray-300"
                  }`}
                >
                  <span>{day}</span>
                  {hasPost > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(hasPost, 3) }).map((_, di) => (
                        <div key={di} className="w-1 h-1 rounded-full" style={{ background: "#0066ff" }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-gray-700 text-xs mt-3 text-center">Cliquez sur un jour pour planifier un post</p>
        </div>

        {/* Side panel */}
        {panelOpen && selectedDay && (
          <div className="cyber-card rounded-xl p-5 w-96 shrink-0 overflow-y-auto max-h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">
                {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <button onClick={() => setPanelOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            {/* Context type selector */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Type de contenu</p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { key: "speaker", icon: "🎤", label: "Speaker" },
                  { key: "session", icon: "📋", label: "Session" },
                  { key: "workshop", icon: "🛠", label: "Workshop" },
                  { key: "sponsor", icon: "🏢", label: "Sponsor" },
                  { key: "countdown", icon: "⏱", label: "Compte à rebours" },
                  { key: "cfp", icon: "📝", label: "CFP" },
                  { key: "inscriptions", icon: "🎟", label: "Inscriptions" },
                  { key: "ctf", icon: "🏆", label: "CTF" },
                  { key: "custom", icon: "✏️", label: "Personnalisé" },
                ] as const).map(ctx => (
                  <button
                    key={ctx.key}
                    onClick={() => {
                      setContextType(ctx.key);
                      setSelectedItem(null);
                      const newBrief = generateBriefFromContext(ctx.key, null, contextData);
                      setBrief(newBrief);
                      setGeneratedPosts(null);
                    }}
                    className={`p-2 rounded-lg border text-left transition-all ${contextType === ctx.key ? "border-neon-green/50 bg-neon-green/10" : "border-gray-800 hover:border-gray-600"}`}
                  >
                    <span className="text-sm block">{ctx.icon}</span>
                    <span className={`text-xs ${contextType === ctx.key ? "text-neon-green" : "text-gray-500"}`}>{ctx.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item selector (for speaker/session/workshop/sponsor) */}
            {contextData && ["speaker", "session", "workshop", "sponsor"].includes(contextType) && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
                  {contextType === "speaker" ? "Sélectionner un speaker" :
                   contextType === "session" ? "Sélectionner une session" :
                   contextType === "workshop" ? "Sélectionner un workshop" :
                   "Sélectionner un sponsor"}
                </p>
                <select
                  className="cyber-input w-full text-xs rounded px-3 py-2"
                  value={(selectedItem?.id as number) || ""}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    let items: Record<string, unknown>[] = [];
                    if (contextType === "speaker") items = contextData.speakers;
                    else if (contextType === "session") items = contextData.sessions;
                    else if (contextType === "workshop") items = contextData.workshops;
                    else if (contextType === "sponsor") items = contextData.sponsors;
                    const item = items.find(i => i.id === id) || null;
                    setSelectedItem(item);
                    const newBrief = generateBriefFromContext(contextType, item, contextData);
                    setBrief(newBrief);
                    setGeneratedPosts(null);
                  }}
                >
                  <option value="">-- Choisir --</option>
                  {(contextType === "speaker" ? contextData.speakers :
                    contextType === "session" ? contextData.sessions :
                    contextType === "workshop" ? contextData.workshops :
                    contextData.sponsors
                  ).map(item => (
                    <option key={item.id as number} value={item.id as number}>
                      {contextType === "speaker" ? `${item.name as string} — ${(item.talkTitle as string) || "Talk à confirmer"}` :
                       contextType === "session" ? `${item.title as string}${item.speakerName ? ` (${item.speakerName as string})` : ""}` :
                       contextType === "workshop" ? `${item.title as string} — ${item.level as string}` :
                       `${item.name as string} (${item.tier as string})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Countdown info */}
            {contextType === "countdown" && contextData && (
              <div className="mb-3 p-2 rounded-lg border border-gray-800">
                <p className="text-xs text-neon-green font-mono">J-{contextData.daysUntil} jusqu'à EOCON 2026</p>
                <p className="text-gray-600 text-xs">28 novembre 2026</p>
              </div>
            )}

            {/* Inscriptions stats */}
            {contextType === "inscriptions" && contextData && (
              <div className="mb-3 p-2 rounded-lg border border-gray-800">
                <p className="text-xs text-white font-mono">{contextData.registrationCount} inscrits</p>
                <p className="text-gray-600 text-xs">au {new Date().toLocaleDateString("fr-FR")}</p>
              </div>
            )}

            {/* Platforms */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Plateformes</p>
              <div className="flex gap-3">
                {(["linkedin", "twitter", "instagram"] as const).map(p => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={platforms[p]} onChange={e => setPlatforms(prev => ({ ...prev, [p]: e.target.checked }))} className="accent-neon-green w-3 h-3" />
                    <span className="text-xs text-gray-400 capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Langue</p>
              <div className="flex gap-2">
                {(["fr", "en", "both"] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)} className={`text-xs px-3 py-1 rounded transition-all ${lang === l ? "bg-neon-green/20 text-neon-green border border-neon-green/40" : "text-gray-500 border border-gray-800"}`}>
                    {l === "both" ? "FR+EN" : l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Brief */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Brief</p>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} className="cyber-input w-full text-xs rounded p-2 h-20 resize-none" placeholder="Décrivez le contenu du post..." />
            </div>

            {/* Image attachment */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Image (optionnel)</p>
              {postImage ? (
                <div className="relative rounded-lg overflow-hidden border border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={postImage} alt="Post" className="w-full h-28 object-cover" />
                  <button
                    onClick={() => setPostImage(null)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                  >✕</button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-700 rounded-lg px-3 py-2 hover:border-gray-500 transition-colors">
                  <span className="text-gray-600 text-xs">{uploadingImage ? "Upload en cours..." : "📎 Ajouter une image (jpg, png, webp)"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>

            <button onClick={generatePosts} disabled={generating || !brief.trim()} className="btn-neon w-full py-2 rounded text-xs mb-4">
              {generating ? "Génération en cours..." : "✨ Générer avec IA"}
            </button>

            {/* Generated posts preview */}
            {generatedPosts && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Posts générés</p>
                {(["linkedin", "twitter", "instagram"] as const).filter(p => platforms[p]).map(platform => (
                  <div key={platform} className="border border-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 capitalize mb-1">{platform}</p>
                    <p className="text-gray-400 text-xs line-clamp-3">
                      {lang !== "en" ? generatedPosts[`${platform}_fr`] : generatedPosts[`${platform}_en`]}
                    </p>
                  </div>
                ))}
                <button onClick={savePosts} disabled={saving} className="w-full py-2 rounded text-xs transition-all" style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d40" }}>
                  {saving ? "Enregistrement..." : "💾 Enregistrer & Planifier"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scheduled/published posts list */}
      <div className="cyber-card rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#0066ff" }}>Posts planifiés & publiés</h3>
        {linkedinPosts.length === 0 && <p className="text-gray-600 text-xs text-center py-4">Aucun post. Cliquez sur un jour du calendrier pour créer.</p>}
        <div className="space-y-2">
          {linkedinPosts.map(post => {
            const color = statusColors[post.status as string] || "#888";
            return (
              <div key={post.id as number} className="border border-gray-800 rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono capitalize" style={{ background: color + "20", color }}>{post.status as string}</span>
                    <span className="text-xs text-gray-600 capitalize">{post.platform as string} · {post.lang as string}</span>
                    {!!post.scheduledAt && <span className="text-xs text-gray-600">📅 {new Date(post.scheduledAt as string).toLocaleDateString("fr-FR")}</span>}
                  </div>
                  <p className="text-gray-400 text-xs line-clamp-2">{post.content as string}</p>
                  {!!post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.imageUrl as string} alt="" className="mt-1 h-12 w-20 object-cover rounded" />
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {post.status === "draft" && (
                    <>
                      <button onClick={() => publishNow(post.id as number)} disabled={publishing === (post.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff30" }}>
                        {publishing === (post.id as number) ? "..." : "▶"}
                      </button>
                      <button onClick={() => { setScheduleId(post.id as number); setScheduleDate(""); }} className="text-xs px-2 py-1 rounded" style={{ background: "#ffaa0020", color: "#ffaa00", border: "1px solid #ffaa0030" }}>🕐</button>
                    </>
                  )}
                  {post.status === "published" && !!post.linkedinPostId && (
                    <a href={`https://www.linkedin.com/feed/update/${post.linkedinPostId as string}/`} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded" style={{ color: "#00ff9d" }}>↗</a>
                  )}
                  {scheduleId === (post.id as number) && (
                    <div className="flex gap-1 items-center">
                      <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="cyber-input text-xs rounded px-1 py-0.5 w-36" />
                      <button onClick={() => schedulePost(post.id as number)} className="btn-neon text-xs px-2 py-1 rounded">OK</button>
                      <button onClick={() => setScheduleId(null)} className="text-gray-500 text-xs">✕</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Email templates */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Templates Email</h3>
          <button onClick={() => setShowTemplateForm(!showTemplateForm)} className="btn-neon px-3 py-1.5 rounded text-xs">+ Template</button>
        </div>
        {showTemplateForm && (
          <div className="border border-gray-800 rounded-lg p-4 mb-4 space-y-2">
            <input placeholder="Nom du template" className="cyber-input w-full text-xs rounded px-3 py-2" value={(templateForm.name as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            <input placeholder="Objet email" className="cyber-input w-full text-xs rounded px-3 py-2" value={(templateForm.subject as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} />
            <select className="cyber-input w-full text-xs rounded px-3 py-2" value={(templateForm.segment as string) || "all"} onChange={e => setTemplateForm(f => ({ ...f, segment: e.target.value }))}>
              <option value="all">Tous</option>
              <option value="registered">Inscrits</option>
              <option value="cfp_accepted">Speakers acceptés</option>
              <option value="volunteers">Bénévoles acceptés</option>
              <option value="newsletter">Newsletter</option>
            </select>
            <textarea placeholder="Corps HTML de l'email" className="cyber-input w-full text-xs rounded px-3 py-2 h-24 resize-none" value={(templateForm.htmlBody as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, htmlBody: e.target.value }))} />
            <div className="flex gap-2">
              <button onClick={saveTemplate} className="btn-neon px-3 py-1.5 rounded text-xs">Enregistrer</button>
              <button onClick={() => setShowTemplateForm(false)} className="text-gray-500 text-xs hover:text-white px-2">Annuler</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id as number} className="border border-gray-800 rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-xs font-bold">{t.name as string}</p>
                <p className="text-gray-500 text-xs">{t.subject as string} · <span className="text-gray-600">{t.segment as string}</span></p>
                {!!t.sentAt && <p className="text-gray-700 text-xs">Envoyé le {new Date(t.sentAt as string).toLocaleDateString("fr-FR")}</p>}
              </div>
              <button onClick={() => sendTemplate(t.id as number)} disabled={sending === (t.id as number)} className="text-xs px-3 py-1.5 rounded shrink-0" style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                {sending === (t.id as number) ? "Envoi..." : "▶ Envoyer"}
              </button>
            </div>
          ))}
          {!templates.length && <p className="text-gray-700 text-xs text-center py-3">Aucun template. Créez-en un.</p>}
        </div>
      </div>
    </div>
  );
}

// ---- Sponsor Pipeline Panel ----
const PROSPECT_STATUSES = [
  { value: "contacted", label: "Contacté", color: "#0066ff" },
  { value: "meeting", label: "Réunion", color: "#cc00ff" },
  { value: "positive", label: "Avancée positive", color: "#00ff9d" },
  { value: "negative", label: "Avancée négative", color: "#ff6600" },
  { value: "concluded", label: "Conclu", color: "#00ff9d" },
  { value: "abandoned", label: "Abandonné", color: "#ff0066" },
  { value: "paused", label: "En pause", color: "#888" },
];

function SponsorPipelinePanel({ prospects, onRefresh }: { prospects: Record<string, unknown>[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ status: "contacted" });
  const [aiEmail, setAiEmail] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(null);
  const [aiEmailTarget, setAiEmailTarget] = useState<string | null>(null);

  const generateFollowupEmail = async (p: Record<string, unknown>) => {
    setAiEmailTarget(p.org as string);
    const res = await fetch("/api/admin/ai/sponsor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: p.org, contact: p.contact, package: p.package, status: p.status, notes: p.notes, mode: "followup" }),
    });
    if (res.ok) setAiEmail(await res.json() as { subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string });
  };

  const save = async () => {
    await fetch("/api/admin/sponsor-prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ status: "contacted" }); onRefresh();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    onRefresh();
  };

  const updateNotes = async (id: number, notes: string) => {
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes }) });
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">Pipeline Sponsors</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter prospect</button>
      </div>

      {aiEmail && aiEmailTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold">Email de relance — {aiEmailTarget}</h3>
              <button onClick={() => setAiEmail(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              {[
                { lang: "FR", subject: aiEmail.subjectFr, body: aiEmail.bodyFr },
                { lang: "EN", subject: aiEmail.subjectEn, body: aiEmail.bodyEn },
              ].map(e => (
                <div key={e.lang} className="border border-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-400">{e.lang}</span>
                    <button onClick={() => navigator.clipboard.writeText(`${e.subject}\n\n${e.body}`)} className="text-xs hover:underline" style={{ color: "#00ff9d" }}>Copier</button>
                  </div>
                  <p className="text-white text-xs font-bold mb-2">Objet: {e.subject}</p>
                  <p className="text-gray-400 text-xs whitespace-pre-wrap">{e.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: "org", label: "Organisation *" },
              { key: "contact", label: "Contact" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Téléphone" },
              { key: "package", label: "Package / Tier" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Statut</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.status as string) || "contacted"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {PROSPECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-gray-500 block mb-1">Notes</label>
              <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.notes as string) || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">Sauvegarder</button>
            <button onClick={() => { setShowForm(false); setForm({ status: "contacted" }); }} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {PROSPECT_STATUSES.map(st => {
          const group = prospects.filter(p => p.status === st.value);
          if (!group.length) return null;
          return (
            <div key={st.value} className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: st.color }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: st.color }} />
                {st.label} ({group.length})
              </h3>
              <div className="space-y-2 pl-4">
                {group.map(p => (
                  <div key={p.id as number} className="cyber-card rounded-lg p-4" style={{ borderLeft: `3px solid ${st.color}40` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{p.org as string}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                          {!!(p.contact as string) && <span>{p.contact as string}</span>}
                          {!!(p.email as string) && <span className="text-neon-green/60">{p.email as string}</span>}
                          {!!(p.phone as string) && <span>{p.phone as string}</span>}
                          {!!(p.package as string) && <span className="px-1.5 py-0.5 rounded" style={{ background: st.color + "20", color: st.color }}>{p.package as string}</span>}
                        </div>
                        {!!(p.notes as string) && (
                          <textarea
                            defaultValue={(p.notes as string) || ""}
                            onBlur={e => updateNotes(p.id as number, e.target.value)}
                            className="cyber-input w-full text-xs rounded p-2 mt-2 h-12 resize-none"
                            placeholder="Notes..."
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => generateFollowupEmail(p)} className="text-xs px-2 py-1 rounded transition-all" style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}>✨ Email IA</button>
                        <select
                          className="cyber-input text-xs px-2 py-1 rounded"
                          value={p.status as string}
                          onChange={e => updateStatus(p.id as number, e.target.value)}
                        >
                          {PROSPECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button onClick={() => del(p.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">Suppr.</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!prospects.length && <p className="text-gray-600 text-xs py-8 text-center">Aucun prospect pour l&apos;instant</p>}
      </div>
    </div>
  );
}

// ---- Budget Panel ----
const BUDGET_COST_LABELS = [
  "Hébergement services web", "Sponsoring pages LinkedIn/Twitter/Instagram", "Insertion Média papier",
  "Communication Média TV/Radio", "Couverture TV/Radio", "Salle de conférence Hotel",
  "Service conférence", "Hébergement parties prenantes clés", "Transports",
  "Impressions", "Gadjets", "Sécurité", "Santé", "Animation DJ",
];

function BudgetPanel({ items, onRefresh }: { items: Record<string, unknown>[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ category: "costs", planned: 0, actual: 0, status: "pending" });

  const save = async () => {
    await fetch("/api/admin/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ category: "costs", planned: 0, actual: 0, status: "pending" }); onRefresh();
  };

  const update = async (id: number, data: Record<string, unknown>) => {
    await fetch(`/api/admin/budget/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    onRefresh();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ?")) return;
    await fetch(`/api/admin/budget/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const seedCosts = async () => {
    for (const label of BUDGET_COST_LABELS) {
      await fetch("/api/admin/budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "costs", label, planned: 0, actual: 0, status: "pending" }) });
    }
    onRefresh();
  };

  const revenues = items.filter(i => i.category === "revenue");
  const costs = items.filter(i => i.category === "costs");
  const totalPlannedRev = revenues.reduce((s, i) => s + ((i.planned as number) || 0), 0);
  const totalActualRev = revenues.reduce((s, i) => s + ((i.actual as number) || 0), 0);
  const totalPlannedCost = costs.reduce((s, i) => s + ((i.planned as number) || 0), 0);
  const totalActualCost = costs.reduce((s, i) => s + ((i.actual as number) || 0), 0);

  const renderTable = (rows: Record<string, unknown>[], title: string, color: string) => (
    <div className="cyber-card rounded-xl p-5 mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color }}>{title}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500">
            <th className="text-left py-2 px-2 font-normal">Libellé</th>
            <th className="text-right py-2 px-2 font-normal">Prévu (FCFA)</th>
            <th className="text-right py-2 px-2 font-normal">Réel (FCFA)</th>
            <th className="text-left py-2 px-2 font-normal">Statut</th>
            <th className="py-2 px-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id as number} className="border-b border-gray-900 hover:bg-white/[0.01]">
              <td className="py-2 px-2 text-white">{r.label as string}</td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  className="cyber-input w-24 px-2 py-1 rounded text-xs text-right"
                  defaultValue={(r.planned as number) || 0}
                  onBlur={e => update(r.id as number, { planned: parseFloat(e.target.value) || 0 })}
                />
              </td>
              <td className="py-2 px-2 text-right">
                <input
                  type="number"
                  className="cyber-input w-24 px-2 py-1 rounded text-xs text-right"
                  defaultValue={(r.actual as number) || 0}
                  onBlur={e => update(r.id as number, { actual: parseFloat(e.target.value) || 0 })}
                />
              </td>
              <td className="py-2 px-2">
                <select
                  className="cyber-input text-xs px-2 py-1 rounded"
                  value={r.status as string}
                  onChange={e => update(r.id as number, { status: e.target.value })}
                >
                  <option value="pending">En attente</option>
                  <option value="paid">Payé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </td>
              <td className="py-2 px-2">
                <button onClick={() => del(r.id as number)} className="text-red-400 text-xs hover:text-red-300">✗</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-gray-600 text-xs py-4 text-center">Aucun élément</p>}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">Budget</h1>
        <div className="flex gap-2">
          <button onClick={seedCosts} className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">Pré-remplir dépenses</button>
          <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter ligne</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Revenus prévus", value: totalPlannedRev, color: "#00ff9d" },
          { label: "Revenus réels", value: totalActualRev, color: "#00ff9d" },
          { label: "Dépenses prévues", value: totalPlannedCost, color: "#ff0066" },
          { label: "Dépenses réelles", value: totalActualCost, color: "#ff0066" },
        ].map(s => (
          <div key={s.label} className="cyber-card rounded-xl p-4 text-center">
            <div className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value.toLocaleString("fr-FR")} FCFA</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Catégorie</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.category as string) || "costs"} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="revenue">Revenus</option>
                <option value="costs">Dépenses</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Libellé</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.label as string) || ""} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Montant prévu (FCFA)</label>
              <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.planned as number) || 0} onChange={e => setForm(p => ({ ...p, planned: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">Ajouter</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
          </div>
        </div>
      )}

      {!items.length && (
        <div className="text-center py-8">
          <p className="text-gray-600 text-xs mb-3">Aucun élément. Initialisez avec le budget standard EOCON.</p>
          <button
            onClick={async () => {
              const res = await fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "budget" }) });
              if (res.ok) onRefresh();
            }}
            className="btn-neon px-4 py-2 rounded text-xs"
          >
            🌱 Initialiser budget EOCON
          </button>
        </div>
      )}
      {renderTable(revenues, "Revenus", "#00ff9d")}
      {renderTable(costs, "Dépenses", "#ff0066")}
    </div>
  );
}

// ---- Logistics Panel ----
const LOGISTICS_SEED_CATEGORIES = [
  { category: "Production", tasks: ["Production gadjets & impressions"] },
  { category: "Coordination bénévoles", tasks: ["Briefing équipe bénévoles", "Attribution des rôles"] },
  { category: "Plan salle", tasks: ["Validation plan salle", "Installation signalétique"] },
  { category: "Vérification billets", tasks: ["Test scanner QR", "Formation opérateurs check-in"] },
  { category: "Kit speakers", tasks: ["Préparation kit speakers", "Distribution badges speakers"] },
  { category: "Animateur", tasks: ["Brief animateur"] },
  { category: "Discours", tasks: ["Discours d'ouverture", "Discours de clôture"] },
  { category: "Eau", tasks: ["Commande eau/boissons"] },
  { category: "Internet", tasks: ["Test connexion salle", "WiFi invités opérationnel"] },
  { category: "Tests techniques", tasks: ["Tests techniques salle", "Test son & vidéo", "Test retransmission"] },
  { category: "Caméras", tasks: ["Installation caméras", "Test enregistrement"] },
];

function LogisticsPanel({ tasks, onRefresh }: { tasks: Record<string, unknown>[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ done: false });

  const save = async () => {
    await fetch("/api/admin/logistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ done: false }); onRefresh();
  };

  const update = async (id: number, data: Record<string, unknown>) => {
    await fetch(`/api/admin/logistics/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    onRefresh();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ?")) return;
    await fetch(`/api/admin/logistics/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const seed = async () => {
    for (const { category, tasks: ts } of LOGISTICS_SEED_CATEGORIES) {
      for (let i = 0; i < ts.length; i++) {
        await fetch("/api/admin/logistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, title: ts[i], sortOrder: i }) });
      }
    }
    onRefresh();
  };

  const totalDone = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((totalDone / total) * 100) : 0;

  const byCategory: Record<string, Record<string, unknown>[]> = {};
  for (const t of tasks) {
    const cat = (t.category as string) || "Autre";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">Logistique</h1>
        <div className="flex gap-2">
          {!tasks.length && <button onClick={seed} className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">Pré-remplir tâches</button>}
          <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">+ Ajouter tâche</button>
        </div>
      </div>

      {total > 0 && (
        <div className="cyber-card rounded-xl p-4 mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progression globale</span>
            <span className="text-neon-green font-bold">{totalDone}/{total} ({pct}%)</span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#00ff9d" : "#0066ff" }} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Catégorie</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.category as string) || ""} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="ex: Technique" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Titre *</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.title as string) || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Responsable</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.assignee as string) || ""} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Échéance</label>
              <input type="date" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.deadline as string) || ""} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">Ajouter</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(byCategory).map(([cat, catTasks]) => {
          const catDone = catTasks.filter(t => t.done).length;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-neon-green/70 uppercase tracking-widest">{cat}</h3>
                <span className="text-xs text-gray-600">{catDone}/{catTasks.length}</span>
              </div>
              <div className="space-y-2">
                {catTasks.map(t => (
                  <div key={t.id as number} className="cyber-card rounded-lg p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!t.done}
                      onChange={e => update(t.id as number, { done: e.target.checked })}
                      className="w-4 h-4 accent-neon-green shrink-0"
                    />
                    <span className={`flex-1 text-sm transition-colors ${t.done ? "line-through text-gray-600" : "text-white"}`}>{t.title as string}</span>
                    {!!(t.assignee as string) && <span className="text-xs text-gray-500 shrink-0">{t.assignee as string}</span>}
                    {!!(t.deadline as string) && <span className="text-xs text-gray-600 shrink-0">{new Date(t.deadline as string).toLocaleDateString("fr-FR")}</span>}
                    <button onClick={() => del(t.id as number)} className="text-red-400 text-xs hover:text-red-300 shrink-0">✗</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!tasks.length && (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs mb-3">Aucune tâche. Initialisez avec les tâches standard.</p>
            <button
              onClick={async () => {
                const res = await fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "logistics" }) });
                if (res.ok) onRefresh();
              }}
              className="btn-neon px-4 py-2 rounded text-xs"
            >
              🌱 Initialiser tâches logistiques
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketsPanel() {
  const [tickets, setTickets] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tickets");
    if (res.ok) setTickets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: true }) });
    load();
  };

  const save = async (id: number) => {
    await fetch(`/api/admin/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setEditId(null);
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ce type de billet ?")) return;
    await fetch(`/api/admin/tickets/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Types de billets</h1>
          <p className="text-gray-500 text-xs mt-1">Capacités maximales et alertes par type de billet</p>
        </div>
        {!tickets.length && !loading && (
          <button onClick={seed} className="btn-neon px-4 py-2 rounded text-sm">🌱 Initialiser types standard</button>
        )}
      </div>
      <div className="space-y-3">
        {tickets.map(t => {
          const sold = t.sold as number;
          const max = t.maxCapacity as number;
          const pct = max > 0 ? Math.round((sold / max) * 100) : 0;
          const alert = pct >= (t.alertPercent as number);
          const isEditing = editId === (t.id as number);
          return (
            <div key={t.id as number} className="cyber-card rounded-xl p-5">
              {isEditing ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <input value={(editForm.ticketType as string) || ""} onChange={e => setEditForm(f => ({ ...f, ticketType: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-36" placeholder="Type" />
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500">Capacité max</label>
                    <input type="number" value={(editForm.maxCapacity as number) || 0} onChange={e => setEditForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) }))} className="cyber-input text-sm rounded px-3 py-1.5 w-24" />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500">Alerte %</label>
                    <input type="number" value={(editForm.alertPercent as number) || 80} onChange={e => setEditForm(f => ({ ...f, alertPercent: parseInt(e.target.value) }))} className="cyber-input text-sm rounded px-3 py-1.5 w-20" />
                  </div>
                  <button onClick={() => save(t.id as number)} className="btn-neon px-3 py-1.5 rounded text-xs">Enregistrer</button>
                  <button onClick={() => setEditId(null)} className="text-gray-500 text-xs hover:text-white">Annuler</button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-white font-bold capitalize">{t.ticketType as string}</span>
                      {alert && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#ff006620", color: "#ff0066" }}>⚠ Alerte capacité</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: alert ? "#ff0066" : "#00ff9d" }} />
                      </div>
                      <span className="text-xs font-mono shrink-0" style={{ color: alert ? "#ff0066" : "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>{sold} / {max}</span>
                      <span className="text-xs text-gray-600">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditId(t.id as number); setEditForm({ ticketType: t.ticketType, maxCapacity: t.maxCapacity, alertPercent: t.alertPercent }); }} className="text-xs text-gray-500 hover:text-white transition-colors">Modifier</button>
                    <button onClick={() => del(t.id as number)} className="text-xs text-red-800 hover:text-red-400 transition-colors">Supprimer</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!tickets.length && !loading && (
          <p className="text-gray-600 text-xs py-8 text-center">Aucun type de billet configuré. Cliquez sur &ldquo;Initialiser&rdquo; pour ajouter les types standard.</p>
        )}
      </div>
    </div>
  );
}

function AnalyticsPanel({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p className="text-gray-600 text-xs py-8 text-center">Chargement...</p>;

  const curve = data.registrationCurve as { date: string; count: number }[];
  const byTicket = data.byTicket as Record<string, number>;
  const topCountries = data.topCountries as { country: string; count: number }[];
  const total = data.totalRegistrations as number;
  const maxCount = Math.max(...curve.map(c => c.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Analytics</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Inscriptions", value: data.totalRegistrations as number, color: "#00ff9d" },
          { label: "Check-ins", value: data.checkedIn as number, color: "#0066ff" },
          { label: "Taux CFP", value: `${data.cfpRate}%`, color: "#ff6600" },
          { label: "Taux bénévoles", value: `${data.volRate}%`, color: "#cc00ff" },
        ].map(k => (
          <div key={k.label} className="cyber-card rounded-xl p-4 text-center">
            <div className="text-2xl font-black font-mono" style={{ color: k.color, fontFamily: "'Share Tech Mono', monospace" }}>{k.value}</div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Registration curve */}
      <div className="cyber-card rounded-xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Courbe d&apos;inscriptions</h2>
        {curve.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">Aucune donnée</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {curve.map(c => (
              <div key={c.date} className="flex flex-col items-center flex-1 min-w-0 group" title={`${c.date}: ${c.count}`}>
                <div
                  className="w-full rounded-t transition-all"
                  style={{ height: `${Math.round((c.count / maxCount) * 100)}%`, background: "#00ff9d", minHeight: 2, opacity: 0.8 }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-gray-700 text-xs mt-1">
          <span>{curve[0]?.date || ""}</span>
          <span>{total} total</span>
          <span>{curve[curve.length - 1]?.date || ""}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By ticket type */}
        <div className="cyber-card rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Par type de billet</h2>
          <div className="space-y-2">
            {Object.entries(byTicket).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-24 shrink-0">{type}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-neon-green/60" style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }} />
                </div>
                <span className="text-xs font-mono text-neon-green w-8 text-right">{count}</span>
              </div>
            ))}
            {!Object.keys(byTicket).length && <p className="text-gray-600 text-xs">Aucune donnée</p>}
          </div>
        </div>

        {/* Top countries */}
        <div className="cyber-card rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Top pays</h2>
          <div className="space-y-2">
            {topCountries.map(c => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-24 shrink-0 truncate">{c.country}</span>
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-neon-blue/60" style={{ width: `${total > 0 ? Math.round((c.count / total) * 100) : 0}%` }} />
                </div>
                <span className="text-xs font-mono text-neon-blue w-8 text-right" style={{ color: "#0066ff" }}>{c.count}</span>
              </div>
            ))}
            {!topCountries.length && <p className="text-gray-600 text-xs">Aucune donnée</p>}
          </div>
        </div>
      </div>

      {/* CFP funnel */}
      <div className="cyber-card rounded-xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Funnel CFP</h2>
        <div className="flex gap-6 items-center">
          {[
            { label: "Soumis", value: data.cfpTotal as number, color: "#888" },
            { label: "Acceptés", value: data.cfpAccepted as number, color: "#00ff9d" },
            { label: "Taux", value: `${data.cfpRate}%`, color: "#ff6600" },
          ].map(f => (
            <div key={f.label} className="text-center">
              <div className="text-2xl font-black font-mono" style={{ color: f.color, fontFamily: "'Share Tech Mono', monospace" }}>{f.value}</div>
              <div className="text-gray-500 text-xs mt-1">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CertificatesPanel() {
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const send = async (type: string) => {
    setSending(type);
    setResult(null);
    const res = await fetch("/api/admin/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (res.ok) setResult(await res.json());
    setSending(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">Certificats</h1>
      <p className="text-gray-500 text-xs mb-6">Envoi des certificats par email après l&apos;événement</p>
      {result && (
        <div className="cyber-card rounded-xl p-4 mb-6 border-neon-green/30">
          <span className="text-neon-green text-sm">✓ {result.sent} envoyés</span>
          {result.failed > 0 && <span className="text-red-400 text-sm ml-3">✗ {result.failed} échecs</span>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="cyber-card rounded-xl p-6">
          <h2 className="text-white font-bold mb-2">Certificat Participants</h2>
          <p className="text-gray-500 text-xs mb-4">Envoyé à tous les participants ayant été check-in le jour J</p>
          <div className="flex gap-2">
            <button
              onClick={() => send("participants")}
              disabled={!!sending}
              className="btn-neon px-4 py-2 rounded text-sm"
            >
              {sending === "participants" ? "Envoi..." : "Envoyer à tous"}
            </button>
            <a href="/api/admin/certificates" onClick={e => { e.preventDefault(); window.open("/api/admin/certificates?preview=participant", "_blank"); }}
              className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
              Aperçu
            </a>
          </div>
        </div>
        <div className="cyber-card rounded-xl p-6">
          <h2 className="text-white font-bold mb-2">Certificat Speakers</h2>
          <p className="text-gray-500 text-xs mb-4">Envoyé à tous les speakers 2026 avec un talk assigné</p>
          <div className="flex gap-2">
            <button
              onClick={() => send("speakers")}
              disabled={!!sending}
              className="btn-neon px-4 py-2 rounded text-sm"
            >
              {sending === "speakers" ? "Envoi..." : "Envoyer à tous"}
            </button>
          </div>
        </div>
      </div>
      <div className="cyber-card rounded-xl p-5 mt-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Aperçus</h2>
        <div className="flex gap-3">
          <a
            href="#"
            onClick={e => { e.preventDefault(); fetch("/api/admin/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "preview-participant" }) }).then(r => r.text()).then(html => { const w = window.open(); w?.document.write(html); }); }}
            className="text-xs text-neon-green hover:underline"
          >
            Voir aperçu participant →
          </a>
          <a
            href="#"
            onClick={e => { e.preventDefault(); fetch("/api/admin/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "preview-speaker" }) }).then(r => r.text()).then(html => { const w = window.open(); w?.document.write(html); }); }}
            className="text-xs text-neon-green hover:underline"
          >
            Voir aperçu speaker →
          </a>
        </div>
      </div>
    </div>
  );
}

function SponsorPackagesPanel() {
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sponsor-packages");
    if (res.ok) setPackages(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    await fetch("/api/admin/sponsor-packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: true }) });
    load();
  };

  const toggleVisible = async (id: number, isVisible: boolean) => {
    await fetch(`/api/admin/sponsor-packages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible }) });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Packages de Sponsoring</h1>
          <p className="text-gray-500 text-xs mt-1">Ces packages sont affichés sur le site web et utilisés dans la prospection IA</p>
        </div>
        {!packages.length && !loading && (
          <button onClick={seed} className="btn-neon px-4 py-2 rounded text-sm">🌱 Initialiser packages standard</button>
        )}
      </div>
      <div className="space-y-4">
        {packages.map(pkg => {
          const perksFr = JSON.parse((pkg.perksFr as string) || "[]") as string[];
          const perksEn = JSON.parse((pkg.perksEn as string) || "[]") as string[];
          return (
            <div key={pkg.id as number} className={`cyber-card rounded-xl p-5 ${!pkg.isVisible ? "opacity-50" : ""}`} style={{ borderColor: ((pkg.highlightColor as string) || "#333") + "40" }}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-black" style={{ color: (pkg.highlightColor as string) || "#888" }}>{pkg.tier as string}</span>
                    <span className="text-xl font-black font-mono text-white">{(pkg.price as number) > 0 ? `${(pkg.price as number).toLocaleString("fr-FR")} FCFA` : "Partenariat"}</span>
                    {!!(pkg.maxSponsors as number) && <span className="text-xs text-gray-600">max {pkg.maxSponsors as number} sponsors</span>}
                  </div>
                  <p className="text-gray-400 text-sm">{pkg.nameFr as string} / <span className="text-gray-600">{pkg.nameEn as string}</span></p>
                </div>
                <button onClick={() => toggleVisible(pkg.id as number, !(pkg.isVisible as boolean))} className={`text-xs px-3 py-1 rounded shrink-0 ${pkg.isVisible ? "text-neon-green bg-neon-green/10" : "text-gray-600 bg-gray-800"}`}>
                  {pkg.isVisible ? "Visible" : "Masqué"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase">Avantages FR</p>
                  <ul className="space-y-1">
                    {perksFr.map((p, i) => <li key={i} className="text-gray-400 text-xs flex gap-2"><span style={{ color: (pkg.highlightColor as string) || "#888" }}>✓</span>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2 uppercase">Perks EN</p>
                  <ul className="space-y-1">
                    {perksEn.map((p, i) => <li key={i} className="text-gray-400 text-xs flex gap-2"><span style={{ color: (pkg.highlightColor as string) || "#888" }}>✓</span>{p}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
        {!packages.length && !loading && (
          <p className="text-gray-600 text-xs py-8 text-center">Aucun package configuré.</p>
        )}
      </div>
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
  const [cfpNotes, setCfpNotes] = useState<Record<number, string>>({});
  const [onboarding, setOnboarding] = useState<Record<number, Record<string, boolean | string>>>({});
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
      } else if (t === "onboarding") {
        const res = await fetch("/api/admin/speakers");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, speakers: json })); }
      } else if (t === "communication") {
        const res = await fetch("/api/admin/email-templates");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, "email-templates": json })); }
      } else if (t === "sponsor-pipeline") {
        const res = await fetch("/api/admin/sponsor-prospects");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, "sponsor-pipeline": json })); }
      } else if (t === "sponsor-packages") {
        // SponsorPackagesPanel fetches its own data internally
      } else if (t === "prospection") {
        const res = await fetch("/api/admin/ai/prospect-leads");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, prospection: json })); }
      } else if (t === "budget") {
        const res = await fetch("/api/admin/budget");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, budget: json })); }
      } else if (t === "logistics") {
        const res = await fetch("/api/admin/logistics");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, logistics: json })); }
      } else if (t === "dashboard") {
        const res = await fetch("/api/admin/analytics");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, analytics: [json] })); }
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
  useEffect(() => { fetchData("dashboard"); }, [fetchData]);
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

  const sendDecision = async (id: number, action: "accept" | "reject") => {
    const notes = cfpNotes[id] || "";
    await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cfp", id, action, notes }),
    });
    fetchData(tab);
    fetchStats();
  };

  const loadOnboarding = async (speakerId: number) => {
    const res = await fetch(`/api/admin/speakers/${speakerId}/onboarding`);
    if (res.ok) {
      const json = await res.json();
      setOnboarding(prev => ({ ...prev, [speakerId]: json }));
    }
  };

  const saveOnboarding = async (speakerId: number, updates: Record<string, boolean | string>) => {
    const current = onboarding[speakerId] || {};
    const merged = { ...current, ...updates };
    setOnboarding(prev => ({ ...prev, [speakerId]: merged }));
    await fetch(`/api/admin/speakers/${speakerId}/onboarding`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  type TabGroup = {
    label: string;
    icon: string;
    tabs: { id: Tab; label: string; count?: number }[];
  };

  const tabGroups: TabGroup[] = [
    {
      label: "Vue générale",
      icon: "◈",
      tabs: [
        { id: "dashboard", label: "Dashboard" },
      ],
    },
    {
      label: "Contenu & Programme",
      icon: "◆",
      tabs: [
        { id: "speakers", label: "Speakers", count: stats.speakers },
        { id: "onboarding", label: "Onboarding" },
        { id: "sessions", label: "Programme", count: stats.sessions },
        { id: "workshops", label: "Workshops", count: stats.workshops },
        { id: "past-speakers", label: "Anciens Speakers" },
      ],
    },
    {
      label: "Participants",
      icon: "◉",
      tabs: [
        { id: "cfp", label: "CFP", count: stats.cfp },
        { id: "registrations", label: "Inscriptions", count: stats.registrations },
        { id: "volunteers", label: "Bénévoles", count: stats.volunteers },
        { id: "newsletter", label: "Newsletter", count: stats.newsletter },
        { id: "tickets", label: "Billets & Capacités" },
      ],
    },
    {
      label: "Sponsors & Budget",
      icon: "◇",
      tabs: [
        { id: "sponsors", label: "Sponsors", count: stats.sponsors },
        { id: "sponsor-packages", label: "Packages Sponsoring" },
        { id: "sponsor-pipeline", label: "Pipeline" },
        { id: "prospection", label: "Prospection IA" },
        { id: "budget", label: "Budget" },
      ],
    },
    {
      label: "Opérations",
      icon: "◎",
      tabs: [
        { id: "communication", label: "Communication" },
        { id: "logistics", label: "Logistique" },
        { id: "team", label: "Équipe", count: stats.team },
        { id: "certificates", label: "Certificats" },
        { id: "export", label: "Export CSV" },
        { id: "users", label: "Utilisateurs" },
      ],
    },
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
        <aside className="w-56 min-h-screen border-r border-neon-green/10 bg-black/40 p-3 shrink-0 overflow-y-auto">
          {tabGroups.map(group => (
            <div key={group.label} className="mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                <span className="text-neon-green/40 text-xs">{group.icon}</span>
                <span className="text-gray-600 text-xs uppercase tracking-widest font-bold">{group.label}</span>
              </div>
              {group.tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all flex items-center justify-between mb-0.5 ${tab === t.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"}`}
                >
                  <span>{t.label}</span>
                  {t.count !== undefined && t.count > 0 && (
                    <span className="text-neon-green/50 text-xs font-mono">{t.count}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 min-w-0">

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Dashboard</h1>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                <StatCard label="Speakers" value={stats.speakers || 0} />
                <StatCard label="Sponsors" value={stats.sponsors || 0} color="#ffd700" />
                <StatCard label="Sessions" value={stats.sessions || 0} color="#0066ff" />
                <StatCard label="CFP" value={stats.cfp || 0} color="#cc00ff" />
                <StatCard label="Bénévoles" value={stats.volunteers || 0} color="#ff6600" />
                <StatCard label="Inscriptions" value={stats.registrations || 0} color="#ff0066" />
                <StatCard label="Newsletter" value={stats.subscribers || 0} color="#ffaa00" />
                <StatCard label="Équipe" value={stats.team || 0} color="#00ccff" />
              </div>
              {/* Analytics section inlined */}
              {(data.analytics?.[0] as Record<string, unknown> | undefined) && (() => {
                const ad = data.analytics![0] as Record<string, unknown>;
                const curve = (ad.registrationCurve as { date: string; count: number }[]) || [];
                const byTicket = (ad.byTicket as Record<string, number>) || {};
                const topCountries = (ad.topCountries as { country: string; count: number }[]) || [];
                const totalRegs = (ad.totalRegistrations as number) || 0;
                const maxCount = Math.max(...curve.map(c => c.count), 1);
                return (
                  <>
                    {/* CFP breakdown + check-in */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: "CFP Total", value: ad.cfpTotal as number, color: "#888" },
                        { label: "CFP Acceptés", value: ad.cfpAccepted as number, color: "#00ff9d" },
                        { label: "Taux CFP", value: `${ad.cfpRate}%`, color: "#ff6600" },
                        { label: "Check-ins", value: ad.checkedIn as number, color: "#0066ff" },
                      ].map(k => (
                        <div key={k.label} className="cyber-card rounded-xl p-4 text-center">
                          <div className="text-2xl font-black font-mono" style={{ color: k.color, fontFamily: "'Share Tech Mono', monospace" }}>{k.value ?? 0}</div>
                          <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">{k.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Registration curve */}
                    {curve.length > 0 && (
                      <div className="cyber-card rounded-xl p-5 mb-6">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Courbe d&apos;inscriptions</h2>
                        <div className="flex items-end gap-1 h-32">
                          {curve.map(c => (
                            <div key={c.date} className="flex flex-col items-center flex-1 min-w-0" title={`${c.date}: ${c.count}`}>
                              <div className="w-full rounded-t transition-all" style={{ height: `${Math.round((c.count / maxCount) * 100)}%`, background: "#00ff9d", minHeight: 2, opacity: 0.8 }} />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-gray-700 text-xs mt-1">
                          <span>{curve[0]?.date || ""}</span>
                          <span>{totalRegs} total</span>
                          <span>{curve[curve.length - 1]?.date || ""}</span>
                        </div>
                      </div>
                    )}
                    {/* Ticket breakdown + top countries */}
                    {(Object.keys(byTicket).length > 0 || topCountries.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="cyber-card rounded-xl p-5">
                          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Par type de billet</h2>
                          <div className="space-y-2">
                            {Object.entries(byTicket).map(([type, count]) => (
                              <div key={type} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-24 shrink-0">{type}</span>
                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-neon-green/60" style={{ width: `${totalRegs > 0 ? Math.round((count / totalRegs) * 100) : 0}%` }} />
                                </div>
                                <span className="text-xs font-mono text-neon-green w-8 text-right">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="cyber-card rounded-xl p-5">
                          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Top pays</h2>
                          <div className="space-y-2">
                            {topCountries.map(c => (
                              <div key={c.country} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-24 shrink-0 truncate">{c.country}</span>
                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${totalRegs > 0 ? Math.round((c.count / totalRegs) * 100) : 0}%`, background: "#0066ff" }} />
                                </div>
                                <span className="text-xs font-mono w-8 text-right" style={{ color: "#0066ff" }}>{c.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* CFP funnel + volunteer rates */}
                    <div className="cyber-card rounded-xl p-5 mb-6">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Funnel CFP &amp; Bénévoles</h2>
                      <div className="flex gap-8 items-center flex-wrap">
                        {[
                          { label: "CFP Soumis", value: ad.cfpTotal as number, color: "#888" },
                          { label: "CFP Acceptés", value: ad.cfpAccepted as number, color: "#00ff9d" },
                          { label: "Taux CFP", value: `${ad.cfpRate}%`, color: "#ff6600" },
                          { label: "Taux Bénévoles", value: `${ad.volRate}%`, color: "#cc00ff" },
                        ].map(f => (
                          <div key={f.label} className="text-center">
                            <div className="text-2xl font-black font-mono" style={{ color: f.color, fontFamily: "'Share Tech Mono', monospace" }}>{f.value ?? 0}</div>
                            <div className="text-gray-500 text-xs mt-1">{f.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
              {/* Quick action cards */}
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
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black text-white">Propositions de Talks</h1>
                <button
                  onClick={async () => {
                    await fetch("/api/admin/ai/score-cfp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scoreAll: true }) });
                    fetchData(tab);
                  }}
                  className="text-xs px-3 py-2 rounded transition-all"
                  style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                >
                  ✨ Analyser tout avec IA
                </button>
              </div>
              {/* Stats bar */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total", key: "cfp", color: "#888" },
                  { label: "En attente", key: "cfpPending", color: "#ffaa00" },
                  { label: "Acceptés", key: "cfpAccepted", color: "#00ff9d" },
                  { label: "Refusés", key: "cfpRejected", color: "#ff0066" },
                ].map(s => (
                  <div key={s.key} className="cyber-card rounded-xl p-4 text-center">
                    <div className="text-2xl font-black font-mono" style={{ color: s.color, fontFamily: "'Share Tech Mono', monospace" }}>
                      {(stats as Record<string, number>)[s.key] ?? ((data.cfp || []) as Record<string, unknown>[]).filter((x) => s.key === "cfp" || x.status === (s.key === "cfpPending" ? "pending" : s.key === "cfpAccepted" ? "accepted" : "rejected")).length}
                    </div>
                    <div className="text-gray-500 text-xs uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {((data.cfp || []) as Record<string, unknown>[]).map(s => (
                  <div key={s.id as number} className="cyber-card rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-white font-bold">{s.name as string} <span className="text-gray-500 font-normal text-sm">— {s.email as string}</span></p>
                        <p className="text-neon-green text-sm mt-0.5">🎤 {s.talkTitle as string}</p>
                        {!!s.org && <p className="text-gray-500 text-xs">{s.org as string}{s.country ? ` · ${s.country}` : ""}</p>}
                        {!!s.format && <span className="text-xs px-2 py-0.5 rounded bg-neon-green/10 text-neon-green/70 mr-2">{s.format as string}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={s.status as string} />
                        <AiScoreBadge score={s.aiScore as number | null} analysis={s.aiAnalysis as string | null} />
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs mb-3 line-clamp-3">{s.abstract as string}</p>
                    {!!s.bio && <p className="text-gray-600 text-xs mb-3 italic line-clamp-2">{s.bio as string}</p>}
                    <textarea
                      placeholder="Notes comité (interne)..."
                      value={cfpNotes[s.id as number] ?? ((s.notes as string) || "")}
                      onChange={e => setCfpNotes(prev => ({ ...prev, [s.id as number]: e.target.value }))}
                      className="cyber-input w-full text-xs rounded p-2 mb-3 h-16 resize-none"
                    />
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-gray-600 text-xs">{new Date(s.createdAt as string).toLocaleDateString("fr-FR")}</span>
                      {s.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendDecision(s.id as number, "accept")}
                            className="px-3 py-1.5 rounded text-xs font-bold transition-all"
                            style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d40" }}
                          >
                            ✓ Accepter + Email
                          </button>
                          <button
                            onClick={() => sendDecision(s.id as number, "reject")}
                            className="px-3 py-1.5 rounded text-xs font-bold transition-all"
                            style={{ background: "#ff006620", color: "#ff0066", border: "1px solid #ff006640" }}
                          >
                            ✗ Refuser + Email
                          </button>
                        </div>
                      )}
                      {s.status !== "pending" && (
                        <span className="text-xs text-gray-600">
                          Décision envoyée {s.decisionSentAt ? new Date(s.decisionSentAt as string).toLocaleDateString("fr-FR") : ""}
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-start justify-between gap-4 mb-3">
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
                    {v.status === "accepted" && (
                      <div className="border-t border-gray-800 pt-3 mt-2">
                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Affectation</p>
                        <div className="flex gap-2 flex-wrap">
                          <input
                            type="text"
                            placeholder="Rôle assigné"
                            defaultValue={(v.assignedRole as string) || ""}
                            className="cyber-input text-xs rounded px-2 py-1 flex-1 min-w-[120px]"
                            onBlur={async (e) => {
                              await fetch("/api/admin/submissions", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ type: "volunteer-assign", id: v.id, assignedRole: e.target.value }),
                              });
                            }}
                          />
                          <input
                            type="datetime-local"
                            defaultValue={(v.shiftStart as string)?.slice(0, 16) || ""}
                            className="cyber-input text-xs rounded px-2 py-1"
                            onBlur={async (e) => {
                              await fetch("/api/admin/submissions", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ type: "volunteer-assign", id: v.id, shiftStart: e.target.value }),
                              });
                            }}
                          />
                          <input
                            type="datetime-local"
                            defaultValue={(v.shiftEnd as string)?.slice(0, 16) || ""}
                            className="cyber-input text-xs rounded px-2 py-1"
                            onBlur={async (e) => {
                              await fetch("/api/admin/submissions", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ type: "volunteer-assign", id: v.id, shiftEnd: e.target.value }),
                              });
                            }}
                          />
                        </div>
                      </div>
                    )}
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
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">Inscriptions ({(data.registrations || []).length})</h1>
                <a href="/admin/checkin" target="_blank" rel="noreferrer" className="btn-neon px-4 py-2 rounded text-sm">
                  📱 Ouvrir Check-in J-Day →
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neon-green/10 text-gray-500 text-left">
                      {["Nom", "Email", "Ticket", "Statut", "Check-in", "Date"].map(h => (
                        <th key={h} className="py-2 px-3 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {((data.registrations || []) as Record<string, unknown>[]).map(r => (
                      <tr key={r.id as number} className={`border-b border-gray-800 hover:bg-white/[0.02] transition-colors ${r.checkedInAt ? "bg-neon-green/[0.02]" : ""}`}>
                        <td className="py-2 px-3 text-white">{r.fname as string} {r.lname as string}<br/><span className="text-gray-500">{r.email as string}</span></td>
                        <td className="py-2 px-3 text-gray-500">{(r.org as string) || (r.country as string) || "—"}</td>
                        <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green/70">{r.ticketType as string}</span></td>
                        <td className="py-2 px-3"><Badge status={r.status as string} /></td>
                        <td className="py-2 px-3">
                          {r.checkedInAt
                            ? <span className="text-neon-green text-xs">✓ {new Date(r.checkedInAt as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                            : <span className="text-gray-600 text-xs">—</span>}
                        </td>
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

          {tab === "onboarding" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-2">Onboarding Speakers</h1>
              <p className="text-gray-500 text-xs mb-6">Suivi des 9 étapes de préparation par speaker</p>
              <div className="space-y-4">
                {((data.speakers || []) as Record<string, unknown>[]).filter(s => s.edition === "2026").map(s => {
                  const ob = onboarding[s.id as number] || {};
                  const checkboxes: { key: string; label: string }[] = [
                    { key: "selectionMailSent", label: "Mail de sélection envoyé" },
                    { key: "modalitiesMailSent", label: "Mail des modalités envoyé" },
                    { key: "timingMailSent", label: "Mail de timing envoyé" },
                    { key: "bioReceived", label: "Bio reçue" },
                    { key: "photoReceived", label: "Photo reçue" },
                    { key: "slidesReceived", label: "Slides reçues" },
                    { key: "transportArranged", label: "Transport arrangé" },
                    { key: "accommodationDone", label: "Hébergement confirmé" },
                    { key: "agreementSigned", label: "Entente conclue" },
                  ];
                  const doneCount = checkboxes.filter(c => ob[c.key]).length;
                  const isReady = doneCount === checkboxes.length;
                  return (
                    <div key={s.id as number} className="cyber-card rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar photoUrl={s.photoUrl as string} name={s.name as string} size={10} />
                          <div>
                            <p className="text-white font-bold text-sm">{s.name as string}</p>
                            <p className="text-gray-500 text-xs">{s.talkTitle as string}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-500">{doneCount}/9</div>
                          <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount/9)*100}%`, background: isReady ? "#00ff9d" : "#0066ff" }} />
                          </div>
                          {isReady && <span className="text-xs text-neon-green font-bold">✓ PRÊT</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {checkboxes.map(c => (
                          <label key={c.key} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={!!ob[c.key]}
                              onChange={e => {
                                if (!ob.id && !ob.speakerId) loadOnboarding(s.id as number);
                                saveOnboarding(s.id as number, { [c.key]: e.target.checked });
                              }}
                              className="w-3 h-3 accent-neon-green"
                            />
                            <span className={`text-xs transition-colors ${ob[c.key] ? "text-neon-green" : "text-gray-500 group-hover:text-gray-300"}`}>{c.label}</span>
                          </label>
                        ))}
                      </div>
                      <textarea
                        placeholder="Notes internes..."
                        value={(ob.notes as string) || ""}
                        onChange={e => setOnboarding(prev => ({ ...prev, [s.id as number]: { ...prev[s.id as number], notes: e.target.value } }))}
                        onBlur={e => saveOnboarding(s.id as number, { notes: e.target.value })}
                        className="cyber-input w-full text-xs rounded p-2 h-12 resize-none"
                      />
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/admin/ai/speaker-bio", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: s.name, bio: s.bio, talkTitle: s.talkTitle, talkAbstract: s.talkAbstract }),
                          });
                          if (res.ok) {
                            const data2 = await res.json() as { bioFr: string; bioEn: string; teaserFr: string; teaserEn: string };
                            alert(`Bio FR:\n${data2.bioFr}\n\nBio EN:\n${data2.bioEn}\n\nTeaser FR:\n${data2.teaserFr}\n\nTeaser EN:\n${data2.teaserEn}`);
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded mt-2 transition-all"
                        style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                      >
                        ✨ Reformuler bio avec IA
                      </button>
                    </div>
                  );
                })}
                {!data.speakers?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun speaker 2026</p>}
              </div>
            </div>
          )}

          {tab === "users" && <AdminUsersPanel />}

          {/* COMMUNICATION */}
          {tab === "communication" && (
            <CommunicationPanel />
          )}

          {/* SPONSOR PIPELINE */}
          {tab === "sponsor-pipeline" && (
            <SponsorPipelinePanel
              prospects={(data["sponsor-pipeline"] || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("sponsor-pipeline")}
            />
          )}

          {/* SPONSOR PACKAGES */}
          {tab === "sponsor-packages" && (
            <SponsorPackagesPanel />
          )}

          {/* PROSPECTION IA */}
          {tab === "prospection" && (
            <ProspectionPanel
              leads={(data.prospection || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("prospection")}
            />
          )}

          {/* BUDGET */}
          {tab === "budget" && (
            <BudgetPanel
              items={(data.budget || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("budget")}
            />
          )}

          {/* LOGISTICS */}
          {tab === "logistics" && (
            <LogisticsPanel
              tasks={(data.logistics || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("logistics")}
            />
          )}

          {/* TICKETS */}
          {tab === "tickets" && <TicketsPanel />}

          {/* CERTIFICATES */}
          {tab === "certificates" && (
            <CertificatesPanel />
          )}

          {/* EXPORT */}
          {tab === "export" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Export CSV</h1>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { type: "registrations", label: "Inscriptions CSV", color: "#ff0066", desc: "Tous les participants inscrits" },
                  { type: "cfp", label: "CFP CSV", color: "#cc00ff", desc: "Toutes les propositions de talks" },
                  { type: "volunteers", label: "Bénévoles CSV", color: "#ff6600", desc: "Candidatures bénévoles" },
                  { type: "newsletter", label: "Newsletter CSV", color: "#ffaa00", desc: "Abonnés à la newsletter" },
                ].map(item => (
                  <a
                    key={item.type}
                    href={`/api/admin/export?type=${item.type}`}
                    className="cyber-card rounded-xl p-6 block hover:opacity-90 transition-opacity"
                    style={{ borderColor: item.color + "40" }}
                  >
                    <div className="text-lg font-bold mb-1" style={{ color: item.color }}>⬇ {item.label}</div>
                    <div className="text-gray-500 text-xs">{item.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
