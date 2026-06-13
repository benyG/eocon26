"use client";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PROFILES } from "@/lib/adminProfiles";
import PipelineKanban from "@/components/admin/PipelineKanban";
import CountrySelect from "@/components/CountrySelect";
import AdminProfilesPanel from "@/components/admin/AdminProfilesPanel";
import ConfirmModal, { useConfirm } from "@/components/admin/ConfirmModal";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
import { adminI18n, AdminLang, AdminTranslations } from "@/lib/adminI18n";

const AdminLangContext = createContext<{ lang: AdminLang; t: AdminTranslations; setLang: (l: AdminLang) => void }>({
  lang: "fr",
  t: adminI18n.fr,
  setLang: () => {},
});
const useAdminT = () => useContext(AdminLangContext);

type Tab = "dashboard" | "pipeline" | "sponsors" | "volunteers" | "registrations" | "newsletter" | "team" | "past-speakers" | "users" | "profiles" | "communication" | "sponsor-pipeline" | "budget" | "logistics" | "certificates" | "export" | "prospection" | "tickets" | "sponsor-packages" | "settings" | "sessions" | "audit";

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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
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
  const confirm = useConfirm();
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
    if (!(await confirm({ message: "Désactiver le MFA pour cet utilisateur ?", danger: true }))) return;
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
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
  const { t } = useAdminT();
  const [searchTab, setSearchTab] = useState<"apollo" | "places">("apollo");
  const [apolloKeywords, setApolloKeywords] = useState("cybersecurity,technology,telecom,finance");
  const [placesQuery, setPlacesQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Record<string, unknown> | null>(null);
  const [emailResult, setEmailResult] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [pitchTarget, setPitchTarget] = useState<Record<string, unknown> | null>(null);
  const [pitchResult, setPitchResult] = useState<{ accroche: string; valeur: string[]; objection: { question: string; reponse: string }; ouverture: string; brief_complet: string } | null>(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "added">("all");
  const [enrichingId, setEnrichingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/sponsor-packages").then(r => r.json()).then(setPackages).catch(() => {});
  }, []);

  const enrichLead = async (lead: Record<string, unknown>) => {
    setEnrichingId(lead.id as number);
    await fetch("/api/admin/ai/enrich-prospect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: lead.org, website: lead.website }),
    });
    await onRefresh();
    setEnrichingId(null);
  };

  const hasContact = (lead: Record<string, unknown>) =>
    !!(lead.contactEmail || lead.phone || lead.contactName);

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

  const generatePitch = async (lead: Record<string, unknown>) => {
    setPitchTarget(lead);
    setPitchResult(null);
    setGeneratingPitch(true);
    const res = await fetch("/api/admin/ai/pitch-strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org: lead.org,
        sector: lead.sector,
        contactName: lead.contactName,
        contactTitle: lead.contactTitle,
        website: lead.website,
        recommendedPackage: lead.recommendedPackage,
        aiScoreReason: lead.aiScoreReason,
      }),
    });
    if (res.ok) setPitchResult(await res.json());
    setGeneratingPitch(false);
  };

  const addToPipeline = async (lead: Record<string, unknown>) => {
    // Mark lead as added
    await fetch("/api/admin/ai/prospect-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, addedToPipeline: true }),
    });
    // Create prospect entry with status "prospect"
    await fetch("/api/admin/sponsor-prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org: lead.org,
        contact: lead.contactName || null,
        email: lead.contactEmail || null,
        phone: lead.phone || null,
        package: lead.recommendedPackage || null,
        notes: lead.aiScoreReason || null,
        status: "prospect",
      }),
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
        <h1 className="text-2xl font-black text-white">{t.prospectionTitle}</h1>
        <p className="text-gray-500 text-xs mt-1">{t.prospectionWorkflow}</p>
      </div>

      {emailTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">{emailTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{emailTarget.sector as string} · {t.package} : <span style={{ color: "#00ff9d" }}>{(emailTarget.recommendedPackage as string) || "—"}</span></p>
              </div>
              <button onClick={() => { setEmailTarget(null); setEmailResult(null); }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {generatingEmail && <p className="text-gray-500 text-xs text-center py-8">{t.generatingLabel}</p>}
            {emailResult && (
              <div className="space-y-4">
                {[
                  { lang: "Français", subject: emailResult.subjectFr, body: emailResult.bodyFr },
                  { lang: "English", subject: emailResult.subjectEn, body: emailResult.bodyEn },
                ].map(e => (
                  <div key={e.lang} className="border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase">{e.lang}</span>
                      <button onClick={() => navigator.clipboard.writeText(`${t.emailSubjectField} : ${e.subject}\n\n${e.body}`)} className="text-xs hover:underline" style={{ color: "#00ff9d" }}>{t.close}</button>
                    </div>
                    <p className="text-white text-xs font-bold mb-2">{t.emailSubjectField} : {e.subject}</p>
                    <p className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed">{e.body}</p>
                  </div>
                ))}
                <button
                  onClick={() => addToPipeline(emailTarget)}
                  className="w-full py-2 rounded text-sm font-bold transition-all"
                  style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d40" }}
                >
                  {t.addToPipeline}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pitchTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold">🎯 Pitch · {pitchTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{pitchTarget.sector as string} · Package : <span style={{ color: "#ff0066" }}>{(pitchTarget.recommendedPackage as string) || "—"}</span></p>
              </div>
              <button onClick={() => { setPitchTarget(null); setPitchResult(null); }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {generatingPitch && <p className="text-gray-500 text-xs text-center py-8">Génération du brief stratégique…</p>}
            {pitchResult && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4" style={{ borderColor: "#ff006640", background: "#ff006610" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#ff0066" }}>Accroche</p>
                  <p className="text-white text-sm leading-relaxed">{pitchResult.accroche}</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">Valeur concrète</p>
                  <ul className="space-y-1">
                    {pitchResult.valeur.map((v, i) => (
                      <li key={i} className="text-gray-300 text-sm flex gap-2"><span style={{ color: "#00ff9d" }}>▸</span>{v}</li>
                    ))}
                  </ul>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">Objection probable</p>
                  <p className="text-sm font-semibold text-white mb-1">❝ {pitchResult.objection.question} ❞</p>
                  <p className="text-gray-400 text-sm">→ {pitchResult.objection.reponse}</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">Ouverture de réunion</p>
                  <p className="text-white text-sm italic">❝ {pitchResult.ouverture} ❞</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Brief complet</p>
                    <button onClick={() => navigator.clipboard.writeText(pitchResult!.brief_complet)} className="text-xs hover:underline" style={{ color: "#00ff9d" }}>📋 Copier</button>
                  </div>
                  <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{pitchResult.brief_complet}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cyber-card rounded-xl p-5 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00ff9d" }}>
          {t.prospectionStep1}
        </h2>
        <div className="flex gap-2 mb-4">
          {(["apollo", "places"] as const).map(tab => (
            <button key={tab} onClick={() => setSearchTab(tab)} className={`text-xs px-4 py-2 rounded transition-all ${searchTab === tab ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 border border-gray-800"}`}>
              {tab === "apollo" ? t.apolloTab : t.placesTab}
            </button>
          ))}
        </div>
        {searchTab === "apollo" ? (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{t.apolloKeywordsLabel}</label>
              <input value={apolloKeywords} onChange={e => setApolloKeywords(e.target.value)} className="cyber-input w-full text-xs rounded px-3 py-2" placeholder="cybersecurity,technology,telecom,finance,banking" />
            </div>
            <button onClick={runApolloSearch} disabled={searching} className="btn-neon px-5 py-2 rounded text-xs self-end shrink-0">
              {searching ? t.searchingLabel : t.searchBtn}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{t.placesQueryLabel}</label>
              <input value={placesQuery} onChange={e => setPlacesQuery(e.target.value)} className="cyber-input w-full text-xs rounded px-3 py-2" placeholder="banque Douala, opérateur télécom Cameroun..." onKeyDown={e => e.key === "Enter" && runPlacesSearch()} />
            </div>
            <button onClick={runPlacesSearch} disabled={searching || !placesQuery.trim()} className="btn-neon px-5 py-2 rounded text-xs self-end shrink-0">
              {searching ? t.searchingLabel : t.searchBtn}
            </button>
          </div>
        )}
        <p className="text-gray-700 text-xs mt-2">
          {t.apolloHint}
        </p>
      </div>

      <div className="cyber-card rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0066ff" }}>
            {t.leadsStep2Heading} ({deduped.length})
          </h2>
          <div className="flex gap-2">
            {(["all", "pending", "added"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded transition-all ${filter === f ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"}`}>
                {f === "all" ? `${t.filterAll} (${deduped.length})` : f === "pending" ? `${t.filterPending} (${pending})` : `${t.filterAdded} (${added})`}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-gray-600 text-xs py-8 text-center">
            {deduped.length === 0 ? t.noProspectsAll : t.noProspectsFilter}
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
                    {!!lead.addedToPipeline && <span className="text-xs text-neon-green">{t.inPipeline}</span>}
                  </div>
                  <p className="text-white font-bold text-sm">{lead.org as string}</p>
                  {(!!lead.sector || !!lead.city) && (
                    <p className="text-gray-500 text-xs mt-0.5">{lead.sector as string}{lead.city ? ` · ${lead.city}` : ""}</p>
                  )}
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.contactEmail ? "#00ff9d20" : "#ff006615", color: lead.contactEmail ? "#00ff9d" : "#ff0066" }}>📧 email</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.phone ? "#00ff9d20" : "#ff006615", color: lead.phone ? "#00ff9d" : "#ff0066" }}>📞 tel</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.contactName ? "#00ff9d20" : "#ff006615", color: lead.contactName ? "#00ff9d" : "#ff0066" }}>👤 contact</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.website ? "#00ff9d20" : "#ff006615", color: lead.website ? "#00ff9d" : "#ff0066" }}>🌐 web</span>
                  </div>
                  {!!lead.contactName && (
                    <p className="text-xs mt-1" style={{ color: "#00ff9d" }}>
                      👤 {lead.contactName as string}{lead.contactTitle ? ` — ${lead.contactTitle}` : ""}
                    </p>
                  )}
                  {!!lead.contactEmail && (
                    <p className="text-gray-400 text-xs">✉ {lead.contactEmail as string}</p>
                  )}
                  {!!lead.phone && (
                    <p className="text-gray-400 text-xs">📞 {lead.phone as string}</p>
                  )}
                  {!!lead.website && (
                    <a href={lead.website as string} target="_blank" rel="noreferrer" className="text-xs hover:underline block mt-0.5" style={{ color: "#0066ff" }}>
                      🌐 {lead.website as string}
                    </a>
                  )}
                  {lead.aiScore !== null && lead.aiScore !== undefined && !hasContact(lead) && (
                    <p className="text-gray-600 text-xs mt-1 italic line-through">Score {(lead.aiScore as number).toFixed(1)}/10 — Score inutile sans contact</p>
                  )}
                  {!!lead.aiScoreReason && (
                    <p className="text-gray-600 text-xs mt-1 italic">{lead.aiScoreReason as string}</p>
                  )}
                </div>
                {!lead.addedToPipeline && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => enrichLead(lead)}
                      disabled={enrichingId === (lead.id as number)}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                    >
                      {enrichingId === (lead.id as number) ? "…" : "🔍 Enrichir"}
                    </button>
                    <button
                      onClick={() => generateEmail(lead)}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}
                    >
                      {t.generateBtn}
                    </button>
                    <button
                      onClick={() => generatePitch(lead)}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={{ background: "#ff006615", color: "#ff0066", border: "1px solid #ff006640" }}
                    >
                      🎯 Pitch
                    </button>
                    <button
                      onClick={() => hasContact(lead) ? addToPipeline(lead) : undefined}
                      disabled={!hasContact(lead)}
                      title={!hasContact(lead) ? "Enrichissez les données de contact avant de qualifier ce prospect." : undefined}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={hasContact(lead)
                        ? { background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }
                        : { background: "#33333320", color: "#555", border: "1px solid #33333340", cursor: "not-allowed" }}
                    >
                      {t.addToPipeline}
                    </button>
                    {!hasContact(lead) && (
                      <p className="text-xs text-gray-600 max-w-[140px] text-center leading-tight">Enrichissez les données de contact</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {packages.length > 0 && (
        <div className="cyber-card rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500">{t.availablePackages}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {packages.map(pkg => {
              const perks = JSON.parse((pkg.perksFr as string) || "[]") as string[];
              return (
                <div key={pkg.id as number} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: (pkg.highlightColor as string) || "#888" }}>{pkg.tier as string}</span>
                    <span className="text-xs font-mono text-white">{(pkg.price as number) > 0 ? `${(pkg.price as number).toLocaleString("fr-FR")} FCFA` : t.exchangeLabel}</span>
                  </div>
                  <p className="text-gray-500 text-xs mb-2">{pkg.nameFr as string}</p>
                  <ul className="space-y-0.5">
                    {perks.slice(0, 3).map((p, i) => (
                      <li key={i} className="text-gray-600 text-xs flex gap-1"><span style={{ color: (pkg.highlightColor as string) || "#888" }}>·</span>{p}</li>
                    ))}
                    {perks.length > 3 && <li className="text-gray-700 text-xs">+{perks.length - 3} {t.morePerks}</li>}
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
  const { t } = useAdminT();
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

  // Posts by date for calendar
  const postsByDate: Record<string, Record<string, unknown>[]> = {};
  linkedinPosts.forEach(p => {
    const d = p.scheduledAt || p.publishedAt;
    if (d) {
      const key = new Date(d as string).toISOString().slice(0, 10);
      if (!postsByDate[key]) postsByDate[key] = [];
      postsByDate[key].push(p);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">{t.communicationTitle}</h1>

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
              const dayPosts = postsByDate[dateKey] || [];
              const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
              const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === currentMonth && selectedDay?.getFullYear() === currentYear;
              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`relative rounded-lg text-xs flex flex-col items-start justify-start p-1 transition-all min-h-[40px] ${
                    isSelected ? "bg-neon-green/20 text-neon-green border border-neon-green/50" :
                    isToday ? "bg-white/10 text-white border border-white/20" :
                    "text-gray-500 hover:bg-white/[0.05] hover:text-gray-300"
                  }`}
                >
                  <span className="w-full text-center">{day}</span>
                  {dayPosts.slice(0, 2).map((p, i) => (
                    <span key={i} className="block text-left truncate text-gray-500 leading-tight mt-0.5 w-full" style={{ fontSize: "9px" }}>
                      {p.platform === "linkedin" ? "in" : p.platform === "twitter" ? "𝕏" : "ig"} {(p.content as string).substring(0, 25)}…
                    </span>
                  ))}
                  {dayPosts.length > 2 && <span style={{ fontSize: "9px" }} className="text-gray-600">+{dayPosts.length - 2}</span>}
                </button>
              );
            })}
          </div>
          <p className="text-gray-700 text-xs mt-3 text-center">{t.clickToScheduleHint}</p>
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
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{t.contentTypeLabel}</p>
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
                  {contextType === "speaker" ? t.selectSpeakerLabel :
                   contextType === "session" ? t.selectSessionLabel :
                   contextType === "workshop" ? t.selectWorkshopLabel :
                   t.selectSponsorLabel}
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
                  <option value="">{t.chooseLabel}</option>
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
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{t.platformsLabel}</p>
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
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{t.languageLabel}</p>
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
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{t.briefLabel}</p>
              <textarea value={brief} onChange={e => setBrief(e.target.value)} className="cyber-input w-full text-xs rounded p-2 h-24 resize-none text-white" placeholder={t.briefPlaceholder} />
            </div>

            {/* Image attachment */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{t.imageOptionalLabel}</p>
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
                  <span className="text-gray-600 text-xs">{uploadingImage ? t.loading : t.addImageLabel}</span>
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
                {generating ? t.generatingPosts : t.generateWithAI}
              </button>

              {/* Generated posts preview */}
              {generatedPosts && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t.postsPreviewLabel}</p>
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
                    {t.postNowBtn}
                  </button>
                  <button
                    onClick={savePosts}
                    disabled={saving || !scheduleDate}
                    className="py-2 rounded text-xs font-bold transition-all"
                    style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d40" }}
                  >
                    {saving ? "..." : t.schedulePostBtn}
                  </button>
                </div>
              ) : (
                <p className="text-gray-700 text-xs text-center">{t.generateFirstHint}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Day-selected posts view */}
      <div className="cyber-card rounded-xl p-5">
        {!selectedDay ? (
          <>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#0066ff" }}>Posts planifiés & publiés</h3>
            <p className="text-gray-600 text-xs text-center py-4">Cliquez sur un jour pour voir les posts planifiés</p>
          </>
        ) : (() => {
          const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,"0")}-${String(selectedDay.getDate()).padStart(2,"0")}`;
          const dayPostsList = postsByDate[dateKey] || [];
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0066ff" }}>
                  Posts du {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-gray-400 text-xs">✕ Fermer</button>
              </div>
              {dayPostsList.length === 0 && <p className="text-gray-600 text-xs text-center py-4">Aucun post ce jour. Cliquez sur le calendrier pour créer.</p>}
              <div className="space-y-3">
                {dayPostsList.map(post => {
                  const color = statusColors[post.status as string] || "#888";
                  const platformColor = post.platform === "linkedin" ? "#0066ff" : post.platform === "twitter" ? "#00ccff" : "#cc00ff";
                  return (
                    <div key={post.id as number} className="border border-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono capitalize" style={{ background: platformColor + "20", color: platformColor }}>{post.platform as string}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono uppercase" style={{ background: "#ffffff10", color: "#aaa" }}>{post.lang as string}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono capitalize" style={{ background: color + "20", color }}>{post.status as string}</span>
                        {!!post.scheduledAt && <span className="text-xs text-gray-600">📅 {new Date(post.scheduledAt as string).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                      <textarea
                        readOnly
                        value={post.content as string}
                        className="cyber-input w-full text-xs rounded p-2 h-24 resize-none text-gray-300"
                      />
                      {!!post.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.imageUrl as string} alt="" className="h-12 w-20 object-cover rounded" />
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { handleDayClick(selectedDay.getDate()); }}
                          className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors"
                        >✏️ Modifier</button>
                        {post.status === "scheduled" && (
                          <button onClick={() => publishNow(post.id as number)} disabled={publishing === (post.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff30" }}>
                            {publishing === (post.id as number) ? "..." : "▶️ Publier maintenant"}
                          </button>
                        )}
                        {post.status === "draft" && (
                          <>
                            <button onClick={() => publishNow(post.id as number)} disabled={publishing === (post.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff30" }}>
                              {publishing === (post.id as number) ? "..." : "▶️ Publier maintenant"}
                            </button>
                            <button onClick={() => { setScheduleId(post.id as number); setScheduleDate(""); }} className="text-xs px-2 py-1 rounded" style={{ background: "#ffaa0020", color: "#ffaa00", border: "1px solid #ffaa0030" }}>🕐 Planifier</button>
                          </>
                        )}
                        {post.status === "published" && !!post.linkedinPostId && (
                          <a
                            href={post.platform === "twitter"
                              ? `https://x.com/i/web/status/${post.linkedinPostId as string}`
                              : `https://www.linkedin.com/feed/update/${post.linkedinPostId as string}/`}
                            target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded" style={{ color: "#00ff9d" }}
                          >↗ Voir</a>
                        )}
                        <button
                          onClick={async () => {
                            await fetch("/api/admin/ai/social-posts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id }) });
                            await loadLinkedinPosts();
                          }}
                          className="text-xs px-2 py-1 rounded border border-red-800/50 text-red-500 hover:bg-red-900/20 transition-colors"
                        >🗑️ Supprimer</button>
                        {scheduleId === (post.id as number) && (
                          <div className="flex gap-1 items-center w-full mt-1">
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
            </>
          );
        })()}
      </div>

      {/* Transactional templates */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.transactionalTemplatesLabel}</h3>
          <button onClick={seedTransactionalTemplates} className="text-xs px-3 py-1.5 rounded transition-all" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>{t.initTransactionalBtn}</button>
        </div>
        <div className="space-y-3">
          {templates.filter(tpl => tpl.slug).length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4">{t.noTransactionalTemplates}</p>
          )}
          {templates.filter(tpl => tpl.slug).map(tpl => {
            const id = tpl.id as number;
            const edit = txEdits[id] || { subject: tpl.subject as string, htmlBody: tpl.htmlBody as string };
            let vars: string[] = [];
            try { vars = JSON.parse(tpl.variables as string || "[]"); } catch { vars = []; }
            return (
              <div key={id} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#00ff9d10", color: "#00ff9d", border: "1px solid #00ff9d30" }}>{tpl.slug as string}</span>
                  <span className="text-white text-xs font-bold">{tpl.name as string}</span>
                </div>
                {vars.length > 0 && (
                  <p className="text-gray-600 text-xs mb-2">{t.variablesLabel} {vars.map(v => `{{${v}}}`).join(", ")}</p>
                )}
                <input
                  className="cyber-input w-full text-xs rounded px-3 py-2 text-white mb-2"
                  value={edit.subject}
                  onChange={e => setTxEdits(prev => ({ ...prev, [id]: { ...edit, subject: e.target.value } }))}
                  placeholder={t.emailSubjectLabelTpl}
                />
                <textarea
                  className="cyber-input w-full text-xs rounded px-3 py-2 text-white h-40 resize-none"
                  value={edit.htmlBody}
                  onChange={e => setTxEdits(prev => ({ ...prev, [id]: { ...edit, htmlBody: e.target.value } }))}
                  placeholder={t.htmlBodyLabelTpl}
                />
                <div className="mt-2 flex justify-end">
                  <button onClick={() => saveTxTemplate(id)} disabled={txSaving === id} className="text-xs px-3 py-1.5 rounded" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                    {txSaving === id ? "..." : t.saveTemplateBtn}
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
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{t.campaignTemplatesLabel}</h3>
          <div className="flex gap-2">
            <button onClick={seedTemplates} className="text-xs px-3 py-1.5 rounded transition-all" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>{t.seedTemplatesBtn}</button>
            <button onClick={() => setShowTemplateForm(!showTemplateForm)} className="btn-neon px-3 py-1.5 rounded text-xs">{t.createTemplateBtn}</button>
          </div>
        </div>
        {showTemplateForm && (
          <div className="border border-gray-800 rounded-lg p-4 mb-4 space-y-2">
            <input placeholder={t.templateNamePlaceholder} className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.name as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            <input placeholder={t.emailSubjectLabelTpl} className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.subject as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} />
            <select className="cyber-input w-full text-xs rounded px-3 py-2 text-black" value={(templateForm.segment as string) || "all"} onChange={e => setTemplateForm(f => ({ ...f, segment: e.target.value }))}>
              <option value="all">Tous</option>
              <option value="registered">Inscrits</option>
              <option value="cfp_accepted">Speakers acceptés</option>
              <option value="volunteers">Bénévoles acceptés</option>
              <option value="newsletter">Newsletter</option>
            </select>
            <textarea placeholder={t.htmlBodyLabelTpl} className="cyber-input w-full text-xs rounded px-3 py-2 h-32 resize-none text-white" value={(templateForm.htmlBody as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, htmlBody: e.target.value }))} />
            <div className="flex gap-2">
              <button onClick={saveTemplate} className="btn-neon px-3 py-1.5 rounded text-xs">{t.saveTemplateBtn}</button>
              <button onClick={() => setShowTemplateForm(false)} className="text-gray-500 text-xs hover:text-white px-2">{t.cancelTemplateBtn}</button>
            </div>
          </div>
        )}

        {/* Preview modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setPreviewTemplate(null)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{previewTemplate.name as string}</p>
                  <p className="text-gray-500 text-xs">{t.subjectDisplayLabel} {previewTemplate.subject as string}</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
              <div className="p-4" dangerouslySetInnerHTML={{ __html: previewTemplate.htmlBody as string }} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templates.filter(tpl => !tpl.slug).length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 text-xs mb-3">{t.noCampaignTemplates}</p>
              <button onClick={seedTemplates} className="text-xs px-4 py-2 rounded" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>{t.seedEoconTemplates}</button>
            </div>
          )}
          {templates.filter(tpl => !tpl.slug).map(tpl => (
            <div key={tpl.id as number} className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-bold">{tpl.name as string}</p>
                  <p className="text-gray-500 text-xs">{t.subjectDisplayLabel} {tpl.subject as string}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ color: "#888", background: "#88888815" }}>{tpl.segment as string}</span>
                  {!!tpl.sentAt && <p className="text-gray-700 text-xs mt-1">{t.sentOnLabel} {new Date(tpl.sentAt as string).toLocaleDateString("fr-FR")}</p>}
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  <button onClick={() => setPreviewTemplate(tpl)} className="text-xs px-2 py-1 rounded" style={{ color: "#888", border: "1px solid #33333380" }}>👁</button>
                  <button onClick={() => sendTemplate(tpl.id as number)} disabled={sending === (tpl.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                    {sending === (tpl.id as number) ? "..." : t.sendCampaignBtn}
                  </button>
                </div>
              </div>
              {/* AI refine row */}
              <div className="flex gap-2 pt-2 border-t border-gray-800/50">
                <input
                  type="text"
                  placeholder={t.refineInstructions}
                  className="cyber-input flex-1 text-xs rounded px-2 py-1 text-white"
                  onFocus={() => setRefineInstructions("")}
                  onChange={e => setRefineInstructions(e.target.value)}
                />
                <button
                  onClick={() => refineTemplate(tpl.id as number)}
                  disabled={refining === (tpl.id as number)}
                  className="text-xs px-3 py-1 rounded shrink-0 transition-all"
                  style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff30" }}
                >
                  {refining === (tpl.id as number) ? t.improvingLabel : t.improveBtn}
                </button>
              </div>
            </div>
          ))}
          {!templates.filter(tpl => !tpl.slug).length && <p className="text-gray-700 text-xs text-center py-3">{t.noCampaignTemplates}</p>}
        </div>
      </div>
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

function SponsorFormPanel({
  form,
  editing,
  setForm,
  onSave,
  onCancel,
}: {
  form: Record<string, unknown>;
  editing: number | null;
  setForm: (f: Record<string, unknown>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/library", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      setForm({ ...form, logoUrl: url });
    }
    setUploading(false);
  };

  return (
    <div className="cyber-card rounded-xl p-6 mb-6">
      {showLibrary && (
        <MediaLibraryModal
          onSelect={url => { setForm({ ...form, logoUrl: url }); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
        />
      )}
      <h3 className="text-neon-green text-sm mb-4">{editing ? "Modifier le Sponsor" : "Nouveau Sponsor"}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { key: "name", label: "Nom du Sponsor *" },
          { key: "website", label: "Site Web" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Téléphone" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Logo</label>
          <div className="flex items-center gap-2 flex-wrap">
            {form.logoUrl && <img src={form.logoUrl as string} alt="logo" className="w-10 h-10 object-contain rounded bg-white/5 p-1 border border-gray-700" />}
            <input className="cyber-input flex-1 px-3 py-2 rounded text-xs min-w-0" placeholder="URL du logo" value={(form.logoUrl as string) || ""} onChange={e => setForm({ ...form, logoUrl: e.target.value })} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs px-3 py-2 rounded border border-gray-700 hover:border-neon-green text-gray-400 hover:text-neon-green shrink-0">
              {uploading ? "Upload…" : "⬆ Upload"}
            </button>
            <button type="button" onClick={() => setShowLibrary(true)} className="text-xs px-3 py-2 rounded border border-gray-700 hover:border-neon-green text-gray-400 hover:text-neon-green shrink-0">
              📂 Library
            </button>
          </div>
        </div>
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
        <button onClick={onSave} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">Sauvegarder</button>
        <button onClick={onCancel} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
      </div>
    </div>
  );
}

function SponsorPipelinePanel({ prospects, onRefresh }: { prospects: Record<string, unknown>[]; onRefresh: () => void }) {
  const { t, lang } = useAdminT();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ status: "prospect" });
  const [aiEmail, setAiEmail] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(null);
  const [aiEmailTarget, setAiEmailTarget] = useState<{ org: string; id: number } | null>(null);
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);

  const generateFollowupEmail = async (p: Record<string, unknown>) => {
    setGeneratingFor(p.id as number);
    setAiEmailTarget({ org: p.org as string, id: p.id as number });
    const res = await fetch("/api/admin/ai/sponsor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: p.org, contact: p.contact, package: p.package, status: p.status, notes: p.notes, mode: "followup" }),
    });
    if (res.ok) setAiEmail(await res.json());
    setGeneratingFor(null);
  };

  const markContacted = async (id: number) => {
    await fetch(`/api/admin/sponsor-prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "contacted" }),
    });
    setAiEmail(null);
    setAiEmailTarget(null);
    onRefresh();
  };

  const save = async () => {
    await fetch("/api/admin/sponsor-prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ status: "prospect" }); onRefresh();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (status === "concluded") {
      const sponsor = prospects.find(p => p.id === id);
      if (sponsor) {
        // Auto-add to active sponsors list
        await fetch("/api/admin/sponsors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: sponsor.org || sponsor.name,
            logoUrl: sponsor.logoUrl || "",
            website: sponsor.website || "",
            tier: sponsor.package || sponsor.tier || "BRONZE",
            isVisible: true,
          }),
        }).catch(() => {});
        // Auto-generate announcement post in FR and EN
        await fetch("/api/admin/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: "linkedin",
            lang: "fr",
            content: `🎉 [EOCON 2026 · Sponsor ${sponsor.package || sponsor.tier || "BRONZE"}] Nous sommes ravis d'accueillir ${sponsor.org || sponsor.name} comme partenaire ${sponsor.package || sponsor.tier || "BRONZE"} d'EOCON 2026 ! 🙏\n\nMerci pour votre soutien à la communauté cybersécurité africaine.\n\n📅 28 Novembre 2026 · Hotel Onomo, Douala\n🔗 Inscriptions : https://eyesopensecurity.com/#inscription\n\n#EOCON2026 #Cybersecurity #Cameroun`,
            scheduledAt: null,
            status: "draft",
          }),
        }).catch(() => {});
      }
    }
    onRefresh();
  };

  const del = async (id: number) => {
    if (!(await confirm({ message: "Supprimer ce prospect ?", danger: true, confirmLabel: "Supprimer" }))) return;
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">{t.pipelineTitle}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">{t.addProspect}</button>
      </div>

      {/* AI Email Modal */}
      {aiEmail && aiEmailTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h3 className="text-white font-bold">Email — {aiEmailTarget.org}</h3>
              <button onClick={() => { setAiEmail(null); setAiEmailTarget(null); }} className="text-gray-500 hover:text-white">✕</button>
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
            <div className="mt-4 pt-4 border-t border-gray-800">
              <button
                onClick={() => markContacted(aiEmailTarget.id)}
                className="w-full text-xs px-4 py-2 rounded border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all"
              >
                {t.markContacted}
              </button>
            </div>
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
                          onClick={() => generateFollowupEmail(p)}
                          disabled={generatingFor === (p.id as number)}
                          className="text-xs px-1.5 py-0.5 rounded transition-all disabled:opacity-50"
                          style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                        >
                          {generatingFor === (p.id as number) ? "…" : "✨"}
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

function BudgetPanel({ items, onRefresh }: { items: Record<string, unknown>[]; onRefresh: () => void }) {
  const { t } = useAdminT();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ category: "costs", planned: 0, actual: 0, status: "pending" });
  const [autoRevenues, setAutoRevenues] = useState<AutoRevenue[]>([]);

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
        for (const tt of types) {
          const val = tt.priceFr * (tt.sold || 0);
          if (tt.sold > 0 || tt.priceFr > 0) revenues.push({ label: `Billets — ${tt.nameFr}`, value: val, color: tt.color });
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
    if (!(await confirm({ message: "Supprimer ?", danger: true, confirmLabel: "Supprimer" }))) return;
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

  // Histogram data: revenues vs costs by category
  const histogramItems: { label: string; value: number; color: string; maxVal: number }[] = [
    ...autoRevenues.map(r => ({ label: r.label, value: r.value, color: r.color, maxVal: 0 })),
    ...manualRevenues.map(r => ({ label: r.label as string, value: (r.actual as number) || (r.planned as number) || 0, color: "#00ff9d", maxVal: 0 })),
    ...costs.map(c => ({ label: c.label as string, value: -((c.actual as number) || (c.planned as number) || 0), color: "#ff4444", maxVal: 0 })),
  ].filter(i => i.value !== 0);

  const maxAbsVal = Math.max(...histogramItems.map(i => Math.abs(i.value)), 1);

  const renderTable = (rows: Record<string, unknown>[], title: string, color: string) => (
    <div className="cyber-card rounded-xl p-5 mb-6">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color }}>{title}</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500">
            <th className="text-left py-2 px-2 font-normal">{t.label}</th>
            <th className="text-right py-2 px-2 font-normal">{t.planned} (FCFA)</th>
            <th className="text-right py-2 px-2 font-normal">{t.actual} (FCFA)</th>
            <th className="text-left py-2 px-2 font-normal">{t.status}</th>
            <th className="py-2 px-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id as number} className="border-b border-gray-900 hover:bg-white/[0.01]">
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
                <select className="cyber-input text-xs px-2 py-1 rounded" value={r.status as string}
                  onChange={e => update(r.id as number, { status: e.target.value })}>
                  <option value="pending">{t.statusPending}</option>
                  <option value="paid">{t.statusPaid}</option>
                  <option value="cancelled">{t.statusCancelled}</option>
                </select>
              </td>
              <td className="py-2 px-2">
                <button onClick={() => del(r.id as number)} className="text-red-400 text-xs hover:text-red-300">✗</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-gray-600 text-xs py-4 text-center">{t.noItems}</p>}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">{t.budgetTitle}</h1>
        <div className="flex gap-2">
          <button onClick={seedCosts} className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">{t.prefillCosts}</button>
          <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">{t.addLine}</button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t.revenusProjectes, value: totalPlannedRev, color: "#00ff9d" },
          { label: t.revenusReels, value: totalActualRev, color: "#00ff9d" },
          { label: t.depensesPlannees, value: totalPlannedCost, color: "#ff4444" },
          { label: t.soldeNet, value: balance, color: balance >= 0 ? "#00ff9d" : "#ff4444" },
        ].map(s => (
          <div key={s.label} className="cyber-card rounded-xl p-4 text-center">
            <div className="text-xl font-black font-mono" style={{ color: s.color, fontFamily: "'Share Tech Mono', monospace" }}>{s.value.toLocaleString("fr-FR")} XAF</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Auto-revenues from ticket sales + sponsors */}
      {autoRevenues.length > 0 && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#00ff9d" }}>
            {t.autoRevenues}
            <span className="ml-2 text-xs font-normal text-gray-500">{t.autoRevenuesHint}</span>
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
              <span className="text-xs text-gray-500">{t.totalAutoRevenues}</span>
              <span className="text-xs font-bold font-mono text-neon-green" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{autoTotal.toLocaleString("fr-FR")} XAF</span>
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Histogram */}
      {histogramItems.length > 0 && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-400">{t.histogramLabel}</h3>
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
              <label className="text-xs text-gray-500 block mb-1">{t.categoryLabel}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.category as string) || "costs"} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="revenue">{t.revenue}</option>
                <option value="costs">{t.costs}</option>
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
      {renderTable(costs, "Dépenses", "#ff4444")}
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
  const confirm = useConfirm();
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
    if (!(await confirm({ message: "Supprimer ?", danger: true, confirmLabel: "Supprimer" }))) return;
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
  const confirm = useConfirm();
  const [tickets, setTickets] = useState<TicketTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TicketTypeRow> & { perksFrArr?: string[]; perksEnArr?: string[] }>({});
  const [ticketOfficeOpen, setTicketOfficeOpen] = useState<boolean>(false);
  const [togglingOffice, setTogglingOffice] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tickRes, settingsRes] = await Promise.all([
      fetch("/api/admin/ticket-types"),
      fetch("/api/admin/settings"),
    ]);
    if (tickRes.ok) setTickets(await tickRes.json());
    if (settingsRes.ok) {
      const s = await settingsRes.json() as Record<string, string>;
      setTicketOfficeOpen(s.ticketOfficeOpen === "true");
    }
    setLoading(false);
  }, []);

  const toggleOffice = async () => {
    setTogglingOffice(true);
    const next = !ticketOfficeOpen;
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketOfficeOpen: String(next) }),
    });
    if (next) {
      fetch("/api/admin/tickets/notify-preregistered", { method: "POST" }).catch(() => {});
    }
    setTicketOfficeOpen(next);
    setTogglingOffice(false);
  };

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
    if (!(await confirm({ message: "Supprimer ce type de billet ?", danger: true, confirmLabel: "Supprimer" }))) return;
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
      <button
        onClick={toggleOffice}
        disabled={togglingOffice}
        className="w-full mb-6 py-4 rounded-xl font-black text-sm tracking-widest transition-all border-2"
        style={ticketOfficeOpen
          ? { background: "#00ff9d15", color: "#00ff9d", borderColor: "#00ff9d" }
          : { background: "#ff660015", color: "#ff6600", borderColor: "#ff6600" }}
      >
        {ticketOfficeOpen ? "🟢 GUICHET OUVERT — Inscriptions actives" : "🔒 GUICHET FERMÉ — Pré-inscriptions actives"}
      </button>
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
  const [form, setForm] = useState({ badgeType: "participant", recipientName: "", recipientEmail: "", subtype: "" });
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

  const bulkAction = async (action: string) => {
    setStatus("Generating…");
    const r = await fetch("/api/admin/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (r.ok) {
      const j = await r.json();
      setStatus(`Done: ${j.issued ?? j.sent ?? 0} badge(s) generated/sent.${j.failed ? ` (${j.failed} failed)` : ""}`);
    } else setStatus("Error");
  };

  const issueSingle = async () => {
    if (!form.recipientName || !form.recipientEmail) return;
    setStatus("Issuing…");
    const r = await fetch("/api/admin/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "issue", ...form, subtype: form.subtype || null }) });
    if (r.ok) { setStatus("Badge issued."); setForm({ badgeType: "participant", recipientName: "", recipientEmail: "", subtype: "" }); }
    else setStatus("Error issuing badge");
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

          {/* Single badge form */}
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Issue Single Badge</h2>
            <div className="cyber-card rounded-xl p-5 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Badge Type</label>
                  <select className="cyber-input w-full px-3 py-2 rounded text-xs"
                    value={form.badgeType} onChange={e => setForm(f => ({ ...f, badgeType: e.target.value }))}>
                    {BADGE_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                {form.badgeType === "participant" && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Ticket Level (subtype)</label>
                    <input className="cyber-input w-full px-3 py-2 rounded text-xs" placeholder="student / standard / vip"
                      value={form.subtype} onChange={e => setForm(f => ({ ...f, subtype: e.target.value }))} />
                  </div>
                )}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Recipient Name *</label>
                  <input className="cyber-input w-full px-3 py-2 rounded text-xs"
                    value={form.recipientName} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Recipient Email *</label>
                  <input type="email" className="cyber-input w-full px-3 py-2 rounded text-xs"
                    value={form.recipientEmail} onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))} />
                </div>
              </div>
              <button onClick={issueSingle} className="btn-neon px-4 py-2 rounded text-xs">Issue Badge</button>
            </div>
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


function SessionsPanel() {
  const { t } = useAdminT();
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const SESSION_TYPES = ["keynote", "talk", "workshop", "panel", "break", "logistics"];

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/sessions");
    if (r.ok) setSessions(await r.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    if (!confirm("Initialiser le programme avec les sessions standard ? (Annulé si des sessions existent déjà)")) return;
    setSeeding(true);
    const r = await fetch("/api/admin/sessions/seed", { method: "POST" });
    const j = await r.json();
    if (!r.ok) alert(j.error || "Erreur");
    else { alert(`${j.seeded} sessions créées.`); load(); }
    setSeeding(false);
  };

  const startEdit = (s: Record<string, unknown> | null) => {
    setEditingId(s ? Number(s.id) : null);
    setForm(s ? { ...s } : { time: "09:00", title: "", type: "talk", sortOrder: 100, isVisible: true });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const save = async () => {
    setSaving(true);
    const url = editingId ? `/api/admin/sessions/${editingId}` : "/api/admin/sessions";
    const method = editingId ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { closeForm(); load(); }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Supprimer cette session ?")) return;
    await fetch(`/api/admin/sessions/${id}`, { method: "DELETE" });
    load();
  };

  const typeColor: Record<string, string> = {
    keynote: "#00ff9d", talk: "#0066ff", workshop: "#ff6600", panel: "#cc00ff", break: "#444", logistics: "#888",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">{t.sessionsTitle}</h1>
        <div className="flex gap-2">
          <button onClick={seed} disabled={seeding} className="text-xs px-3 py-1.5 rounded border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all disabled:opacity-50">
            {seeding ? "…" : t.initStandard}
          </button>
          <button onClick={() => startEdit(null)} className="text-xs px-3 py-1.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20 transition-all">
            + {t.newSession}
          </button>
        </div>
      </div>

      {/* Edit/create form */}
      {showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6 border border-neon-green/20">
          <h2 className="text-sm font-bold text-neon-green mb-4">{editingId ? t.editSession : t.newSession}</h2>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.sessionTitle}</label>
              <input className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.title || "")} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.type}</label>
              <select className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.type || "talk")} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {SESSION_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.date}</label>
              <input type="date" className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.date || "")} onChange={e => setForm(f => ({ ...f, date: e.target.value || null }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.startTime}</label>
              <input type="time" className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.time || "")} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.endTime}</label>
              <input type="time" className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.endTime || "")} onChange={e => setForm(f => ({ ...f, endTime: e.target.value || null }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.room}</label>
              <input className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.room || "")} onChange={e => setForm(f => ({ ...f, room: e.target.value || null }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.speakerName}</label>
              <input className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={String(form.speakerName || "")} onChange={e => setForm(f => ({ ...f, speakerName: e.target.value || null }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.sortOrder}</label>
              <input type="number" className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none"
                value={Number(form.sortOrder ?? 100)} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">{t.description}</label>
            <textarea rows={2} className="w-full bg-black/40 border border-gray-800 rounded px-3 py-2 text-white text-sm focus:border-neon-green/50 outline-none resize-none"
              value={String(form.description || "")} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={Boolean(form.isVisible)} onChange={e => setForm(f => ({ ...f, isVisible: e.target.checked }))} />
              {t.visibleOnSite}
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="text-xs px-4 py-2 rounded bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30 transition-all disabled:opacity-50">
              {saving ? "…" : t.save}
            </button>
            <button onClick={closeForm} className="text-xs px-4 py-2 rounded border border-gray-800 text-gray-500 hover:text-gray-300 transition-all">
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-sm font-mono">Chargement…</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-sm font-mono mb-4">{t.noSessions}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => {
            const color = typeColor[String(s.type)] || "#888";
            return (
              <div key={String(s.id)} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-neon-green/20 transition-all">
                <span className="w-14 shrink-0 text-right text-xs font-mono" style={{ color: color + "aa" }}>{String(s.time)}</span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="flex-1 text-sm text-white">{String(s.title)}</span>
                {!!s.speakerName && <span className="text-xs text-gray-500">{String(s.speakerName)}</span>}
                <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ color, background: color + "20" }}>{String(s.type)}</span>
                {!s.isVisible && <span className="text-xs text-gray-600 shrink-0">{t.hidden}</span>}
                <button onClick={() => startEdit(s)} className="text-xs text-gray-500 hover:text-neon-green transition-colors shrink-0">✎</button>
                <button onClick={() => del(Number(s.id))} className="text-xs text-gray-600 hover:text-red-400 transition-colors shrink-0">✕</button>
              </div>
            );
          })}
        </div>
      )}
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

  // Current user identity + permissions
  const [userInfo, setUserInfo] = useState<{ isLegacy: boolean; name: string; permissions: Record<string, string> } | null>(null);

  useEffect(() => {
    fetch("/api/admin/me").then(r => r.ok ? r.json() : null).then(info => {
      if (info) setUserInfo(info);
    }).catch(() => {});
  }, []);

  // Tab → required permission key (undefined = always visible)
  const TAB_PERMISSION: Partial<Record<Tab, string | undefined>> = {
    dashboard: undefined,        // always visible
    pipeline: "cfp",
    sessions: "sessions",
    "past-speakers": "speakers",
    registrations: "registrations",
    volunteers: "volunteers",
    newsletter: "newsletter",
    sponsors: "sponsors",
    "sponsor-pipeline": "sponsor-pipeline",
    prospection: "prospection",
    tickets: "registrations",
    "sponsor-packages": "sponsors",
    budget: "budget",
    communication: "communication",
    logistics: "logistics",
    team: "team",
    certificates: "certificates",
    export: "export",
    users: "users",
    profiles: "users",
    audit: "users",
    settings: "users",
  };

  const canSeeTab = (tabId: Tab): boolean => {
    if (!userInfo) return true; // not loaded yet — show all
    if (userInfo.isLegacy) return true; // legacy token = full access
    const permKey = TAB_PERMISSION[tabId];
    if (permKey === undefined) return true; // always visible
    return !!userInfo.permissions[permKey as string];
  };

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
        { id: "sessions", label: t.sessions },
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

  // Filter tabGroups based on current user's permissions
  const visibleTabGroups = tabGroups
    .map(g => ({ ...g, tabs: g.tabs.filter(t => canSeeTab(t.id)) }))
    .filter(g => g.tabs.length > 0);

  // If active tab is no longer visible after permissions load, switch to first visible tab
  useEffect(() => {
    if (!userInfo) return;
    const allVisible = visibleTabGroups.flatMap(g => g.tabs).map(t => t.id);
    if (allVisible.length > 0 && !allVisible.includes(tab)) {
      setTab(allVisible[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo]);

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
        <span className="text-neon-green font-mono text-sm font-bold">&gt; EOCON Eventlyx</span>
        <div className="flex items-center gap-4">
          {userInfo && !userInfo.isLegacy && (
            <span className="text-gray-500 text-xs font-mono hidden sm:inline">{userInfo.name}</span>
          )}
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
          {visibleTabGroups.map(group => (
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
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{t.dashboardTitle}</h1>
                {canSeeTab("registrations") && (
                  <a
                    href="/checkin/scan"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all"
                    style={{ background: "#00ff9d15", color: "#00ff9d", border: "2px solid #00ff9d", letterSpacing: "0.1em" }}
                  >
                    <span>▣</span> SCANNER QR <span>→</span>
                  </a>
                )}
              </div>
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

          {/* SPONSORS */}
          {tab === "sponsors" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{t.sponsorsTitle}</h1>
                <button onClick={() => { setForm({ isVisible: true, tier: "GOLD", sortOrder: 0 }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">{t.addSponsor}</button>
              </div>

              {showForm && (
                <SponsorFormPanel
                  form={form}
                  editing={editing}
                  setForm={setForm}
                  onSave={() => save("/api/admin/sponsors")}
                  onCancel={cancelForm}
                />
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
                            {!!s.email && <p className="text-gray-500 text-xs truncate">✉ {s.email as string}</p>}
                            {!!s.phone && <p className="text-gray-500 text-xs">📞 {s.phone as string}</p>}
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

          {/* SESSIONS / PROGRAMME */}
          {tab === "sessions" && <SessionsPanel />}

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
    <ConfirmModal />
    </AdminLangContext.Provider>
  );
}
