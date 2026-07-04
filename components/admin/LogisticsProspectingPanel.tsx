"use client";
import { useState, useEffect, useCallback } from "react";

interface LogisticsProspect {
  id: number;
  sector: string;
  name: string;
  contactName: string | null;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  googlePlaceId: string | null;
  googleRating: number | null;
  status: string;
  notes: string | null;
  aiDraftEmailFr: string | null;
  aiDraftEmailEn: string | null;
  lastContactAt: string | null;
  source: string;
  createdAt: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  types?: string[];
  url?: string;
  alreadyAdded: boolean;
  existingId: number | null;
}

const SECTORS = [
  { id: "hotel", label: "Hôtels", emoji: "🏨" },
  { id: "traiteur", label: "Traiteurs", emoji: "🍽️" },
  { id: "transport", label: "Transport", emoji: "🚌" },
  { id: "impression", label: "Impression", emoji: "🖨️" },
  { id: "badges", label: "Badges", emoji: "🪪" },
  { id: "goodies", label: "Goodies", emoji: "🎁" },
];

const STATUSES = [
  { id: "new", label: "Nouveau", color: "#888" },
  { id: "contacted", label: "Contacté", color: "#0066ff" },
  { id: "replied", label: "Répondu", color: "#ffaa00" },
  { id: "visit_planned", label: "Visite planifiée", color: "#cc00ff" },
  { id: "deal", label: "Accord", color: "#00ff9d" },
  { id: "rejected", label: "Refusé", color: "#ff3366" },
];

function statusColor(s: string) {
  return STATUSES.find(x => x.id === s)?.color ?? "#888";
}
function statusLabel(s: string) {
  return STATUSES.find(x => x.id === s)?.label ?? s;
}

function EmailModal({
  prospect,
  onClose,
  onSent,
}: {
  prospect: LogisticsProspect;
  onClose: () => void;
  onSent: () => void;
}) {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [draftFr, setDraftFr] = useState(prospect.aiDraftEmailFr || "");
  const [draftEn, setDraftEn] = useState(prospect.aiDraftEmailEn || "");
  const [generating, setGenerating] = useState(false);
  const [toEmail, setToEmail] = useState(prospect.email || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentDraft = lang === "fr" ? draftFr : draftEn;
  const setCurrentDraft = lang === "fr" ? setDraftFr : setDraftEn;

  const extractSubject = (text: string) => {
    const m = text.match(/^(?:Objet|Subject)\s*:\s*(.+)/im);
    return m ? m[1].trim() : `Partenariat EOCON 2026 – ${prospect.name}`;
  };

  const bodyWithoutSubject = (text: string) =>
    text.replace(/^(?:Objet|Subject)\s*:.+\n?/im, "").trim();

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/ai/logistics-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector: prospect.sector,
          name: prospect.name,
          contactName: prospect.contactName,
          contactTitle: prospect.contactTitle,
          address: prospect.address,
          website: prospect.website,
          phone: prospect.phone,
        }),
      });
      const data = await res.json() as { fr: string; en: string };
      setDraftFr(data.fr || "");
      setDraftEn(data.en || "");
    } catch { /* skip */ }
    setGenerating(false);
  };

  const saveDrafts = async () => {
    await fetch(`/api/admin/logistics-prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiDraftEmailFr: draftFr, aiDraftEmailEn: draftEn }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const send = async () => {
    if (!toEmail.trim()) return;
    setSending(true);
    const body = bodyWithoutSubject(currentDraft);
    const subject = extractSubject(currentDraft);
    const res = await fetch("/api/admin/logistics-prospects/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: toEmail, subject, body, prospectId: prospect.id, org: prospect.name }),
    });
    setSending(false);
    if (res.ok) { setSent(true); setTimeout(() => { onSent(); onClose(); }, 1500); }
  };

  useEffect(() => {
    if (!prospect.aiDraftEmailFr && !prospect.aiDraftEmailEn) generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="cyber-card rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="font-black text-white text-sm">✉️ Email — {prospect.name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{SECTORS.find(s => s.id === prospect.sector)?.emoji} {SECTORS.find(s => s.id === prospect.sector)?.label}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Lang toggle */}
          <div className="flex gap-2">
            {(["fr", "en"] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${lang === l ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 border border-gray-700 hover:text-white"}`}
              >
                {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
              </button>
            ))}
            <button
              onClick={generate}
              disabled={generating}
              className="ml-auto px-3 py-1 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              {generating ? "⏳ Génération..." : "🔄 Régénérer"}
            </button>
          </div>

          {/* Email body */}
          <textarea
            className="cyber-input w-full px-3 py-2 rounded text-xs font-mono resize-none"
            rows={14}
            value={currentDraft}
            onChange={e => setCurrentDraft(e.target.value)}
            placeholder={generating ? "Génération en cours..." : "Email..."}
          />

          {/* To */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Destinataire (email)</label>
            <input
              className="cyber-input w-full px-3 py-2 rounded text-xs"
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              placeholder="email@domaine.com"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-800">
          <button
            onClick={saveDrafts}
            className="px-4 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            {saved ? "✓ Sauvegardé" : "💾 Sauvegarder"}
          </button>
          <button
            onClick={send}
            disabled={sending || !toEmail.trim() || !currentDraft.trim() || sent}
            className="btn-neon px-5 py-2 rounded text-xs disabled:opacity-40"
          >
            {sent ? "✓ Envoyé !" : sending ? "Envoi..." : "📤 Envoyer"}
          </button>
          <button onClick={onClose} className="ml-auto px-4 py-2 rounded text-xs text-gray-500 hover:text-white">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function AddProspectModal({
  sector,
  onClose,
  onAdded,
}: {
  sector: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "", contactName: "", contactTitle: "", email: "", phone: "",
    website: "", address: "", city: "Douala",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/logistics-prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sector, source: "manual" }),
    });
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="cyber-card rounded-2xl border border-gray-700 w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="font-black text-white text-sm">+ Ajouter un prospect</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {[
            { key: "name", label: "Nom *", full: true },
            { key: "contactName", label: "Contact" },
            { key: "contactTitle", label: "Titre" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Téléphone" },
            { key: "website", label: "Site web" },
            { key: "address", label: "Adresse", full: true },
            { key: "city", label: "Ville" },
          ].map(f => (
            <div key={f.key} className={f.full ? "col-span-2" : ""}>
              <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
              <input
                className="cyber-input w-full px-3 py-2 rounded text-xs"
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-4 border-t border-gray-800">
          <button onClick={save} disabled={saving || !form.name.trim()} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-40">
            {saving ? "..." : "Ajouter"}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function PlacesSearchPanel({
  sector,
  onImport,
}: {
  sector: string;
  onImport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  const search = async () => {
    setSearching(true);
    try {
      const res = await fetch("/api/admin/logistics-prospects/search-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sector, query: query.trim() || undefined }),
      });
      const data = await res.json() as PlaceResult[];
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    setSearching(false);
  };

  const importPlace = async (place: PlaceResult) => {
    setImporting(place.place_id);
    await fetch("/api/admin/logistics-prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector,
        name: place.name,
        address: place.address,
        phone: place.phone,
        website: place.website,
        googlePlaceId: place.place_id,
        googleRating: place.rating,
        source: "google_places",
        city: "Douala",
      }),
    });
    setResults(prev => prev.map(r => r.place_id === place.place_id ? { ...r, alreadyAdded: true } : r));
    setImporting(null);
    onImport();
  };

  return (
    <div className="cyber-card rounded-xl p-4 border border-gray-800 mb-4">
      <p className="text-xs font-bold text-gray-300 mb-3">🔍 Recherche Google Places</p>
      <div className="flex gap-2 mb-3">
        <input
          className="cyber-input flex-1 px-3 py-2 rounded text-xs"
          placeholder={`Ex: hôtel Douala, traiteur évènementiel...`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
        />
        <button onClick={search} disabled={searching} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-40">
          {searching ? "..." : "Chercher"}
        </button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {results.map(r => (
            <div key={r.place_id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/40">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{r.name}</p>
                {r.address && <p className="text-xs text-gray-500 truncate">{r.address}</p>}
                <div className="flex gap-3 mt-1 flex-wrap">
                  {r.rating && <span className="text-xs text-yellow-400">★ {r.rating}</span>}
                  {r.phone && <span className="text-xs text-gray-400">{r.phone}</span>}
                  {r.website && <a href={r.website} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline truncate max-w-[160px]">{r.website.replace(/^https?:\/\//, "")}</a>}
                </div>
              </div>
              <button
                onClick={() => !r.alreadyAdded && importPlace(r)}
                disabled={r.alreadyAdded || importing === r.place_id}
                className={`shrink-0 px-3 py-1.5 rounded text-xs transition-colors ${r.alreadyAdded ? "text-green-500 border border-green-900" : "btn-neon disabled:opacity-40"}`}
              >
                {r.alreadyAdded ? "✓ Ajouté" : importing === r.place_id ? "..." : "+ Importer"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LogisticsProspectingPanel({ canWrite = true }: { canWrite?: boolean }) {
  const [activeSector, setActiveSector] = useState("hotel");
  const [prospects, setProspects] = useState<LogisticsProspect[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState<LogisticsProspect | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  // scraping state: prospectId → { scraping, found, error }
  const [scrapeState, setScrapeState] = useState<Record<number, { scraping: boolean; found: string[]; error: string | null }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/logistics-prospects?sector=${activeSector}`);
      if (res.ok) setProspects(await res.json());
    } catch { /* skip */ }
    setLoading(false);
  }, [activeSector]);

  useEffect(() => { load(); }, [load]);

  const updateProspect = async (id: number, data: Partial<LogisticsProspect>) => {
    await fetch(`/api/admin/logistics-prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  };

  const deleteProspect = async (id: number) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    await fetch(`/api/admin/logistics-prospects/${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (p: LogisticsProspect) => {
    setEditId(p.id);
    setEditNotes(p.notes || "");
    setEditStatus(p.status);
  };

  const saveEdit = async () => {
    if (editId === null) return;
    await updateProspect(editId, { notes: editNotes, status: editStatus });
    setEditId(null);
  };

  const scrapeEmail = async (p: LogisticsProspect) => {
    if (!p.website) return;
    setScrapeState(prev => ({ ...prev, [p.id]: { scraping: true, found: [], error: null } }));
    try {
      const res = await fetch("/api/admin/logistics-prospects/scrape-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: p.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeState(prev => ({ ...prev, [p.id]: { scraping: false, found: [], error: data.error ?? "Erreur" } }));
        return;
      }
      setScrapeState(prev => ({ ...prev, [p.id]: { scraping: false, found: data.found ?? [], error: null } }));
      if (data.autoFilled) load();
    } catch {
      setScrapeState(prev => ({ ...prev, [p.id]: { scraping: false, found: [], error: "Erreur réseau" } }));
    }
  };

  const applyScrapeEmail = async (id: number, email: string) => {
    await updateProspect(id, { email });
    setScrapeState(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const filtered = filterStatus === "all"
    ? prospects
    : prospects.filter(p => p.status === filterStatus);

  const countByStatus = (s: string) => prospects.filter(p => p.status === s).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Prospection Logistique</h2>
          <p className="text-xs text-gray-500 mt-0.5">{prospects.length} prospect(s) · secteur sélectionné</p>
        </div>
        {canWrite && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowPlacesSearch(!showPlacesSearch)}
              className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              {showPlacesSearch ? "✕ Fermer recherche" : "🔍 Google Places"}
            </button>
            <button
              onClick={async () => {
                const targets = prospects.filter(p => p.website && !p.email);
                for (const p of targets) await scrapeEmail(p);
              }}
              disabled={prospects.filter(p => p.website && !p.email).length === 0}
              title="Scraper les emails sur tous les sites sans email"
              className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              🔎 Scraper tous ({prospects.filter(p => p.website && !p.email).length})
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-neon px-4 py-2 rounded text-xs"
            >
              + Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Sector tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {SECTORS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSector(s.id)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${activeSector === s.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-white border border-transparent"}`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Google Places search panel */}
      {showPlacesSearch && canWrite && (
        <PlacesSearchPanel sector={activeSector} onImport={load} />
      )}

      {/* Status filters */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-2 py-1 rounded text-xs transition-colors ${filterStatus === "all" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"}`}
        >
          Tous ({prospects.length})
        </button>
        {STATUSES.map(s => {
          const cnt = countByStatus(s.id);
          if (cnt === 0 && filterStatus !== s.id) return null;
          return (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-2 py-1 rounded text-xs transition-colors ${filterStatus === s.id ? "text-white" : "text-gray-500 hover:text-white"}`}
              style={filterStatus === s.id ? { background: s.color + "22", color: s.color, border: `1px solid ${s.color}55` } : {}}
            >
              {s.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Prospects list */}
      {loading ? (
        <div className="text-center py-12 text-gray-600 text-xs">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 cyber-card rounded-xl">
          <p className="text-gray-600 text-xs">Aucun prospect pour ce secteur.</p>
          {canWrite && (
            <p className="text-gray-700 text-xs mt-2">Utilisez "Google Places" ou "+ Ajouter" pour démarrer.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="cyber-card rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-white">{p.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: statusColor(p.status) + "22", color: statusColor(p.status), border: `1px solid ${statusColor(p.status)}44` }}
                    >
                      {statusLabel(p.status)}
                    </span>
                    {p.source === "google_places" && (
                      <span className="text-xs text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded">📍 Places</span>
                    )}
                    {p.googleRating && (
                      <span className="text-xs text-yellow-400">★ {p.googleRating}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mb-2">
                    {p.contactName && <span>👤 {p.contactName}{p.contactTitle ? ` · ${p.contactTitle}` : ""}</span>}
                    {p.email && <span>✉ {p.email}</span>}
                    {p.phone && <span>📞 {p.phone}</span>}
                    {p.address && <span>📍 {p.address}</span>}
                    {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{p.website.replace(/^https?:\/\//, "").split("/")[0]}</a>}
                    {p.lastContactAt && <span>Dernier contact : {new Date(p.lastContactAt).toLocaleDateString("fr-FR")}</span>}
                  </div>

                  {editId === p.id ? (
                    <div className="mt-2 space-y-2">
                      <select
                        className="cyber-input px-2 py-1 rounded text-xs"
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <textarea
                        className="cyber-input w-full px-3 py-2 rounded text-xs resize-none"
                        rows={3}
                        placeholder="Notes..."
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="btn-neon px-3 py-1 rounded text-xs">Sauvegarder</button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1 rounded text-xs text-gray-500 hover:text-white">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    p.notes && <p className="text-xs text-gray-500 italic mt-1 border-l-2 border-gray-700 pl-2">{p.notes}</p>
                  )}

                  {(p.aiDraftEmailFr || p.aiDraftEmailEn) && (
                    <p className="text-xs text-neon-green/60 mt-1">✓ Brouillon email sauvegardé</p>
                  )}

                  {/* Scrape results */}
                  {scrapeState[p.id] && !scrapeState[p.id].scraping && (
                    <div className="mt-2">
                      {scrapeState[p.id].error && (
                        <p className="text-xs text-red-400">{scrapeState[p.id].error}</p>
                      )}
                      {scrapeState[p.id].found.length === 0 && !scrapeState[p.id].error && (
                        <p className="text-xs text-gray-500">Aucun email trouvé sur le site.</p>
                      )}
                      {scrapeState[p.id].found.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-400 font-mono">Emails trouvés :</p>
                          {scrapeState[p.id].found.map(e => (
                            <div key={e} className="flex items-center gap-2">
                              <span className="text-xs text-blue-300 font-mono">{e}</span>
                              {e !== p.email && (
                                <button
                                  onClick={() => applyScrapeEmail(p.id, e)}
                                  className="text-xs text-neon-green hover:underline"
                                >
                                  ✓ Utiliser
                                </button>
                              )}
                              {e === p.email && (
                                <span className="text-xs text-green-600">· déjà enregistré</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {canWrite && editId !== p.id && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setEmailTarget(p)}
                      className="px-3 py-1.5 rounded text-xs btn-neon"
                    >
                      ✉️ Email
                    </button>
                    {p.website && (
                      <button
                        onClick={() => scrapeEmail(p)}
                        disabled={scrapeState[p.id]?.scraping}
                        title="Chercher un email sur le site web"
                        className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
                      >
                        {scrapeState[p.id]?.scraping ? "⏳..." : "🔎 Email"}
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(p)}
                      className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteProspect(p.id)}
                      className="px-3 py-1.5 rounded text-xs border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {emailTarget && (
        <EmailModal
          prospect={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={load}
        />
      )}

      {showAddModal && (
        <AddProspectModal
          sector={activeSector}
          onClose={() => setShowAddModal(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}
