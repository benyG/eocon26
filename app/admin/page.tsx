"use client";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PROFILES } from "@/lib/adminProfiles";
import PipelineKanban from "@/components/admin/PipelineKanban";
import CountrySelect from "@/components/CountrySelect";
import AdminProfilesPanel from "@/components/admin/AdminProfilesPanel";
import { adminI18n, AdminLang, AdminTranslations } from "@/lib/adminI18n";

const AdminLangContext = createContext<{ lang: AdminLang; t: AdminTranslations; setLang: (l: AdminLang) => void }>({
  lang: "fr",
  t: adminI18n.fr,
  setLang: () => {},
});
const useAdminT = () => useContext(AdminLangContext);

type Tab = "dashboard" | "pipeline" | "sponsors" | "volunteers" | "registrations" | "newsletter" | "team" | "past-speakers" | "users" | "profiles" | "communication" | "sponsor-pipeline" | "budget" | "logistics" | "certificates" | "export" | "prospection" | "tickets" | "sponsor-packages" | "settings" | "audit";

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

interface MfaSetupState {
  userId: number;
  userName: string;
  qrDataUrl: string;
  secret: string;
  totpCode: string;
  verified: boolean;
  loading: boolean;
  error: string;
}

function MfaSetupModal({ setup, onClose, onSuccess }: { setup: MfaSetupState; onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  const verify = async () => {
    setVerifying(true);
    setErr("");
    const res = await fetch("/api/admin/mfa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: setup.userId, totp: code }),
    });
    const json = await res.json();
    if (res.ok) { setDone(true); onSuccess(); }
    else setErr(json.error || "Erreur");
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="cyber-card rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-white font-bold mb-2">🔐 Activer MFA — {setup.userName}</h3>
        {done ? (
          <>
            <p className="text-neon-green text-sm mb-4">✓ MFA activé avec succès !</p>
            <button onClick={onClose} className="btn-neon w-full py-2 rounded text-sm">Fermer</button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-xs mb-3">Scannez ce QR code avec Google Authenticator ou une app TOTP compatible.</p>
            <div className="flex justify-center mb-3">
              <img src={setup.qrDataUrl} alt="QR Code MFA" className="w-48 h-48" />
            </div>
            <p className="text-gray-600 text-xs text-center mb-4 font-mono break-all" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{setup.secret}</p>
            <label className="text-xs text-gray-500 block mb-1">Code de vérification (6 chiffres)</label>
            <input
              className="cyber-input w-full px-3 py-2 rounded text-sm mb-3 font-mono"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
            />
            {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
            <div className="flex gap-2">
              <button onClick={verify} disabled={verifying || code.length !== 6} className="btn-neon flex-1 py-2 rounded text-sm">
                {verifying ? "Vérification..." : "Vérifier et activer"}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white transition-colors">Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AdminUsersPanel() {
  const { t } = useAdminT();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ profileId: "coordinateur_cfp" });
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<MfaSetupState | null>(null);

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

  const startMfaSetup = async (u: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/mfa/setup?userId=${u.id}`);
    if (!res.ok) { alert("Erreur lors de la génération du QR code"); return; }
    const json = await res.json() as { qrDataUrl: string; secret: string };
    setMfaSetup({
      userId: u.id as number,
      userName: u.name as string,
      qrDataUrl: json.qrDataUrl,
      secret: json.secret,
      totpCode: "",
      verified: false,
      loading: false,
      error: "",
    });
  };

  const disableMfa = async (id: number) => {
    if (!confirm("Désactiver le MFA pour cet utilisateur ?")) return;
    const res = await fetch("/api/admin/mfa/setup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, mfaEnabled: false } : u));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{t.usersTitle}</h1>
          <p className="text-gray-500 text-xs mt-1">{t.receiveCredentials}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-sm">{t.newUser}</button>
      </div>

      {mfaSetup && (
        <MfaSetupModal
          setup={mfaSetup}
          onClose={() => setMfaSetup(null)}
          onSuccess={() => {
            setUsers(prev => prev.map(u => u.id === mfaSetup.userId ? { ...u, mfaEnabled: true } : u));
          }}
        />
      )}

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
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                  {profile && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: profile.color + "20", color: profile.color }}>
                      {profile.name}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${u.mfaEnabled ? "bg-purple-900/30 text-purple-400" : "bg-gray-800 text-gray-600"}`}>
                    🔐 MFA {u.mfaEnabled ? "ON" : "OFF"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "bg-neon-green/10 text-neon-green" : "bg-gray-800 text-gray-600"}`}>
                    {u.isActive ? "Actif" : "Inactif"}
                  </span>
                  <button onClick={() => toggleActive(u.id as number, !(u.isActive as boolean))} className="text-xs text-gray-600 hover:text-white transition-colors">
                    {u.isActive ? "Désactiver" : "Activer"}
                  </button>
                  {u.mfaEnabled ? (
                    <button onClick={() => disableMfa(u.id as number)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                      Désactiver MFA
                    </button>
                  ) : (
                    <button onClick={() => startMfaSetup(u)} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                      Activer MFA
                    </button>
                  )}
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
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [view, setView] = useState<"leads" | "pipeline">("leads");

  // Selection for batch scoring
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scoring, setScoring] = useState(false);

  // Contact modal
  const [contactTarget, setContactTarget] = useState<Record<string, unknown> | null>(null);
  const [contactLang, setContactLang] = useState<"fr" | "en">("fr");
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sponsor-packages").then(r => r.json()).then(setPackages).catch(() => {});
  }, []);

  const runApolloSearch = async () => {
    setSearching(true);
    await fetch("/api/admin/ai/apollo-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keywords: apolloKeywords.split(",").map(k => k.trim()).filter(Boolean) }) });
    await onRefresh();
    setSearching(false);
  };

  const runPlacesSearch = async () => {
    if (!placesQuery.trim()) return;
    setSearching(true);
    await fetch("/api/admin/ai/places-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: placesQuery }) });
    await onRefresh();
    setSearching(false);
  };

  const scoreColor = (s: number | null | undefined) => {
    if (s === null || s === undefined) return "#555";
    return s >= 7 ? "#00ff9d" : s >= 5 ? "#ffaa00" : "#ff0066";
  };

  const scoreSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0 || ids.length > 10) return;
    setScoring(true);
    const res = await fetch("/api/admin/ai/score-prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    if (res.ok) {
      const { leads: updated } = await res.json() as { leads: Record<string, unknown>[]; scored: number };
      // Merge updated scores back without full refresh
      updated.forEach(u => {
        const lead = leads.find(l => l.id === u.id);
        if (lead) { lead.aiScore = u.aiScore; lead.aiScoreReason = u.aiScoreReason; lead.recommendedPackage = u.recommendedPackage; }
      });
      onRefresh();
    }
    setSelected(new Set());
    setScoring(false);
  };

  const addToPipeline = async (lead: Record<string, unknown>, status = "prospect") => {
    await fetch("/api/admin/ai/prospect-leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, addedToPipeline: true }) });
    await fetch("/api/admin/sponsor-prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: lead.org, contact: lead.contactName || null, email: lead.contactEmail || null, phone: lead.phone || null, package: lead.recommendedPackage || null, notes: lead.aiScoreReason || null, status }),
    });
    onRefresh();
  };

  const deleteLead = async (lead: Record<string, unknown>) => {
    if (!confirm(`Supprimer définitivement "${lead.org}" ?`)) return;
    await fetch("/api/admin/ai/prospect-leads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id }) });
    onRefresh();
  };

  const openContactModal = (lead: Record<string, unknown>) => {
    setContactTarget(lead);
    setContactLang("fr");
    setContactSubject("");
    setContactBody("");
    setSendResult(null);
    setGenerating(false);
  };

  const generateContactEmail = async () => {
    if (!contactTarget) return;
    setGenerating(true);
    const pkg = packages.find(p => p.tier === contactTarget.recommendedPackage);
    const res = await fetch("/api/admin/ai/sponsor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: contactTarget.org, contact: contactTarget.contactName, contactTitle: contactTarget.contactTitle, package: contactTarget.recommendedPackage, packagePrice: pkg ? `${(pkg.price as number).toLocaleString("fr-FR")} FCFA` : undefined, sector: contactTarget.sector, mode: "prospect" }),
    });
    if (res.ok) {
      const data = await res.json() as { subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string };
      setContactSubject(contactLang === "fr" ? data.subjectFr : data.subjectEn);
      setContactBody(contactLang === "fr" ? data.bodyFr : data.bodyEn);
    }
    setGenerating(false);
  };

  const sendContactEmail = async () => {
    if (!contactTarget || !contactSubject || !contactBody) return;
    const to = contactTarget.contactEmail as string;
    if (!to) { setSendResult("❌ Aucun email de contact disponible pour ce prospect."); return; }
    setSending(true);
    const res = await fetch("/api/admin/ai/prospect-email-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject: contactSubject, body: contactBody, org: contactTarget.org }),
    });
    setSendResult(res.ok ? "✓ Email envoyé avec succès." : "❌ Erreur lors de l'envoi.");
    setSending(false);
  };

  // Deduplicate
  const seen = new Set<string>();
  const deduped = leads.filter(l => {
    const key = (l.org as string).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const pendingLeads = deduped.filter(l => !l.addedToPipeline).sort((a, b) => ((b.aiScore as number) || 0) - ((a.aiScore as number) || 0));
  const pipelineLeads = deduped.filter(l => !!l.addedToPipeline).sort((a, b) => ((b.aiScore as number) || 0) - ((a.aiScore as number) || 0));

  // Selection helpers
  const canSelect = (lead: Record<string, unknown>) => lead.aiScore === null || lead.aiScore === undefined;
  const toggleSelect = (id: number, lead: Record<string, unknown>) => {
    if (!canSelect(lead)) return; // already scored — block
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else if (next.size < 10) next.add(id);
    setSelected(next);
  };
  const selectedCount = selected.size;

  return (
    <div>
      {/* Contact modal */}
      {contactTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{contactTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{contactTarget.sector as string} · {contactTarget.contactEmail as string || "Pas d'email"}</p>
              </div>
              <button onClick={() => setContactTarget(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Lang + generate */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-500">Langue :</span>
              {(["fr", "en"] as const).map(l => (
                <button key={l} onClick={() => setContactLang(l)}
                  className={`text-xs px-3 py-1 rounded border transition-all ${contactLang === l ? "bg-neon-green/10 text-neon-green border-neon-green/30" : "text-gray-500 border-gray-700"}`}>
                  {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
              ))}
              <button onClick={generateContactEmail} disabled={generating}
                className="ml-auto text-xs px-4 py-1.5 rounded transition-all"
                style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}>
                {generating ? "Génération…" : "✨ Générer"}
              </button>
            </div>

            {/* Editable subject */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Objet</label>
              <input
                className="cyber-input w-full px-3 py-2 rounded text-xs text-white"
                value={contactSubject}
                onChange={e => setContactSubject(e.target.value)}
                placeholder="Objet de l'email…"
              />
            </div>

            {/* Editable body */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Corps du message</label>
              <textarea
                className="cyber-input w-full px-3 py-2 rounded text-xs text-white leading-relaxed"
                rows={12}
                value={contactBody}
                onChange={e => setContactBody(e.target.value)}
                placeholder="Corps de l'email…"
              />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={sendContactEmail} disabled={sending || !contactSubject || !contactBody}
                className="btn-neon px-5 py-2 rounded text-xs disabled:opacity-50">
                {sending ? "Envoi…" : "📤 Envoyer"}
              </button>
              <span className="text-xs text-gray-600">Reply-To : contact@eyesopensecurity.com</span>
            </div>
            {sendResult && (
              <p className="mt-3 text-xs font-mono" style={{ color: sendResult.startsWith("✓") ? "#00ff9d" : "#ff0066" }}>{sendResult}</p>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Prospection Sponsors IA</h1>
        <p className="text-gray-500 text-xs mt-1">Workflow : Recherche → Leads → Scoring IA → Pipeline → Contacter</p>
      </div>

      {/* Search */}
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
        <p className="text-gray-700 text-xs mt-2">Apollo.io couvre les entreprises de +50 employés en Afrique · Google Places couvre les PME locales de Douala</p>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-3 mb-4">
        {(["leads", "pipeline"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`text-xs px-4 py-2 rounded border transition-all ${view === v ? "bg-neon-green/10 text-neon-green border-neon-green/30" : "text-gray-600 border-gray-800"}`}>
            {v === "leads" ? `📋 Leads (${pendingLeads.length})` : `🎯 En pipeline (${pipelineLeads.length})`}
          </button>
        ))}
      </div>

      {/* LEADS VIEW */}
      {view === "leads" && (
        <div className="cyber-card rounded-xl p-5 mb-5">
          {/* Scoring toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-500">{selectedCount} sélectionné{selectedCount > 1 ? "s" : ""} (max 10)</span>
            <button
              onClick={scoreSelected}
              disabled={selectedCount === 0 || scoring}
              className="text-xs px-4 py-1.5 rounded transition-all disabled:opacity-40"
              style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}
            >
              {scoring ? "Analyse IA…" : "✨ Scorer avec IA"}
            </button>
            {selectedCount > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs text-gray-600 hover:text-gray-400">Tout déselectionner</button>
            )}
          </div>

          {pendingLeads.length === 0 && (
            <p className="text-gray-600 text-xs py-8 text-center">Aucun prospect. Lancez une recherche ci-dessus ou tous les leads sont déjà en pipeline.</p>
          )}

          <div className="space-y-3">
            {pendingLeads.map(lead => {
              const id = lead.id as number;
              const isSelected = selected.has(id);
              const isScored = lead.aiScore !== null && lead.aiScore !== undefined;
              return (
                <div key={id} className={`border rounded-xl p-4 transition-all ${isSelected ? "border-blue-500/50 bg-blue-500/5" : "border-gray-700 hover:border-gray-500"}`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isScored}
                        onChange={() => toggleSelect(id, lead)}
                        title={isScored ? "Déjà scoré — scoring IA non nécessaire" : "Sélectionner pour scorer"}
                        className="w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: lead.source === "apollo" ? "#0066ff15" : "#cc00ff15", color: lead.source === "apollo" ? "#0066ff" : "#cc00ff" }}>
                          {lead.source as string}
                        </span>
                        {isScored ? (
                          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ background: scoreColor(lead.aiScore as number) + "20", color: scoreColor(lead.aiScore as number) }}>
                            ✨ {(lead.aiScore as number).toFixed(1)}/10
                          </span>
                        ) : (
                          <span className="text-xs text-gray-700 font-mono">— non scoré</span>
                        )}
                        {!!(lead.recommendedPackage as string) && (
                          <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "#ffaa0040", color: "#ffaa00" }}>{lead.recommendedPackage as string}</span>
                        )}
                      </div>
                      <p className="text-white font-bold text-sm">{lead.org as string}</p>
                      {(!!lead.sector || !!lead.city) && <p className="text-gray-500 text-xs mt-0.5">{lead.sector as string}{lead.city ? ` · ${lead.city}` : ""}</p>}
                      {!!lead.contactName && <p className="text-xs mt-1" style={{ color: "#00ff9d" }}>👤 {lead.contactName as string}{lead.contactTitle ? ` — ${lead.contactTitle}` : ""}</p>}
                      {!!lead.contactEmail && <p className="text-gray-400 text-xs">✉ {lead.contactEmail as string}</p>}
                      {!!lead.website && <a href={lead.website as string} target="_blank" rel="noreferrer" className="text-xs hover:underline block mt-0.5" style={{ color: "#0066ff" }}>🌐 {lead.website as string}</a>}
                      {!lead.contactEmail && lead.source === "google_places" && <p className="text-gray-700 text-xs mt-0.5 italic">Email non disponible via Google Places — consulter le site web</p>}
                      {!!lead.aiScoreReason && <p className="text-gray-600 text-xs mt-1 italic">{lead.aiScoreReason as string}</p>}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => addToPipeline(lead, "prospect")}
                        className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                        style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                        + Pipeline
                      </button>
                      <button onClick={() => addToPipeline(lead, "abandoned")}
                        className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                        style={{ background: "#88888815", color: "#888", border: "1px solid #88888830" }}>
                        Abandonner
                      </button>
                      <button onClick={() => deleteLead(lead)}
                        className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                        style={{ background: "#ff006615", color: "#ff0066", border: "1px solid #ff006630" }}>
                        ✕ Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PIPELINE VIEW */}
      {view === "pipeline" && (
        <div className="cyber-card rounded-xl p-5 mb-5">
          {pipelineLeads.length === 0 && (
            <p className="text-gray-600 text-xs py-8 text-center">Aucun prospect en pipeline. Ajoutez des leads depuis l&apos;onglet Leads.</p>
          )}
          <div className="space-y-3">
            {pipelineLeads.map(lead => (
              <div key={lead.id as number} className="border border-gray-700 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: lead.source === "apollo" ? "#0066ff15" : "#cc00ff15", color: lead.source === "apollo" ? "#0066ff" : "#cc00ff" }}>{lead.source as string}</span>
                    {lead.aiScore !== null && lead.aiScore !== undefined && (
                      <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ background: scoreColor(lead.aiScore as number) + "20", color: scoreColor(lead.aiScore as number) }}>
                        ✨ {(lead.aiScore as number).toFixed(1)}/10
                      </span>
                    )}
                    {!!(lead.recommendedPackage as string) && (
                      <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "#ffaa0040", color: "#ffaa00" }}>{lead.recommendedPackage as string}</span>
                    )}
                    <span className="text-xs text-neon-green">✓ En pipeline</span>
                  </div>
                  <p className="text-white font-bold text-sm">{lead.org as string}</p>
                  {(!!lead.sector || !!lead.city) && <p className="text-gray-500 text-xs mt-0.5">{lead.sector as string}{lead.city ? ` · ${lead.city}` : ""}</p>}
                  {!!lead.contactName && <p className="text-xs mt-1" style={{ color: "#00ff9d" }}>👤 {lead.contactName as string}{lead.contactTitle ? ` — ${lead.contactTitle}` : ""}</p>}
                  {!!lead.contactEmail && <p className="text-gray-400 text-xs">✉ {lead.contactEmail as string}</p>}
                  {!!lead.website && <a href={lead.website as string} target="_blank" rel="noreferrer" className="text-xs hover:underline block mt-0.5" style={{ color: "#0066ff" }}>🌐 {lead.website as string}</a>}
                  {!!lead.aiScoreReason && <p className="text-gray-600 text-xs mt-1 italic">{lead.aiScoreReason as string}</p>}
                </div>
                <button onClick={() => openContactModal(lead)}
                  className="text-xs px-4 py-2 rounded whitespace-nowrap transition-all shrink-0"
                  style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}>
                  ✉ Contacter le prospect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
  // Transactional template editing
  const [txEdits, setTxEdits] = useState<Record<number, { subject: string; htmlBody: string }>>({});
  const [txSaving, setTxSaving] = useState<number | null>(null);;
  const [sending, setSending] = useState<number | null>(null);
  const [refining, setRefining] = useState<number | null>(null);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Record<string, unknown> | null>(null);
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
  const [eventSettings, setEventSettings] = useState<Record<string, string>>({});

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

  useEffect(() => {
    loadLinkedinPosts(); loadTemplates(); loadContext();
    fetch("/api/admin/settings").then(r => r.json()).then(setEventSettings).catch(() => {});
  }, [loadLinkedinPosts, loadTemplates, loadContext]);

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

  const refineTemplate = async (id: number) => {
    setRefining(id);
    const res = await fetch("/api/admin/email-templates/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: id, instructions: refineInstructions || undefined }),
    });
    if (res.ok) {
      const updated = await res.json() as Record<string, unknown>;
      setTemplates(prev => prev.map(t => t.id === id ? updated : t));
    }
    setRefining(null);
    setRefineInstructions("");
  };

  const seedTemplates = async () => {
    await fetch("/api/admin/email-templates/seed", { method: "POST" });
    await loadTemplates();
  };

  const seedTransactionalTemplates = async () => {
    await fetch("/api/admin/email-templates/seed-transactional", { method: "POST" });
    await loadTemplates();
  };

  const saveTxTemplate = async (id: number) => {
    const edit = txEdits[id];
    if (!edit) return;
    setTxSaving(id);
    await fetch(`/api/admin/email-templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setTxSaving(null);
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
  const [commTab, setCommTab] = useState<"social" | "email">("social");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Communication</h1>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-1 border-b border-gray-800">
        {([
          { key: "social", label: "📱 Réseaux Sociaux" },
          { key: "email",  label: "✉ Emails & Templates" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setCommTab(tab.key)}
            className={`text-xs px-4 py-2 border-b-2 transition-all ${commTab === tab.key ? "border-neon-green text-neon-green" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── RÉSEAUX SOCIAUX ── */}
      {commTab === "social" && <>

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

        {/* Side panel — fixed layout: sticky header + scrollable body + sticky footer */}
        {panelOpen && selectedDay && (
          <div className="cyber-card rounded-xl w-96 shrink-0 flex flex-col" style={{ height: "calc(100vh - 160px)", maxHeight: 680 }}>
            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800 shrink-0">
              <h3 className="text-white font-bold text-sm">
                {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <button onClick={() => setPanelOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">

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
                    // Auto-fill speaker photo
                    if (contextType === "speaker" && item?.photoUrl) setPostImage(item.photoUrl as string);
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

            {/* Event info banner */}
            {Object.keys(eventSettings).length > 0 && (
              <div className="mb-3 p-2 rounded-lg border border-gray-800 flex items-center gap-3">
                <span className="text-neon-green text-xs">📅</span>
                <span className="text-xs text-gray-300">{eventSettings.event_date_display_fr || "28 novembre 2026"} · {eventSettings.event_venue || "Hotel Onomo"}, {eventSettings.event_city || "Douala"}</span>
              </div>
            )}

            {/* Countdown info */}
            {contextType === "countdown" && contextData && (
              <div className="mb-3 p-2 rounded-lg border border-gray-800">
                <p className="text-xs text-neon-green font-mono">J-{contextData.daysUntil} jusqu'à EOCON 2026</p>
                <p className="text-gray-600 text-xs">{eventSettings.event_date_display_fr || "28 novembre 2026"} · {eventSettings.event_venue || "Hotel Onomo"}, {eventSettings.event_city || "Douala"}</p>
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

            {/* CTA for this content type */}
            {contextType !== "custom" && (() => {
              const ctaMap: Record<string, { text: string; urlKey: string }> = {
                inscriptions: { text: "S'inscrire à EOCON 2026 →", urlKey: "url_inscription" },
                cfp: { text: "Soumettre mon talk →", urlKey: "url_cfp" },
                ctf: { text: "Rejoindre l'EOCTF →", urlKey: "url_ctf" },
                speaker: { text: "Voir le programme →", urlKey: "url_programme" },
                session: { text: "Voir le programme →", urlKey: "url_programme" },
                workshop: { text: "S'inscrire →", urlKey: "url_inscription" },
                countdown: { text: "S'inscrire →", urlKey: "url_inscription" },
                sponsor: { text: "Devenir partenaire →", urlKey: "site_base_url" },
              };
              const cta = ctaMap[contextType];
              if (!cta) return null;
              const url = eventSettings[cta.urlKey] || "";
              return (
                <div className="mb-3 p-2 rounded-lg flex items-center gap-3" style={{ background: "#00ff9d0a", border: "1px solid #00ff9d22" }}>
                  <span className="text-xs text-gray-500">CTA</span>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-neon-green">{cta.text}</span>
                    {url && <span className="text-xs text-gray-500 ml-2 font-mono">{url}</span>}
                  </div>
                </div>
              );
            })()}

            {/* Brief */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Brief</p>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} className="cyber-input w-full text-xs rounded p-2 h-24 resize-none text-white" placeholder="Décrivez le contenu du post..." />
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

              <button onClick={generatePosts} disabled={generating || !brief.trim()} className="btn-neon w-full py-2 rounded text-xs">
                {generating ? "Génération en cours..." : "✨ Générer avec IA"}
              </button>

              {/* Generated posts preview */}
              {generatedPosts && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Aperçu des posts</p>
                  {(["linkedin", "twitter", "instagram"] as const).filter(p => platforms[p]).map(platform => (
                    <div key={platform} className="border border-gray-800 rounded-lg p-3">
                      <p className="text-xs font-bold mb-1 capitalize" style={{ color: platform === "linkedin" ? "#0066ff" : platform === "twitter" ? "#00ccff" : "#cc00ff" }}>{platform}</p>
                      {(lang === "both" ? ["fr", "en"] : [lang]).map(l => (
                        <div key={l} className="mb-1">
                          <span className="text-gray-600 text-xs">[{l.toUpperCase()}] </span>
                          <span className="text-gray-400 text-xs">{generatedPosts[`${platform}_${l}`]?.slice(0, 120)}...</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>{/* end scrollable body */}

            {/* Sticky footer — always visible */}
            <div className="shrink-0 border-t border-gray-800 px-5 py-3 space-y-2">
              {/* Schedule date */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">📅</span>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="cyber-input text-xs rounded px-2 py-1 flex-1 text-white"
                />
              </div>
              {/* Action buttons */}
              {generatedPosts ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      await savePosts();
                      // publish all saved drafts immediately
                      const fresh = await fetch("/api/admin/ai/social-posts").then(r => r.json()) as Record<string, unknown>[];
                      for (const p of fresh.filter(p => p.status === "draft")) {
                        await fetch("/api/admin/ai/publish-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
                      }
                      await loadLinkedinPosts();
                    }}
                    disabled={saving}
                    className="py-2 rounded text-xs font-bold transition-all"
                    style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}
                  >
                    ▶ Poster maintenant
                  </button>
                  <button
                    onClick={savePosts}
                    disabled={saving || !scheduleDate}
                    className="py-2 rounded text-xs font-bold transition-all"
                    style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d40" }}
                  >
                    {saving ? "..." : "📅 Planifier"}
                  </button>
                </div>
              ) : (
                <p className="text-gray-700 text-xs text-center">Générez d&apos;abord les posts avec l&apos;IA ↑</p>
              )}
            </div>
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
                    <a
                      href={post.platform === "twitter"
                        ? `https://x.com/i/web/status/${post.linkedinPostId as string}`
                        : `https://www.linkedin.com/feed/update/${post.linkedinPostId as string}/`}
                      target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded" style={{ color: "#00ff9d" }}
                    >↗</a>
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

      </>}

      {/* ── EMAILS & TEMPLATES ── */}
      {commTab === "email" && <>

      {/* Transactional templates */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Templates Transactionnels</h3>
          <button onClick={seedTransactionalTemplates} className="text-xs px-3 py-1.5 rounded transition-all" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>🔧 Initialiser templates transactionnels</button>
        </div>
        <div className="space-y-3">
          {templates.filter(t => t.slug).length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4">Aucun template transactionnel. Cliquez sur &quot;Initialiser&quot; pour créer les 7 templates.</p>
          )}
          {templates.filter(t => t.slug).map(t => {
            const id = t.id as number;
            const edit = txEdits[id] || { subject: t.subject as string, htmlBody: t.htmlBody as string };
            let vars: string[] = [];
            try { vars = JSON.parse(t.variables as string || "[]"); } catch { vars = []; }
            return (
              <div key={id} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#00ff9d10", color: "#00ff9d", border: "1px solid #00ff9d30" }}>{t.slug as string}</span>
                  <span className="text-white text-xs font-bold">{t.name as string}</span>
                </div>
                {vars.length > 0 && (
                  <p className="text-gray-600 text-xs mb-2">Variables : {vars.map(v => `{{${v}}}`).join(", ")}</p>
                )}
                <input
                  className="cyber-input w-full text-xs rounded px-3 py-2 text-white mb-2"
                  value={edit.subject}
                  onChange={e => setTxEdits(prev => ({ ...prev, [id]: { ...edit, subject: e.target.value } }))}
                  placeholder="Objet"
                />
                <textarea
                  className="cyber-input w-full text-xs rounded px-3 py-2 text-white h-40 resize-none"
                  value={edit.htmlBody}
                  onChange={e => setTxEdits(prev => ({ ...prev, [id]: { ...edit, htmlBody: e.target.value } }))}
                  placeholder="Corps HTML"
                />
                <div className="mt-2 flex justify-end">
                  <button onClick={() => saveTxTemplate(id)} disabled={txSaving === id} className="text-xs px-3 py-1.5 rounded" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                    {txSaving === id ? "..." : "Sauvegarder"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Email templates */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Templates Email Campagnes</h3>
          <div className="flex gap-2">
            <button onClick={seedTemplates} className="text-xs px-3 py-1.5 rounded transition-all" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>⚡ Seeder</button>
            <button onClick={() => setShowTemplateForm(!showTemplateForm)} className="btn-neon px-3 py-1.5 rounded text-xs">+ Créer</button>
          </div>
        </div>
        {showTemplateForm && (
          <div className="border border-gray-800 rounded-lg p-4 mb-4 space-y-2">
            <input placeholder="Nom du template" className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.name as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            <input placeholder="Objet email" className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.subject as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} />
            <select className="cyber-input w-full text-xs rounded px-3 py-2 text-black" value={(templateForm.segment as string) || "all"} onChange={e => setTemplateForm(f => ({ ...f, segment: e.target.value }))}>
              <option value="all">Tous</option>
              <option value="registered">Inscrits</option>
              <option value="cfp_accepted">Speakers acceptés</option>
              <option value="volunteers">Bénévoles acceptés</option>
              <option value="newsletter">Newsletter</option>
            </select>
            <textarea placeholder="Corps HTML de l'email" className="cyber-input w-full text-xs rounded px-3 py-2 h-32 resize-none text-white" value={(templateForm.htmlBody as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, htmlBody: e.target.value }))} />
            <div className="flex gap-2">
              <button onClick={saveTemplate} className="btn-neon px-3 py-1.5 rounded text-xs">Enregistrer</button>
              <button onClick={() => setShowTemplateForm(false)} className="text-gray-500 text-xs hover:text-white px-2">Annuler</button>
            </div>
          </div>
        )}

        {/* Preview modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewTemplate(null)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{previewTemplate.name as string}</p>
                  <p className="text-gray-500 text-xs">Objet : {previewTemplate.subject as string}</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
              <div className="p-4" dangerouslySetInnerHTML={{ __html: `<style>td,p,span,div,a,h1,h2,h3,h4,li,body{color:#111!important}</style>${previewTemplate.htmlBody as string}` }} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templates.filter(t => !t.slug).length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 text-xs mb-3">Aucun template campagne. Seedez les templates EOCON 2026 ou créez-en un.</p>
              <button onClick={seedTemplates} className="text-xs px-4 py-2 rounded" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>⚡ Seeder les 7 templates EOCON</button>
            </div>
          )}
          {templates.filter(t => !t.slug).map(t => (
            <div key={t.id as number} className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold">{t.name as string}</p>
                  <p className="text-gray-500 text-xs">Objet : {t.subject as string}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ color: "#888", background: "#88888815" }}>{t.segment as string}</span>
                  {!!t.sentAt && <p className="text-gray-700 text-xs mt-1">Envoyé le {new Date(t.sentAt as string).toLocaleDateString("fr-FR")}</p>}
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  <button onClick={() => setPreviewTemplate(t)} className="text-xs px-2 py-1 rounded" style={{ color: "#888", border: "1px solid #33333380" }}>👁</button>
                  <button onClick={() => sendTemplate(t.id as number)} disabled={sending === (t.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                    {sending === (t.id as number) ? "..." : "▶ Envoyer"}
                  </button>
                </div>
              </div>
              {/* AI refine row */}
              <div className="flex gap-2 pt-2 border-t border-gray-800/50">
                <input
                  type="text"
                  placeholder="Instructions pour l'IA (optionnel)..."
                  className="cyber-input flex-1 text-xs rounded px-2 py-1 text-white"
                  onFocus={() => setRefineInstructions("")}
                  onChange={e => setRefineInstructions(e.target.value)}
                />
                <button
                  onClick={() => refineTemplate(t.id as number)}
                  disabled={refining === (t.id as number)}
                  className="text-xs px-3 py-1 rounded shrink-0 transition-all"
                  style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff30" }}
                >
                  {refining === (t.id as number) ? "IA..." : "✨ Améliorer"}
                </button>
              </div>
            </div>
          ))}
          {!templates.filter(t => !t.slug).length && <p className="text-gray-700 text-xs text-center py-3">Aucun template campagne. Créez-en un.</p>}
        </div>
      </div>

      </>}
    </div>
  );
}

// ---- Sponsor Pipeline Panel ----
const PROSPECT_STATUSES = [
  { value: "demande", fr: "Demande", en: "Request", label: "Demande", color: "#ffaa00" },
  { value: "prospect", fr: "Prospect", en: "Prospect", label: "Prospect", color: "#888" },
  { value: "contacted", fr: "Contacté", en: "Contacted", label: "Contacté", color: "#0066ff" },
  { value: "meeting", fr: "Réunion", en: "Meeting", label: "Réunion", color: "#cc00ff" },
  { value: "positive", fr: "Avancée positive", en: "Positive progress", label: "Avancée positive", color: "#00ff9d" },
  { value: "negative", fr: "Avancée négative", en: "Negative progress", label: "Avancée négative", color: "#ff6600" },
  { value: "concluded", fr: "Conclu", en: "Concluded", label: "Conclu", color: "#00e066" },
  { value: "abandoned", fr: "Abandonné", en: "Abandoned", label: "Abandonné", color: "#ff0066" },
  { value: "paused", fr: "En pause", en: "Paused", label: "En pause", color: "#555" },
];

function SponsorPipelinePanel({ prospects, onRefresh }: { prospects: Record<string, unknown>[]; onRefresh: () => void }) {
  const { t, lang } = useAdminT();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ status: "prospect" });

  // Contact modal state
  const [contactTarget, setContactTarget] = useState<Record<string, unknown> | null>(null);
  const [contactLang, setContactLang] = useState<"fr" | "en">("fr");
  const [contactSubject, setContactSubject] = useState("");
  const [contactBody, setContactBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const openContact = (p: Record<string, unknown>) => {
    setContactTarget(p);
    setContactLang("fr");
    setContactSubject("");
    setContactBody("");
    setSendResult(null);
  };

  const generateEmail = async () => {
    if (!contactTarget) return;
    setGenerating(true);
    const res = await fetch("/api/admin/ai/sponsor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: contactTarget.org, contact: contactTarget.contact, package: contactTarget.package, status: contactTarget.status, notes: contactTarget.notes, mode: "followup" }),
    });
    if (res.ok) {
      const data = await res.json() as { subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string };
      setContactSubject(contactLang === "fr" ? data.subjectFr : data.subjectEn);
      setContactBody(contactLang === "fr" ? data.bodyFr : data.bodyEn);
    }
    setGenerating(false);
  };

  const sendEmail = async () => {
    if (!contactTarget || !contactSubject || !contactBody) return;
    const to = contactTarget.email as string;
    if (!to) { setSendResult("❌ Aucun email de contact disponible."); return; }
    setSending(true);
    const res = await fetch("/api/admin/ai/prospect-email-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject: contactSubject, body: contactBody, org: contactTarget.org }),
    });
    if (res.ok) {
      setSendResult("✓ Email envoyé.");
      await fetch(`/api/admin/sponsor-prospects/${contactTarget.id as number}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "contacted" }) });
      onRefresh();
    } else {
      setSendResult("❌ Erreur lors de l'envoi.");
    }
    setSending(false);
  };

  const save = async () => {
    await fetch("/api/admin/sponsor-prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ status: "prospect" }); onRefresh();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    onRefresh();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ce prospect ?")) return;
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">{t.pipelineTitle}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">{t.addProspect}</button>
      </div>

      {/* Contact modal */}
      {contactTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{contactTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{(contactTarget.email as string) || "Pas d'email"} · Package : {(contactTarget.package as string) || "—"}</p>
              </div>
              <button onClick={() => setContactTarget(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>

            {/* Lang + generate */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-500">Langue :</span>
              {(["fr", "en"] as const).map(l => (
                <button key={l} onClick={() => setContactLang(l)}
                  className={`text-xs px-3 py-1 rounded border transition-all ${contactLang === l ? "bg-neon-green/10 text-neon-green border-neon-green/30" : "text-gray-500 border-gray-700"}`}>
                  {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                </button>
              ))}
              <button onClick={generateEmail} disabled={generating}
                className="ml-auto text-xs px-4 py-1.5 rounded transition-all"
                style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}>
                {generating ? "Génération…" : "✨ Générer relance"}
              </button>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">Objet</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs text-white" value={contactSubject} onChange={e => setContactSubject(e.target.value)} placeholder="Objet…" />
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Corps du message</label>
              <textarea className="cyber-input w-full px-3 py-2 rounded text-xs text-white leading-relaxed" rows={12} value={contactBody} onChange={e => setContactBody(e.target.value)} placeholder="Corps…" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={sendEmail} disabled={sending || !contactSubject || !contactBody}
                className="btn-neon px-5 py-2 rounded text-xs disabled:opacity-50">
                {sending ? "Envoi…" : "📤 Envoyer"}
              </button>
              <span className="text-xs text-gray-600">Reply-To : contact@eyesopensecurity.com</span>
            </div>
            {sendResult && (
              <p className="mt-3 text-xs font-mono" style={{ color: sendResult.startsWith("✓") ? "#00ff9d" : "#ff0066" }}>{sendResult}</p>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: "org", label: t.org + " *" },
              { key: "contact", label: t.contact },
              { key: "email", label: t.email },
              { key: "phone", label: t.phone },
              { key: "package", label: t.package },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.status}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.status as string) || "prospect"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {PROSPECT_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "en" ? s.en : s.fr}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-gray-500 block mb-1">{t.notes}</label>
              <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.notes as string) || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">{t.save}</button>
            <button onClick={() => { setShowForm(false); setForm({ status: "prospect" }); }} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {PROSPECT_STATUSES.map(st => {
            const group = prospects.filter(p => p.status === st.value);
            return (
              <div key={st.value} className="w-64 shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: st.color }}>{lang === "en" ? st.en : st.fr}</span>
                  <span className="ml-auto text-xs text-gray-700 font-mono">{group.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {group.map(p => (
                    <div
                      key={p.id as number}
                      className="cyber-card rounded-lg p-3 text-xs"
                      style={{ borderLeft: `3px solid ${st.color}40` }}
                    >
                      <p className="text-white font-bold text-sm mb-1 truncate">{p.org as string}</p>
                      {(p.contact as string) && <p className="text-gray-500 truncate">{p.contact as string}</p>}
                      {(p.email as string) && <p className="text-neon-green/60 truncate">{p.email as string}</p>}
                      {(p.package as string) && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs" style={{ background: st.color + "20", color: st.color }}>
                          {p.package as string}
                        </span>
                      )}
                      {(p.notes as string) && (
                        <p className="text-gray-600 text-xs mt-1 truncate" title={p.notes as string}>{p.notes as string}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <button
                          onClick={() => openContact(p)}
                          className="text-xs px-2 py-0.5 rounded transition-all"
                          style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                        >
                          ✉
                        </button>
                        <select
                          className="cyber-input text-xs px-1 py-0.5 rounded flex-1 min-w-0"
                          value={p.status as string}
                          onChange={e => updateStatus(p.id as number, e.target.value)}
                        >
                          {PROSPECT_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "en" ? s.en : s.fr}</option>)}
                        </select>
                        <button onClick={() => del(p.id as number)} className="text-xs text-red-500 hover:text-red-400 px-1">✕</button>
                      </div>
                    </div>
                  ))}
                  {group.length === 0 && (
                    <div className="border border-dashed border-gray-800 rounded-lg h-16 flex items-center justify-center">
                      <span className="text-gray-800 text-xs">vide</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!prospects.length && <p className="text-gray-600 text-xs py-4 text-center">Aucun prospect pour l&apos;instant</p>}
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

interface AutoRevenue { label: string; value: number; color: string; }

const BUDGET_STATUS_COLORS: Record<string, string> = {
  paid: "#00ff9d",
  pending: "#ffaa00",
  cancelled: "#666666",
};

function BudgetPanel({ items, onRefresh }: { items: Record<string, unknown>[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ category: "costs", planned: 0, actual: 0, status: "pending" });
  const [autoRevenues, setAutoRevenues] = useState<AutoRevenue[]>([]);
  const [capitalDepart, setCapitalDepart] = useState<number>(0);
  const [capitalInput, setCapitalInput] = useState<string>("0");
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; name: string }>>([]);

  // Fetch capital setting and team members
  useEffect(() => {
    async function loadMeta() {
      const [settingsRes, teamRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/team"),
      ]);
      if (settingsRes.ok) {
        const s = await settingsRes.json() as Record<string, string>;
        const cap = parseFloat(s.capitalDepart || "0") || 0;
        setCapitalDepart(cap);
        setCapitalInput(String(cap));
      }
      if (teamRes.ok) {
        const members = await teamRes.json() as Array<{ id: number; name: string }>;
        setTeamMembers(members);
      }
    }
    loadMeta();
  }, []);

  // Fetch auto-calculated revenues from ticket sales + sponsor packages
  useEffect(() => {
    async function loadAutoRevenues() {
      const [ticketRes, sponsorRes] = await Promise.all([
        fetch("/api/admin/ticket-types"),
        fetch("/api/admin/packages"),
      ]);
      const revenues: AutoRevenue[] = [];
      if (ticketRes.ok) {
        const types = await ticketRes.json() as Array<{ nameFr: string; priceFr: number; sold: number; color: string }>;
        for (const t of types) {
          const val = t.priceFr * (t.sold || 0);
          if (t.sold > 0 || t.priceFr > 0) revenues.push({ label: `Billets — ${t.nameFr}`, value: val, color: t.color });
        }
      }
      if (sponsorRes.ok) {
        const pkgs = await sponsorRes.json() as Array<{ name: string; price: number; sponsors?: unknown[] }>;
        for (const p of pkgs) {
          const count = Array.isArray(p.sponsors) ? p.sponsors.length : 0;
          if (p.price > 0) revenues.push({ label: `Sponsors — ${p.name}`, value: p.price * count, color: "#ffaa00" });
        }
      }
      setAutoRevenues(revenues);
    }
    loadAutoRevenues();
  }, [items]);

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

  const manualRevenues = items.filter(i => i.category === "revenue");
  const costs = items.filter(i => i.category === "costs");
  const autoTotal = autoRevenues.reduce((s, r) => s + r.value, 0);
  const totalPlannedRev = manualRevenues.reduce((s, i) => s + ((i.planned as number) || 0), 0) + autoTotal;
  const totalActualRev = manualRevenues.reduce((s, i) => s + ((i.actual as number) || 0), 0) + autoTotal;
  const totalPlannedCost = costs.reduce((s, i) => s + ((i.planned as number) || 0), 0);
  const totalActualCost = costs.reduce((s, i) => s + ((i.actual as number) || 0), 0);
  const balance = totalActualRev - totalActualCost;
  const capitalRestant = capitalDepart - totalActualCost;
  const capitalDepasse = capitalDepart > 0 && totalActualCost > capitalDepart;

  const saveCapital = async (val: number) => {
    setCapitalDepart(val);
    await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ capitalDepart: String(val) }) });
  };

  // Histogram data: revenues vs costs by category
  const histogramItems: { label: string; value: number; color: string; maxVal: number }[] = [
    ...autoRevenues.map(r => ({ label: r.label, value: r.value, color: r.color, maxVal: 0 })),
    ...manualRevenues.map(r => ({ label: r.label as string, value: (r.actual as number) || (r.planned as number) || 0, color: "#00ff9d", maxVal: 0 })),
    ...costs.map(c => ({ label: c.label as string, value: -((c.actual as number) || (c.planned as number) || 0), color: "#ff4444", maxVal: 0 })),
  ].filter(i => i.value !== 0);

  const maxAbsVal = Math.max(...histogramItems.map(i => Math.abs(i.value)), 1);

  const renderTable = (rows: Record<string, unknown>[], title: string, color: string, showResponsable = false) => (
    <div className="cyber-card rounded-xl p-5 mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color }}>{title}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500">
            <th className="text-left py-2 px-2 font-normal">Libellé</th>
            <th className="text-right py-2 px-2 font-normal">Prévu (FCFA)</th>
            <th className="text-right py-2 px-2 font-normal">Réel (FCFA)</th>
            <th className="text-left py-2 px-2 font-normal">Statut</th>
            {showResponsable && <th className="text-left py-2 px-2 font-normal">Responsable</th>}
            <th className="py-2 px-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const statusColor = BUDGET_STATUS_COLORS[r.status as string] || "#888";
            return (
              <tr key={r.id as number} className="border-b border-gray-900 hover:bg-white/[0.01]" style={{ borderLeft: `3px solid ${statusColor}20` }}>
                <td className="py-2 px-2 text-white">{r.label as string}</td>
                <td className="py-2 px-2 text-right">
                  <input type="number" className="cyber-input w-24 px-2 py-1 rounded text-xs text-right"
                    defaultValue={(r.planned as number) || 0}
                    onBlur={e => update(r.id as number, { planned: parseFloat(e.target.value) || 0 })} />
                </td>
                <td className="py-2 px-2 text-right">
                  <input type="number" className="cyber-input w-24 px-2 py-1 rounded text-xs text-right"
                    defaultValue={(r.actual as number) || 0}
                    onBlur={e => update(r.id as number, { actual: parseFloat(e.target.value) || 0 })} />
                </td>
                <td className="py-2 px-2">
                  <select
                    className="cyber-input text-xs px-2 py-1 rounded font-bold"
                    style={{ color: statusColor, borderColor: statusColor + "60" }}
                    value={r.status as string}
                    onChange={e => update(r.id as number, { status: e.target.value })}>
                    <option value="pending" style={{ color: BUDGET_STATUS_COLORS.pending }}>En attente</option>
                    <option value="paid" style={{ color: BUDGET_STATUS_COLORS.paid }}>Payé</option>
                    <option value="cancelled" style={{ color: BUDGET_STATUS_COLORS.cancelled }}>Annulé</option>
                  </select>
                </td>
                {showResponsable && (
                  <td className="py-2 px-2">
                    <select
                      className="cyber-input text-xs px-2 py-1 rounded w-36"
                      defaultValue={(r.responsable as string) || ""}
                      onChange={e => update(r.id as number, { responsable: e.target.value || null })}>
                      <option value="">— aucun —</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="py-2 px-2">
                  <button onClick={() => del(r.id as number)} className="text-red-400 text-xs hover:text-red-300">✗</button>
                </td>
              </tr>
            );
          })}
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

      {/* Capital de départ */}
      <div className="cyber-card rounded-xl p-4 mb-4 flex items-center gap-4">
        <div className="text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap">Capital de départ</div>
        <input
          type="number"
          className="cyber-input px-3 py-1.5 rounded text-sm font-mono flex-1 max-w-[220px]"
          value={capitalInput}
          onChange={e => setCapitalInput(e.target.value)}
          onBlur={e => saveCapital(parseFloat(e.target.value) || 0)}
        />
        <span className="text-xs text-gray-500">XAF</span>
        {capitalDepart > 0 && (
          <span className="text-xs text-gray-400 ml-2">
            Capital restant : <span className="font-mono font-bold" style={{ color: capitalRestant >= 0 ? "#00ff9d" : "#ff4444" }}>{capitalRestant.toLocaleString("fr-FR")} XAF</span>
          </span>
        )}
      </div>

      {capitalDepasse && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-bold flex items-center gap-2" style={{ background: "#ff006620", border: "1px solid #ff0066", color: "#ff4444" }}>
          ⚠ Les dépenses réelles ({totalActualCost.toLocaleString("fr-FR")} XAF) dépassent le capital de départ ({capitalDepart.toLocaleString("fr-FR")} XAF) de {(totalActualCost - capitalDepart).toLocaleString("fr-FR")} XAF
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Capital départ", value: capitalDepart, color: "#00ccff" },
          { label: "Capital restant", value: capitalRestant, color: capitalRestant >= 0 ? "#00ccff" : "#ff4444" },
          { label: "Revenus projetés", value: totalPlannedRev, color: "#00ff9d" },
          { label: "Revenus réels", value: totalActualRev, color: "#00ff9d" },
          { label: "Dépenses prévues", value: totalPlannedCost, color: "#ff4444" },
          { label: "Solde net", value: balance, color: balance >= 0 ? "#00ff9d" : "#ff4444" },
        ].map(s => (
          <div key={s.label} className="cyber-card rounded-xl p-4 text-center">
            <div className="text-lg font-black font-mono" style={{ color: s.color, fontFamily: "'Share Tech Mono', monospace" }}>{s.value.toLocaleString("fr-FR")}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Auto-revenues from ticket sales + sponsors */}
      {autoRevenues.length > 0 && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#00ff9d" }}>
            Revenus calculés automatiquement
            <span className="ml-2 text-xs font-normal text-gray-500">(billets vendus × tarif + sponsors confirmés × package)</span>
          </h3>
          <div className="space-y-2">
            {autoRevenues.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                <span className="text-xs text-gray-300 flex-1">{r.label}</span>
                <span className="text-xs font-mono font-bold" style={{ color: r.color, fontFamily: "'Share Tech Mono', monospace" }}>{r.value.toLocaleString("fr-FR")} XAF</span>
              </div>
            ))}
            <div className="border-t border-gray-800 pt-2 flex justify-between">
              <span className="text-xs text-gray-500">Total revenus auto</span>
              <span className="text-xs font-bold font-mono text-neon-green" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{autoTotal.toLocaleString("fr-FR")} XAF</span>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Histogram */}
      {histogramItems.length > 0 && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-400">Histogramme revenus / dépenses</h3>
          <div className="space-y-2">
            {histogramItems.sort((a, b) => b.value - a.value).map((item, i) => {
              const isPos = item.value >= 0;
              const barPct = Math.abs(item.value) / maxAbsVal * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-40 text-xs text-gray-400 truncate text-right flex-shrink-0">{item.label}</div>
                  <div className="flex-1 flex items-center" style={{ height: "20px" }}>
                    {isPos ? (
                      <div className="h-4 rounded-r-full transition-all" style={{ width: `${barPct}%`, background: item.color, minWidth: "2px" }} />
                    ) : (
                      <div className="flex items-center w-full justify-end">
                        <div className="h-4 rounded-l-full transition-all" style={{ width: `${barPct}%`, background: item.color, minWidth: "2px" }} />
                      </div>
                    )}
                  </div>
                  <div className="w-32 text-xs font-mono text-right flex-shrink-0" style={{ color: item.color, fontFamily: "'Share Tech Mono', monospace" }}>
                    {isPos ? "+" : ""}{Math.abs(item.value).toLocaleString("fr-FR")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      {renderTable(manualRevenues, "Revenus additionnels (manuels)", "#00ff9d")}
      {renderTable(costs, "Dépenses", "#ff4444", true)}
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

interface TicketTypeRow {
  id: number; slug: string; nameFr: string; nameEn: string;
  priceFr: number; priceEn: number; perksFr: string; perksEn: string;
  earlyBirdPriceFr: number | null; earlyBirdPriceEn: number | null;
  earlyBirdUntil: string | null; color: string; isFeatured: boolean;
  isVisible: boolean; ctfAccess: boolean; maxCapacity: number; sortOrder: number; sold: number;
}

function TicketsPanel() {
  const [tickets, setTickets] = useState<TicketTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TicketTypeRow> & { perksFrArr?: string[]; perksEnArr?: string[] }>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/ticket-types");
    if (res.ok) setTickets(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (t: TicketTypeRow) => {
    setEditId(t.id);
    setEditForm({
      ...t,
      perksFrArr: (() => { try { return JSON.parse(t.perksFr); } catch { return []; } })(),
      perksEnArr: (() => { try { return JSON.parse(t.perksEn); } catch { return []; } })(),
    });
  };

  const save = async (id: number) => {
    const payload = {
      ...editForm,
      perksFr: editForm.perksFrArr,
      perksEn: editForm.perksEnArr,
    };
    await fetch(`/api/admin/ticket-types/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setEditId(null);
    load();
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer ce type de billet ?")) return;
    await fetch(`/api/admin/ticket-types/${id}`, { method: "DELETE" });
    load();
  };

  const toggleVisible = async (t: TicketTypeRow) => {
    await fetch(`/api/admin/ticket-types/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !t.isVisible }) });
    load();
  };

  const addPerk = (lang: "fr" | "en") => {
    if (lang === "fr") setEditForm(f => ({ ...f, perksFrArr: [...(f.perksFrArr || []), ""] }));
    else setEditForm(f => ({ ...f, perksEnArr: [...(f.perksEnArr || []), ""] }));
  };

  const updatePerk = (lang: "fr" | "en", i: number, val: string) => {
    if (lang === "fr") setEditForm(f => { const arr = [...(f.perksFrArr || [])]; arr[i] = val; return { ...f, perksFrArr: arr }; });
    else setEditForm(f => { const arr = [...(f.perksEnArr || [])]; arr[i] = val; return { ...f, perksEnArr: arr }; });
  };

  const removePerk = (lang: "fr" | "en", i: number) => {
    if (lang === "fr") setEditForm(f => { const arr = [...(f.perksFrArr || [])]; arr.splice(i, 1); return { ...f, perksFrArr: arr }; });
    else setEditForm(f => { const arr = [...(f.perksEnArr || [])]; arr.splice(i, 1); return { ...f, perksEnArr: arr }; });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Billets & Tarifs</h1>
          <p className="text-gray-500 text-xs mt-1">Gérez les types de billets affichés sur le portail d&apos;inscription</p>
        </div>
      </div>
      <div className="space-y-4">
        {tickets.map(t => {
          const sold = t.sold || 0;
          const max = t.maxCapacity;
          const pct = max > 0 ? Math.round((sold / max) * 100) : 0;
          const isEditing = editId === t.id;
          return (
            <div key={t.id} className="cyber-card rounded-xl p-5" style={{ borderLeft: `3px solid ${t.color}` }}>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Nom FR</label>
                      <input value={editForm.nameFr || ""} onChange={e => setEditForm(f => ({ ...f, nameFr: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Nom EN</label>
                      <input value={editForm.nameEn || ""} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Prix (XAF)</label>
                      <input type="number" value={editForm.priceFr ?? 0} onChange={e => setEditForm(f => ({ ...f, priceFr: parseInt(e.target.value) }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Prix (USD)</label>
                      <input type="number" value={editForm.priceEn ?? 0} onChange={e => setEditForm(f => ({ ...f, priceEn: parseInt(e.target.value) }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Early Bird XAF</label>
                      <input type="number" value={editForm.earlyBirdPriceFr ?? ""} onChange={e => setEditForm(f => ({ ...f, earlyBirdPriceFr: e.target.value ? parseInt(e.target.value) : null }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="0 = aucun" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Early Bird USD</label>
                      <input type="number" value={editForm.earlyBirdPriceEn ?? ""} onChange={e => setEditForm(f => ({ ...f, earlyBirdPriceEn: e.target.value ? parseInt(e.target.value) : null }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="0 = aucun" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Early Bird jusqu&apos;au</label>
                      <input type="date" value={editForm.earlyBirdUntil ? editForm.earlyBirdUntil.slice(0, 10) : ""} onChange={e => setEditForm(f => ({ ...f, earlyBirdUntil: e.target.value || null }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Capacité max</label>
                      <input type="number" value={editForm.maxCapacity ?? 200} onChange={e => setEditForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-500">Avantages FR</label>
                        <button onClick={() => addPerk("fr")} className="text-xs text-neon-green">+ Ajouter</button>
                      </div>
                      {(editForm.perksFrArr || []).map((p, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                          <input value={p} onChange={e => updatePerk("fr", i, e.target.value)} className="cyber-input text-xs rounded px-2 py-1 flex-1" />
                          <button onClick={() => removePerk("fr", i)} className="text-red-600 text-xs px-1">×</button>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-500">Avantages EN</label>
                        <button onClick={() => addPerk("en")} className="text-xs text-neon-green">+ Add</button>
                      </div>
                      {(editForm.perksEnArr || []).map((p, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                          <input value={p} onChange={e => updatePerk("en", i, e.target.value)} className="cyber-input text-xs rounded px-2 py-1 flex-1" />
                          <button onClick={() => removePerk("en", i)} className="text-red-600 text-xs px-1">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Couleur</label>
                      <input type="color" value={editForm.color || "#00ff9d"} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} style={{ width: "32px", height: "24px", border: "none", borderRadius: "4px", cursor: "pointer" }} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.isFeatured} onChange={e => setEditForm(f => ({ ...f, isFeatured: e.target.checked }))} />
                      Recommandé
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.isVisible} onChange={e => setEditForm(f => ({ ...f, isVisible: e.target.checked }))} />
                      Visible sur le portail
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-bold" style={{ color: "#00ccff" }}>
                      <input type="checkbox" checked={!!editForm.ctfAccess} onChange={e => setEditForm(f => ({ ...f, ctfAccess: e.target.checked }))} />
                      ⚡ Accès CTF
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Ordre</label>
                      <input type="number" value={editForm.sortOrder ?? 0} onChange={e => setEditForm(f => ({ ...f, sortOrder: parseInt(e.target.value) }))} className="cyber-input text-xs rounded px-2 py-1 w-16" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => save(t.id)} className="btn-neon px-4 py-2 rounded text-xs">Enregistrer</button>
                    <button onClick={() => setEditId(null)} className="text-gray-500 text-xs hover:text-white">Annuler</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">{t.nameFr} / {t.nameEn}</span>
                          {t.isFeatured && <span className="text-xs px-2 py-0.5 rounded" style={{ background: t.color + "20", color: t.color }}>★ Recommandé</span>}
                          {!t.isVisible && <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">Masqué</span>}
                          {t.ctfAccess && <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "#00ccff15", color: "#00ccff", border: "1px solid #00ccff30" }}>⚡ CTF</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span style={{ color: t.color }}>{t.priceFr.toLocaleString("fr-FR")} XAF</span>
                          <span className="text-gray-600 mx-2">/</span>
                          <span style={{ color: t.color }}>${t.priceEn} USD</span>
                          {t.earlyBirdPriceFr && <span className="text-yellow-400 ml-2">⚡ Early Bird: {t.earlyBirdPriceFr.toLocaleString()} XAF</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleVisible(t)} className="text-xs text-gray-500 hover:text-white transition-colors">{t.isVisible ? "Masquer" : "Afficher"}</button>
                      <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-white transition-colors">Modifier</button>
                      <button onClick={() => del(t.id)} className="text-xs text-red-800 hover:text-red-400 transition-colors">Supprimer</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? "#ff4444" : t.color }} />
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: t.color, fontFamily: "'Share Tech Mono', monospace" }}>{sold} / {max} vendus</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(() => { try { return JSON.parse(t.perksFr) as string[]; } catch { return []; } })().map((p: string) => (
                      <span key={p} className="text-xs px-2 py-0.5 rounded" style={{ background: t.color + "15", color: t.color + "cc" }}>✓ {p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!tickets.length && !loading && (
          <p className="text-gray-600 text-xs py-8 text-center">Les types de billets sont auto-seedés au démarrage (Student, Standard, VIP).</p>
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
  const { t } = useAdminT();
  const [subTab, setSubTab] = useState<"issue" | "list" | "keys">("issue");
  const [badges, setBadges] = useState<Record<string, unknown>[]>([]);
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedInRegs, setCheckedInRegs] = useState<Record<string, unknown>[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [keys, setKeys] = useState<{ privateKeyBase64: string; publicKeyBase64: string } | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  void t; // used for translation context

  const BADGE_TYPES = [
    { value: "participant", label: "Participant", color: "#00ff9d" },
    { value: "speaker", label: "Speaker", color: "#ff0066" },
    { value: "volunteer", label: "Volunteer", color: "#ff6600" },
    { value: "ctf_competitor", label: "CTF Competitor", color: "#00ccff" },
    { value: "ctf_winner", label: "CTF Winner", color: "#ffd700" },
    { value: "organizer", label: "Organizer", color: "#cc00ff" },
  ];

  const loadBadges = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/badges${filterType ? `?type=${filterType}` : ""}`);
    if (r.ok) setBadges(await r.json());
    setLoading(false);
  }, [filterType]);

  useEffect(() => { if (subTab === "list") loadBadges(); }, [subTab, filterType, loadBadges]);

  const loadCheckedInRegs = useCallback(async () => {
    setRegsLoading(true);
    const r = await fetch("/api/admin/submissions?type=registration");
    if (r.ok) {
      const data = await r.json();
      const regs = Array.isArray(data) ? data : data.registrations || [];
      setCheckedInRegs(regs.filter((x: Record<string, unknown>) => x.checkedInAt && x.status === "validated"));
    }
    setRegsLoading(false);
  }, []);

  useEffect(() => { if (subTab === "issue") loadCheckedInRegs(); }, [subTab, loadCheckedInRegs]);

  const issueForReg = async (reg: Record<string, unknown>) => {
    setIssuingId(reg.id as number);
    setStatus("Issuing…");
    const r = await fetch("/api/admin/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "issue",
        badgeType: "participant",
        recipientName: `${reg.fname} ${reg.lname}`,
        recipientEmail: reg.email,
        subtype: (reg.ticketType as string)?.toLowerCase() || null,
      }),
    });
    if (r.ok) setStatus(`Badge émis pour ${reg.fname} ${reg.lname}.`);
    else setStatus("Erreur lors de l'émission du badge");
    setIssuingId(null);
  };

  const bulkAction = async (action: string) => {
    setStatus("Generating…");
    const r = await fetch("/api/admin/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (r.ok) {
      const j = await r.json();
      setStatus(`Done: ${j.issued ?? j.sent ?? 0} badge(s) generated/sent.${j.failed ? ` (${j.failed} failed)` : ""}`);
    } else setStatus("Error");
  };

  const sendBadge = async (id: number) => {
    setStatus(`Sending badge #${id}…`);
    const r = await fetch("/api/admin/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", id }) });
    setStatus(r.ok ? "Email sent." : "Error sending");
    loadBadges();
  };

  const revokeBadge = async (id: number) => {
    if (!confirm("Revoke this badge? This cannot be undone.")) return;
    await fetch("/api/admin/badges", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadBadges();
  };

  const genKeys = async () => {
    if (!confirm("Generate a new keypair? This will invalidate all previously signed badges.")) return;
    setKeyLoading(true);
    const r = await fetch("/api/admin/badges/generate-keys", { method: "POST" });
    if (r.ok) setKeys(await r.json());
    setKeyLoading(false);
  };

  const badgeColor = (type: string) => BADGE_TYPES.find(b => b.value === type)?.color || "#888";

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">Badges &amp; Certificates</h1>
      <p className="text-xs text-gray-600 font-mono mb-6">Open Badges V3 · W3C Verifiable Credentials · Ed25519 signed</p>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-3">
        {(["issue", "list", "keys"] as const).map(st => (
          <button key={st} onClick={() => setSubTab(st)}
            className={`text-xs px-4 py-1.5 rounded transition-all ${subTab === st ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 border border-gray-800"}`}>
            {st === "issue" ? "🎫 Issue" : st === "list" ? "📋 Issued" : "🔑 Keys"}
          </button>
        ))}
      </div>

      {status && (
        <div className="mb-4 p-3 rounded bg-neon-green/10 border border-neon-green/20 text-neon-green text-xs font-mono flex justify-between">
          <span>{status}</span>
          <button onClick={() => setStatus(null)} className="text-gray-500 hover:text-white">✕</button>
        </div>
      )}

      {/* ISSUE TAB */}
      {subTab === "issue" && (
        <div className="space-y-6">
          {/* Bulk actions */}
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Bulk Generation</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { action: "bulk-participants", label: "🎫 All Checked-in Participants", desc: "Issues participant badges for all checked-in registrations", color: "#00ff9d" },
                { action: "bulk-speakers", label: "🎤 All Speakers", desc: "Issues speaker badges for all 2026 speakers", color: "#ff0066" },
                { action: "bulk-send", label: "📤 Send All Pending Emails", desc: "Sends badge emails to all recipients who haven't received one yet", color: "#0066ff" },
              ].map(item => (
                <button key={item.action} onClick={() => bulkAction(item.action)}
                  className="cyber-card rounded-xl p-5 text-left hover:opacity-80 transition-opacity"
                  style={{ borderColor: item.color + "30" }}>
                  <div className="font-bold text-sm mb-1" style={{ color: item.color }}>{item.label}</div>
                  <div className="text-xs text-gray-600">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Single badge — checked-in registrants table */}
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              Issue Badge — Participants check-in
              <span className="text-gray-600 font-normal ml-2">({checkedInRegs.length} checked-in)</span>
            </h2>
            {regsLoading ? (
              <p className="text-gray-600 text-xs font-mono py-4">Chargement…</p>
            ) : checkedInRegs.length === 0 ? (
              <div className="cyber-card rounded-xl p-6 text-center text-gray-600 text-xs font-mono">
                // Aucun participant check-in pour l&apos;instant
              </div>
            ) : (
              <div className="space-y-2">
                {checkedInRegs.map(r => (
                  <div key={r.id as number} className="flex items-center gap-3 p-3 rounded bg-white/[0.02] border border-white/[0.04] text-xs">
                    <span className="flex-1 text-white font-medium">{String(r.fname)} {String(r.lname)}</span>
                    <span className="text-gray-500 truncate max-w-[160px]">{String(r.email)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green/70 font-mono shrink-0">{String(r.ticketType)}</span>
                    <span className="text-neon-green/50 shrink-0 text-xs">
                      ✓ {new Date(r.checkedInAt as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => issueForReg(r)}
                      disabled={issuingId === (r.id as number)}
                      className="text-xs px-3 py-1 rounded border border-neon-green/20 text-neon-green hover:bg-neon-green/10 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {issuingId === (r.id as number) ? "…" : "Issue Badge"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIST TAB */}
      {subTab === "list" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <select className="bg-black/40 border border-gray-800 rounded px-3 py-1.5 text-xs text-white outline-none"
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">— All types</option>
              {BADGE_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <span className="text-xs text-gray-600">{badges.length} badge(s)</span>
          </div>
          {loading ? <p className="text-gray-600 text-xs font-mono">Loading…</p> : (
            <div className="space-y-2">
              {badges.map(b => {
                const color = badgeColor(String(b.badgeType));
                return (
                  <div key={String(b.id)} className="flex items-center gap-3 p-3 rounded bg-white/[0.02] border border-white/[0.04] text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="flex-1 text-white font-medium">{String(b.recipientName)}</span>
                    <span className="text-gray-500 truncate max-w-[160px]">{String(b.recipientEmail)}</span>
                    <span className="px-1.5 py-0.5 rounded font-mono shrink-0" style={{ color, background: color + "20" }}>
                      {String(b.badgeType)}{b.subtype ? ` / ${b.subtype}` : ""}
                    </span>
                    <span className="text-gray-600 shrink-0">{new Date(String(b.issuedAt)).toLocaleDateString()}</span>
                    {b.revokedAt ? (
                      <span className="text-red-500 text-xs shrink-0">REVOKED</span>
                    ) : (
                      <>
                        {b.emailSentAt
                          ? <span className="text-neon-green/50 text-xs shrink-0">✓ sent</span>
                          : <button onClick={() => sendBadge(Number(b.id))} className="text-xs text-blue-400 hover:text-blue-300 shrink-0 transition-colors">📤 Send</button>
                        }
                        <a href={`/verify/${b.uuid}`} target="_blank" className="text-xs text-gray-500 hover:text-neon-green transition-colors shrink-0">🔍</a>
                        <button onClick={() => revokeBadge(Number(b.id))} className="text-xs text-red-600 hover:text-red-400 shrink-0 transition-colors">✕</button>
                      </>
                    )}
                  </div>
                );
              })}
              {badges.length === 0 && <p className="text-gray-600 text-xs font-mono py-4">// No badges issued yet</p>}
            </div>
          )}
        </div>
      )}

      {/* KEYS TAB */}
      {subTab === "keys" && (
        <div className="space-y-4">
          <div className="cyber-card rounded-xl p-5 border border-yellow-500/20">
            <p className="text-yellow-400 text-xs font-bold mb-2">⚠ Cryptographic Key Setup</p>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              EOCON badges are signed with an Ed25519 keypair. Generate the keys once, add them to your environment variables, and never regenerate (doing so invalidates all existing badges).
            </p>
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Status:</p>
              <p className="text-xs font-mono text-orange-400">
                Check server .env file for BADGE_PRIVATE_KEY and BADGE_PUBLIC_KEY
              </p>
            </div>
            <button onClick={genKeys} disabled={keyLoading} className="text-xs px-4 py-2 rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-all disabled:opacity-50">
              {keyLoading ? "Generating…" : "Generate Ed25519 Keypair"}
            </button>
          </div>

          {keys && (
            <div className="cyber-card rounded-xl p-5 space-y-3">
              <p className="text-neon-green text-xs font-bold">✓ Keys generated — add to .env file:</p>
              {[
                { label: "BADGE_PRIVATE_KEY", value: keys.privateKeyBase64, warn: true },
                { label: "BADGE_PUBLIC_KEY", value: keys.publicKeyBase64, warn: false },
              ].map(k => (
                <div key={k.label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">{k.label} {k.warn && <span className="text-red-400">(keep secret!)</span>}</label>
                    <button onClick={() => navigator.clipboard.writeText(`${k.label}="${k.value}"`)}
                      className="text-xs text-neon-green hover:underline">Copy</button>
                  </div>
                  <div className="bg-black/60 rounded p-2 text-xs font-mono text-gray-500 break-all max-h-16 overflow-y-auto">{k.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SponsorPkg {
  id: number; tier: string; nameFr: string; nameEn: string; price: number;
  maxSponsors: number; sortOrder: number; highlightColor: string;
  perksFr: string; perksEn: string; isVisible: boolean;
}

function SponsorPackageEditor({ pkg, onSave, onDelete }: { pkg: SponsorPkg; onSave: (data: Partial<SponsorPkg>) => Promise<void>; onDelete: () => Promise<void> }) {
  const [draft, setDraft] = useState<SponsorPkg>({ ...pkg });
  const [perksFr, setPerksFr] = useState<string[]>(() => { try { return JSON.parse(pkg.perksFr || "[]"); } catch { return []; } });
  const [perksEn, setPerksEn] = useState<string[]>(() => { try { return JSON.parse(pkg.perksEn || "[]"); } catch { return []; } });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const color = draft.highlightColor || "#888";

  const save = async () => {
    setSaving(true);
    await onSave({ ...draft, perksFr: JSON.stringify(perksFr), perksEn: JSON.stringify(perksEn) });
    setSaving(false);
  };

  const updatePerk = (list: string[], setList: (v: string[]) => void, i: number, val: string) => {
    const next = [...list]; next[i] = val; setList(next);
  };
  const removePerk = (list: string[], setList: (v: string[]) => void, i: number) => {
    setList(list.filter((_, j) => j !== i));
  };

  return (
    <div className="cyber-card rounded-xl overflow-hidden" style={{ borderColor: color + "40" }}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <span className="text-base font-black font-mono" style={{ color }}>{draft.tier}</span>
        <span className="text-white font-bold text-sm flex-1">{draft.nameFr} / <span className="text-gray-500">{draft.nameEn}</span></span>
        <span className="text-neon-green font-mono text-sm">{draft.price > 0 ? `${draft.price.toLocaleString("fr-FR")} FCFA` : "Partenariat"}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${draft.isVisible ? "text-neon-green bg-neon-green/10" : "text-gray-600 bg-gray-800"}`}>{draft.isVisible ? "Visible" : "Masqué"}</span>
        <span className="text-gray-500 text-xs ml-2">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Tier + colors */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Identifiant (tier)</label>
              <input className="cyber-input w-full px-2 py-1.5 rounded text-sm" value={draft.tier} onChange={e => setDraft(d => ({ ...d, tier: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Couleur</label>
              <div className="flex gap-2 items-center">
                <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" value={draft.highlightColor} onChange={e => setDraft(d => ({ ...d, highlightColor: e.target.value }))} />
                <input className="cyber-input flex-1 px-2 py-1.5 rounded text-sm font-mono" value={draft.highlightColor} onChange={e => setDraft(d => ({ ...d, highlightColor: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max sponsors</label>
              <input type="number" min={0} className="cyber-input w-full px-2 py-1.5 rounded text-sm" value={draft.maxSponsors} onChange={e => setDraft(d => ({ ...d, maxSponsors: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Names + price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nom FR</label>
              <input className="cyber-input w-full px-2 py-1.5 rounded text-sm" value={draft.nameFr} onChange={e => setDraft(d => ({ ...d, nameFr: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Name EN</label>
              <input className="cyber-input w-full px-2 py-1.5 rounded text-sm" value={draft.nameEn} onChange={e => setDraft(d => ({ ...d, nameEn: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Prix FCFA (0 = partenariat)</label>
              <input type="number" min={0} step={50000} className="cyber-input w-full px-2 py-1.5 rounded text-sm" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          {/* Perks FR + EN */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase">Avantages FR</p>
                <button onClick={() => setPerksFr(p => [...p, ""])} className="text-xs text-neon-green hover:text-neon-green/70">+ Ajouter</button>
              </div>
              <div className="space-y-1">
                {perksFr.map((p, i) => (
                  <div key={i} className="flex gap-1">
                    <input className="cyber-input flex-1 px-2 py-1 rounded text-xs" value={p} onChange={e => updatePerk(perksFr, setPerksFr, i, e.target.value)} />
                    <button onClick={() => removePerk(perksFr, setPerksFr, i)} className="text-red-500/60 hover:text-red-400 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase">Perks EN</p>
                <button onClick={() => setPerksEn(p => [...p, ""])} className="text-xs text-neon-green hover:text-neon-green/70">+ Add</button>
              </div>
              <div className="space-y-1">
                {perksEn.map((p, i) => (
                  <div key={i} className="flex gap-1">
                    <input className="cyber-input flex-1 px-2 py-1 rounded text-xs" value={p} onChange={e => updatePerk(perksEn, setPerksEn, i, e.target.value)} />
                    <button onClick={() => removePerk(perksEn, setPerksEn, i)} className="text-red-500/60 hover:text-red-400 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => onSave({ isVisible: !draft.isVisible }).then(() => setDraft(d => ({ ...d, isVisible: !d.isVisible })))} className={`text-xs px-3 py-1.5 rounded border ${draft.isVisible ? "border-neon-green/30 text-neon-green" : "border-gray-700 text-gray-500"}`}>
              {draft.isVisible ? "Visible ✓" : "Masqué"}
            </button>
            <div className="flex gap-2">
              <button onClick={() => { if (confirm("Supprimer ce package ?")) onDelete(); }} className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10">Supprimer</button>
              <button onClick={save} disabled={saving} className="btn-neon px-4 py-1.5 rounded text-xs">{saving ? "..." : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SponsorPackagesPanel() {
  const [packages, setPackages] = useState<SponsorPkg[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTier, setNewTier] = useState("");

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

  const savePackage = async (id: number, data: Partial<SponsorPkg>) => {
    await fetch(`/api/admin/sponsor-packages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    load();
  };

  const deletePackage = async (id: number) => {
    await fetch(`/api/admin/sponsor-packages/${id}`, { method: "DELETE" });
    load();
  };

  const createPackage = async () => {
    if (!newTier.trim()) return;
    await fetch("/api/admin/sponsor-packages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: newTier.toUpperCase(), nameFr: newTier, nameEn: newTier, price: 0, maxSponsors: 5, sortOrder: packages.length + 1, highlightColor: "#888888", perksFr: "[]", perksEn: "[]", perks: "[]", isVisible: true }),
    });
    setNewTier(""); setAdding(false); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Packages de Sponsoring</h1>
          <p className="text-gray-500 text-xs mt-1">Cliquez sur un package pour le modifier. Les données sont stockées en base.</p>
        </div>
        <div className="flex gap-2">
          {!packages.length && !loading && (
            <button onClick={seed} className="btn-neon px-4 py-2 rounded text-sm">🌱 Initialiser packages standard</button>
          )}
          <button onClick={() => setAdding(a => !a)} className="btn-neon px-4 py-2 rounded text-sm">+ Nouveau package</button>
        </div>
      </div>

      {adding && (
        <div className="cyber-card rounded-xl p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Identifiant du nouveau package (ex: STARTUP)</label>
            <input autoFocus className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="STARTUP" value={newTier} onChange={e => setNewTier(e.target.value)} onKeyDown={e => e.key === "Enter" && createPackage()} />
          </div>
          <button onClick={createPackage} className="btn-neon px-4 py-2 rounded text-sm">Créer</button>
          <button onClick={() => setAdding(false)} className="text-gray-500 text-sm px-2">Annuler</button>
        </div>
      )}

      <div className="space-y-3">
        {packages.map(pkg => (
          <SponsorPackageEditor
            key={pkg.id}
            pkg={pkg}
            onSave={(data) => savePackage(pkg.id, data)}
            onDelete={() => deletePackage(pkg.id)}
          />
        ))}
        {!packages.length && !loading && (
          <p className="text-gray-600 text-xs py-8 text-center">Aucun package configuré.</p>
        )}
      </div>
    </div>
  );
}

// ---- Event Settings Panel ----
const SETTINGS_FIELDS = [
  { key: "event_date", label: "Date (ISO)", type: "date", group: "Événement" },
  { key: "event_date_display_fr", label: "Date affichée (FR)", type: "text", group: "Événement" },
  { key: "event_date_display_en", label: "Date affichée (EN)", type: "text", group: "Événement" },
  { key: "event_time_start", label: "Heure d'ouverture", type: "time", group: "Événement" },
  { key: "event_edition", label: "Édition (numéro)", type: "text", group: "Événement" },
  { key: "event_venue", label: "Lieu (nom)", type: "text", group: "Lieu" },
  { key: "event_city", label: "Ville", type: "text", group: "Lieu" },
  { key: "event_country", label: "Pays", type: "text", group: "Lieu" },
  { key: "event_address", label: "Adresse complète", type: "text", group: "Lieu" },
  { key: "ctf_tagline", label: "Accroche principale", type: "text", group: "CTF" },
  { key: "ctf_prize_main", label: "Gains vainqueur (résumé court)", type: "text", group: "CTF" },
  { key: "ctf_prize_details", label: "Gains vainqueur (détails complets)", type: "text", group: "CTF" },
  { key: "site_base_url", label: "URL de base du site", type: "url", group: "Liens" },
  { key: "url_inscription", label: "Lien → Inscription", type: "url", group: "Liens" },
  { key: "url_cfp", label: "Lien → CFP", type: "url", group: "Liens" },
  { key: "url_benevoles", label: "Lien → Bénévoles", type: "url", group: "Liens" },
  { key: "url_programme", label: "Lien → Programme", type: "url", group: "Liens" },
  { key: "url_ctf", label: "Lien → CTF", type: "url", group: "Liens" },
] as const;

function EventSettingsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(setSettings);
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const groups = Array.from(new Set(SETTINGS_FIELDS.map(f => f.group)));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">⚙ Paramètres Événement</h1>
          <p className="text-gray-500 text-xs mt-1">Date, lieu et URLs utilisés sur tout le site et dans les communications</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{ background: "#00ff9d", color: "#000", border: "none", borderRadius: "6px", padding: "10px 20px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
        >
          {saving ? "Sauvegarde…" : saved ? "✓ Sauvegardé" : "Enregistrer"}
        </button>
      </div>

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group} className="cyber-card rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{group}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SETTINGS_FIELDS.filter(f => f.group === group).map(field => (
                <div key={field.key}>
                  <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                  {field.key === "event_country" ? (
                    <CountrySelect
                      value={settings[field.key] || ""}
                      onChange={v => handleChange(field.key, v)}
                      className="w-full text-sm"
                    />
                  ) : field.key === "ctf_prize_details" ? (
                    <textarea
                      rows={4}
                      value={settings[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="cyber-input w-full px-3 py-2 rounded text-sm text-white resize-none"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      placeholder="Ex: 1er prix : 500 000 XAF + trophée + badge CTF Winner&#10;2e prix : 200 000 XAF&#10;3e prix : 100 000 XAF"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={settings[field.key] || ""}
                      onChange={e => handleChange(field.key, e.target.value)}
                      className="cyber-input w-full px-3 py-2 rounded text-sm text-white"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="cyber-card rounded-xl p-5 mt-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">🔐 Sécurité</h3>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white text-sm font-bold mb-1">Forcer le MFA pour tous les utilisateurs admin</p>
            <p className="text-gray-500 text-xs">Les utilisateurs sans MFA seront bloqués à la connexion jusqu&apos;à l&apos;enrollment.</p>
          </div>
          <button
            onClick={() => {
              const next = settings.mfa_required === "true" ? "false" : "true";
              handleChange("mfa_required", next);
            }}
            className={`shrink-0 px-4 py-2 rounded text-sm font-bold transition-all ${settings.mfa_required === "true" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
          >
            {settings.mfa_required === "true" ? "✓ Activé" : "Désactivé"}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="cyber-card rounded-xl p-5 mt-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Aperçu — CTAs par type de contenu</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { type: "inscriptions", icon: "🎟", label: "Inscriptions" },
            { type: "cfp", icon: "📝", label: "CFP" },
            { type: "ctf", icon: "🏆", label: "CTF" },
            { type: "speaker", icon: "🎤", label: "Speaker/Session" },
            { type: "countdown", icon: "⏱", label: "Compte à rebours" },
            { type: "sponsor", icon: "🏢", label: "Sponsor" },
          ].map(({ type, icon, label }) => {
            const urlKey = type === "inscriptions" || type === "countdown" ? "url_inscription"
              : type === "cfp" ? "url_cfp"
              : type === "ctf" ? "url_ctf"
              : type === "sponsor" ? "site_base_url"
              : "url_programme";
            return (
              <div key={type} className="rounded p-2" style={{ background: "#111", border: "1px solid #1a1a2e" }}>
                <div className="text-xs text-gray-400 mb-1">{icon} {label}</div>
                <div className="text-xs font-mono text-neon-green truncate" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {settings[urlKey] || "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function AuditPanel() {
  const { t } = useAdminT();
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  const RESOURCES = ["", "cfp", "registration", "volunteer", "speaker", "session", "user", "speaker_onboarding"];
  const ACTIONS = ["", "CREATE", "UPDATE", "DELETE", "VALIDATE", "REJECT", "ACCEPT", "LOGIN"];

  const load = async (p: number, res: string, act: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (res) params.set("resource", res);
    if (act) params.set("action", act);
    const r = await fetch(`/api/admin/audit?${params}`);
    if (r.ok) {
      const j = await r.json();
      setLogs(j.logs);
      setTotal(j.total);
      setPage(j.page);
      setPages(j.pages);
    }
    setLoading(false);
  };

  useEffect(() => { load(page, resource, action); }, [page, resource, action]);

  const purge = async () => {
    if (!confirm(t.confirmPurge)) return;
    setPurging(true);
    const r = await fetch("/api/admin/audit", { method: "DELETE" });
    if (r.ok) { const j = await r.json(); alert(`${j.deleted} ${t.deletedEntries}`); load(1, resource, action); }
    setPurging(false);
  };

  const actionColor: Record<string, string> = {
    CREATE: "#00ff9d", UPDATE: "#0066ff", DELETE: "#ff0066",
    VALIDATE: "#00ff9d", ACCEPT: "#00ff9d", REJECT: "#ff6600", LOGIN: "#ffaa00",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{t.auditTitle}</h1>
          <p className="text-xs text-gray-600 mt-1 font-mono">{t.retention60} · {total} {t.entry}</p>
        </div>
        <button onClick={purge} disabled={purging} className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
          {purging ? "…" : t.purgeOld}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="bg-black/40 border border-gray-800 rounded px-3 py-1.5 text-sm text-white focus:border-neon-green/50 outline-none"
          value={resource} onChange={e => { setResource(e.target.value); setPage(1); }}>
          {RESOURCES.map(r => <option key={r} value={r}>{r || t.allResources}</option>)}
        </select>
        <select className="bg-black/40 border border-gray-800 rounded px-3 py-1.5 text-sm text-white focus:border-neon-green/50 outline-none"
          value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          {ACTIONS.map(a => <option key={a} value={a}>{a || t.allActions}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm font-mono">Chargement…</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-600 text-sm font-mono">{t.noEntries}</p>
      ) : (
        <>
          <div className="space-y-1 mb-4">
            {logs.map(log => {
              const actColor = actionColor[String(log.action)] || "#888";
              return (
                <div key={String(log.id)} className="flex items-start gap-3 p-3 rounded bg-white/[0.02] border border-white/[0.04] text-xs font-mono">
                  <span className="text-gray-600 shrink-0 w-32">{new Date(String(log.createdAt)).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span className="px-1.5 py-0.5 rounded shrink-0" style={{ color: actColor, background: actColor + "20" }}>{String(log.action)}</span>
                  <span className="text-gray-400 shrink-0">{String(log.resource)}{log.resourceId ? `#${log.resourceId}` : ""}</span>
                  <span className="text-gray-600 shrink-0">{String(log.ip || "")}</span>
                  {!!log.details && <span className="text-gray-700 truncate">{JSON.stringify(log.details)}</span>}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2 justify-center">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1 rounded border border-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-all">←</button>
            <span className="text-xs text-gray-600 font-mono">{t.page} {page} {t.of} {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1 rounded border border-gray-800 text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-all">→</button>
          </div>
        </>
      )}
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
  const [lang, setLang] = useState<AdminLang>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("admin_lang") as AdminLang) || "fr";
    return "fr";
  });
  const t = adminI18n[lang];
  const changeLang = (l: AdminLang) => { setLang(l); localStorage.setItem("admin_lang", l); };
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
      if (t === "pipeline") {
        // PipelineKanban self-fetches all data
      } else if (t === "sponsors") {
        const res = await fetch("/api/admin/sponsors");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, sponsors: json })); }
      } else if (t === "team") {
        const res = await fetch("/api/admin/team");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, team: json })); }
      } else if (t === "past-speakers") {
        const res = await fetch("/api/admin/past-speakers");
        if (res.ok) { const json = await res.json(); setData(d => ({ ...d, "past-speakers": json })); }
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
      label: t.overview,
      icon: "◈",
      tabs: [
        { id: "dashboard", label: t.dashboard },
      ],
    },
    {
      label: t.speakersProgram,
      icon: "◆",
      tabs: [
        { id: "pipeline", label: t.pipeline, count: stats.cfp },
        { id: "past-speakers", label: t.pastSpeakers },
      ],
    },
    {
      label: t.participants,
      icon: "◉",
      tabs: [
        { id: "registrations", label: t.registrations, count: stats.registrations },
        { id: "volunteers", label: t.volunteers, count: stats.volunteers },
        { id: "newsletter", label: t.newsletter, count: stats.newsletter },
      ],
    },
    {
      label: t.sponsorsGroup,
      icon: "◇",
      tabs: [
        { id: "sponsors", label: t.sponsorsActive, count: stats.sponsors },
        { id: "sponsor-pipeline", label: t.sponsorPipeline },
        { id: "prospection", label: t.prospection },
      ],
    },
    {
      label: t.budget,
      icon: "◈",
      tabs: [
        { id: "tickets", label: t.tickets },
        { id: "sponsor-packages", label: t.sponsorPackages },
        { id: "budget", label: t.budgetTracking },
      ],
    },
    {
      label: t.communication,
      icon: "◉",
      tabs: [
        { id: "communication", label: t.communicationPosts },
      ],
    },
    {
      label: t.operations,
      icon: "◎",
      tabs: [
        { id: "logistics", label: t.logistics },
        { id: "team", label: t.team, count: stats.team },
        { id: "certificates", label: t.certificates },
        { id: "export", label: t.exportCsv },
        { id: "users", label: t.users },
        { id: "profiles", label: t.profiles },
        { id: "audit", label: t.auditLog },
        { id: "settings", label: t.eventSettings },
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
    <AdminLangContext.Provider value={{ lang, t, setLang: changeLang }}>
    <div className="min-h-screen bg-dark-900" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {/* Top bar */}
      <div className="border-b border-neon-green/20 bg-black/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <span className="text-neon-green font-mono text-sm font-bold">&gt; EOCON_ADMIN</span>
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" className="text-gray-500 hover:text-neon-green text-xs transition-colors">↗ {t.viewSite}</a>
          <button
            onClick={() => changeLang(lang === "fr" ? "en" : "fr")}
            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-neon-green hover:border-neon-green/40 transition-all font-mono"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 transition-colors">{t.logout}</button>
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

          {/* PIPELINE — Speakers & Programme unified */}
          {tab === "pipeline" && <PipelineKanban />}

          {/* DASHBOARD */}
          {tab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">{t.dashboardTitle}</h1>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
                <StatCard label={t.speakers} value={stats.speakers || 0} />
                <StatCard label={t.sponsors} value={stats.sponsors || 0} color="#ffd700" />
                <StatCard label={t.sessionsLabel} value={stats.sessions || 0} color="#0066ff" />
                <StatCard label={t.cfp} value={stats.cfp || 0} color="#cc00ff" />
                <StatCard label={t.benevoles} value={stats.volunteers || 0} color="#ff6600" />
                <StatCard label={t.inscriptions} value={stats.registrations || 0} color="#ff0066" />
                <StatCard label={t.newsletterLabel} value={stats.subscribers || 0} color="#ffaa00" />
                <StatCard label={t.equipe} value={stats.team || 0} color="#00ccff" />
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
                  { tab: "pipeline", label: "Éditer le Programme", desc: "Planifier les sessions dans le pipeline speakers (onglet Programme)" },
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

          {/* SPONSORS */}
          {tab === "sponsors" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{t.sponsorsTitle}</h1>
                <button onClick={() => { setForm({ isVisible: true, tier: "GOLD", sortOrder: 0 }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">{t.addSponsor}</button>
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

          {/* VOLUNTEERS */}
          {tab === "volunteers" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">{t.benevoles} ({(data.volunteers || []).length})</h1>
              {(() => {
                const volunteerList = (data.volunteers || []) as Record<string, unknown>[];
                const existingRoles = Array.from(new Set(volunteerList.map(v => v.role as string).filter(Boolean))).sort();
                return (
              <div className="space-y-3">
                {volunteerList.map(v => (
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
                          <select
                            className="cyber-input text-xs rounded px-2 py-1 flex-1 min-w-[140px]"
                            defaultValue={(v.assignedRole as string) || ""}
                            onChange={async (e) => {
                              await fetch("/api/admin/submissions", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ type: "volunteer-assign", id: v.id, assignedRole: e.target.value }),
                              });
                            }}
                          >
                            <option value="">— Rôle assigné —</option>
                            {existingRoles.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
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
                {!volunteerList.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">Aucune candidature</p>}
              </div>
                );
              })()}
            </div>
          )}

          {/* REGISTRATIONS */}
          {tab === "registrations" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-black text-white">{t.registrationsTitle} ({(data.registrations || []).length})</h1>
                  <p className="text-gray-500 text-xs mt-1">Validez le paiement pour envoyer le billet avec QR code</p>
                </div>
                <a href="/admin/checkin" target="_blank" rel="noreferrer" className="btn-neon px-4 py-2 rounded text-sm">
                  📱 Ouvrir Check-in J-Day →
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neon-green/10 text-gray-500 text-left">
                      {[t.name, t.ticketType, t.status, t.checkedIn, t.date, t.actions].map(h => (
                        <th key={h} className="py-2 px-3 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {((data.registrations || []) as Record<string, unknown>[]).map(r => (
                      <tr key={r.id as number} className={`border-b border-gray-800 hover:bg-white/[0.02] transition-colors ${r.checkedInAt ? "bg-neon-green/[0.02]" : ""}`}>
                        <td className="py-2 px-3">
                          <span className="text-white">{r.fname as string} {r.lname as string}</span>
                          <br/><span className="text-gray-500">{r.email as string}</span>
                          {!!r.org && <><br/><span className="text-gray-600">{String(r.org)}</span></>}
                        </td>
                        <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green/70">{r.ticketType as string}</span></td>
                        <td className="py-2 px-3"><Badge status={r.status as string} /></td>
                        <td className="py-2 px-3">
                          {r.checkedInAt
                            ? <span className="text-neon-green text-xs">✓ {new Date(r.checkedInAt as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                            : <span className="text-gray-600 text-xs">—</span>}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{new Date(r.createdAt as string).toLocaleDateString("fr-FR")}</td>
                        <td className="py-2 px-3">
                          {(r.status as string) === "pending" && (
                            <button
                              className="text-xs px-3 py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-colors"
                              onClick={async () => {
                                if (!confirm(`Valider le paiement de ${r.fname} ${r.lname} et envoyer le billet ?`)) return;
                                const res = await fetch("/api/admin/submissions", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ type: "registration", action: "validate", id: r.id }),
                                });
                                if (res.ok) fetchData("registrations");
                              }}
                            >
                              {t.validateAndSend}
                            </button>
                          )}
                          {(r.status as string) === "validated" && (
                            <span className="text-xs text-neon-green/60 font-mono">Billet envoyé ✓</span>
                          )}
                        </td>
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
                      <CountrySelect value={(form.country as string) || ""} onChange={v => setForm({ ...form, country: v })} className="w-full text-xs" />
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

          {tab === "users" && <AdminUsersPanel />}
          {tab === "profiles" && <AdminProfilesPanel />}
          {tab === "settings" && <EventSettingsPanel />}

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

          {/* AUDIT LOG — super_admin only */}
          {tab === "audit" && <AuditPanel />}

          {/* EXPORT */}
          {tab === "export" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">{t.exportTitle}</h1>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { type: "registrations", label: t.exportRegistrations, color: "#ff0066", desc: t.allParticipants },
                  { type: "cfp", label: t.exportCfpLabel, color: "#cc00ff", desc: t.allCfp },
                  { type: "volunteers", label: t.exportVolunteers, color: "#ff6600", desc: t.allVolunteers },
                  { type: "newsletter", label: t.exportNewsletter, color: "#ffaa00", desc: t.allNewsletter },
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
    </AdminLangContext.Provider>
  );
}
