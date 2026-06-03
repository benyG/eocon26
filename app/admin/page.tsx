"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type Tab = "dashboard" | "speakers" | "sponsors" | "sessions" | "workshops" | "cfp" | "volunteers" | "registrations" | "newsletter" | "team" | "past-speakers" | "users" | "onboarding" | "communication" | "sponsor-pipeline" | "budget" | "logistics" | "analytics" | "certificates" | "export";

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
  const SECTIONS = ["cfp", "speakers", "sponsors", "sessions", "volunteers", "registrations", "newsletter", "team"];
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ permissions: {} });

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(setUsers);
  }, []);

  const save = async () => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
    setShowForm(false);
    setForm({ permissions: {} });
  };

  const toggle = async (id: number, isActive: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive } : u));
  };

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-sm mb-4">+ Nouvel utilisateur</button>
      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom</label>
              <input className="cyber-input w-full text-sm rounded px-3 py-2" value={(form.name as string) || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <input type="email" className="cyber-input w-full text-sm rounded px-3 py-2" value={(form.email as string) || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Mot de passe</label>
            <input type="password" className="cyber-input w-full text-sm rounded px-3 py-2" value={(form.password as string) || ""} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">Permissions (read / write / none)</label>
            <div className="grid grid-cols-4 gap-2">
              {SECTIONS.map(s => (
                <div key={s}>
                  <p className="text-xs text-gray-400 mb-1 capitalize">{s}</p>
                  <select className="cyber-input w-full text-xs rounded px-2 py-1"
                    value={((form.permissions as Record<string, string>)[s]) || "none"}
                    onChange={e => setForm(f => ({ ...f, permissions: { ...(f.permissions as Record<string, string>), [s]: e.target.value } }))}>
                    <option value="none">Aucun</option>
                    <option value="read">Lecture</option>
                    <option value="write">Écriture</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-sm">Créer</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white">Annuler</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {users.map(u => {
          const perms = JSON.parse((u.permissions as string) || "{}") as Record<string, string>;
          return (
            <div key={u.id as number} className="cyber-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white text-sm font-bold">{u.name as string}</p>
                <p className="text-gray-500 text-xs">{u.email as string}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {Object.entries(perms).filter(([, v]) => v !== "none").map(([k, v]) => (
                    <span key={k} className="text-xs px-1.5 py-0.5 rounded" style={{ background: v === "write" ? "#00ff9d20" : "#0066ff20", color: v === "write" ? "#00ff9d" : "#0066ff" }}>
                      {k}:{v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "text-neon-green bg-neon-green/10" : "text-gray-600 bg-gray-800"}`}>
                  {u.isActive ? "Actif" : "Inactif"}
                </span>
                <button
                  onClick={() => toggle(u.id as number, !(u.isActive as boolean))}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {u.isActive ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Communication Panel ----
function CommunicationPanel({ templates, onRefresh }: { templates: Record<string, unknown>[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ segment: "all" });
  const [editing, setEditing] = useState<number | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const save = async () => {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/admin/email-templates/${editing}` : "/api/admin/email-templates";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); setForm({ segment: "all" }); onRefresh();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ce template ?")) return;
    await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const send = async (id: number) => {
    if (!confirm("Envoyer cet email à tous les destinataires du segment ?")) return;
    setSending(id); setSendResult(null);
    const res = await fetch("/api/admin/email-templates/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: id }) });
    const json = await res.json() as Record<string, unknown>;
    setSending(null);
    setSendResult(res.ok ? `✓ Envoyé : ${json.sent} / ${json.total} (${json.failed} erreurs)` : `✗ Erreur : ${json.error}`);
    onRefresh();
  };

  const seedTemplates = async () => {
    const templates = [
      { name: "J-30 — Save the Date", subject: "EOCON 2026 — Réservez la date !", segment: "newsletter", htmlBody: "<h1>EOCON 2026</h1><p>L'événement cybersécurité de l'année arrive dans 30 jours. Inscrivez-vous dès maintenant !</p>" },
      { name: "J-7 — Rappel inscription", subject: "Plus que 7 jours — EOCON 2026", segment: "newsletter", htmlBody: "<h1>EOCON 2026 — J-7</h1><p>Plus que 7 jours ! Confirmez votre participation maintenant.</p>" },
      { name: "J-1 — Infos pratiques", subject: "EOCON 2026 demain — Infos pratiques", segment: "registered", htmlBody: "<h1>À demain !</h1><p>Retrouvez toutes les informations pratiques pour EOCON 2026.</p>" },
    ];
    for (const t of templates) {
      await fetch("/api/admin/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
    }
    onRefresh();
  };

  const segmentLabel: Record<string, string> = { all: "Tous", registered: "Inscrits", cfp_accepted: "CFP acceptés", volunteers: "Bénévoles", newsletter: "Newsletter" };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">Communication Email</h1>
        <div className="flex gap-2">
          <button onClick={seedTemplates} className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">+ Templates J-30/J-7/J-1</button>
          <button onClick={() => { setForm({ segment: "all" }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">+ Nouveau template</button>
        </div>
      </div>
      {sendResult && (
        <div className="mb-4 p-3 rounded text-xs" style={{ background: sendResult.startsWith("✓") ? "#00ff9d15" : "#ff006615", color: sendResult.startsWith("✓") ? "#00ff9d" : "#ff0066", border: `1px solid ${sendResult.startsWith("✓") ? "#00ff9d40" : "#ff006640"}` }}>
          {sendResult}
        </div>
      )}
      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom du template</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.name as string) || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Segment</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.segment as string) || "all"} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}>
                {Object.entries(segmentLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Sujet</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.subject as string) || ""} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Corps HTML</label>
              <textarea rows={8} className="cyber-input w-full px-3 py-2 rounded text-xs resize-y font-mono" value={(form.htmlBody as string) || ""} onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">Sauvegarder</button>
            <button onClick={() => { setShowForm(false); setForm({ segment: "all" }); setEditing(null); }} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id as number} className="cyber-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-bold text-sm">{t.name as string}</p>
                <p className="text-gray-400 text-xs mt-0.5">{t.subject as string}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#0066ff20", color: "#0066ff" }}>{segmentLabel[t.segment as string] || (t.segment as string)}</span>
                  {t.sentAt ? (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#00ff9d20", color: "#00ff9d" }}>Envoyé le {new Date(t.sentAt as string).toLocaleDateString("fr-FR")}</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#ffffff10", color: "#888" }}>Brouillon</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => send(t.id as number)}
                  disabled={sending === (t.id as number)}
                  className="text-xs px-3 py-1.5 rounded transition-colors"
                  style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d40" }}
                >
                  {sending === (t.id as number) ? "Envoi..." : "Envoyer"}
                </button>
                <button onClick={() => { setForm({ ...t }); setEditing(t.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">Éditer</button>
                <button onClick={() => del(t.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">Suppr.</button>
              </div>
            </div>
          </div>
        ))}
        {!templates.length && <p className="text-gray-600 text-xs py-8 text-center">Aucun template — créez-en un ou utilisez les templates pré-configurés</p>}
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
            <th className="text-right py-2 px-2 font-normal">Prévu (€)</th>
            <th className="text-right py-2 px-2 font-normal">Réel (€)</th>
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
            <div className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value.toLocaleString("fr-FR")} €</div>
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
              <label className="text-xs text-gray-500 block mb-1">Montant prévu (€)</label>
              <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.planned as number) || 0} onChange={e => setForm(p => ({ ...p, planned: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">Ajouter</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
          </div>
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
        {!tasks.length && <p className="text-gray-600 text-xs py-8 text-center">Aucune tâche — créez-en une ou utilisez le pré-remplissage</p>}
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
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, "sponsor-prospects": json })); }
      } else if (t === "budget") {
        const res = await fetch("/api/admin/budget");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, budget: json })); }
      } else if (t === "logistics") {
        const res = await fetch("/api/admin/logistics");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, logistics: json })); }
      } else if (t === "analytics") {
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

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "speakers", label: "Speakers", count: stats.speakers },
    { id: "onboarding", label: "Onboarding Speakers" },
    { id: "sponsors", label: "Sponsors", count: stats.sponsors },
    { id: "sessions", label: "Programme", count: stats.sessions },
    { id: "workshops", label: "Workshops", count: stats.workshops },
    { id: "cfp", label: "CFP", count: stats.cfp },
    { id: "volunteers", label: "Bénévoles", count: stats.volunteers },
    { id: "registrations", label: "Inscriptions", count: stats.registrations },
    { id: "newsletter", label: "Newsletter", count: stats.newsletter },
    { id: "team", label: "Équipe", count: stats.team },
    { id: "past-speakers", label: "Anciens Speakers" },
    { id: "users", label: "Utilisateurs Admin" },
    { id: "communication", label: "Communication" },
    { id: "sponsor-pipeline", label: "Pipeline Sponsors" },
    { id: "budget", label: "Budget" },
    { id: "logistics", label: "Logistique" },
    { id: "analytics", label: "Analytics" },
    { id: "certificates", label: "Certificats" },
    { id: "export", label: "Export CSV" },
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
              <h1 className="text-2xl font-black text-white mb-4">Propositions de Talks</h1>
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
                      <Badge status={s.status as string} />
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
              <h1 className="text-2xl font-black text-white mb-6">Inscriptions ({(data.registrations || []).length})</h1>
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
                    </div>
                  );
                })}
                {!data.speakers?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucun speaker 2026</p>}
              </div>
            </div>
          )}

          {tab === "users" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Utilisateurs Admin</h1>
              <AdminUsersPanel />
            </div>
          )}

          {/* COMMUNICATION */}
          {tab === "communication" && (
            <CommunicationPanel
              templates={(data["email-templates"] || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("communication")}
            />
          )}

          {/* SPONSOR PIPELINE */}
          {tab === "sponsor-pipeline" && (
            <SponsorPipelinePanel
              prospects={(data["sponsor-prospects"] || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("sponsor-pipeline")}
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

          {/* ANALYTICS */}
          {tab === "analytics" && (
            <AnalyticsPanel data={(data.analytics?.[0] as Record<string, unknown>) ?? null} />
          )}

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
