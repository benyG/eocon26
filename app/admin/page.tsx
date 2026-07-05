"use client";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import PipelineKanban from "@/components/admin/PipelineKanban";
import VolunteerKanban from "@/components/admin/VolunteerKanban";
import CountrySelect from "@/components/CountrySelect";
import AdminProfilesPanel from "@/components/admin/AdminProfilesPanel";
import ConfirmModal, { useConfirm } from "@/components/admin/ConfirmModal";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
import CyberWatchPanel from "@/components/admin/CyberWatchPanel";
import PilotagePanel from "@/components/admin/PilotagePanel";
import CampaignsPanel from "@/components/admin/CampaignsPanel";
import StrategicPlanPanel from "@/components/admin/StrategicPlanPanel";
import LivePanel from "@/components/admin/LivePanel";
import ProspectionSpeakersPanel from "@/components/admin/ProspectionSpeakersPanel";
import LogisticsProspectingPanel from "@/components/admin/LogisticsProspectingPanel";
import RegistrationsChart from "@/components/admin/RegistrationsChart";
import NotificationBell from "@/components/admin/NotificationBell";
import { adminI18n } from "@/lib/adminI18n";
import { AdminLangContext, useAdminT, type AdminLang } from "@/lib/adminLangContext";

const AdminThemeContext = createContext<{ theme: "dark" | "light"; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});
const useAdminTheme = () => useContext(AdminThemeContext);

type Tab = "dashboard" | "pilotage" | "pipeline" | "sponsors" | "volunteers" | "registrations" | "newsletter" | "team" | "past-speakers" | "users" | "profiles" | "communication" | "library" | "cyber-watch" | "sponsor-pipeline" | "budget" | "logistics" | "certificates" | "export" | "prospection" | "prospection-speakers" | "tickets" | "sponsor-packages" | "settings" | "audit" | "ctf" | "live" | "sessions" | "video" | "transactions" | "testimony" | "campaigns" | "strategic-plan";

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
  const colors: Record<string, string> = { pending: "#ffaa00", payment_pending: "#ffaa00", paid: "#00ff9d", validated: "#00ff9d", pre_registered: "#00ccff", accepted: "#00ff9d", rejected: "#ff0066" };
  return (
    <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: colors[status] ? colors[status] + "20" : "var(--bdr)", color: colors[status] || "var(--txt-dim)", fontFamily: "'Share Tech Mono', monospace" }}>
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

// Self-service account: change own password + manage own MFA.
function AccountModal({
  info,
  onClose,
  onChanged,
}: {
  info: { name: string; email?: string; mfaEnabled?: boolean; mfaRequired?: boolean };
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, lang } = useAdminT();
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  // MFA enrollment state
  const [qr, setQr] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaMsg, setMfaMsg] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  const changePassword = async () => {
    setPwMsg(""); setPwSaving(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const d = await res.json().catch(() => ({}));
    setPwMsg(res.ok ? (lang === "en" ? "✓ Password updated." : "✓ Mot de passe mis à jour.") : (d.error || (lang === "en" ? "Failed." : "Échec.")));
    if (res.ok) { setCurPw(""); setNewPw(""); }
    setPwSaving(false);
  };

  const startMfa = async () => {
    setMfaMsg(""); setMfaBusy(true);
    const res = await fetch("/api/admin/account/mfa");
    const d = await res.json().catch(() => ({}));
    if (res.ok) setQr(d.qrDataUrl); else setMfaMsg(d.error || (lang === "en" ? "Failed." : "Échec."));
    setMfaBusy(false);
  };
  const verifyMfa = async () => {
    setMfaMsg(""); setMfaBusy(true);
    const res = await fetch("/api/admin/account/mfa", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ totp }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMfaMsg(lang === "en" ? "✓ MFA enabled." : "✓ MFA activé."); setQr(""); setTotp(""); onChanged(); }
    else setMfaMsg(d.error || (lang === "en" ? "Incorrect code." : "Code incorrect."));
    setMfaBusy(false);
  };
  const disableMfa = async () => {
    if (!confirm(lang === "en" ? "Disable MFA for your account?" : "Désactiver le MFA pour votre compte ?")) return;
    setMfaMsg(""); setMfaBusy(true);
    const res = await fetch("/api/admin/account/mfa", { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMfaMsg(lang === "en" ? "MFA disabled." : "MFA désactivé."); onChanged(); } else setMfaMsg(d.error || (lang === "en" ? "Failed." : "Échec."));
    setMfaBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="cyber-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold">{lang === "en" ? "👤 My Account" : "👤 Mon compte"}</h3>
            <p className="text-gray-500 text-xs">{info.email || info.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lang === "en" ? "Password" : "Mot de passe"}</p>
          <input type="password" placeholder={lang === "en" ? "Current password" : "Mot de passe actuel"} className="cyber-input w-full text-sm rounded px-3 py-2" value={curPw} onChange={e => setCurPw(e.target.value)} />
          <input type="password" placeholder={lang === "en" ? "New password (min 8)" : "Nouveau mot de passe (min 8)"} className="cyber-input w-full text-sm rounded px-3 py-2" value={newPw} onChange={e => setNewPw(e.target.value)} />
          <button onClick={changePassword} disabled={pwSaving || !curPw || newPw.length < 8} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">
            {pwSaving ? "…" : (lang === "en" ? "Change password" : "Changer le mot de passe")}
          </button>
          {pwMsg && <p className="text-xs" style={{ color: pwMsg.startsWith("✓") ? "var(--ac)" : "#ff6666" }}>{pwMsg}</p>}
        </div>

        {/* MFA */}
        <div className="space-y-2 border-t border-gray-800 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {lang === "en" ? "Two-factor authentication (MFA)" : "Double authentification (MFA)"}{info.mfaRequired ? (lang === "en" ? " · required" : " · obligatoire") : ""}
          </p>
          <p className="text-xs text-gray-500">
            {lang === "en" ? "Status: " : "Statut : "}{info.mfaEnabled ? <span className="text-neon-green">{lang === "en" ? "enabled ✓" : "activé ✓"}</span> : <span className="text-yellow-400">{lang === "en" ? "not enabled" : "non activé"}</span>}
          </p>
          {!info.mfaEnabled && !qr && (
            <button onClick={startMfa} disabled={mfaBusy} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">
              {mfaBusy ? "…" : (lang === "en" ? "Set up MFA" : "Configurer le MFA")}
            </button>
          )}
          {qr && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">{lang === "en" ? "Scan this QR with your authenticator app, then enter the code:" : "Scannez ce QR avec votre application d'authentification, puis entrez le code :"}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR MFA" width={160} height={160} className="rounded bg-white p-2 mx-auto" />
              <input inputMode="numeric" maxLength={6} placeholder="000000" className="cyber-input w-full text-sm rounded px-3 py-2 text-center tracking-[0.4em]" value={totp} onChange={e => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <button onClick={verifyMfa} disabled={mfaBusy || totp.length < 6} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">{lang === "en" ? "Enable MFA" : "Activer le MFA"}</button>
            </div>
          )}
          {info.mfaEnabled && !info.mfaRequired && (
            <button onClick={disableMfa} disabled={mfaBusy} className="text-xs px-3 py-1.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50">
              {lang === "en" ? "Disable MFA" : "Désactiver le MFA"}
            </button>
          )}
          {mfaMsg && <p className="text-xs" style={{ color: mfaMsg.startsWith("✓") ? "var(--ac)" : "#ff6666" }}>{mfaMsg}</p>}
        </div>
      </div>
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
  const { t, lang } = useAdminT();
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
    else setErr(json.error || (lang === "en" ? "Error" : "Erreur"));
    setVerifying(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="cyber-card rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-white font-bold mb-2">{lang === "en" ? "🔐 Enable MFA" : "🔐 Activer MFA"} — {setup.userName}</h3>
        {done ? (
          <>
            <p className="text-neon-green text-sm mb-4">{lang === "en" ? "✓ MFA successfully enabled!" : "✓ MFA activé avec succès !"}</p>
            <button onClick={onClose} className="btn-neon w-full py-2 rounded text-sm">{t.close}</button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-xs mb-3">{lang === "en" ? "Scan this QR code with Google Authenticator or a compatible TOTP app." : "Scannez ce QR code avec Google Authenticator ou une app TOTP compatible."}</p>
            <div className="flex justify-center mb-3">
              <img src={setup.qrDataUrl} alt="QR Code MFA" className="w-48 h-48" />
            </div>
            <p className="text-gray-600 text-xs text-center mb-4 font-mono break-all" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{setup.secret}</p>
            <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Verification code (6 digits)" : "Code de vérification (6 chiffres)"}</label>
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
                {verifying ? (lang === "en" ? "Verifying..." : "Vérification...") : (lang === "en" ? "Verify and enable" : "Vérifier et activer")}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white transition-colors">{t.cancel}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MfaToggle() {
  const { lang } = useAdminT();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then((s: Record<string, string>) => setEnabled(s.mfa_required === "true")).catch(() => setEnabled(false));
  }, []);
  const toggle = async () => {
    setSaving(true);
    const next = !enabled;
    await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mfa_required: String(next) }) });
    setEnabled(next);
    setSaving(false);
  };
  if (enabled === null) return <div className="text-gray-600 text-xs">…</div>;
  return (
    <button onClick={toggle} disabled={saving} className={`shrink-0 px-4 py-2 rounded text-sm font-bold transition-all ${enabled ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
      {saving ? "…" : enabled ? (lang === "en" ? "✓ Enabled" : "✓ Activé") : (lang === "en" ? "Disabled" : "Désactivé")}
    </button>
  );
}

interface ProfileLite {
  id: number;
  slug: string;
  name: string;
  description: string;
  color: string;
  permissions: Record<string, string>;
  isSystem: boolean;
}

function AdminUsersPanel({ canWrite = true, canDelete = false }: { canWrite?: boolean; canDelete?: boolean }) {
  const { t, lang } = useAdminT();
  const confirm = useConfirm();
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [created, setCreated] = useState<{ name: string; email: string; tempPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<MfaSetupState | null>(null);
  // Inline edit (password reset / profile reassignment) for an existing account.
  const [editUser, setEditUser] = useState<{ id: number; name: string; profileId: number | null; password: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  const loadProfiles = useCallback(async () => {
    const res = await fetch("/api/admin/profiles");
    if (!res.ok) return;
    const raw = await res.json() as Record<string, unknown>[];
    const parsed: ProfileLite[] = raw.map(p => {
      let perms: Record<string, string> = {};
      try { perms = JSON.parse((p.permissions as string) || "{}"); } catch { perms = {}; }
      return {
        id: p.id as number,
        slug: p.slug as string,
        name: p.name as string,
        description: (p.description as string) || "",
        color: (p.color as string) || "#888888",
        permissions: perms,
        isSystem: !!p.isSystem,
      };
    });
    setProfiles(parsed);
    // Default the creation form to the first profile once profiles are loaded.
    setForm(f => (f.profileId === undefined && parsed.length ? { ...f, profileId: parsed[0].id } : f));
  }, []);

  useEffect(() => { loadUsers(); loadProfiles(); }, [loadUsers, loadProfiles]);

  const selectedProfile = profiles.find(p => p.id === (form.profileId as number));

  const saveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const body: Record<string, unknown> = { profileId: editUser.profileId };
    if (editUser.password.trim()) body.password = editUser.password.trim();
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json() as Record<string, unknown>;
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...updated } : u));
      setEditUser(null);
    }
    setEditSaving(false);
  };

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
      setForm({ profileId: profiles[0]?.id });
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
    if (!res.ok) { alert(lang === "en" ? "Error generating QR code" : "Erreur lors de la génération du QR code"); return; }
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
    if (!(await confirm({ message: lang === "en" ? "Disable MFA for this user?" : "Désactiver le MFA pour cet utilisateur ?", danger: true }))) return;
    const res = await fetch("/api/admin/mfa/setup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, mfaEnabled: false } : u));
    }
  };

  const deleteUser = async (u: Record<string, unknown>) => {
    if (!(await confirm({ message: lang === "en" ? `Permanently delete the account "${u.name as string}" (${u.email as string})? This action is irreversible.` : `Supprimer définitivement le compte "${u.name as string}" (${u.email as string}) ? Cette action est irréversible.`, danger: true }))) return;
    const res = await fetch(`/api/admin/users/${u.id as number}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(prev => prev.filter(x => x.id !== u.id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{t.usersTitle}</h1>
          <p className="text-gray-500 text-xs mt-1">{t.receiveCredentials}</p>
        </div>
        {canWrite && <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-sm">{t.newUser}</button>}
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
            <h3 className="text-white font-bold mb-4">{lang === "en" ? "✅ User created" : "✅ Utilisateur créé"}</h3>
            <p className="text-gray-400 text-sm mb-4">{lang === "en" ? <>An email has been sent to <strong className="text-white">{created.email}</strong> with the credentials.</> : <>Un email a été envoyé à <strong className="text-white">{created.email}</strong> avec les identifiants.</>}</p>
            <div className="bg-black/50 border border-neon-green/30 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">{lang === "en" ? "Temporary password" : "Mot de passe temporaire"}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black font-mono" style={{ color: "var(--ac)", fontFamily: "'Share Tech Mono', monospace" }}>{created.tempPassword}</span>
                <button onClick={() => navigator.clipboard.writeText(created.tempPassword)} className="text-xs text-gray-500 hover:text-white transition-colors px-2">{lang === "en" ? "Copy" : "Copier"}</button>
              </div>
            </div>
            <button onClick={() => setCreated(null)} className="btn-neon w-full py-2 rounded text-sm">{t.close}</button>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setEditUser(null)}>
          <div className="cyber-card rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm">{lang === "en" ? "Edit" : "Éditer"} — {editUser.name}</h3>
              <button onClick={() => setEditUser(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "New password" : "Nouveau mot de passe"} <span className="text-gray-600">{lang === "en" ? "(leave blank to keep unchanged)" : "(laisser vide pour ne pas changer)"}</span></label>
              <input
                type="text"
                className="cyber-input w-full text-sm rounded px-3 py-2"
                placeholder={lang === "en" ? "e.g. shared password for hosts" : "ex. mot de passe commun hôtesses"}
                value={editUser.password}
                onChange={e => setEditUser(u => u && ({ ...u, password: e.target.value }))}
              />
              <p className="text-[11px] text-gray-600 mt-1">{lang === "en" ? "For a shared account (e.g. check-in hosts), set a common password here and share it with the team." : "Pour un compte partagé (ex. hôtesses check-in), définissez ici un mot de passe commun et communiquez-le à l'équipe."}</p>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-2">{lang === "en" ? "Role profile" : "Profil de rôle"}</label>
              <select
                className="cyber-input w-full text-sm rounded px-3 py-2 bg-transparent"
                value={editUser.profileId ?? ""}
                onChange={e => setEditUser(u => u && ({ ...u, profileId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="" className="bg-dark-800">{lang === "en" ? "— None —" : "— Aucun —"}</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} className="bg-dark-800">{p.name}{!p.isSystem ? (lang === "en" ? " (custom)" : " (personnalisé)") : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={editSaving} className="btn-neon px-4 py-2 rounded text-sm">
                {editSaving ? (lang === "en" ? "Saving..." : "Enregistrement...") : t.save}
              </button>
              <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white transition-colors">{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {canWrite && showForm && (
        <div className="cyber-card rounded-xl p-6 mb-6">
          <h3 className="text-white font-bold mb-4 text-sm">{lang === "en" ? "New administrator account" : "Nouveau compte administrateur"}</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Full name" : "Nom complet"}</label>
              <input className="cyber-input w-full text-sm rounded px-3 py-2" placeholder="Jean Mbarga" value={(form.name as string) || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <input type="email" className="cyber-input w-full text-sm rounded px-3 py-2" placeholder="jean@eyesopensecurity.com" value={(form.email as string) || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">{lang === "en" ? "Role profile" : "Profil de rôle"}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setForm(f => ({ ...f, profileId: profile.id }))}
                  className={`p-3 rounded-lg border text-left transition-all ${form.profileId === profile.id ? "border-opacity-60" : "border-gray-800 hover:border-gray-600"}`}
                  style={form.profileId === profile.id ? { borderColor: profile.color, background: profile.color + "15" } : {}}
                >
                  <p className="text-xs font-bold" style={{ color: form.profileId === profile.id ? profile.color : "var(--txt-dim)" }}>
                    {profile.name}{!profile.isSystem && <span className="text-gray-600 font-normal"> · {lang === "en" ? "custom" : "personnalisé"}</span>}
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">{profile.description}</p>
                </button>
              ))}
            </div>
          </div>
          {selectedProfile && (
            <div className="mb-4 p-3 rounded-lg border border-gray-800">
              <p className="text-xs text-gray-500 mb-2">{lang === "en" ? "Included access" : "Accès inclus"}</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedProfile.permissions).map(([k, v]) => (
                  <span key={k} className="text-xs px-2 py-0.5 rounded" style={{ background: v === "write" ? "var(--ac-bg)" : "#0066ff15", color: v === "write" ? "var(--ac)" : "#0066ff" }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={saveUser} disabled={loading || !form.name || !form.email} className="btn-neon px-4 py-2 rounded text-sm">
              {loading ? (lang === "en" ? "Creating..." : "Création...") : (lang === "en" ? "Create and send credentials" : "Créer et envoyer les identifiants")}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white transition-colors">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">{lang === "en" ? "Available profiles" : "Profils disponibles"}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {profiles.map(profile => (
            <div key={profile.id} className="cyber-card rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: profile.color }} />
                <span className="text-white text-xs font-bold">{profile.name}</span>
                {!profile.isSystem && <span className="text-[10px] text-gray-600">{lang === "en" ? "custom" : "personnalisé"}</span>}
              </div>
              <p className="text-gray-600 text-xs">{profile.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3">{lang === "en" ? `Existing accounts (${users.length})` : `Comptes existants (${users.length})`}</h3>
        <div className="space-y-2">
          {users.map(u => {
            const profile = profiles.find(p => p.id === (u.profileId as number));
            return (
              <div key={u.id as number} className="cyber-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: profile?.color ? profile.color + "20" : "var(--bdr)", color: profile?.color || "var(--txt-dim)" }}>
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
                    {u.isActive ? (lang === "en" ? "Active" : "Actif") : (lang === "en" ? "Inactive" : "Inactif")}
                  </span>
                  {canWrite && <button onClick={() => setEditUser({ id: u.id as number, name: u.name as string, profileId: (u.profileId as number) ?? null, password: "" })} className="text-xs text-neon-green/80 hover:text-neon-green transition-colors">
                    {lang === "en" ? "Edit" : "Éditer"}
                  </button>}
                  {canWrite && <button onClick={() => toggleActive(u.id as number, !(u.isActive as boolean))} className="text-xs text-gray-600 hover:text-white transition-colors">
                    {u.isActive ? (lang === "en" ? "Deactivate" : "Désactiver") : (lang === "en" ? "Activate" : "Activer")}
                  </button>}
                  {canWrite && (u.mfaEnabled ? (
                    <button onClick={() => disableMfa(u.id as number)} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                      {lang === "en" ? "Disable MFA" : "Désactiver MFA"}
                    </button>
                  ) : (
                    <button onClick={() => startMfaSetup(u)} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                      {lang === "en" ? "Enable MFA" : "Activer MFA"}
                    </button>
                  ))}
                  {canDelete && (
                    <button onClick={() => deleteUser(u)} className="text-xs text-red-600 hover:text-red-400 transition-colors border border-red-900/40 hover:border-red-500/50 px-2 py-0.5 rounded">
                      {t.delete}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!users.length && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No users created" : "Aucun utilisateur créé"}</p>}
        </div>
      </div>

      {/* Sécurité MFA */}
      {canWrite && <div className="cyber-card rounded-xl p-5 mt-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{t.securitySection}</h3>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white text-sm font-bold mb-1">{t.forceMfa}</p>
            <p className="text-gray-500 text-xs">{t.forceMfaDesc}</p>
          </div>
          <MfaToggle />
        </div>
      </div>}
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

function ProspectionPanel({ leads, onRefresh, canWrite = true }: { leads: Record<string, unknown>[]; onRefresh: () => void; canWrite?: boolean }) {
  const { t, lang } = useAdminT();
  const { theme } = useAdminTheme();
  const [searchTab, setSearchTab] = useState<"apollo" | "places">("apollo");
  const [apolloKeywords, setApolloKeywords] = useState("cybersecurity,technology,telecom,finance");
  const [placesQuery, setPlacesQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<Record<string, unknown> | null>(null);
  const [emailResult, setEmailResult] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [pitchTarget, setPitchTarget] = useState<Record<string, unknown> | null>(null);
  const [pitchResult, setPitchResult] = useState<{ accroche: string; valeur: string[]; objection: { question: string; reponse: string }; ouverture: string; brief_complet: string } | null>(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "added">("all");
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [collapsedQueries, setCollapsedQueries] = useState<Set<string>>(new Set());
  const [editLeadTarget, setEditLeadTarget] = useState<Record<string, unknown> | null>(null);
  const [editLeadForm, setEditLeadForm] = useState<Record<string, unknown>>({});
  const [savingLead, setSavingLead] = useState(false);
  // Pipeline assignment modal
  const [pipelineAssignTarget, setPipelineAssignTarget] = useState<Record<string, unknown> | null>(null);
  const [pipelineAssigneeId, setPipelineAssigneeId] = useState<string>("");
  const [pipelineAssigning, setPipelineAssigning] = useState(false);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);

  const toggleQuery = (q: string) => setCollapsedQueries(prev => {
    const next = new Set(prev);
    if (next.has(q)) next.delete(q); else next.add(q);
    return next;
  });

  useEffect(() => {
    fetch("/api/admin/sponsor-packages").then(r => r.json()).then(setPackages).catch(() => {});
    fetch("/api/admin/sponsor-prospects/assignees").then(r => r.ok ? r.json() : []).then(setAssignees).catch(() => {});
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
    setSearchError(null);
    try {
      const res = await fetch("/api/admin/ai/apollo-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: apolloKeywords.split(",").map(k => k.trim()).filter(Boolean) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await onRefresh();
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
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
    // Re-display the cached email instead of regenerating it.
    if (lead.emailJson) {
      try { setEmailResult(JSON.parse(lead.emailJson as string)); return; } catch { /* regenerate */ }
    }
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
    if (res.ok) {
      const result = await res.json();
      setEmailResult(result);
      // Cache it on the lead so it isn't regenerated next time.
      await fetch("/api/admin/ai/prospect-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, emailJson: JSON.stringify(result) }),
      }).catch(() => {});
      onRefresh();
    }
    setGeneratingEmail(false);
  };

  const generatePitch = async (lead: Record<string, unknown>) => {
    setPitchTarget(lead);
    // Re-display the cached pitch instead of regenerating it.
    if (lead.pitchJson) {
      try { setPitchResult(JSON.parse(lead.pitchJson as string)); return; } catch { /* regenerate */ }
    }
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
    if (res.ok) {
      const result = await res.json();
      setPitchResult(result);
      await fetch("/api/admin/ai/prospect-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, pitchJson: JSON.stringify(result) }),
      }).catch(() => {});
      onRefresh();
    }
    setGeneratingPitch(false);
  };

  const requestAddToPipeline = (lead: Record<string, unknown>) => {
    if (lead.addedToPipeline) return;
    setPipelineAssignTarget(lead);
    setPipelineAssigneeId("");
  };

  const confirmAddToPipeline = async () => {
    if (!pipelineAssignTarget || !pipelineAssigneeId) return;
    setPipelineAssigning(true);
    await fetch("/api/admin/ai/prospect-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pipelineAssignTarget.id, addedToPipeline: true, assigneeId: parseInt(pipelineAssigneeId) }),
    });
    setPipelineAssigning(false);
    setPipelineAssignTarget(null);
    setPipelineAssigneeId("");
    onRefresh();
  };

  const deleteLead = async (lead: Record<string, unknown>) => {
    if (!confirm(lang === "en" ? "Delete this prospect lead?" : "Supprimer ce prospect ?")) return;
    await fetch("/api/admin/ai/prospect-leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id }),
    });
    onRefresh();
  };

  const openEditLead = (lead: Record<string, unknown>) => {
    setEditLeadForm({
      org: lead.org,
      sector: lead.sector || "",
      city: lead.city || "",
      website: lead.website || "",
      phone: lead.phone || "",
      contactName: lead.contactName || "",
      contactTitle: lead.contactTitle || "",
      contactEmail: lead.contactEmail || "",
      contactLinkedin: lead.contactLinkedin || "",
      recommendedPackage: lead.recommendedPackage || "",
    });
    setEditLeadTarget(lead);
  };

  const saveLeadEdit = async () => {
    if (!editLeadTarget) return;
    setSavingLead(true);
    await fetch("/api/admin/ai/prospect-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editLeadTarget.id, ...editLeadForm }),
    });
    setSavingLead(false);
    setEditLeadTarget(null);
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

      {/* Edit lead modal */}
      {editLeadTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-800 shrink-0">
              <h3 className="text-white font-bold text-sm">{lang === "en" ? "Edit lead" : "Modifier le prospect"} — {editLeadTarget.org as string}</h3>
              <button onClick={() => setEditLeadTarget(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "org", label: lang === "en" ? "Organization" : "Organisation" },
                  { key: "sector", label: lang === "en" ? "Sector" : "Secteur" },
                  { key: "city", label: lang === "en" ? "City" : "Ville" },
                  { key: "website", label: "Website" },
                  { key: "phone", label: lang === "en" ? "Phone" : "Téléphone" },
                  { key: "contactName", label: lang === "en" ? "Contact name" : "Nom contact" },
                  { key: "contactTitle", label: lang === "en" ? "Contact title" : "Titre contact" },
                  { key: "contactEmail", label: "Email contact" },
                  { key: "contactLinkedin", label: "LinkedIn" },
                  { key: "recommendedPackage", label: "Package" },
                ] as { key: string; label: string }[]).map(f => (
                  <div key={f.key} className={f.key === "contactLinkedin" ? "col-span-2" : ""}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <input
                      value={(editLeadForm[f.key] as string) || ""}
                      onChange={e => setEditLeadForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="cyber-input w-full px-3 py-1.5 rounded text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                <button onClick={saveLeadEdit} disabled={savingLead} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">
                  {savingLead ? "…" : (lang === "en" ? "Save" : "Enregistrer")}
                </button>
                <button onClick={() => setEditLeadTarget(null)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">{lang === "en" ? "Cancel" : "Annuler"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-800 shrink-0">
              <div>
                <h3 className="text-white font-bold">{emailTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{emailTarget.sector as string} · {t.package} : <span style={{ color: "var(--ac)" }}>{(emailTarget.recommendedPackage as string) || "—"}</span></p>
              </div>
              <button onClick={() => { setEmailTarget(null); setEmailResult(null); }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
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
                      <button onClick={() => navigator.clipboard.writeText(`${t.emailSubjectField} : ${e.subject}\n\n${e.body}`)} className="text-xs hover:underline" style={{ color: "var(--ac)" }}>{t.close}</button>
                    </div>
                    <p className="text-white text-xs font-bold mb-2">{t.emailSubjectField} : {e.subject}</p>
                    <p className="text-gray-400 text-xs whitespace-pre-wrap leading-relaxed">{e.body}</p>
                  </div>
                ))}
                {canWrite && <button
                  onClick={() => requestAddToPipeline(emailTarget)}
                  disabled={!!emailTarget.addedToPipeline}
                  className="w-full py-2 rounded text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--ac-bg)", color: "var(--ac)", border: "1px solid var(--ac-bdr)" }}
                >
                  {emailTarget.addedToPipeline ? (lang === "en" ? "✓ Already in pipeline" : "✓ Déjà dans le pipeline") : t.addToPipeline}
                </button>}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {pitchTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-800 shrink-0">
              <div>
                <h3 className="text-white font-bold">🎯 Pitch · {pitchTarget.org as string}</h3>
                <p className="text-gray-500 text-xs">{pitchTarget.sector as string} · {t.package} : <span style={{ color: "#ff0066" }}>{(pitchTarget.recommendedPackage as string) || "—"}</span></p>
              </div>
              <button onClick={() => { setPitchTarget(null); setPitchResult(null); }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
            {generatingPitch && <p className="text-gray-500 text-xs text-center py-8">{lang === "en" ? "Generating strategic brief…" : "Génération du brief stratégique…"}</p>}
            {pitchResult && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4" style={{ borderColor: "#ff006640", background: "#ff006610" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#ff0066" }}>{lang === "en" ? "Hook" : "Accroche"}</p>
                  <p className="text-white text-sm leading-relaxed">{pitchResult.accroche}</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">{lang === "en" ? "Concrete value" : "Valeur concrète"}</p>
                  <ul className="space-y-1">
                    {pitchResult.valeur.map((v, i) => (
                      <li key={i} className="text-gray-300 text-sm flex gap-2"><span style={{ color: "var(--ac)" }}>▸</span>{v}</li>
                    ))}
                  </ul>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">{lang === "en" ? "Likely objection" : "Objection probable"}</p>
                  <p className="text-sm font-semibold text-white mb-1">❝ {pitchResult.objection.question} ❞</p>
                  <p className="text-gray-400 text-sm">→ {pitchResult.objection.reponse}</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">{lang === "en" ? "Meeting opener" : "Ouverture de réunion"}</p>
                  <p className="text-white text-sm italic">❝ {pitchResult.ouverture} ❞</p>
                </div>
                <div className="border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{lang === "en" ? "Full brief" : "Brief complet"}</p>
                    <button onClick={() => navigator.clipboard.writeText(pitchResult!.brief_complet)} className="text-xs hover:underline" style={{ color: "var(--ac)" }}>📋 {lang === "en" ? "Copy" : "Copier"}</button>
                  </div>
                  <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">{pitchResult.brief_complet}</p>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      <div className="cyber-card rounded-xl p-5 mb-5">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--ac)" }}>
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
          <div className="space-y-2">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">{t.apolloKeywordsLabel}</label>
                <input value={apolloKeywords} onChange={e => { setApolloKeywords(e.target.value); setSearchError(null); }} className="cyber-input w-full text-xs rounded px-3 py-2" placeholder="cybersecurity,technology,telecom,finance,banking" />
              </div>
              {canWrite && <button onClick={runApolloSearch} disabled={searching} className="btn-neon px-5 py-2 rounded text-xs self-end shrink-0">
                {searching ? t.searchingLabel : t.searchBtn}
              </button>}
            </div>
            {searchError && <p className="text-xs text-red-400 font-mono bg-red-400/5 border border-red-400/20 rounded px-3 py-2">⚠ {searchError}</p>}
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{t.placesQueryLabel}</label>
              <input value={placesQuery} onChange={e => setPlacesQuery(e.target.value)} className="cyber-input w-full text-xs rounded px-3 py-2" placeholder={lang === "en" ? "bank Douala, telecom operator Cameroon..." : "banque Douala, opérateur télécom Cameroun..."} onKeyDown={e => e.key === "Enter" && runPlacesSearch()} />
            </div>
            {canWrite && <button onClick={runPlacesSearch} disabled={searching || !placesQuery.trim()} className="btn-neon px-5 py-2 rounded text-xs self-end shrink-0">
              {searching ? t.searchingLabel : t.searchBtn}
            </button>}
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

        {(() => {
          const sorted = [...filtered].sort((a, b) => ((b.aiScore as number) || 0) - ((a.aiScore as number) || 0));
          const byQuery: Record<string, Record<string, unknown>[]> = {};
          for (const lead of sorted) {
            const q = (lead.searchQuery as string) || (lang === "en" ? "No search query" : "Sans requête");
            if (!byQuery[q]) byQuery[q] = [];
            byQuery[q].push(lead);
          }
          const queries = Object.keys(byQuery);

          const renderLead = (lead: Record<string, unknown>) => (
            <div key={lead.id as number} className={`border rounded-xl p-4 transition-all ${lead.addedToPipeline ? "border-gray-800 opacity-60" : "border-gray-700 hover:border-gray-500"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: lead.source === "apollo" ? (theme === "light" ? "#0066ff28" : "#0066ff15") : (theme === "light" ? "#cc00ff28" : "#cc00ff15"), color: lead.source === "apollo" ? "#0066ff" : "#cc00ff", border: `1px solid ${lead.source === "apollo" ? "#0066ff50" : "#cc00ff50"}` }}>
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
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.contactEmail ? "var(--ac-bg)" : "#ff006615", color: lead.contactEmail ? "var(--ac)" : "#ff0066" }}>📧 email</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.phone ? "var(--ac-bg)" : "#ff006615", color: lead.phone ? "var(--ac)" : "#ff0066" }}>📞 tel</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.contactName ? "var(--ac-bg)" : "#ff006615", color: lead.contactName ? "var(--ac)" : "#ff0066" }}>👤 contact</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: lead.website ? "var(--ac-bg)" : "#ff006615", color: lead.website ? "var(--ac)" : "#ff0066" }}>🌐 web</span>
                  </div>
                  {!!lead.contactName && (
                    <p className="text-xs mt-1" style={{ color: "var(--ac)" }}>
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
                    <p className="text-gray-600 text-xs mt-1 italic line-through">Score {(lead.aiScore as number).toFixed(1)}/10 — {lang === "en" ? "Score useless without contact" : "Score inutile sans contact"}</p>
                  )}
                  {!!lead.aiScoreReason && (
                    <p className="text-gray-600 text-xs mt-1 italic">{lead.aiScoreReason as string}</p>
                  )}
                </div>
                {canWrite && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openEditLead(lead)}
                      className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                      style={{ background: "#ffffff10", color: "#aaa", border: "1px solid #333" }}
                    >
                      ✏️ {lang === "en" ? "Edit" : "Modifier"}
                    </button>
                    {!lead.addedToPipeline && <>
                      <button
                        onClick={() => enrichLead(lead)}
                        disabled={enrichingId === (lead.id as number)}
                        className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                        style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                      >
                        {enrichingId === (lead.id as number) ? "…" : (lang === "en" ? "🔍 Enrich" : "🔍 Enrichir")}
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
                        onClick={() => hasContact(lead) ? requestAddToPipeline(lead) : undefined}
                        disabled={!hasContact(lead)}
                        title={!hasContact(lead) ? (lang === "en" ? "Enrich contact data first." : "Enrichissez les données de contact d'abord.") : undefined}
                        className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                        style={hasContact(lead)
                          ? { background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }
                          : { background: "#33333320", color: "#555", border: "1px solid #33333340", cursor: "not-allowed" }}
                      >
                        {t.addToPipeline}
                      </button>
                      <button
                        onClick={() => deleteLead(lead)}
                        className="text-xs px-3 py-1.5 rounded transition-all whitespace-nowrap"
                        style={{ background: "#ff006610", color: "#ff0066", border: "1px solid #ff006630" }}
                      >
                        🗑 {lang === "en" ? "Delete" : "Supprimer"}
                      </button>
                    </>}
                  </div>
                )}
              </div>
            </div>
          );

          if (queries.length <= 1) {
            return <div className="space-y-3">{sorted.map(renderLead)}</div>;
          }

          return (
            <div className="space-y-4">
              {/* Quick-nav chips */}
              <div className="flex gap-2 flex-wrap pb-2 border-b border-gray-800">
                {queries.map(q => {
                  const qLeads = byQuery[q];
                  const pending = qLeads.filter(l => !l.addedToPipeline).length;
                  const isCollapsed = collapsedQueries.has(q);
                  return (
                    <button
                      key={q}
                      onClick={() => {
                        if (isCollapsed) toggleQuery(q);
                        document.getElementById(`prospect-group-${q}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="text-xs px-2.5 py-1 rounded-full font-mono transition-all"
                      style={{
                        background: isCollapsed ? (theme === "light" ? "#e8e8ee" : "#1a1a2e") : "var(--ac-bg)",
                        color: isCollapsed ? (theme === "light" ? "#666" : "#555") : "var(--ac)",
                        border: `1px solid ${isCollapsed ? (theme === "light" ? "#ccc" : "#333") : "var(--ac)"}`,
                      }}
                    >
                      {q.split(",")[0].trim()} <span style={{ opacity: 0.6 }}>({pending}/{qLeads.length})</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    const allCollapsed = queries.every(q => collapsedQueries.has(q));
                    setCollapsedQueries(allCollapsed ? new Set() : new Set(queries));
                  }}
                  className="text-xs px-2.5 py-1 rounded-full font-mono transition-all ml-auto"
                  style={{ background: theme === "light" ? "#e8e8ee" : "#1a1a2e", color: theme === "light" ? "#666" : "#555", border: `1px solid ${theme === "light" ? "#ccc" : "#333"}` }}
                >
                  {queries.every(q => collapsedQueries.has(q)) ? (lang === "en" ? "Expand all" : "Tout ouvrir") : (lang === "en" ? "Collapse all" : "Tout réduire")}
                </button>
              </div>

              {/* Groups */}
              {queries.map(q => {
                const qLeads = byQuery[q];
                const isCollapsed = collapsedQueries.has(q);
                const scores = qLeads.map(l => l.aiScore as number).filter(s => s !== null && s !== undefined);
                const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                const pendingCount = qLeads.filter(l => !l.addedToPipeline).length;

                return (
                  <div key={q} id={`prospect-group-${q}`} className="scroll-mt-4">
                    <button
                      onClick={() => toggleQuery(q)}
                      className="w-full flex items-center gap-3 mb-3 text-left group"
                    >
                      <span className="text-xs font-mono transition-transform" style={{ color: "#555" }}>
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest truncate" style={{ color: "var(--ac)" }}>
                        🔍 {q}
                      </span>
                      <span className="text-xs font-mono whitespace-nowrap" style={{ color: "#555" }}>
                        {pendingCount} {lang === "en" ? "pending" : "restants"} / {qLeads.length}
                      </span>
                      {avgScore !== null && (
                        <span className="text-xs font-mono whitespace-nowrap" style={{ color: scoreColor(avgScore) }}>
                          ø {avgScore.toFixed(1)}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-gray-800 group-hover:bg-gray-700 transition-colors" />
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-3">{qLeads.map(renderLead)}</div>
                    )}
                    {isCollapsed && (
                      <div className="flex gap-2 flex-wrap mb-2 pl-4">
                        {qLeads.slice(0, 6).map(l => (
                          <span key={l.id as number} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#0a0a0a", color: "#444", border: "1px solid #222" }}>
                            {(l.org as string).slice(0, 22)}
                          </span>
                        ))}
                        {qLeads.length > 6 && <span className="text-xs text-gray-700 font-mono">+{qLeads.length - 6}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Assignee modal for +Pipeline */}
      {pipelineAssignTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="cyber-card rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-white font-bold">{lang === "en" ? "Assign this prospect" : "Assigner ce prospect"}</h3>
            <p className="text-gray-400 text-sm font-mono">{pipelineAssignTarget.org as string}</p>
            <select
              value={pipelineAssigneeId}
              onChange={e => setPipelineAssigneeId(e.target.value)}
              className="cyber-input w-full px-3 py-2 rounded text-sm"
            >
              <option value="">{lang === "en" ? "— Choose a team member —" : "— Choisir un responsable —"}</option>
              {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button
                onClick={confirmAddToPipeline}
                disabled={!pipelineAssigneeId || pipelineAssigning}
                className="btn-neon flex-1 py-2 rounded text-sm font-bold disabled:opacity-40"
              >
                {pipelineAssigning ? "…" : (lang === "en" ? "✓ Add to pipeline" : "✓ Ajouter au pipeline")}
              </button>
              <button
                onClick={() => { setPipelineAssignTarget(null); setPipelineAssigneeId(""); }}
                className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white transition-colors"
              >
                {lang === "en" ? "Cancel" : "Annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


// ---- Library Panel ----
type LibFile = { name: string; url: string; size: number; updated: string; categoryId: number | null; categoryName: string | null; categorySlug: string | null };
type LibCat = { id: number; name: string; slug: string; _count: { assets: number } };

function LibraryPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { t, lang } = useAdminT();
  const [files, setFiles] = useState<LibFile[]>([]);
  const [categories, setCategories] = useState<LibCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | "all" | "uncategorized">("all");
  const [uploadCat, setUploadCat] = useState<number | "">("");
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [movingFile, setMovingFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [fr, cr] = await Promise.all([fetch("/api/admin/library"), fetch("/api/admin/library/categories")]);
    if (fr.ok) setFiles(await fr.json());
    if (cr.ok) setCategories(await cr.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    if (uploadCat) fd.append("categoryId", String(uploadCat));
    await fetch("/api/admin/library", { method: "POST", body: fd });
    await load();
    setUploading(false);
  };

  const deleteFile = async (name: string) => {
    if (!confirm(lang === "en" ? `Delete "${name.split("/").pop()}"?` : `Supprimer "${name.split("/").pop()}" ?`)) return;
    setDeleting(name);
    await fetch("/api/admin/library", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    setFiles(prev => prev.filter(f => f.name !== name));
    setDeleting(null);
  };

  const assignCategory = async (name: string, categoryId: number | null) => {
    const res = await fetch("/api/admin/library", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, categoryId }) });
    if (res.ok) {
      const cat = categories.find(c => c.id === categoryId) ?? null;
      setFiles(prev => prev.map(f => f.name === name ? { ...f, categoryId: cat?.id ?? null, categoryName: cat?.name ?? null, categorySlug: cat?.slug ?? null } : f));
    }
    setMovingFile(null);
  };

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const res = await fetch("/api/admin/library/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName }) });
    if (res.ok) { await load(); setNewCatName(""); setAddingCat(false); }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm(lang === "en" ? "Delete this category? Images will become uncategorized." : "Supprimer cette catégorie ? Les images deviennent non classées.")) return;
    await fetch("/api/admin/library/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
    if (activeCat === id) setActiveCat("all");
  };

  const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const filtered = files.filter(f => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCat === "all") return true;
    if (activeCat === "uncategorized") return f.categoryId === null;
    return f.categoryId === activeCat;
  });

  const uncategorizedCount = files.filter(f => f.categoryId === null).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-white">{t.libraryTitle}</h1>
          <p className="text-gray-500 text-xs mt-1">{t.librarySubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cyber-input text-xs px-3 py-1.5 rounded w-44"
          />
          {canWrite && (
            <div className="flex items-center gap-2">
              <select value={uploadCat} onChange={e => setUploadCat(e.target.value ? Number(e.target.value) : "")} className="cyber-input text-xs px-2 py-1.5 rounded text-gray-300 bg-transparent">
                <option value="">{lang === "en" ? "No category" : "Sans catégorie"}</option>
                {categories.map(c => <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>)}
              </select>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs px-4 py-1.5 rounded border border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20 font-mono transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {uploading ? t.importingBtn : t.importBtn}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Category sidebar */}
        <div className="w-44 shrink-0 space-y-0.5">
          {[
            { id: "all" as const, label: lang === "en" ? "All" : "Toutes", count: files.length },
            { id: "uncategorized" as const, label: lang === "en" ? "Uncategorized" : "Non classées", count: uncategorizedCount },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveCat(item.id)}
              className={`w-full text-left text-xs px-2.5 py-1.5 rounded font-mono flex items-center justify-between transition-colors ${activeCat === item.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/40"}`}
            >
              <span>{item.label}</span>
              <span className="text-gray-600 text-xs">{item.count}</span>
            </button>
          ))}

          {categories.length > 0 && <div className="border-t border-gray-800 my-1.5" />}

          {categories.map(cat => (
            <div key={cat.id} className={`group flex items-center gap-1 rounded transition-colors ${activeCat === cat.id ? "bg-neon-green/10 border border-neon-green/30" : "hover:bg-gray-800/40"}`}>
              <button
                onClick={() => setActiveCat(cat.id)}
                className={`flex-1 text-left text-xs px-2.5 py-1.5 font-mono flex items-center justify-between ${activeCat === cat.id ? "text-neon-green" : "text-gray-500 hover:text-gray-300"}`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-gray-600 text-xs ml-1 shrink-0">{cat._count.assets}</span>
              </button>
              {canWrite && (
                <button onClick={() => deleteCategory(cat.id)} className="hidden group-hover:flex text-gray-700 hover:text-red-400 text-xs px-1 py-1.5 transition-colors" title={lang === "en" ? "Delete category" : "Supprimer la catégorie"}>✕</button>
              )}
            </div>
          ))}

          {canWrite && (
            <div className="pt-2">
              {addingCat ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") createCategory(); if (e.key === "Escape") { setAddingCat(false); setNewCatName(""); } }}
                    placeholder={lang === "en" ? "Category name…" : "Nom de catégorie…"}
                    className="cyber-input text-xs px-2 py-1 rounded w-full"
                  />
                  <div className="flex gap-1">
                    <button onClick={createCategory} className="flex-1 text-xs py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 font-mono">✓</button>
                    <button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="flex-1 text-xs py-1 rounded bg-gray-800 text-gray-400 font-mono">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingCat(true)} className="w-full text-xs px-2.5 py-1.5 text-gray-600 hover:text-neon-green font-mono border border-dashed border-gray-800 hover:border-neon-green/30 rounded transition-colors text-left">
                  + {lang === "en" ? "New category" : "Nouvelle catégorie"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Image grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-600 font-mono text-xs">{t.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600 font-mono text-xs gap-3">
              <span>{search ? t.noSearchResult : t.noImages}</span>
              {canWrite && !search && (
                <button onClick={() => fileRef.current?.click()} className="text-neon-green text-xs underline">{t.importFirstImage}</button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-600 mb-3 font-mono">{filtered.length} fichier{filtered.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filtered.map(f => (
                  <div key={f.name} className="group relative rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-all">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.name} className="w-full aspect-square object-contain bg-gray-900 p-1" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors" />

                    {/* Category badge */}
                    {f.categoryName && (
                      <div className="absolute top-1 left-1 text-xs bg-black/70 text-neon-green px-1.5 py-0.5 rounded font-mono leading-tight max-w-[80%] truncate">
                        {f.categoryName}
                      </div>
                    )}

                    {/* Delete button */}
                    {canWrite && (
                      <button
                        onClick={() => deleteFile(f.name)}
                        disabled={deleting === f.name}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/80 text-white text-xs items-center justify-center hidden group-hover:flex hover:bg-red-500"
                      >✕</button>
                    )}

                    {/* Bottom overlay: filename + category selector */}
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs truncate leading-tight">{f.name.split("/").pop()}</p>
                      <p className="text-gray-400 text-xs">{fmt(f.size)}</p>
                      {canWrite && (
                        movingFile === f.name ? (
                          <select
                            autoFocus
                            defaultValue={f.categoryId ?? ""}
                            onChange={e => assignCategory(f.name, e.target.value ? Number(e.target.value) : null)}
                            onBlur={() => setMovingFile(null)}
                            className="mt-1 w-full text-xs bg-gray-900 text-white border border-gray-700 rounded px-1 py-0.5"
                          >
                            <option value="">{lang === "en" ? "Uncategorized" : "Non classée"}</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        ) : (
                          <button
                            onClick={() => setMovingFile(f.name)}
                            className="mt-0.5 text-xs text-gray-500 hover:text-neon-green font-mono"
                          >
                            {lang === "en" ? "📁 Move to…" : "📁 Déplacer…"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Library Picker Modal ----
// Browse and pick an existing image from the GCS library — organised by category.
function LibraryPickerModal({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const { lang } = useAdminT();
  const [files, setFiles] = useState<{ name: string; url: string; size: number; updated: string; categoryName: string | null; categorySlug: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/library")
      .then(r => r.ok ? r.json() : [])
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const filtered = search
    ? files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || (f.categoryName ?? "").toLowerCase().includes(search.toLowerCase()))
    : files;

  // Group by category; files without a category go into "Autres"
  const groups: { key: string; label: string; files: typeof filtered }[] = [];
  const seen = new Map<string, typeof filtered>();
  for (const f of filtered) {
    const key = f.categorySlug ?? "__autres__";
    const label = f.categoryName ?? (lang === "en" ? "Other" : "Autres");
    if (!seen.has(key)) { seen.set(key, []); groups.push({ key, label, files: seen.get(key)! }); }
    seen.get(key)!.push(f);
  }

  const toggleCollapse = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="cyber-card rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 pb-3 border-b border-gray-800 shrink-0">
          <div>
            <h3 className="text-white font-bold text-sm">📁 {lang === "en" ? "Choose an image from the Library" : "Choisir une image de la Library"}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{files.length} {lang === "en" ? "image(s) — organised by category" : "image(s) — organisées par catégorie"}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={lang === "en" ? "Search…" : "Rechercher…"}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="cyber-input text-xs px-3 py-1.5 rounded w-40"
            />
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-600 font-mono text-xs">{lang === "en" ? "Loading…" : "Chargement…"}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 font-mono text-xs gap-2">
              <span>{search ? (lang === "en" ? "No results" : "Aucun résultat") : (lang === "en" ? "No images in the Library" : "Aucune image dans la Library")}</span>
              <span className="text-gray-700">{lang === "en" ? "Import images via the 📁 Library tab." : "Importez des images via l'onglet 📁 Library."}</span>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.key}>
                {/* Category header — clickable to collapse/expand */}
                <button
                  onClick={() => toggleCollapse(group.key)}
                  className="flex items-center gap-2 mb-2 w-full text-left group"
                >
                  <span className="text-base">{collapsed[group.key] ? "📁" : "📂"}</span>
                  <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{group.label}</span>
                  <span className="text-xs text-gray-600">({group.files.length})</span>
                  <span className="text-gray-700 text-xs ml-1">{collapsed[group.key] ? "▶" : "▼"}</span>
                </button>

                {!collapsed[group.key] && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {group.files.map(f => (
                      <button
                        key={f.name}
                        onClick={() => { onPick(f.url); onClose(); }}
                        className="group/img relative rounded-lg overflow-hidden border border-gray-800 hover:border-neon-green transition-all text-left"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt={f.name} className="w-full aspect-square object-contain bg-gray-900 p-1" loading="lazy" />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-neon-green/10 transition-colors" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1.5 py-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate leading-tight">{f.name.split("/").pop()}</p>
                          <p className="text-gray-400 text-xs">{fmt(f.size)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Social Credentials Diagnostics ----

function SocialCredentialsDiag({ adminLang }: { adminLang: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, { status: string; vars: Record<string, boolean> }> | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai/check-social-credentials");
      if (res.ok) setData(await res.json());
    } catch { /* skip */ }
    setLoading(false);
  };

  const ok = (s: string) => s.startsWith("OK");

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && !data) run(); }}
        className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors"
      >
        🔌 {adminLang === "en" ? "Test credentials" : "Tester les credentials"}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-96 cyber-card rounded-xl p-4 border border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white">{adminLang === "en" ? "Social API credentials" : "Credentials APIs sociales"}</span>
            <div className="flex gap-2">
              <button onClick={run} disabled={loading} className="text-xs text-blue-400 hover:underline disabled:opacity-40">{loading ? "..." : adminLang === "en" ? "Refresh" : "Actualiser"}</button>
              <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white">✕</button>
            </div>
          </div>
          {!data && !loading && <p className="text-xs text-gray-500">{adminLang === "en" ? "Click Refresh to run the check." : "Cliquez sur Actualiser pour lancer le test."}</p>}
          {loading && <p className="text-xs text-gray-500 animate-pulse">Test en cours...</p>}
          {data && (
            <div className="space-y-3">
              {(["twitter", "facebook", "instagram", "whatsapp"] as const).map(p => {
                const pl = data[p] as { status: string; vars: Record<string, boolean> } | undefined;
                if (!pl) return null;
                const isOk = ok(pl.status);
                return (
                  <div key={p} className="border-b border-gray-800 pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-mono ${isOk ? "text-green-400" : "text-red-400"}`}>{isOk ? "✓" : "✗"} {p}</span>
                      <span className="text-xs text-gray-500 truncate flex-1">{pl.status}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(pl.vars).map(([k, v]) => (
                        <span key={k} className={`text-xs px-1.5 py-0.5 rounded font-mono ${v ? "text-green-600 border border-green-900" : "text-red-500 border border-red-900"}`}>
                          {v ? "✓" : "✗"} {k.replace(/_/g, "_​")}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Communication Panel ----

function CommunicationPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { t, lang: adminLang } = useAdminT();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [brief, setBrief] = useState("");
  const [platforms, setPlatforms] = useState({ linkedin: true, twitter: true, instagram: false, facebook: true, whatsapp: false });
  const [lang, setLang] = useState<"fr" | "en" | "both">("both");
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, string> | null>(null);
  const [generatedPostIds, setGeneratedPostIds] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [linkedinPosts, setLinkedinPosts] = useState<Record<string, unknown>[]>([]);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const getTomorrow09h = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
  };
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
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [eventSettings, setEventSettings] = useState<Record<string, string>>({});

  const generateBriefFromContext = (type: string, item: Record<string, unknown> | null, data: typeof contextData): string => {
    if (!data) return "";
    switch (type) {
      case "speaker":
        if (!item) return adminLang === "en" ? "Announcement of an EOCON 2026 speaker. Select a speaker below to customize this brief with their name, expertise and talk topic." : "Annonce d'un speaker EOCON 2026. Sélectionner un speaker ci-dessous pour personnaliser ce brief avec son nom, son expertise et son sujet de talk.";
        return adminLang === "en"
          ? `Announcement of ${item.name as string}'s talk, ${item.title as string}${item.company ? ` at ${item.company}` : ""}${item.country ? ` (${item.country})` : ""}. Talk: "${item.talkTitle || "TBC"}". ${item.isKeynote ? "Keynote speaker of the event. " : ""}Build excitement and highlight their expertise for EOCON 2026.`
          : `Annonce de la conférence de ${item.name as string}, ${item.title as string}${item.company ? ` chez ${item.company}` : ""}${item.country ? ` (${item.country})` : ""}. Talk : "${item.talkTitle || "à confirmer"}". ${item.isKeynote ? "Keynote speaker de l'événement. " : ""}Créer de l'enthousiasme et mettre en avant son expertise pour EOCON 2026.`;
      case "session":
        if (!item) return adminLang === "en" ? "Highlight of an EOCON 2026 programme session. Select a session below to customize this brief with its title, speaker and date." : "Mise en avant d'une session du programme EOCON 2026. Sélectionner une session ci-dessous pour personnaliser ce brief avec son titre, son intervenant et sa date.";
        return adminLang === "en"
          ? `Highlight of the session "${item.title as string}"${item.speakerName ? ` by ${item.speakerName}` : ""}${item.date ? ` on ${item.date}` : ""}${item.time ? ` at ${item.time}` : ""}. ${item.description ? `Context: ${(item.description as string).slice(0, 150)}...` : ""}`
          : `Mise en avant de la session "${item.title as string}"${item.speakerName ? ` par ${item.speakerName}` : ""}${item.date ? ` le ${item.date}` : ""}${item.time ? ` à ${item.time}` : ""}. ${item.description ? `Contexte : ${(item.description as string).slice(0, 150)}...` : ""}`;
      case "workshop":
        if (!item) return adminLang === "en" ? "Announcement of an EOCON 2026 workshop. Select a workshop below to customize this brief with its title, instructor, level and duration." : "Annonce d'un workshop EOCON 2026. Sélectionner un workshop ci-dessous pour personnaliser ce brief avec son titre, son animateur, son niveau et sa durée.";
        return adminLang === "en"
          ? `Announcement of the workshop "${item.title as string}"${item.instructor ? ` led by ${item.instructor}` : ""}, level ${item.level as string}, duration ${item.duration as string}. ${(item.description as string).slice(0, 150)}... Invite participants to register.`
          : `Annonce du workshop "${item.title as string}"${item.instructor ? ` animé par ${item.instructor}` : ""}, niveau ${item.level as string}, durée ${item.duration as string}. ${(item.description as string).slice(0, 150)}... Inviter les participants à s'inscrire.`;
      case "sponsor":
        if (!item) return adminLang === "en" ? "Highlight of an EOCON 2026 partner. Select a sponsor below to customize this brief with their name and partnership level." : "Mise en avant d'un partenaire EOCON 2026. Sélectionner un sponsor ci-dessous pour personnaliser ce brief avec son nom et son niveau de partenariat.";
        return adminLang === "en"
          ? `Highlight and thanks to ${item.name as string}, ${item.tier as string} partner of EOCON 2026. Showcase their support and commitment to cybersecurity in Africa.`
          : `Mise en avant et remerciement de ${item.name as string}, partenaire ${item.tier as string} d'EOCON 2026. Valoriser leur soutien et leur engagement pour la cybersécurité en Afrique.`;
      case "countdown":
        return adminLang === "en"
          ? `EOCON 2026 countdown: D-${data.daysUntil}! Create urgency and excitement. ${data.daysUntil <= 7 ? "Last practical reminders (venue, programme)." : data.daysUntil <= 30 ? "Remind about the key highlights of the event." : "Present the highlights of the upcoming programme."}`
          : `Compte à rebours EOCON 2026 : J-${data.daysUntil} ! Créer l'urgence et l'excitation. ${data.daysUntil <= 7 ? "Derniers rappels pratiques (lieu, programme)." : data.daysUntil <= 30 ? "Rappeler les points clés de l'événement." : "Présenter les highlights du programme à venir."}`;
      case "cfp":
        return adminLang === "en"
          ? "Announcement related to the Call for Papers (CFP) for EOCON 2026. Specify whether this is the CFP opening, a deadline reminder, or the announcement of selection results. Encourage cybersecurity experts to submit their talk proposals."
          : "Annonce liée au Call for Papers (CFP) d'EOCON 2026. Préciser s'il s'agit de l'ouverture du CFP, d'un rappel de deadline, ou de l'annonce des résultats de sélection. Inciter les experts en cybersécurité à soumettre leur proposition de talk.";
      case "inscriptions":
        return adminLang === "en"
          ? `Registrations for EOCON 2026 are open! ${data.registrationCount > 0 ? `Already ${data.registrationCount} participants registered. ` : ""}Invite to register, highlight the available ticket types (Standard, Student, VIP, Early Bird). Remind that the event is accessible online for the African diaspora.`
          : `Les inscriptions pour EOCON 2026 sont ouvertes ! ${data.registrationCount > 0 ? `Déjà ${data.registrationCount} participants inscrits. ` : ""}Inviter à s'inscrire, mettre en avant les types de billets disponibles (Standard, Student, VIP, Early Bird). Rappeler que l'événement est accessible en ligne pour la diaspora africaine.`;
      case "ctf":
        return adminLang === "en"
          ? "Announcement of the EyesOpenCTF — the Capture The Flag of EOCON 2026. Present the cybersecurity challenge, its categories, prizes to win and the expected level of participants. Invite teams and individuals to register and compete."
          : "Annonce de l'EyesOpenCTF — le Capture The Flag d'EOCON 2026. Présenter le challenge cybersécurité, ses catégories, les lots à remporter et le niveau attendu des participants. Inviter les équipes et individus à s'inscrire et à se challenger.";
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

  const loadContext = useCallback(async () => {
    const res = await fetch("/api/admin/communication-context");
    if (res.ok) setContextData(await res.json());
  }, []);

  useEffect(() => {
    loadLinkedinPosts(); loadContext();
    fetch("/api/admin/settings").then(r => r.json()).then(setEventSettings).catch(() => {});
  }, [loadLinkedinPosts, loadContext]);

  // Calendar helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = adminLang === "en" ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] : ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

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

  const handleDayClick = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    setSelectedDay(date);
    setGeneratedPosts(null);
    setGeneratedPostIds({});
    setPanelOpen(true);
    setPostImage(null);
    // Default to tomorrow 09:00 if clicked day is today or in the past
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const clickedStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    setScheduleDate(date <= todayStart ? getTomorrow09h() : `${clickedStr}T09:00`);
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
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      const { _ids, ...postsData } = data;
      setGeneratedPosts(postsData as Record<string, string>);
      setGeneratedPostIds((_ids as Record<string, number>) || {});
    }
    setGenerating(false);
  };

  const savePosts = async (overrideDate?: string) => {
    if (!generatedPosts || !selectedDay) return;
    const effectiveDate = overrideDate !== undefined ? overrideDate : scheduleDate;
    setSaving(true);
    // PATCH each generated post's content (edited by user) and scheduling data in-place.
    // Never re-generate — that would create duplicate DB records.
    const entries: { platform: string; lang: string; content: string }[] = [];
    if (platforms.linkedin) {
      if (lang !== "en") entries.push({ platform: "linkedin", lang: "fr", content: generatedPosts.linkedin_fr || "" });
      if (lang !== "fr") entries.push({ platform: "linkedin", lang: "en", content: generatedPosts.linkedin_en || "" });
    }
    if (platforms.twitter) {
      if (lang !== "en") entries.push({ platform: "twitter", lang: "fr", content: generatedPosts.twitter_fr || "" });
      if (lang !== "fr") entries.push({ platform: "twitter", lang: "en", content: generatedPosts.twitter_en || "" });
    }
    if (platforms.facebook) {
      if (lang !== "en") entries.push({ platform: "facebook", lang: "fr", content: (generatedPosts.facebook_fr as string) || "" });
      if (lang !== "fr") entries.push({ platform: "facebook", lang: "en", content: (generatedPosts.facebook_en as string) || "" });
    }
    if (platforms.instagram) {
      if (lang !== "en") entries.push({ platform: "instagram", lang: "fr", content: generatedPosts.instagram_fr || "" });
      if (lang !== "fr") entries.push({ platform: "instagram", lang: "en", content: generatedPosts.instagram_en || "" });
    }
    if (platforms.whatsapp) {
      if (lang !== "en") entries.push({ platform: "whatsapp", lang: "fr", content: (generatedPosts.whatsapp_fr as string) || "" });
      if (lang !== "fr") entries.push({ platform: "whatsapp", lang: "en", content: (generatedPosts.whatsapp_en as string) || "" });
    }
    for (const entry of entries) {
      const postId = generatedPostIds[`${entry.platform}_${entry.lang}`];
      if (!postId) continue;
      await fetch("/api/admin/ai/social-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, content: entry.content, imageUrl: postImage || undefined, scheduledAt: effectiveDate || undefined }),
      });
    }
    await loadLinkedinPosts();
    setPanelOpen(false);
    setGeneratedPosts(null);
    setGeneratedPostIds({});
    setSaving(false);
  };

  const publishNow = async (id: number) => {
    setPublishing(id);
    setPublishError(null);
    try {
      const res = await fetch("/api/admin/ai/publish-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setPublishError(data.error ?? `Erreur ${res.status}`);
      }
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Erreur réseau");
    }
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

  const statusColors: Record<string, string> = { draft: "#888", scheduled: "#ffaa00", published: "#00ff9d", failed: "#ff0066" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black text-white">{t.communicationTitle}</h1>
        <SocialCredentialsDiag adminLang={adminLang} />
      </div>

      {/* Publish error banner */}
      {publishError && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-800 bg-red-950/30">
          <span className="text-red-400 text-xs flex-1 font-mono break-all">{publishError}</span>
          <button onClick={() => setPublishError(null)} className="text-red-600 hover:text-red-400 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ── RÉSEAUX SOCIAUX ── */}
      <>

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
            {(adminLang === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]).map(d => (
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
        {canWrite && panelOpen && selectedDay && (
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
                  { key: "countdown", icon: "⏱", label: adminLang === "en" ? "Countdown" : "Compte à rebours" },
                  { key: "cfp", icon: "📝", label: "CFP" },
                  { key: "inscriptions", icon: "🎟", label: "Inscriptions" },
                  { key: "ctf", icon: "🏆", label: "CTF" },
                  { key: "custom", icon: "✏️", label: adminLang === "en" ? "Custom" : "Personnalisé" },
                ] as const).map(ctx => (
                  <button
                    key={ctx.key}
                    onClick={() => {
                      setContextType(ctx.key);
                      setSelectedItem(null);
                      const newBrief = generateBriefFromContext(ctx.key, null, contextData);
                      setBrief(newBrief);
                      setGeneratedPosts(null);
                      setGeneratedPostIds({});
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
                    setGeneratedPostIds({});
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
                      {contextType === "speaker" ? `${item.name as string} — ${(item.talkTitle as string) || (adminLang === "en" ? "Talk TBC" : "Talk à confirmer")}` :
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
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {([
                  { id: "linkedin", label: "💼 LinkedIn" },
                  { id: "twitter", label: "𝕏 Twitter/X" },
                  { id: "facebook", label: "📘 Facebook" },
                  { id: "instagram", label: "📷 Instagram" },
                  { id: "whatsapp", label: "💬 WhatsApp" },
                ] as const).map(p => (
                  <label key={p.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={platforms[p.id]} onChange={e => setPlatforms(prev => ({ ...prev, [p.id]: e.target.checked }))} className="accent-neon-green w-3 h-3" />
                    <span className="text-xs text-gray-400">{p.label}</span>
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
                ctf: { text: "Rejoindre l'EyesOpenCTF →", urlKey: "url_ctf" },
                speaker: { text: "Voir le programme →", urlKey: "url_programme" },
                session: { text: "Voir le programme →", urlKey: "url_programme" },
                workshop: { text: "S'inscrire →", urlKey: "url_inscription" },
                countdown: { text: "S'inscrire →", urlKey: "url_inscription" },
                sponsor: { text: "Devenir partenaire →", urlKey: "url_sponsor" },
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
                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      onClick={() => setShowImagePicker(true)}
                      className="px-2 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-black/90"
                    >{adminLang === "en" ? "Change" : "Changer"}</button>
                    <button
                      onClick={() => setPostImage(null)}
                      className="w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-black/90"
                    >✕</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowImagePicker(true)}
                  className="flex items-center gap-2 w-full cursor-pointer border border-dashed border-gray-700 rounded-lg px-3 py-2 hover:border-neon-green/60 transition-colors text-left"
                >
                  <span className="text-gray-500 text-xs">🖼️</span>
                  <span className="text-gray-600 text-xs">{t.addImageLabel}</span>
                </button>
              )}
            </div>

              <button onClick={generatePosts} disabled={generating || !brief.trim()} className="btn-neon w-full py-2 rounded text-xs">
                {generating ? t.generatingPosts : t.generateWithAI}
              </button>

              {/* Generated posts preview — fully editable before save */}
              {generatedPosts && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t.postsPreviewLabel}</p>
                  {(["linkedin", "twitter", "facebook", "instagram", "whatsapp"] as const).filter(p => platforms[p]).map(platform => {
                    const platformColor: Record<string, string> = {
                      linkedin: "#0066ff", twitter: "#00ccff", facebook: "#1877f2",
                      instagram: "#cc00ff", whatsapp: "#25d366",
                    };
                    const platformLabel: Record<string, string> = {
                      linkedin: "💼 LinkedIn", twitter: "𝕏 Twitter/X", facebook: "📘 Facebook",
                      instagram: "📷 Instagram", whatsapp: "💬 WhatsApp",
                    };
                    return (
                    <div key={platform} className="border border-gray-800 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-bold" style={{ color: platformColor[platform] }}>{platformLabel[platform]}</p>
                      {(lang === "both" ? ["fr", "en"] : [lang]).map(l => (
                        <div key={l}>
                          <p className="text-gray-600 text-xs mb-1">[{l.toUpperCase()}] <span className="text-gray-700">{(generatedPosts[`${platform}_${l}`] || "").length} car.</span></p>
                          <textarea
                            value={generatedPosts[`${platform}_${l}`] || ""}
                            onChange={e => setGeneratedPosts(prev => prev ? { ...prev, [`${platform}_${l}`]: e.target.value } : prev)}
                            className="cyber-input w-full text-xs rounded p-2 resize-y text-gray-200"
                            style={{ minHeight: platform === "twitter" || platform === "whatsapp" ? "64px" : "130px" }}
                          />
                        </div>
                      ))}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>{/* end scrollable body */}

            {/* Sticky footer — always visible */}
            <div className="shrink-0 border-t border-gray-800 px-5 py-3 space-y-2">
              {/* Schedule date */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 shrink-0">📅 {adminLang === "en" ? "Publish on:" : "Publier le :"}</span>
                  <button
                    type="button"
                    onClick={() => setScheduleDate(getTomorrow09h())}
                    className="text-xs px-1.5 py-0.5 rounded ml-auto shrink-0 transition-all"
                    style={{ background: "#ffaa0015", color: "#ffaa00", border: "1px solid #ffaa0030" }}
                  >
                    {adminLang === "en" ? "Tomorrow 9am" : "Demain 09h"}
                  </button>
                  {scheduleDate && (
                    <button type="button" onClick={() => setScheduleDate("")} className="text-gray-600 hover:text-gray-400 text-xs px-1">✕</button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="cyber-input text-xs rounded px-2 py-1 w-full text-white"
                />
                {!scheduleDate && (
                  <p className="text-gray-700 text-xs">{adminLang === "en" ? "No date → publishes immediately" : "Aucune date → publication immédiate"}</p>
                )}
              </div>
              {/* Action buttons */}
              {generatedPosts ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      if (saving) return;
                      setSaving(true);
                      // Save edited content in-place (PATCH), then publish only the current-session posts.
                      // Snapshot IDs before savePosts() clears them.
                      const toPublish = Object.entries(generatedPostIds)
                        .filter(([key]) => {
                          const [plat] = key.split("_");
                          return platforms[plat as keyof typeof platforms];
                        })
                        .map(([, id]) => id);
                      // Update content in DB (no new records created)
                      const entries: { platform: string; lang: string; content: string }[] = [];
                      if (platforms.linkedin) {
                        if (lang !== "en") entries.push({ platform: "linkedin", lang: "fr", content: generatedPosts.linkedin_fr || "" });
                        if (lang !== "fr") entries.push({ platform: "linkedin", lang: "en", content: generatedPosts.linkedin_en || "" });
                      }
                      if (platforms.twitter) {
                        if (lang !== "en") entries.push({ platform: "twitter", lang: "fr", content: generatedPosts.twitter_fr || "" });
                        if (lang !== "fr") entries.push({ platform: "twitter", lang: "en", content: generatedPosts.twitter_en || "" });
                      }
                      if (platforms.facebook) {
                        if (lang !== "en") entries.push({ platform: "facebook", lang: "fr", content: (generatedPosts.facebook_fr as string) || "" });
                        if (lang !== "fr") entries.push({ platform: "facebook", lang: "en", content: (generatedPosts.facebook_en as string) || "" });
                      }
                      if (platforms.instagram) {
                        if (lang !== "en") entries.push({ platform: "instagram", lang: "fr", content: generatedPosts.instagram_fr || "" });
                        if (lang !== "fr") entries.push({ platform: "instagram", lang: "en", content: generatedPosts.instagram_en || "" });
                      }
                      if (platforms.whatsapp) {
                        if (lang !== "en") entries.push({ platform: "whatsapp", lang: "fr", content: (generatedPosts.whatsapp_fr as string) || "" });
                        if (lang !== "fr") entries.push({ platform: "whatsapp", lang: "en", content: (generatedPosts.whatsapp_en as string) || "" });
                      }
                      for (const entry of entries) {
                        const postId = generatedPostIds[`${entry.platform}_${entry.lang}`];
                        if (!postId) continue;
                        await fetch("/api/admin/ai/social-posts", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: postId, content: entry.content, imageUrl: postImage || undefined }),
                        });
                      }
                      // Publish only this generation's posts (not all drafts)
                      const batchErrors: string[] = [];
                      for (const postId of toPublish) {
                        try {
                          const res = await fetch("/api/admin/ai/publish-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: postId }) });
                          if (!res.ok) {
                            const d = await res.json() as { error?: string };
                            batchErrors.push(d.error ?? `Post ${postId}: erreur ${res.status}`);
                          }
                        } catch (e) {
                          batchErrors.push(e instanceof Error ? e.message : "Erreur réseau");
                        }
                      }
                      if (batchErrors.length > 0) setPublishError(batchErrors.join(" | "));
                      setGeneratedPosts(null);
                      setGeneratedPostIds({});
                      setSaving(false);
                      setPanelOpen(false);
                      await loadLinkedinPosts();
                    }}
                    disabled={saving}
                    className="py-2 rounded text-xs font-bold transition-all"
                    style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}
                  >
                    {saving ? "..." : t.postNowBtn}
                  </button>
                  <button
                    onClick={() => {
                      const effectiveDate = scheduleDate || getTomorrow09h();
                      if (!scheduleDate) setScheduleDate(effectiveDate);
                      savePosts(effectiveDate);
                    }}
                    disabled={saving}
                    className="py-2 rounded text-xs font-bold transition-all"
                    style={{ background: "var(--ac-bg)", color: "var(--ac)", border: "1px solid var(--ac-bdr)" }}
                  >
                    {saving ? "..." : (scheduleDate ? t.schedulePostBtn : (adminLang === "en" ? "📅 Tomorrow 9am" : "📅 Demain 09h"))}
                  </button>
                </div>
              ) : (
                <p className="text-gray-700 text-xs text-center">{t.generateFirstHint}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Library picker rendered outside cyber-card to avoid fixed-position corruption from cyber-card hover transform */}
      {showImagePicker && (
        <LibraryPickerModal onPick={url => setPostImage(url)} onClose={() => setShowImagePicker(false)} />
      )}

      {/* Day-selected posts view */}
      <div className="cyber-card rounded-xl p-5">
        {!selectedDay ? (
          <>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#0066ff" }}>{adminLang === "en" ? "Scheduled & published posts" : "Posts planifiés & publiés"}</h3>
            <p className="text-gray-600 text-xs text-center py-4">{adminLang === "en" ? "Click on a day to see scheduled posts" : "Cliquez sur un jour pour voir les posts planifiés"}</p>
          </>
        ) : (() => {
          const dateKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth()+1).padStart(2,"0")}-${String(selectedDay.getDate()).padStart(2,"0")}`;
          const dayPostsList = postsByDate[dateKey] || [];
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0066ff" }}>
                  {adminLang === "en" ? `Posts for ${selectedDay.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : `Posts du ${selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-gray-400 text-xs">{adminLang === "en" ? "✕ Close" : "✕ Fermer"}</button>
              </div>
              {dayPostsList.length === 0 && <p className="text-gray-600 text-xs text-center py-4">{adminLang === "en" ? "No posts this day. Click on the calendar to create one." : "Aucun post ce jour. Cliquez sur le calendrier pour créer."}</p>}
              <div className="space-y-3">
                {dayPostsList.map(post => {
                  const color = statusColors[post.status as string] || "#888";
                  const platformColor = post.platform === "linkedin" ? "#0066ff" : post.platform === "twitter" ? "#00ccff" : "#cc00ff";
                  return (
                    <div key={post.id as number} className="border border-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono capitalize" style={{ background: platformColor + "20", color: platformColor }}>{post.platform as string}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono uppercase" style={{ background: "var(--bdr)", color: "var(--txt-2)" }}>{post.lang as string}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono capitalize" style={{ background: color + "20", color }}>{post.status as string}</span>
                        {!!post.scheduledAt && <span className="text-xs text-gray-600">📅 {new Date(post.scheduledAt as string).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                      <textarea
                        key={post.id as number}
                        defaultValue={post.content as string}
                        onBlur={async e => {
                          if (e.target.value !== post.content) {
                            await fetch("/api/admin/ai/social-posts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id, content: e.target.value }) });
                            await loadLinkedinPosts();
                          }
                        }}
                        className="cyber-input w-full text-xs rounded p-2 h-28 resize-y text-gray-200"
                      />
                      {post.status === "failed" && !!post.errorMessage && (
                        <p className="text-xs text-red-400 font-mono break-all bg-red-900/10 rounded p-2 border border-red-900/30">{post.errorMessage as string}</p>
                      )}
                      {!!post.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.imageUrl as string} alt="" className="h-12 w-20 object-cover rounded" />
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {canWrite && <button
                          onClick={() => { handleDayClick(selectedDay.getDate()); }}
                          className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors"
                        >{adminLang === "en" ? "✏️ Edit" : "✏️ Modifier"}</button>}
                        {canWrite && post.status === "scheduled" && (
                          <button onClick={() => publishNow(post.id as number)} disabled={publishing === (post.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff30" }}>
                            {publishing === (post.id as number) ? "..." : (adminLang === "en" ? "▶️ Publish now" : "▶️ Publier maintenant")}
                          </button>
                        )}
                        {canWrite && post.status === "draft" && (
                          <>
                            <button onClick={() => publishNow(post.id as number)} disabled={publishing === (post.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff30" }}>
                              {publishing === (post.id as number) ? "..." : (adminLang === "en" ? "▶️ Publish now" : "▶️ Publier maintenant")}
                            </button>
                            <button onClick={() => { setScheduleId(post.id as number); setScheduleDate(getTomorrow09h()); }} className="text-xs px-2 py-1 rounded" style={{ background: "#ffaa0020", color: "#ffaa00", border: "1px solid #ffaa0030" }}>{adminLang === "en" ? "🕐 Schedule" : "🕐 Planifier"}</button>
                          </>
                        )}
                        {post.status === "published" && !!post.linkedinPostId && (
                          <a
                            href={post.platform === "twitter"
                              ? `https://x.com/i/web/status/${post.linkedinPostId as string}`
                              : `https://www.linkedin.com/feed/update/${post.linkedinPostId as string}/`}
                            target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded" style={{ color: "var(--ac)" }}
                          >↗ Voir</a>
                        )}
                        {canWrite && post.status === "failed" && (
                          <button onClick={() => publishNow(post.id as number)} disabled={publishing === (post.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#ff006615", color: "#ff6666", border: "1px solid #ff006630" }}>
                            {publishing === (post.id as number) ? "..." : (adminLang === "en" ? "🔄 Retry" : "🔄 Réessayer")}
                          </button>
                        )}
                        {canWrite && <button
                          onClick={async () => {
                            await fetch("/api/admin/ai/social-posts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id }) });
                            await loadLinkedinPosts();
                          }}
                          className="text-xs px-2 py-1 rounded border border-red-800/50 text-red-500 hover:bg-red-900/20 transition-colors"
                        >{adminLang === "en" ? "🗑️ Delete" : "🗑️ Supprimer"}</button>}
                        {canWrite && scheduleId === (post.id as number) && (
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

      </>
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
  const { lang } = useAdminT();
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
      <h3 className="text-neon-green text-sm mb-4">{editing ? (lang === "en" ? "Edit Sponsor" : "Modifier le Sponsor") : (lang === "en" ? "New Sponsor" : "Nouveau Sponsor")}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { key: "name", label: lang === "en" ? "Sponsor Name *" : "Nom du Sponsor *" },
          { key: "website", label: lang === "en" ? "Website" : "Site Web" },
          { key: "email", label: "Email" },
          { key: "phone", label: lang === "en" ? "Phone" : "Téléphone" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Logo</label>
          <div className="flex items-center gap-2 flex-wrap">
            {!!form.logoUrl && <img src={form.logoUrl as string} alt="logo" className="w-10 h-10 object-contain rounded bg-white/5 p-1 border border-gray-700" />}
            <input className="cyber-input flex-1 px-3 py-2 rounded text-xs min-w-0" placeholder={lang === "en" ? "Logo URL" : "URL du logo"} value={(form.logoUrl as string) || ""} onChange={e => setForm({ ...form, logoUrl: e.target.value })} />
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
          <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Order" : "Ordre"}</label>
          <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
          {lang === "en" ? "Visible on site" : "Visible sur le site"}
        </label>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onSave} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">{lang === "en" ? "Save" : "Sauvegarder"}</button>
        <button onClick={onCancel} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Cancel" : "Annuler"}</button>
      </div>
    </div>
  );
}

function SponsorPipelinePanel({ prospects, onRefresh, canWrite = true }: { prospects: Record<string, unknown>[]; onRefresh: () => void; canWrite?: boolean }) {
  const { t, lang } = useAdminT();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ status: "prospect" });
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [aiEmail, setAiEmail] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(null);
  const [aiEmailTarget, setAiEmailTarget] = useState<{ org: string; id: number; email: string | null } | null>(null);
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);
  const [attachDecks, setAttachDecks] = useState(true);
  const [sendingLang, setSendingLang] = useState<string | null>(null);
  const [sentMsg, setSentMsg] = useState("");
  const [editingDetail, setEditingDetail] = useState(false);
  const [detailForm, setDetailForm] = useState<Record<string, unknown>>({});
  const [savingDetail, setSavingDetail] = useState(false);
  const [findEmailBusy, setFindEmailBusy] = useState(false);
  const [findEmailResults, setFindEmailResults] = useState<Array<{ email: string; name?: string; title?: string; source: string; confidence?: number }>>([]);
  const [findEmailDone, setFindEmailDone] = useState(false);
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/sponsor-packages").then(r => r.json()).then(setPackages).catch(() => {});
    fetch("/api/admin/sponsor-prospects/assignees").then(r => r.ok ? r.json() : []).then(setAssignees).catch(() => {});
  }, []);

  const generateFollowupEmail = async (p: Record<string, unknown>) => {
    setAiEmailTarget({ org: p.org as string, id: p.id as number, email: (p.email as string) || null });
    setSentMsg("");
    // Re-display the cached email instead of regenerating it.
    if (p.emailJson) {
      try { setAiEmail(JSON.parse(p.emailJson as string)); return; } catch { /* regenerate */ }
    }
    setAiEmail(null);
    setGeneratingFor(p.id as number);
    const res = await fetch("/api/admin/ai/sponsor-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org: p.org, contact: p.contact, package: p.package, status: p.status, notes: p.notes, mode: "followup" }),
    });
    if (res.ok) {
      const result = await res.json();
      setAiEmail(result);
      await fetch(`/api/admin/sponsor-prospects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailJson: JSON.stringify(result) }),
      }).catch(() => {});
      onRefresh();
    }
    setGeneratingFor(null);
  };

  const sendProspectEmail = async (subject: string, body: string, langLabel: string) => {
    if (!aiEmailTarget) return;
    setSendingLang(langLabel);
    setSentMsg("");
    const res = await fetch("/api/admin/sponsor-prospects/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: aiEmailTarget.id, subject, body, attachDecks, markContacted: true }),
    });
    if (res.ok) {
      const d = await res.json();
      setSentMsg(lang === "en" ? `Email sent ✓${d.attached ? ` (${d.attached} attachment(s))` : ""}` : `Email envoyé ✓${d.attached ? ` (${d.attached} pièce(s) jointe(s))` : ""}`);
      onRefresh();
    } else {
      const e = await res.json().catch(() => ({} as { error?: string }));
      setSentMsg(e.error || (lang === "en" ? "Send failed" : "Échec de l'envoi"));
    }
    setSendingLang(null);
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
    if (!form.org) { alert(lang === "en" ? "Organization name is required." : "Le nom de l'organisation est requis."); return; }
    if (!form.assigneeId) { alert(lang === "en" ? "Please assign this prospect to a team member." : "Veuillez assigner ce prospect à un membre de l'équipe."); return; }
    await fetch("/api/admin/sponsor-prospects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ status: "prospect" }); onRefresh();
  };

  const openDetailEdit = (p: Record<string, unknown>) => {
    setDetailForm({ org: p.org, contact: p.contact || "", email: p.email || "", phone: p.phone || "", website: p.website || "", package: p.package || "", notes: p.notes || "", assigneeId: p.assigneeId ?? null });
    setEditingDetail(true);
  };

  const saveDetail = async () => {
    if (!detail) return;
    setSavingDetail(true);
    await fetch(`/api/admin/sponsor-prospects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(detailForm),
    });
    setSavingDetail(false);
    setEditingDetail(false);
    setDetail(null);
    onRefresh();
  };

  const findEmail = async () => {
    if (!detail?.website) return;
    setFindEmailBusy(true);
    setFindEmailResults([]);
    setFindEmailDone(false);
    const res = await fetch("/api/admin/ai/find-prospect-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ website: detail.website }),
    });
    const data = await res.json() as { emails?: typeof findEmailResults };
    setFindEmailResults(data.emails || []);
    setFindEmailBusy(false);
    setFindEmailDone(true);
  };

  const pickEmail = async (email: string) => {
    if (!detail) return;
    await fetch(`/api/admin/sponsor-prospects/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setDetail(d => d ? { ...d, email } : d);
    setFindEmailResults([]);
    onRefresh();
  };

  const savePerkChecklist = async (id: number, checklist: Record<string, { done: boolean; note: string }>) => {
    await fetch(`/api/admin/sponsor-prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perkChecklist: JSON.stringify(checklist) }),
    });
    onRefresh();
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
            content: `🎉 [EOCON 2026 · Sponsor ${sponsor.package || sponsor.tier || "BRONZE"}] Nous sommes ravis d'accueillir ${sponsor.org || sponsor.name} comme partenaire ${sponsor.package || sponsor.tier || "BRONZE"} d'EOCON 2026 ! 🙏\n\nMerci pour votre soutien à la communauté cybersécurité africaine.\n\n📅 28 Novembre 2026 · Hotel Onomo, Douala\n\n#EOCON2026 #Cybersecurity #Cameroun`,
            scheduledAt: null,
            status: "draft",
          }),
        }).catch(() => {});
      }
    }
    onRefresh();
  };

  const del = async (id: number) => {
    if (!(await confirm({ message: lang === "en" ? "Delete this prospect?" : "Supprimer ce prospect ?", danger: true, confirmLabel: lang === "en" ? "Delete" : "Supprimer" }))) return;
    await fetch(`/api/admin/sponsor-prospects/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">{t.pipelineTitle}</h1>
        {canWrite && <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">{t.addProspect}</button>}
      </div>

      {/* AI Email Modal */}
      {aiEmail && aiEmailTarget && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="cyber-card rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-start p-6 pb-4 border-b border-gray-800 shrink-0">
              <div>
                <h3 className="text-white font-bold">Email — {aiEmailTarget.org}</h3>
                <p className="text-gray-500 text-xs">{aiEmailTarget.email || (lang === "en" ? "no email on file" : "aucun email enregistré")}</p>
              </div>
              <button onClick={() => { setAiEmail(null); setAiEmailTarget(null); setSentMsg(""); }} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 overflow-y-auto">
            {/* Attachment toggle */}
            <label className="flex items-center gap-2 mb-4 text-xs text-gray-300 cursor-pointer">
              <input type="checkbox" checked={attachDecks} onChange={e => setAttachDecks(e.target.checked)} />
              {lang === "en"
                ? "Attach the sponsorship deck (FR + EN, .pdf)"
                : "Joindre le dossier de sponsoring (FR + EN, .pdf)"}
            </label>
            <div className="space-y-4">
              {[
                { lang: "FR", subject: aiEmail.subjectFr, body: aiEmail.bodyFr },
                { lang: "EN", subject: aiEmail.subjectEn, body: aiEmail.bodyEn },
              ].map(e => (
                <div key={e.lang} className="border border-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-400">{e.lang}</span>
                    <button onClick={() => navigator.clipboard.writeText(`${e.subject}\n\n${e.body}`)} className="text-xs hover:underline" style={{ color: "var(--ac)" }}>{lang === "en" ? "Copy" : "Copier"}</button>
                  </div>
                  <p className="text-white text-xs font-bold mb-2">{lang === "en" ? "Subject:" : "Objet:"} {e.subject}</p>
                  <p className="text-gray-400 text-xs whitespace-pre-wrap">{e.body}</p>
                  {canWrite && <button
                    onClick={() => sendProspectEmail(e.subject, e.body, e.lang)}
                    disabled={!aiEmailTarget.email || sendingLang !== null}
                    title={!aiEmailTarget.email ? (lang === "en" ? "No email address for this prospect" : "Ce prospect n'a pas d'email") : undefined}
                    className="mt-3 w-full text-xs px-3 py-2 rounded border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "var(--ac-bg)", color: "var(--ac)", borderColor: "var(--ac-bdr)" }}
                  >
                    {sendingLang === e.lang ? "…" : (lang === "en" ? `Send this email (${e.lang})` : `Envoyer ce courriel (${e.lang})`)}
                  </button>}
                </div>
              ))}
            </div>
            {sentMsg && <p className="text-xs text-center mt-3" style={{ color: "var(--ac)" }}>{sentMsg}</p>}
            <div className="mt-4 pt-4 border-t border-gray-800">
              {canWrite && <button
                onClick={() => markContacted(aiEmailTarget.id)}
                className="w-full text-xs px-4 py-2 rounded border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all"
              >
                {t.markContacted}
              </button>}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Prospect detail / edit modal */}
      {detail && (() => {
        const statusColor = PROSPECT_STATUSES.find(s => s.value === detail.status)?.color || "#888";
        const pkgPerks = (() => {
          const pkg = packages.find(p => String(p.tier).toUpperCase() === String(detail.package).toUpperCase());
          if (!pkg) return [] as string[];
          try { return JSON.parse((pkg.perksFr as string) || "[]") as string[]; } catch { return [] as string[]; }
        })();
        const checklist: Record<string, { done: boolean; note: string }> = (() => {
          try { return JSON.parse((detail.perkChecklist as string) || "{}"); } catch { return {}; }
        })();

        return (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => { setDetail(null); setEditingDetail(false); setFindEmailResults([]); setFindEmailDone(false); }}>
            <div className="cyber-card rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start p-5 pb-4 border-b border-gray-800 shrink-0">
                <div>
                  <h3 className="text-white font-bold">{detail.org as string}</h3>
                  <span className="text-xs px-2 py-0.5 rounded inline-block mt-1" style={{ background: statusColor + "20", color: statusColor }}>
                    {(() => { const s = PROSPECT_STATUSES.find(x => x.value === detail.status); return s ? (lang === "en" ? s.en : s.fr) : (detail.status as string); })()}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  {canWrite && !editingDetail && (
                    <button onClick={() => openDetailEdit(detail)} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white">
                      ✏️ {lang === "en" ? "Edit" : "Modifier"}
                    </button>
                  )}
                  <button onClick={() => { setDetail(null); setEditingDetail(false); setFindEmailResults([]); setFindEmailDone(false); }} className="text-gray-500 hover:text-white">✕</button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {editingDetail ? (
                  /* ── Edit form ── */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { key: "org", label: lang === "en" ? "Organization" : "Organisation" },
                        { key: "contact", label: t.contact },
                        { key: "email", label: t.email },
                        { key: "phone", label: t.phone },
                        { key: "website", label: "Website" },
                      ] as { key: string; label: string }[]).map(f => (
                        <div key={f.key}>
                          <label className="text-gray-500 block mb-1">{f.label}</label>
                          <input
                            value={(detailForm[f.key] as string) || ""}
                            onChange={e => setDetailForm(p => ({ ...p, [f.key]: e.target.value }))}
                            className="cyber-input w-full px-3 py-1.5 rounded text-xs"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-gray-500 block mb-1">{t.package}</label>
                        <select
                          value={(detailForm.package as string) || ""}
                          onChange={e => setDetailForm(p => ({ ...p, package: e.target.value }))}
                          className="cyber-input w-full px-3 py-1.5 rounded text-xs"
                        >
                          <option value="">{lang === "en" ? "— Select —" : "— Choisir —"}</option>
                          {["PLATINUM", "GOLD", "SILVER", "BRONZE", "PARTNER"].map(tier => (
                            <option key={tier} value={tier}>{tier}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">{lang === "en" ? "Assigned to" : "Assigné à"}</label>
                      <select
                        value={(detailForm.assigneeId as number | null) ?? ""}
                        onChange={e => setDetailForm(p => ({ ...p, assigneeId: e.target.value ? parseInt(e.target.value) : null }))}
                        className="cyber-input w-full px-3 py-1.5 rounded text-xs"
                      >
                        <option value="">{lang === "en" ? "— Unassigned —" : "— Non assigné —"}</option>
                        {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">{t.notes}</label>
                      <textarea
                        rows={3}
                        value={(detailForm.notes as string) || ""}
                        onChange={e => setDetailForm(p => ({ ...p, notes: e.target.value }))}
                        className="cyber-input w-full px-3 py-2 rounded text-xs resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-800">
                      <button onClick={saveDetail} disabled={savingDetail} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">
                        {savingDetail ? "…" : (lang === "en" ? "Save" : "Enregistrer")}
                      </button>
                      <button onClick={() => setEditingDetail(false)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">
                        {lang === "en" ? "Cancel" : "Annuler"}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read-only view ── */
                  <>
                    {([
                      { label: t.contact, val: detail.contact as string },
                      { label: t.email, val: detail.email as string, href: detail.email ? `mailto:${detail.email}` : undefined },
                      { label: t.phone, val: detail.phone as string, href: detail.phone ? `tel:${detail.phone}` : undefined },
                      { label: lang === "en" ? "Website" : "Site web", val: detail.website as string, href: detail.website ? (String(detail.website).startsWith("http") ? String(detail.website) : `https://${detail.website}`) : undefined },
                      { label: t.package, val: detail.package as string },
                      { label: lang === "en" ? "Assigned to" : "Assigné à", val: detail.assigneeId ? (assignees.find(a => a.id === detail.assigneeId)?.name ?? `#${detail.assigneeId}`) : "" },
                    ]).map(f => (
                      <div key={f.label} className="flex gap-3">
                        <span className="text-gray-600 shrink-0 w-28">{f.label}</span>
                        {f.val
                          ? (f.href
                              ? <a href={f.href} target="_blank" rel="noreferrer" className="text-neon-green hover:underline break-all">{f.val}</a>
                              : <span className="text-gray-200 break-words">{f.val}</span>)
                          : <span className="text-gray-700">—</span>}
                      </div>
                    ))}
                    {/* ── Find email from website ── */}
                    {!detail.email && detail.website && !editingDetail && (
                      <div className="flex gap-3 items-start">
                        <span className="text-gray-600 shrink-0 w-28">{t.email}</span>
                        <div className="flex flex-col gap-2 flex-1">
                          {canWrite && (
                            <button
                              onClick={findEmail}
                              disabled={findEmailBusy}
                              className="self-start text-xs px-3 py-1.5 rounded font-mono disabled:opacity-50 transition-colors"
                              style={{ background: "#00ccff15", color: "#00ccff", border: "1px solid #00ccff30" }}
                            >
                              {findEmailBusy ? "🔍 Recherche…" : (lang === "en" ? "🔍 Find email from website" : "🔍 Trouver l'email depuis le site")}
                            </button>
                          )}
                          {findEmailResults.length > 0 && (
                            <div className="space-y-1">
                              {findEmailResults.map(r => (
                                <button
                                  key={r.email}
                                  onClick={() => canWrite && pickEmail(r.email)}
                                  disabled={!canWrite}
                                  className="flex items-center gap-2 w-full text-left text-xs px-3 py-2 rounded transition-colors hover:border-neon-green/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ background: "#00ff9d08", border: "1px solid #00ff9d20" }}
                                >
                                  <span className="text-neon-green font-mono">{r.email}</span>
                                  {r.name && <span className="text-gray-500">· {r.name}</span>}
                                  {r.title && <span className="text-gray-600">· {r.title}</span>}
                                  {r.confidence !== undefined && <span className="ml-auto text-gray-700">{r.confidence}%</span>}
                                  {r.source === "hunter" && <span className="text-cyan-700 text-xs">Hunter</span>}
                                  {r.source === "scrape" && <span className="text-gray-700 text-xs">web</span>}
                                </button>
                              ))}
                              <p className="text-xs text-gray-700">{lang === "en" ? "Click to save to this prospect." : "Cliquez pour enregistrer sur ce prospect."}</p>
                            </div>
                          )}
                          {findEmailDone && !findEmailBusy && findEmailResults.length === 0 && (
                            <p className="text-xs text-gray-700">{lang === "en" ? "No email found on this website." : "Aucun email trouvé sur ce site."}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <span className="text-gray-600 shrink-0 w-28">{t.notes}</span>
                      <span className="text-gray-300 whitespace-pre-wrap break-words">{(detail.notes as string) || "—"}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600 border-t border-gray-800 pt-3">
                      <span>{lang === "en" ? "Created" : "Créé"}: {detail.createdAt ? new Date(detail.createdAt as string).toLocaleString("fr-FR") : "—"}</span>
                      <span>·</span>
                      <span>{lang === "en" ? "Updated" : "MAJ"}: {detail.updatedAt ? new Date(detail.updatedAt as string).toLocaleString("fr-FR") : "—"}</span>
                    </div>
                    {!!detail.emailJson && (
                      <p className="text-neon-green/60 text-xs">{lang === "en" ? "✓ A follow-up email has been generated." : "✓ Un courriel de relance a été généré."}</p>
                    )}
                  </>
                )}

                {/* ── Perks checklist (only for concluded) ── */}
                {detail.status === "concluded" && pkgPerks.length > 0 && !editingDetail && (
                  <div className="border-t border-gray-800 pt-4">
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#ffaa00" }}>
                      {lang === "en" ? "Deliverables checklist" : "Checklist des livrables"} · {detail.package as string}
                    </p>
                    <div className="space-y-3">
                      {pkgPerks.map((perk, i) => {
                        const item = checklist[perk] || { done: false, note: "" };
                        return (
                          <div key={i} className="rounded-lg p-3" style={{ background: item.done ? "#00ff9d08" : "#0a0a0a", border: `1px solid ${item.done ? "#00ff9d20" : "#1a1a2e"}` }}>
                            <label className={`flex items-start gap-2 ${canWrite ? "cursor-pointer" : "cursor-default"}`}>
                              <input
                                type="checkbox"
                                checked={item.done}
                                disabled={!canWrite}
                                onChange={e => {
                                  if (!canWrite) return;
                                  const next = { ...checklist, [perk]: { ...item, done: e.target.checked } };
                                  savePerkChecklist(detail.id as number, next);
                                  setDetail(d => d ? { ...d, perkChecklist: JSON.stringify(next) } : d);
                                }}
                                className="mt-0.5 shrink-0"
                              />
                              <span className={`text-xs ${item.done ? "line-through text-gray-600" : "text-gray-300"}`}>{perk}</span>
                            </label>
                            <textarea
                              rows={1}
                              placeholder={lang === "en" ? "Notes…" : "Notes…"}
                              value={item.note}
                              readOnly={!canWrite}
                              onChange={e => {
                                if (!canWrite) return;
                                const next = { ...checklist, [perk]: { ...item, note: e.target.value } };
                                setDetail(d => d ? { ...d, perkChecklist: JSON.stringify(next) } : d);
                              }}
                              onBlur={e => {
                                if (!canWrite) return;
                                const next = { ...checklist, [perk]: { ...item, note: e.target.value } };
                                savePerkChecklist(detail.id as number, next);
                              }}
                              className="cyber-input w-full mt-2 px-2 py-1 rounded text-xs resize-none read-only:opacity-60"
                              style={{ minHeight: 28 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-700 mt-2">
                      {Object.values(checklist).filter(v => v.done).length}/{pkgPerks.length} {lang === "en" ? "delivered" : "livrés"}
                    </p>
                  </div>
                )}

                {/* ── Action buttons ── */}
                {canWrite && !editingDetail && (
                  <div className="border-t border-gray-800 pt-4 flex gap-2">
                    <button onClick={() => { generateFollowupEmail(detail); setDetail(null); }} className="flex-1 text-xs px-3 py-2 rounded font-bold" style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}>
                      {detail.emailJson ? (lang === "en" ? "✨ View / send email" : "✨ Voir / envoyer le courriel") : (lang === "en" ? "✨ Generate email (AI)" : "✨ Générer un courriel (IA)")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add form */}
      {canWrite && showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: "org", label: t.org + " *" },
              { key: "contact", label: t.contact },
              { key: "email", label: t.email },
              { key: "phone", label: t.phone },
              { key: "website", label: lang === "en" ? "Website" : "Site web" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.package}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.package as string) || ""} onChange={e => setForm(p => ({ ...p, package: e.target.value }))}>
                <option value="">{lang === "en" ? "— Select —" : "— Choisir —"}</option>
                {["PLATINUM", "GOLD", "SILVER", "BRONZE", "PARTNER"].map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.status}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.status as string) || "prospect"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {PROSPECT_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "en" ? s.en : s.fr}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1">
                <span className="text-red-400 mr-1">*</span>
                <span className={form.assigneeId ? "text-gray-500" : "text-red-400/80"}>{lang === "en" ? "Assigned to" : "Assigné à"}</span>
              </label>
              <select
                className={`cyber-input w-full px-3 py-2 rounded text-xs ${!form.assigneeId ? "border-red-500/40" : ""}`}
                value={(form.assigneeId as number | "") || ""}
                onChange={e => setForm(p => ({ ...p, assigneeId: e.target.value ? parseInt(e.target.value) : null }))}
              >
                <option value="">{lang === "en" ? "— Required —" : "— Obligatoire —"}</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-gray-500 block mb-1">{t.notes}</label>
              <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.notes as string) || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={save} disabled={!form.org || !form.assigneeId} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-40 disabled:cursor-not-allowed">{t.save}</button>
            <button onClick={() => { setShowForm(false); setForm({ status: "prospect" }); }} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">{t.cancel}</button>
            {!form.assigneeId && <span className="text-xs text-red-400/70">{lang === "en" ? "Assignment required" : "Assignation obligatoire"}</span>}
          </div>
        </div>
      )}

      {/* Pipeline counter */}
      {(() => {
        const PIPELINE_TARGET = 300;
        const total = prospects.length;
        const pct = Math.min(100, Math.round((total / PIPELINE_TARGET) * 100));
        const activeCount = prospects.filter(p => !["abandoned", "negative"].includes(p.status as string)).length;
        const color = pct >= 100 ? "#00ff9d" : pct >= 60 ? "#ffaa00" : "#ff0066";
        return (
          <div className="cyber-card rounded-lg p-4 mb-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white font-bold text-lg">{total}</span>
                <span className="text-gray-500 text-xs">/ {PIPELINE_TARGET} {lang === "en" ? "prospects (target)" : "prospects (objectif)"}</span>
                <span className="ml-auto text-xs font-mono font-bold" style={{ color }}>{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {activeCount} {lang === "en" ? "active (excl. abandoned & negative)" : "actifs (hors abandons & négatifs)"}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Team performance leaderboard ────────────────────────────────── */}
      {(() => {
        const NON_NEGOCIE = new Set(["prospect", "concluded", "paused", "abandoned"]);
        const stats = assignees
          .map(a => {
            const mine = prospects.filter(p => p.assigneeId === a.id);
            return {
              ...a,
              total: mine.length,
              negocie: mine.filter(p => !NON_NEGOCIE.has(p.status as string)).length,
              conclu: mine.filter(p => p.status === "concluded").length,
            };
          })
          .filter(a => a.total > 0)
          .sort((a, b) => b.conclu - a.conclu || b.negocie - a.negocie || b.total - a.total);

        if (stats.length === 0) return null;

        const RANK_ICONS = ["🥇", "🥈", "🥉"];
        return (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 font-mono">
              {lang === "en" ? "⚡ Team Performance" : "⚡ Performance équipe"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.map((m, i) => {
                const convRate = m.total > 0 ? Math.round((m.conclu / m.total) * 100) : 0;
                const isTop = i === 0 && m.conclu > 0;
                const initials = m.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const accentColors = ["#00ff9d", "#cc00ff", "#ffaa00", "#0066ff", "#ff0066", "#00ccff"];
                const color = accentColors[i % accentColors.length];
                return (
                  <div
                    key={m.id}
                    className="rounded-xl p-4 flex gap-3 items-start transition-all"
                    style={{ background: isTop ? `${color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${isTop ? color + "40" : "#222"}` }}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 relative" style={{ background: color + "20", color, border: `2px solid ${color}40` }}>
                      {initials}
                      {RANK_ICONS[i] && <span className="absolute -top-2 -right-2 text-sm">{RANK_ICONS[i]}</span>}
                    </div>
                    {/* Stats */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{m.name}</p>
                      <div className="flex gap-3 mt-1.5 text-xs font-mono">
                        <span className="text-gray-500">{m.total} {lang === "en" ? "assigned" : "assignés"}</span>
                        <span style={{ color: "#ffaa00" }}>{m.negocie} {lang === "en" ? "in negot." : "en négo"}</span>
                        <span style={{ color: "#00ff9d" }} className="font-bold">{m.conclu} {lang === "en" ? "closed" : "conclus"}</span>
                      </div>
                      {/* Conversion bar */}
                      <div className="mt-2 h-1 rounded-full bg-gray-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${convRate}%`, background: color }} />
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5 font-mono">{convRate}% {lang === "en" ? "close rate" : "taux de closing"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
                      className="cyber-card rounded-lg p-3 text-xs cursor-pointer hover:border-neon-green/30 transition-colors"
                      style={{ borderLeft: `3px solid ${st.color}40` }}
                      onClick={() => setDetail(p)}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-white font-bold text-sm truncate flex-1">{p.org as string}</p>
                        {!!(p.assigneeId) && (() => {
                          const a = assignees.find(x => x.id === (p.assigneeId as number));
                          if (!a) return null;
                          const initials = a.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                          return (
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d40" }} title={a.name}>
                              {initials}
                            </span>
                          );
                        })()}
                      </div>
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
                      <div className="mt-2 space-y-1.5" onClick={e => e.stopPropagation()}>
                        {canWrite && <button
                          onClick={() => generateFollowupEmail(p)}
                          disabled={generatingFor === (p.id as number)}
                          className="w-full text-xs px-2 py-1 rounded transition-all disabled:opacity-50 font-bold"
                          style={{ background: "#cc00ff20", color: "#cc00ff", border: "1px solid #cc00ff40" }}
                        >
                          {generatingFor === (p.id as number)
                            ? "…"
                            : (p.emailJson
                                ? (lang === "en" ? "✨ View / send email" : "✨ Voir / envoyer le courriel")
                                : (lang === "en" ? "✨ Generate email (AI)" : "✨ Générer un courriel (IA)"))}
                        </button>}
                        {canWrite && <div className="flex items-center gap-1">
                          <select
                            className="cyber-input text-xs px-1 py-0.5 rounded flex-1 min-w-0"
                            value={p.status as string}
                            onChange={e => updateStatus(p.id as number, e.target.value)}
                          >
                            {PROSPECT_STATUSES.map(s => <option key={s.value} value={s.value}>{lang === "en" ? s.en : s.fr}</option>)}
                          </select>
                        </div>}
                      </div>
                    </div>
                  ))}
                  {group.length === 0 && (
                    <div className="border border-dashed border-gray-800 rounded-lg h-16 flex items-center justify-center">
                      <span className="text-gray-800 text-xs">{lang === "en" ? "empty" : "vide"}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!prospects.length && <p className="text-gray-600 text-xs py-4 text-center">{lang === "en" ? "No prospects yet" : "Aucun prospect pour l'instant"}</p>}
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

function BudgetPanel({ items, onRefresh, canWrite = true }: { items: Record<string, unknown>[]; onRefresh: () => void; canWrite?: boolean }) {
  const { t, lang } = useAdminT();
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
    if (!(await confirm({ message: lang === "en" ? "Delete?" : "Supprimer ?", danger: true, confirmLabel: lang === "en" ? "Delete" : "Supprimer" }))) return;
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
                  disabled={!canWrite}
                  onBlur={e => canWrite && update(r.id as number, { planned: parseFloat(e.target.value) || 0 })} />
              </td>
              <td className="py-2 px-2 text-right">
                <input type="number" className="cyber-input w-24 px-2 py-1 rounded text-xs text-right"
                  defaultValue={(r.actual as number) || 0}
                  disabled={!canWrite}
                  onBlur={e => canWrite && update(r.id as number, { actual: parseFloat(e.target.value) || 0 })} />
              </td>
              <td className="py-2 px-2">
                <select className="cyber-input text-xs px-2 py-1 rounded" value={r.status as string}
                  disabled={!canWrite}
                  onChange={e => canWrite && update(r.id as number, { status: e.target.value })}>
                  <option value="pending">{t.statusPending}</option>
                  <option value="paid">{t.statusPaid}</option>
                  <option value="cancelled">{t.statusCancelled}</option>
                </select>
              </td>
              <td className="py-2 px-2">
                {canWrite && <button onClick={() => del(r.id as number)} className="text-red-400 text-xs hover:text-red-300">✗</button>}
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
        {canWrite && <div className="flex gap-2">
          <button onClick={seedCosts} className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">{t.prefillCosts}</button>
          <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">{t.addLine}</button>
        </div>}
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
          <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--ac)" }}>
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

      {canWrite && showForm && (
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
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Label" : "Libellé"}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.label as string) || ""} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Planned amount (FCFA)" : "Montant prévu (FCFA)"}</label>
              <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.planned as number) || 0} onChange={e => setForm(p => ({ ...p, planned: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Add" : "Ajouter"}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">{lang === "en" ? "Cancel" : "Annuler"}</button>
          </div>
        </div>
      )}

      {!items.length && (
        <div className="text-center py-8">
          <p className="text-gray-600 text-xs mb-3">{lang === "en" ? "No items. Initialize with the standard EOCON budget." : "Aucun élément. Initialisez avec le budget standard EOCON."}</p>
          {canWrite && <button
            onClick={async () => {
              const res = await fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "budget" }) });
              if (res.ok) onRefresh();
            }}
            className="btn-neon px-4 py-2 rounded text-xs"
          >
            {lang === "en" ? "🌱 Initialize EOCON budget" : "🌱 Initialiser budget EOCON"}
          </button>}
        </div>
      )}
      {renderTable(manualRevenues, lang === "en" ? "Additional revenues (manual)" : "Revenus additionnels (manuels)", "#00ff9d")}
      {renderTable(costs, lang === "en" ? "Expenses" : "Dépenses", "#ff4444")}
    </div>
  );
}

// ---- Logistics Panel ----
const STATUS_COLS = [
  { id: "todo",        label: "TODO",      labelEn: "TODO",        color: "#888",    bg: "#88888815" },
  { id: "in_progress", label: "EN COURS",  labelEn: "IN PROGRESS", color: "#0066ff", bg: "#0066ff15" },
  { id: "blocked",     label: "BLOQUÉ",    labelEn: "BLOCKED",     color: "#ff0066", bg: "#ff006615" },
  { id: "done",        label: "TERMINÉ",   labelEn: "DONE",        color: "#00ff9d", bg: "#00ff9d15" },
];
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ff0066", high: "#ff6600", medium: "#ffaa00", low: "#888"
};
const PHASES = ["J-90", "J-30", "J-7", "Jour J", "Post-event"] as const;
type Phase = typeof PHASES[number];

const LOGISTICS_PHASES_SEED: { phase: Phase; category: string; title: string; priority: string }[] = [
  // J-90
  { phase: "J-90", category: "Venue & Contrats", title: "Signer contrat venue", priority: "critical" },
  { phase: "J-90", category: "Venue & Contrats", title: "Valider le plan de salle", priority: "high" },
  { phase: "J-90", category: "Venue & Contrats", title: "Négocier hébergement préférentiel speakers", priority: "medium" },
  { phase: "J-90", category: "Budget", title: "Valider budget prévisionnel", priority: "critical" },
  { phase: "J-90", category: "Budget", title: "Ouvrir compte bancaire événement", priority: "high" },
  { phase: "J-90", category: "Sponsors", title: "Lancer dossier sponsoring", priority: "high" },
  { phase: "J-90", category: "Sponsors", title: "Relance sponsors prioritaires", priority: "high" },
  // J-30
  { phase: "J-30", category: "Production", title: "Commander gadgets & impressions", priority: "high" },
  { phase: "J-30", category: "Production", title: "Valider maquettes visuels", priority: "high" },
  { phase: "J-30", category: "Production", title: "Préparer roll-ups et kakémonos", priority: "medium" },
  { phase: "J-30", category: "Technique", title: "Test connexion internet salle", priority: "critical" },
  { phase: "J-30", category: "Technique", title: "Commander équipement son & vidéo", priority: "high" },
  { phase: "J-30", category: "Technique", title: "Tester retransmission live", priority: "high" },
  { phase: "J-30", category: "Caméras", title: "Réserver équipe vidéo/photo", priority: "high" },
  { phase: "J-30", category: "Caméras", title: "Plan de couverture caméras", priority: "medium" },
  { phase: "J-30", category: "Speakers", title: "Envoyer kit logistique speakers", priority: "high" },
  { phase: "J-30", category: "Speakers", title: "Confirmer besoins techniques speakers", priority: "high" },
  { phase: "J-30", category: "Speakers", title: "Réserver transferts aéroport", priority: "medium" },
  { phase: "J-30", category: "Communication", title: "Publier programme définitif", priority: "high" },
  { phase: "J-30", category: "Communication", title: "Campagne réseaux sociaux J-30", priority: "medium" },
  { phase: "J-30", category: "Communication", title: "Envoyer emailings inscrits", priority: "medium" },
  // J-7
  { phase: "J-7", category: "Logistique salle", title: "Validation plan salle final", priority: "critical" },
  { phase: "J-7", category: "Logistique salle", title: "Installation signalétique", priority: "high" },
  { phase: "J-7", category: "Logistique salle", title: "Préparer badges & kits accueil", priority: "high" },
  { phase: "J-7", category: "Logistique salle", title: "Test scanner QR check-in", priority: "critical" },
  { phase: "J-7", category: "Bénévoles", title: "Briefing équipe bénévoles", priority: "critical" },
  { phase: "J-7", category: "Bénévoles", title: "Attribution des rôles bénévoles", priority: "high" },
  { phase: "J-7", category: "Bénévoles", title: "Distribuer planning bénévoles", priority: "high" },
  { phase: "J-7", category: "Technique", title: "Tests techniques salle", priority: "critical" },
  { phase: "J-7", category: "Technique", title: "Test son & vidéo complet", priority: "critical" },
  { phase: "J-7", category: "Technique", title: "Test streaming/retransmission", priority: "high" },
  { phase: "J-7", category: "Animateur", title: "Brief animateur", priority: "high" },
  { phase: "J-7", category: "Animateur", title: "Valider déroulé de la journée", priority: "critical" },
  { phase: "J-7", category: "Eau & Catering", title: "Confirmer commande eau/boissons", priority: "high" },
  { phase: "J-7", category: "Eau & Catering", title: "Valider menu pause-café", priority: "medium" },
  // Jour J
  { phase: "Jour J", category: "Ouverture", title: "Accueil équipe technique", priority: "critical" },
  { phase: "Jour J", category: "Ouverture", title: "Vérification technique finale", priority: "critical" },
  { phase: "Jour J", category: "Ouverture", title: "Ouverture accueil participants", priority: "critical" },
  { phase: "Jour J", category: "Déroulé", title: "Discours d'ouverture", priority: "critical" },
  { phase: "Jour J", category: "Déroulé", title: "Coordination speakers en coulisses", priority: "high" },
  { phase: "Jour J", category: "Déroulé", title: "Gestion temps sessions", priority: "high" },
  { phase: "Jour J", category: "CTF", title: "Lancer plateforme CTF", priority: "critical" },
  { phase: "Jour J", category: "CTF", title: "Support technique CTF", priority: "high" },
  { phase: "Jour J", category: "Clôture", title: "Discours de clôture", priority: "critical" },
  { phase: "Jour J", category: "Clôture", title: "Photo groupe", priority: "medium" },
  { phase: "Jour J", category: "Clôture", title: "Collecte feedback", priority: "medium" },
  // Post-event
  { phase: "Post-event", category: "Suivi", title: "Envoyer certificats participants", priority: "high" },
  { phase: "Post-event", category: "Suivi", title: "Envoyer certificats speakers", priority: "high" },
  { phase: "Post-event", category: "Suivi", title: "Publication photos/vidéos", priority: "medium" },
  { phase: "Post-event", category: "Suivi", title: "Rapport post-événement", priority: "high" },
  { phase: "Post-event", category: "Suivi", title: "Bilan budget final", priority: "high" },
  { phase: "Post-event", category: "Suivi", title: "Remerciements sponsors", priority: "high" },
];

function TaskCard({
  t,
  onUpdate,
  onDelete,
  showPhase = false,
  canWrite = true,
}: {
  t: Record<string, unknown>;
  onUpdate: (id: number, data: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
  showPhase?: boolean;
  canWrite?: boolean;
}) {
  const { lang } = useAdminT();
  const now = new Date();
  const deadline = t.deadline ? new Date(t.deadline as string) : null;
  const isOverdue = deadline && deadline < now && t.status !== "done";
  const priorityColor = PRIORITY_COLORS[(t.priority as string) || "medium"] || "#888";

  return (
    <div className="cyber-card rounded-lg p-3 mb-2 cursor-pointer">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={t.status === "done" || !!t.done}
          onChange={e => canWrite && onUpdate(t.id as number, { status: e.target.checked ? "done" : "todo" })}
          disabled={!canWrite}
          className="w-4 h-4 accent-neon-green shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium mb-1 ${t.status === "done" ? "line-through text-gray-600" : "text-white"}`}>
            {t.title as string}
          </div>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {showPhase && !!t.phase && (
              <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bdr)", color: "var(--txt-2)" }}>{t.phase as string}</span>
            )}
            {!!t.category && (
              <span className="text-gray-500">{t.category as string}</span>
            )}
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: priorityColor, background: priorityColor + "20" }}>
              {(t.priority as string || "medium").toUpperCase()}
            </span>
            {!!t.assignee && <span className="text-gray-400">@{t.assignee as string}</span>}
            {deadline && (
              <span className={isOverdue ? "text-red-400 font-bold" : "text-gray-600"}>
                {deadline.toLocaleDateString("fr-FR")}
                {isOverdue && (lang === "en" ? " (late)" : " (retard)")}
              </span>
            )}
          </div>
          {!!t.notes && <div className="text-xs text-gray-500 mt-1 italic">{t.notes as string}</div>}
        </div>
        {canWrite && <button onClick={() => onDelete(t.id as number)} className="text-red-400 text-xs hover:text-red-300 shrink-0">✗</button>}
      </div>
    </div>
  );
}

const SUPPLIER_DOMAINS = [
  "Lieu/venue/salles", "Mobilier", "Signalétique", "Impression",
  "Badges & supports participants", "Goodies & kits participants",
  "Transport & logistique matériel", "Stockage", "Installation/manutention/démontage",
  "Restauration/coffee break/eau", "Hébergement", "Audio/vidéo/streaming",
  "Photo/vidéo/couverture média", "Internet/connectivité", "Sécurité",
  "Santé/premiers secours", "Nettoyage", "Animation/DJ/networking",
  "Location matériel divers", "Services d'urgence/backup fournisseurs",
];

const SUPPLIER_FORM_DEFAULT = { supplier: "", domain: SUPPLIER_DOMAINS[0], description: "", amount: "", paymentTerms: "", pdfUrl: "", advantages: "", risks: "", comment: "" };

function LogisticsPanel({ tasks, onRefresh, canWrite = true }: { tasks: Record<string, unknown>[]; onRefresh: () => void; canWrite?: boolean }) {
  const { lang } = useAdminT();
  const [activeTab, setActiveTab] = useState<"kanban" | "phase" | "overdue" | "all" | "suppliers" | "prospection">("kanban");
  const [suppliers, setSuppliers] = useState<Record<string, unknown>[]>([]);
  const [supplierForm, setSupplierForm] = useState<Record<string, string>>(SUPPLIER_FORM_DEFAULT);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const loadSuppliers = () => {
    fetch("/api/admin/logistics/suppliers").then(r => r.json()).then(setSuppliers).catch(() => {});
  };

  useEffect(() => { if (activeTab === "suppliers") loadSuppliers(); }, [activeTab]);

  const saveSupplier = async () => {
    const body = {
      ...supplierForm,
      amount: supplierForm.amount !== "" ? Number(supplierForm.amount) : null,
    };
    if (editSupplierId !== null) {
      await fetch(`/api/admin/logistics/suppliers/${editSupplierId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/admin/logistics/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setShowSupplierForm(false);
    setEditSupplierId(null);
    setSupplierForm(SUPPLIER_FORM_DEFAULT);
    loadSuppliers();
  };

  const editSupplier = (s: Record<string, unknown>) => {
    setEditSupplierId(s.id as number);
    setSupplierForm({
      supplier: (s.supplier as string) || "",
      domain: (s.domain as string) || SUPPLIER_DOMAINS[0],
      description: (s.description as string) || "",
      amount: s.amount != null ? String(s.amount) : "",
      paymentTerms: (s.paymentTerms as string) || "",
      pdfUrl: (s.pdfUrl as string) || "",
      advantages: (s.advantages as string) || "",
      risks: (s.risks as string) || "",
      comment: (s.comment as string) || "",
    });
    setShowSupplierForm(true);
  };

  const deleteSupplier = async (id: number) => {
    if (!confirm(lang === "en" ? "Delete this offer?" : "Supprimer cette offre ?")) return;
    await fetch(`/api/admin/logistics/suppliers/${id}`, { method: "DELETE" });
    loadSuppliers();
  };
  const [activePhase, setActivePhase] = useState<Phase>("J-90");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ status: "todo", priority: "medium", phase: "J-30" });

  const save = async () => {
    await fetch("/api/admin/logistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setForm({ status: "todo", priority: "medium", phase: "J-30" }); onRefresh();
  };

  const update = async (id: number, data: Record<string, unknown>) => {
    await fetch(`/api/admin/logistics/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    onRefresh();
  };

  const del = async (id: number) => {
    if (!confirm(lang === "en" ? "Delete?" : "Supprimer ?")) return;
    await fetch(`/api/admin/logistics/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const seedAll = async () => {
    for (let i = 0; i < LOGISTICS_PHASES_SEED.length; i++) {
      const s = LOGISTICS_PHASES_SEED[i];
      await fetch("/api/admin/logistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, status: "todo", sortOrder: i }) });
    }
    onRefresh();
  };

  const seedPhase = async (phase: Phase) => {
    const items = LOGISTICS_PHASES_SEED.filter(s => s.phase === phase);
    for (let i = 0; i < items.length; i++) {
      await fetch("/api/admin/logistics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...items[i], status: "todo", sortOrder: i }) });
    }
    onRefresh();
  };

  const totalDone = tasks.filter(t => t.status === "done" || t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((totalDone / total) * 100) : 0;

  const now = new Date();
  const overdueTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    return new Date(t.deadline as string) < now && t.status !== "done";
  });

  const moveStatus = (t: Record<string, unknown>, direction: "prev" | "next") => {
    const idx = STATUS_COLS.findIndex(c => c.id === t.status);
    const newIdx = direction === "next" ? Math.min(idx + 1, STATUS_COLS.length - 1) : Math.max(idx - 1, 0);
    if (newIdx !== idx) update(t.id as number, { status: STATUS_COLS[newIdx].id });
  };

  const tabs = [
    { id: "kanban" as const, label: lang === "en" ? "Kanban View" : "Vue Kanban" },
    { id: "phase" as const, label: lang === "en" ? "Phase View" : "Vue Phase" },
    { id: "overdue" as const, label: lang === "en" ? "Overdue View" : "Vue Retards" },
    { id: "all" as const, label: lang === "en" ? "All" : "Toutes" },
    { id: "suppliers" as const, label: lang === "en" ? "Supplier Offers" : "Offres Fournisseurs" },
    { id: "prospection" as const, label: lang === "en" ? "Prospecting" : "Prospection" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">{lang === "en" ? "Logistics" : "Logistique"}</h1>
        {canWrite && <div className="flex gap-2">
          {!tasks.length && (
            <button onClick={seedAll} className="px-3 py-2 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">
              {lang === "en" ? "Initialize all tasks" : "Initialiser toutes les tâches"}
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "+ Add task" : "+ Ajouter tâche"}</button>
        </div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${activeTab === tab.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-white"}`}
          >
            {tab.label}
            {tab.id === "overdue" && overdueTasks.length > 0 && (
              <span className="ml-1 px-1 rounded bg-red-500/20 text-red-400">{overdueTasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* PROSPECTION TAB */}
      {activeTab === "prospection" && (
        <LogisticsProspectingPanel canWrite={canWrite} />
      )}

      {/* Progress bar */}
      {activeTab !== "prospection" && total > 0 && (
        <div className="cyber-card rounded-xl p-4 mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>{lang === "en" ? "Overall progress" : "Progression globale"}</span>
            <span className="font-bold" style={{ color: "var(--ac)" }}>{totalDone}/{total} ({pct}%)</span>
          </div>
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "var(--ac)" : "#0066ff" }} />
          </div>
        </div>
      )}

      {/* Add form */}
      {canWrite && showForm && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Category" : "Catégorie"}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.category as string) || ""} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder={lang === "en" ? "e.g.: Technical" : "ex: Technique"} />
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Title *" : "Titre *"}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.title as string) || ""} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phase</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.phase as string) || "J-30"} onChange={e => setForm(p => ({ ...p, phase: e.target.value }))}>
                {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Priority" : "Priorité"}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.priority as string) || "medium"} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Status" : "Statut"}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.status as string) || "todo"} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUS_COLS.map(s => <option key={s.id} value={s.id}>{lang === "en" ? s.labelEn : s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Assignee" : "Responsable"}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.assignee as string) || ""} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Deadline" : "Échéance"}</label>
              <input type="date" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.deadline as string) || ""} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <div className="lg:col-span-3">
              <label className="text-xs text-gray-500 block mb-1">Notes</label>
              <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={(form.notes as string) || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Add" : "Ajouter"}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">{lang === "en" ? "Cancel" : "Annuler"}</button>
          </div>
        </div>
      )}

      {/* KANBAN TAB */}
      {activeTab === "kanban" && (
        <div className="flex overflow-x-auto gap-4 pb-2">
          {STATUS_COLS.map(col => {
            const colTasks = tasks.filter(t => (t.status || "todo") === col.id);
            return (
              <div key={col.id} className="min-w-[260px] flex-shrink-0 rounded-xl p-3" style={{ background: col.bg, border: `1px solid ${col.color}30` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold font-mono tracking-widest" style={{ color: col.color }}>{lang === "en" ? col.labelEn : col.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: col.color + "20", color: col.color }}>{colTasks.length}</span>
                </div>
                <div>
                  {colTasks.map(t => (
                    <div key={t.id as number} className="cyber-card rounded-lg p-3 mb-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium mb-1 ${t.status === "done" ? "line-through text-gray-600" : "text-white"}`}>
                            {t.title as string}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-xs mb-1">
                            <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bdr)", color: "var(--txt-2)" }}>{t.phase as string}</span>
                            <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: PRIORITY_COLORS[(t.priority as string) || "medium"], background: (PRIORITY_COLORS[(t.priority as string) || "medium"]) + "20" }}>
                              {(t.priority as string || "medium").toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            {!!t.category && <span className="text-gray-500">{t.category as string}</span>}
                            {!!t.assignee && <span className="text-gray-400">@{t.assignee as string}</span>}
                            {!!t.deadline && (() => {
                              const dl = new Date(t.deadline as string);
                              const od = dl < now && t.status !== "done";
                              return <span className={od ? "text-red-400 font-bold" : "text-gray-600"}>{dl.toLocaleDateString("fr-FR")}</span>;
                            })()}
                          </div>
                        </div>
                        {canWrite && <button onClick={() => del(t.id as number)} className="text-red-400 text-xs hover:text-red-300 shrink-0">✗</button>}
                      </div>
                      {canWrite && <div className="flex gap-1 mt-2 justify-end">
                        <button
                          onClick={() => moveStatus(t, "prev")}
                          disabled={STATUS_COLS.findIndex(c => c.id === t.status) === 0}
                          className="text-xs px-1.5 py-0.5 rounded border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30"
                        >←</button>
                        <button
                          onClick={() => moveStatus(t, "next")}
                          disabled={STATUS_COLS.findIndex(c => c.id === t.status) === STATUS_COLS.length - 1}
                          className="text-xs px-1.5 py-0.5 rounded border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30"
                        >→</button>
                      </div>}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-xs text-gray-700 text-center py-4 italic">{lang === "en" ? "No tasks" : "Aucune tâche"}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PHASE TAB */}
      {activeTab === "phase" && (
        <div>
          {/* Phase sub-tabs */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {PHASES.map(ph => {
              const phTasks = tasks.filter(t => t.phase === ph);
              const phDone = phTasks.filter(t => t.status === "done" || t.done).length;
              return (
                <button
                  key={ph}
                  onClick={() => setActivePhase(ph)}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${activePhase === ph ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-white border border-gray-800"}`}
                >
                  {ph} <span className="text-gray-600 ml-1">({phDone}/{phTasks.length})</span>
                </button>
              );
            })}
          </div>

          {/* Phase content */}
          {(() => {
            const phTasks = tasks.filter(t => t.phase === activePhase);
            const phDone = phTasks.filter(t => t.status === "done" || t.done).length;
            const phPct = phTasks.length ? Math.round((phDone / phTasks.length) * 100) : 0;

            if (phTasks.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-xs mb-3">{lang === "en" ? `No tasks for phase ${activePhase}.` : `Aucune tâche pour la phase ${activePhase}.`}</p>
                  {canWrite && <button
                    onClick={() => seedPhase(activePhase)}
                    className="btn-neon px-4 py-2 rounded text-xs"
                  >
                    {lang === "en" ? "Initialize this phase" : "Initialiser cette phase"}
                  </button>}
                </div>
              );
            }

            // Group by category
            const byCat: Record<string, Record<string, unknown>[]> = {};
            for (const t of phTasks) {
              const cat = (t.category as string) || "Autre";
              if (!byCat[cat]) byCat[cat] = [];
              byCat[cat].push(t);
            }

            return (
              <div>
                <div className="cyber-card rounded-xl p-3 mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Phase {activePhase}</span>
                    <span className="font-bold" style={{ color: "var(--ac)" }}>{phDone}/{phTasks.length} ({phPct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${phPct}%`, background: phPct === 100 ? "var(--ac)" : "#0066ff" }} />
                  </div>
                </div>
                <div className="space-y-4">
                  {Object.entries(byCat).map(([cat, catTasks]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-neon-green/70 uppercase tracking-widest">{cat}</h3>
                        <span className="text-xs text-gray-600">{catTasks.filter(t => t.status === "done" || t.done).length}/{catTasks.length}</span>
                      </div>
                      {catTasks.map(t => (
                        <TaskCard key={t.id as number} t={t} onUpdate={update} onDelete={del} canWrite={canWrite} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* OVERDUE TAB */}
      {activeTab === "overdue" && (
        <div>
          {overdueTasks.length === 0 ? (
            <div className="text-center py-8 cyber-card rounded-xl">
              <p className="text-green-400 font-bold">{lang === "en" ? "No delays!" : "Aucun retard !"}</p>
              <p className="text-gray-600 text-xs mt-1">{lang === "en" ? "All tasks with deadlines are up to date." : "Toutes les tâches avec deadline sont à jour."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-red-400 mb-3 font-bold">{lang === "en" ? `${overdueTasks.length} task(s) overdue` : `${overdueTasks.length} tâche(s) en retard`}</div>
              {overdueTasks.map(t => {
                const dl = new Date(t.deadline as string);
                const daysLate = Math.floor((now.getTime() - dl.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={t.id as number} className="cyber-card rounded-lg p-3 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white mb-1">{t.title as string}</div>
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className="text-gray-500">{t.category as string}</span>
                          <span className="text-gray-500">{t.phase as string}</span>
                          <span className="px-1.5 py-0.5 rounded font-bold" style={{ color: PRIORITY_COLORS[(t.priority as string) || "medium"], background: (PRIORITY_COLORS[(t.priority as string) || "medium"]) + "20" }}>
                            {(t.priority as string || "medium").toUpperCase()}
                          </span>
                          <span className="text-red-400 font-bold">{lang === "en" ? `+${daysLate}d late` : `+${daysLate}j de retard`}</span>
                        </div>
                      </div>
                      {canWrite && <button
                        onClick={() => update(t.id as number, { status: "done" })}
                        className="text-xs px-2 py-1 rounded border border-green-700 text-green-400 hover:bg-green-900/20"
                      >
                        {lang === "en" ? "Mark done" : "Marquer fait"}
                      </button>}
                      {canWrite && <button onClick={() => del(t.id as number)} className="text-red-400 text-xs hover:text-red-300">✗</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALL TAB */}
      {activeTab === "all" && (
        <div className="space-y-6">
          {(() => {
            const byCategory: Record<string, Record<string, unknown>[]> = {};
            for (const t of tasks) {
              const cat = (t.category as string) || "Autre";
              if (!byCategory[cat]) byCategory[cat] = [];
              byCategory[cat].push(t);
            }
            return Object.entries(byCategory).map(([cat, catTasks]) => {
              const catDone = catTasks.filter(t => t.status === "done" || t.done).length;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-neon-green/70 uppercase tracking-widest">{cat}</h3>
                    <span className="text-xs text-gray-600">{catDone}/{catTasks.length}</span>
                  </div>
                  {catTasks.map(t => (
                    <TaskCard key={t.id as number} t={t} onUpdate={update} onDelete={del} showPhase canWrite={canWrite} />
                  ))}
                </div>
              );
            });
          })()}
          {!tasks.length && (
            <div className="text-center py-8">
              <p className="text-gray-600 text-xs mb-3">{lang === "en" ? "No tasks. Initialize with standard tasks." : "Aucune tâche. Initialisez avec les tâches standard."}</p>
              {canWrite && <button onClick={seedAll} className="btn-neon px-4 py-2 rounded text-xs">
                {lang === "en" ? "Initialize logistics tasks" : "Initialiser tâches logistiques"}
              </button>}
            </div>
          )}
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === "suppliers" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500">
                {lang === "en" ? `${suppliers.length} offer(s) logged` : `${suppliers.length} offre(s) consignée(s)`}
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => { setEditSupplierId(null); setSupplierForm(SUPPLIER_FORM_DEFAULT); setShowSupplierForm(true); }}
                className="btn-neon px-4 py-2 rounded text-xs"
              >
                {lang === "en" ? "+ Add offer" : "+ Ajouter offre"}
              </button>
            )}
          </div>

          {/* Domain filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button
              onClick={() => setSupplierFilter("all")}
              className={`text-xs px-3 py-1 rounded transition-all ${supplierFilter === "all" ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400 border border-gray-800"}`}
            >
              {lang === "en" ? "All" : "Tous"} ({suppliers.length})
            </button>
            {SUPPLIER_DOMAINS.filter(d => suppliers.some(s => s.domain === d)).map(d => (
              <button
                key={d}
                onClick={() => setSupplierFilter(d)}
                className={`text-xs px-3 py-1 rounded transition-all ${supplierFilter === d ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400 border border-gray-800"}`}
              >
                {d} ({suppliers.filter(s => s.domain === d).length})
              </button>
            ))}
          </div>

          {/* Add / Edit form */}
          {canWrite && showSupplierForm && (
            <div className="cyber-card rounded-xl p-5 mb-5">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--ac)" }}>
                {editSupplierId !== null ? (lang === "en" ? "Edit offer" : "Modifier l'offre") : (lang === "en" ? "New supplier offer" : "Nouvelle offre fournisseur")}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Supplier *" : "Fournisseur *"}</label>
                  <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={supplierForm.supplier} onChange={e => setSupplierForm(p => ({ ...p, supplier: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Domain *" : "Domaine *"}</label>
                  <select className="cyber-input w-full px-3 py-2 rounded text-xs" value={supplierForm.domain} onChange={e => setSupplierForm(p => ({ ...p, domain: e.target.value }))}>
                    {SUPPLIER_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Amount (FCFA)" : "Montant (FCFA)"}</label>
                  <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={supplierForm.amount} onChange={e => setSupplierForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Description *" : "Description de l'offre *"}</label>
                  <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={supplierForm.description} onChange={e => setSupplierForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Payment terms" : "Conditions de paiement"}</label>
                  <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={supplierForm.paymentTerms} onChange={e => setSupplierForm(p => ({ ...p, paymentTerms: e.target.value }))} placeholder={lang === "en" ? "e.g. 50% upfront" : "ex. 50% à la commande"} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">PDF URL ({lang === "en" ? "optional" : "optionnel"})</label>
                  <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={supplierForm.pdfUrl} onChange={e => setSupplierForm(p => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Advantages" : "Avantages"}</label>
                  <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={supplierForm.advantages} onChange={e => setSupplierForm(p => ({ ...p, advantages: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Risks" : "Risques"}</label>
                  <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={supplierForm.risks} onChange={e => setSupplierForm(p => ({ ...p, risks: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Comment" : "Commentaire"}</label>
                  <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={supplierForm.comment} onChange={e => setSupplierForm(p => ({ ...p, comment: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveSupplier}
                  disabled={!supplierForm.supplier.trim() || !supplierForm.description.trim()}
                  className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-40"
                >
                  {editSupplierId !== null ? (lang === "en" ? "Update" : "Mettre à jour") : (lang === "en" ? "Add" : "Ajouter")}
                </button>
                <button onClick={() => { setShowSupplierForm(false); setEditSupplierId(null); setSupplierForm(SUPPLIER_FORM_DEFAULT); }} className="px-4 py-2 rounded text-xs text-gray-500 hover:text-white">
                  {lang === "en" ? "Cancel" : "Annuler"}
                </button>
              </div>
            </div>
          )}

          {/* Suppliers list */}
          {suppliers.length === 0 ? (
            <div className="text-center py-12 cyber-card rounded-xl">
              <p className="text-gray-600 text-xs">{lang === "en" ? "No supplier offers yet." : "Aucune offre fournisseur pour l'instant."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers
                .filter(s => supplierFilter === "all" || s.domain === supplierFilter)
                .map(s => (
                  <div key={s.id as number} className="cyber-card rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#0066ff15", color: "#0066ff" }}>{s.domain as string}</span>
                          {s.amount != null && (
                            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "var(--ac-bg)", color: "var(--ac)" }}>
                              {(s.amount as number).toLocaleString("fr-FR")} FCFA
                            </span>
                          )}
                        </div>
                        <p className="text-white font-bold text-sm">{s.supplier as string}</p>
                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">{s.description as string}</p>
                        {!!(s.paymentTerms as string) && (
                          <p className="text-xs text-gray-500 mt-1">💳 {s.paymentTerms as string}</p>
                        )}
                        {!!(s.advantages as string) && (
                          <p className="text-xs mt-1"><span className="text-green-400 font-bold">+ </span><span className="text-gray-400">{s.advantages as string}</span></p>
                        )}
                        {!!(s.risks as string) && (
                          <p className="text-xs mt-1"><span className="text-red-400 font-bold">- </span><span className="text-gray-400">{s.risks as string}</span></p>
                        )}
                        {!!(s.comment as string) && (
                          <p className="text-xs text-gray-600 italic mt-1">{s.comment as string}</p>
                        )}
                        {!!(s.pdfUrl as string) && (
                          <a href={s.pdfUrl as string} target="_blank" rel="noreferrer" className="text-xs mt-1 inline-block hover:underline" style={{ color: "#0066ff" }}>
                            📎 {lang === "en" ? "View PDF" : "Voir PDF"}
                          </a>
                        )}
                      </div>
                      {canWrite && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => editSupplier(s)}
                            className="text-xs px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors"
                          >
                            {lang === "en" ? "Edit" : "Modifier"}
                          </button>
                          <button
                            onClick={() => deleteSupplier(s.id as number)}
                            className="text-xs px-3 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/20 transition-colors"
                          >
                            {lang === "en" ? "Delete" : "Supprimer"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TicketTypeRow {
  id: number; slug: string; nameFr: string; nameEn: string;
  priceFr: number; priceEn: number; perksFr: string; perksEn: string;
  earlyBirdPriceFr: number | null; earlyBirdPriceEn: number | null;
  earlyBirdUntil: string | null; color: string; isFeatured: boolean;
  isVisible: boolean; includesSessions: boolean; includesWorkshops: boolean; includesCTF: boolean; maxCapacity: number; sortOrder: number; sold: number;
  netticketTicketId: string | null; stripeProductId: string | null;
}

const TICKET_DEFAULT_FORM = { slug: "", nameFr: "", nameEn: "", priceFr: 0, priceEn: 0, color: "#00ff9d", isFeatured: false, isVisible: true, includesSessions: true, includesWorkshops: false, includesCTF: false, maxCapacity: 200, sortOrder: 0, perksFrArr: [] as string[], perksEnArr: [] as string[], netticketTicketId: "", stripeProductId: "" };

function TicketsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { lang: adminLang } = useAdminT();
  const [tickets, setTickets] = useState<TicketTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TicketTypeRow> & { perksFrArr?: string[]; perksEnArr?: string[] }>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...TICKET_DEFAULT_FORM });
  const [creating, setCreating] = useState(false);

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
    if (!confirm(adminLang === "en" ? "Delete this ticket type?" : "Supprimer ce type de billet ?")) return;
    await fetch(`/api/admin/ticket-types/${id}`, { method: "DELETE" });
    load();
  };

  const toggleVisible = async (t: TicketTypeRow) => {
    await fetch(`/api/admin/ticket-types/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !t.isVisible }) });
    load();
  };

  const createTicket = async () => {
    if (!createForm.slug || !createForm.nameFr || !createForm.nameEn) return;
    setCreating(true);
    await fetch("/api/admin/ticket-types", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...createForm, perksFr: createForm.perksFrArr, perksEn: createForm.perksEnArr }),
    });
    setShowCreate(false);
    setCreateForm({ ...TICKET_DEFAULT_FORM });
    setCreating(false);
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
          <h1 className="text-2xl font-black text-white">{adminLang === "en" ? "Tickets & Pricing" : "Billets & Tarifs"}</h1>
          <p className="text-gray-500 text-xs mt-1">{adminLang === "en" ? "Manage ticket types displayed on the registration portal" : "Gérez les types de billets affichés sur le portail d'inscription"}</p>
        </div>
        {canWrite && <button onClick={() => setShowCreate(v => !v)} className="btn-neon px-4 py-2 rounded text-xs">{adminLang === "en" ? "+ Create ticket" : "+ Créer billet"}</button>}
      </div>

      {canWrite && showCreate && (
        <div className="cyber-card rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-neon-green mb-4">{adminLang === "en" ? "New ticket type" : "Nouveau type de billet"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{adminLang === "en" ? "Slug (unique identifier)" : "Slug (identifiant unique)"}</label>
              <input value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="ex: vip-ctf" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom FR</label>
              <input value={createForm.nameFr} onChange={e => setCreateForm(f => ({ ...f, nameFr: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nom EN</label>
              <input value={createForm.nameEn} onChange={e => setCreateForm(f => ({ ...f, nameEn: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Couleur</label>
              <input type="color" value={createForm.color} onChange={e => setCreateForm(f => ({ ...f, color: e.target.value }))} style={{ width: "100%", height: "34px", border: "none", borderRadius: "6px", cursor: "pointer" }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prix XAF</label>
              <input type="number" value={createForm.priceFr} onChange={e => setCreateForm(f => ({ ...f, priceFr: parseInt(e.target.value) || 0 }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prix USD</label>
              <input type="number" value={createForm.priceEn} onChange={e => setCreateForm(f => ({ ...f, priceEn: parseInt(e.target.value) || 0 }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{adminLang === "en" ? "Max capacity" : "Capacité max"}</label>
              <input type="number" value={createForm.maxCapacity} onChange={e => setCreateForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) || 200 }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{adminLang === "en" ? "Display order" : "Ordre d'affichage"}</label>
              <input type="number" value={createForm.sortOrder} onChange={e => setCreateForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">NetTicket ticket_id</label>
              <input value={createForm.netticketTicketId} onChange={e => setCreateForm(f => ({ ...f, netticketTicketId: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="ex: 1842" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Stripe product_id</label>
              <input value={createForm.stripeProductId} onChange={e => setCreateForm(f => ({ ...f, stripeProductId: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="prod_… (optionnel)" />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={createForm.isVisible} onChange={e => setCreateForm(f => ({ ...f, isVisible: e.target.checked }))} />
              {adminLang === "en" ? "Visible on portal" : "Visible sur le portail"}
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={createForm.isFeatured} onChange={e => setCreateForm(f => ({ ...f, isFeatured: e.target.checked }))} />
              {adminLang === "en" ? "Featured" : "Recommandé"}
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--ac)" }}>
              <input type="checkbox" checked={createForm.includesSessions} onChange={e => setCreateForm(f => ({ ...f, includesSessions: e.target.checked }))} />
              {adminLang === "en" ? "🎙️ Sessions / Conferences" : "🎙️ Sessions / Conférences"}
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#a78bfa" }}>
              <input type="checkbox" checked={createForm.includesWorkshops} onChange={e => setCreateForm(f => ({ ...f, includesWorkshops: e.target.checked }))} />
              🛠 Workshops
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: "#00ccff" }}>
              <input type="checkbox" checked={createForm.includesCTF} onChange={e => setCreateForm(f => ({ ...f, includesCTF: e.target.checked }))} />
              🏆 CTF
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={createTicket} disabled={creating || !createForm.slug || !createForm.nameFr} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">
              {creating ? (adminLang === "en" ? "Creating…" : "Création…") : (adminLang === "en" ? "Create ticket" : "Créer le billet")}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-gray-500 text-xs hover:text-white">{adminLang === "en" ? "Cancel" : "Annuler"}</button>
          </div>
        </div>
      )}

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
                      <label className="text-xs text-gray-500 block mb-1">{adminLang === "en" ? "Early Bird until" : "Early Bird jusqu'au"}</label>
                      <input type="date" value={editForm.earlyBirdUntil ? editForm.earlyBirdUntil.slice(0, 10) : ""} onChange={e => setEditForm(f => ({ ...f, earlyBirdUntil: e.target.value || null }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">{adminLang === "en" ? "Max capacity" : "Capacité max"}</label>
                      <input type="number" value={editForm.maxCapacity ?? 200} onChange={e => setEditForm(f => ({ ...f, maxCapacity: parseInt(e.target.value) }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-500">{adminLang === "en" ? "Perks FR" : "Avantages FR"}</label>
                        <button onClick={() => addPerk("fr")} className="text-xs text-neon-green">{adminLang === "en" ? "+ Add" : "+ Ajouter"}</button>
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
                        <label className="text-xs text-gray-500">{adminLang === "en" ? "Perks EN" : "Avantages EN"}</label>
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
                      {adminLang === "en" ? "Featured" : "Recommandé"}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!editForm.isVisible} onChange={e => setEditForm(f => ({ ...f, isVisible: e.target.checked }))} />
                      {adminLang === "en" ? "Visible on portal" : "Visible sur le portail"}
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--ac)" }}>
                      <input type="checkbox" checked={editForm.includesSessions !== false} onChange={e => setEditForm(f => ({ ...f, includesSessions: e.target.checked }))} />
                      {adminLang === "en" ? "🎙️ Sessions / Conferences" : "🎙️ Sessions / Conférences"}
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#a78bfa" }}>
                      <input type="checkbox" checked={!!editForm.includesWorkshops} onChange={e => setEditForm(f => ({ ...f, includesWorkshops: e.target.checked }))} />
                      🛠 Workshops
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-bold" style={{ color: "#00ccff" }}>
                      <input type="checkbox" checked={!!editForm.includesCTF} onChange={e => setEditForm(f => ({ ...f, includesCTF: e.target.checked }))} />
                      🏆 CTF
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">{adminLang === "en" ? "Order" : "Ordre"}</label>
                      <input type="number" value={editForm.sortOrder ?? 0} onChange={e => setEditForm(f => ({ ...f, sortOrder: parseInt(e.target.value) }))} className="cyber-input text-xs rounded px-2 py-1 w-16" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">NetTicket ticket_id</label>
                      <input value={editForm.netticketTicketId || ""} onChange={e => setEditForm(f => ({ ...f, netticketTicketId: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="ex: 1842" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Stripe product_id</label>
                      <input value={editForm.stripeProductId || ""} onChange={e => setEditForm(f => ({ ...f, stripeProductId: e.target.value }))} className="cyber-input text-sm rounded px-3 py-1.5 w-full" placeholder="prod_… (optionnel)" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => save(t.id)} className="btn-neon px-4 py-2 rounded text-xs">{adminLang === "en" ? "Save" : "Enregistrer"}</button>
                    <button onClick={() => setEditId(null)} className="text-gray-500 text-xs hover:text-white">{adminLang === "en" ? "Cancel" : "Annuler"}</button>
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
                          {t.isFeatured && <span className="text-xs px-2 py-0.5 rounded" style={{ background: t.color + "20", color: t.color }}>{adminLang === "en" ? "★ Featured" : "★ Recommandé"}</span>}
                          {!t.isVisible && <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">{adminLang === "en" ? "Hidden" : "Masqué"}</span>}
                          {t.includesSessions && <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "var(--ac-bg)", color: "var(--ac)", border: "1px solid var(--ac-bdr)" }}>🎙️ Sessions</span>}
                          {t.includesWorkshops && <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "#a78bfa15", color: "#a78bfa", border: "1px solid #a78bfa30" }}>🛠 Workshops</span>}
                          {t.includesCTF && <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: "#00ccff15", color: "#00ccff", border: "1px solid #00ccff30" }}>🏆 CTF</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span style={{ color: t.color }}>{t.priceFr.toLocaleString("fr-FR")} XAF</span>
                          <span className="text-gray-600 mx-2">/</span>
                          <span style={{ color: t.color }}>${t.priceEn} USD</span>
                          {t.earlyBirdPriceFr && <span className="text-yellow-400 ml-2">⚡ Early Bird: {t.earlyBirdPriceFr.toLocaleString()} XAF</span>}
                        </div>
                      </div>
                    </div>
                    {canWrite && <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleVisible(t)} className="text-xs text-gray-500 hover:text-white transition-colors">{t.isVisible ? (adminLang === "en" ? "Hide" : "Masquer") : (adminLang === "en" ? "Show" : "Afficher")}</button>
                      <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-white transition-colors">{adminLang === "en" ? "Edit" : "Modifier"}</button>
                      <button onClick={() => del(t.id)} className="text-xs text-red-800 hover:text-red-400 transition-colors">{adminLang === "en" ? "Delete" : "Supprimer"}</button>
                    </div>}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? "#ff4444" : t.color }} />
                    </div>
                    <span className="text-xs font-mono shrink-0" style={{ color: t.color, fontFamily: "'Share Tech Mono', monospace" }}>{adminLang === "en" ? `${sold} / ${max} sold` : `${sold} / ${max} vendus`}</span>
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
          <p className="text-gray-600 text-xs py-8 text-center">{adminLang === "en" ? "Ticket types are auto-seeded at startup (Student, Standard, VIP)." : "Les types de billets sont auto-seedés au démarrage (Student, Standard, VIP)."}</p>
        )}
      </div>
    </div>
  );
}

const REG_PAGE_SIZE = 50;

function RegistrationsPanel({ onDetail, canManualValidate = false, canWrite = true }: { onDetail: (r: Record<string, unknown>) => void; canManualValidate?: boolean; canWrite?: boolean }) {
  const { t, lang } = useAdminT();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [fStatus, setFStatus] = useState("");
  const [fTicket, setFTicket] = useState("");
  const [fCheck, setFCheck] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ctfSlugs, setCtfSlugs] = useState<Set<string>>(new Set());
  const [regTab, setRegTab] = useState<"stats" | "list">("stats");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, tt] = await Promise.all([
      fetch("/api/admin/submissions?type=registration"),
      fetch("/api/admin/ticket-types"),
    ]);
    if (r.ok) setRows(await r.json());
    if (tt.ok) {
      const types = await tt.json() as Record<string, unknown>[];
      setCtfSlugs(new Set(types.filter(t => t.includesCTF).map(t => t.slug as string)));
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const statuses = Array.from(new Set(rows.map(r => r.status as string).filter(Boolean)));
  const ticketTypes = Array.from(new Set(rows.map(r => r.ticketType as string).filter(Boolean)));

  const filtered = rows.filter(r => {
    if (fStatus && r.status !== fStatus) return false;
    if (fTicket && r.ticketType !== fTicket) return false;
    if (fCheck === "checked" && !r.checkedInAt) return false;
    if (fCheck === "unchecked" && r.checkedInAt) return false;
    if (fSearch) {
      const q = fSearch.toLowerCase();
      const hay = `${r.fname} ${r.lname} ${r.email} ${r.org || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / REG_PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * REG_PAGE_SIZE, page * REG_PAGE_SIZE);

  const validate = async (r: Record<string, unknown>) => {
    if (!confirm(lang === "en" ? `Validate payment for ${r.fname} ${r.lname} and send the ticket?` : `Valider le paiement de ${r.fname} ${r.lname} et envoyer le billet ?`)) return;
    setBusyId(r.id as number);
    const res = await fetch("/api/admin/submissions", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "registration", action: "validate", id: r.id }),
    });
    setBusyId(null);
    if (res.ok) { setMsg(lang === "en" ? `Ticket sent to ${r.fname} ${r.lname}` : `Billet envoyé à ${r.fname} ${r.lname}`); load(); setTimeout(() => setMsg(null), 3000); }
  };

  const remind = async (r: Record<string, unknown>) => {
    setBusyId(r.id as number);
    const res = await fetch("/api/admin/submissions", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "registration", action: "remind", id: r.id }),
    });
    setBusyId(null);
    if (res.ok) { setMsg(lang === "en" ? `Follow-up sent to ${r.email}` : `Relance envoyée à ${r.email}`); setTimeout(() => setMsg(null), 3000); }
  };

  const selectCls = "bg-black/40 border border-gray-800 rounded px-3 py-1.5 text-xs text-white focus:border-neon-green/50 outline-none";

  const REG_TARGET = 1000;
  const CTF_TARGET = 500;
  const totalReg = rows.length;
  const ctfReg = rows.filter(r => ctfSlugs.has(r.ticketType as string)).length;
  const regPct = Math.min(100, Math.round((totalReg / REG_TARGET) * 100));
  const ctfPct = Math.min(100, Math.round((ctfReg / CTF_TARGET) * 100));
  const regColor = regPct >= 100 ? "#00ff9d" : regPct >= 60 ? "#ffaa00" : "#ff0066";
  const ctfColor = ctfPct >= 100 ? "#00ff9d" : ctfPct >= 60 ? "#ffaa00" : "#ff0066";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">{t.registrationsTitle} <span className="text-gray-600 text-lg font-normal">({rows.length})</span></h1>
        <div className="flex gap-2 flex-wrap">
          <a href="/checkin/scan" target="_blank" rel="noreferrer" className="btn-neon px-4 py-2 rounded text-sm">📷 Scanner QR →</a>
          <a href="/admin/checkin" target="_blank" rel="noreferrer" className="px-4 py-2 rounded text-sm border border-gray-700 text-gray-300 hover:text-white transition-colors">📋 Liste check-in →</a>
          {canWrite && <button
            onClick={async () => {
              if (!confirm(lang === "en" ? "Generate and send online access links to all validated registrants without a link?" : "Générer et envoyer les liens d'accès online à tous les inscrits validés sans lien ?")) return;
              const res = await fetch("/api/admin/registrations/generate-online-tokens", { method: "POST" });
              const data = await res.json();
              setMsg(lang === "en" ? `🌐 ${data.generated} link(s) generated and sent.` : `🌐 ${data.generated} lien(s) généré(s) et envoyé(s).`);
              setTimeout(() => setMsg(null), 6000);
            }}
            className="px-4 py-2 rounded text-sm border border-cyan-700/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
          >
            {lang === "en" ? "🌐 Send online access" : "🌐 Envoyer accès online"}
          </button>}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {([
          { key: "stats", label: `📊 ${lang === "en" ? "Stats" : "Stats"}` },
          { key: "list",  label: `📋 ${lang === "en" ? "List" : "Liste"} (${filtered.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setRegTab(tab.key)}
            className={`text-xs px-4 py-2 border-b-2 transition-all font-mono ${regTab === tab.key ? "border-neon-green text-neon-green" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 px-4 py-2 rounded text-xs text-neon-green border border-neon-green/30 bg-neon-green/5">{msg}</div>}

      {/* ── Stats tab ── */}
      {regTab === "stats" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-800 bg-black/40 px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{lang === "en" ? "Total registrations — target" : "Inscriptions totales — objectif"} {REG_TARGET}</span>
              <span className="text-sm font-black font-mono" style={{ color: regColor }}>{totalReg} / {REG_TARGET} <span className="text-xs font-normal text-gray-500">({regPct}%)</span></span>
            </div>
            <div className="h-2 rounded-full bg-gray-900 overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${regPct}%`, background: regColor, boxShadow: `0 0 8px ${regColor}60` }} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{lang === "en" ? "With CTF — target" : "Avec CTF — objectif"} {CTF_TARGET}</span>
              <span className="text-sm font-black font-mono" style={{ color: ctfColor }}>{ctfReg} / {CTF_TARGET} <span className="text-xs font-normal text-gray-500">({ctfPct}%)</span></span>
            </div>
            <div className="h-2 rounded-full bg-gray-900 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ctfPct}%`, background: ctfColor, boxShadow: `0 0 8px ${ctfColor}60` }} />
            </div>
          </div>
          {rows.length > 0 && <RegistrationsChart rows={rows} />}
        </div>
      )}

      {/* ── List tab ── */}
      {regTab === "list" && (
        <div>
          {/* Filtres + recherche */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="search"
              value={fSearch}
              onChange={e => { setFSearch(e.target.value); setPage(1); }}
              placeholder={lang === "en" ? "Search name, email, org…" : "Rechercher nom, email, org…"}
              className="bg-black/40 border border-gray-800 rounded px-3 py-1.5 text-xs text-white focus:border-neon-green/50 outline-none w-56"
            />
            <select className={selectCls} value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }}>
              <option value="">{lang === "en" ? "All statuses" : "Tous les statuts"}</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={selectCls} value={fTicket} onChange={e => { setFTicket(e.target.value); setPage(1); }}>
              <option value="">{lang === "en" ? "All tickets" : "Tous les billets"}</option>
              {ticketTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
            </select>
            <select className={selectCls} value={fCheck} onChange={e => { setFCheck(e.target.value); setPage(1); }}>
              <option value="">{lang === "en" ? "Check-in: all" : "Check-in : tous"}</option>
              <option value="checked">{lang === "en" ? "Check-in: present" : "Check-in : présents"}</option>
              <option value="unchecked">{lang === "en" ? "Check-in: absent" : "Check-in : absents"}</option>
            </select>
            {(fStatus || fTicket || fCheck || fSearch) && (
              <button onClick={() => { setFStatus(""); setFTicket(""); setFCheck(""); setFSearch(""); setPage(1); }} className="text-xs text-gray-500 hover:text-white px-2">{lang === "en" ? "Reset" : "Réinitialiser"}</button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neon-green/10 text-gray-500 text-left">
                  {[t.name, t.ticketType, t.status, t.checkedIn, t.onlineAccess, t.date, t.actions].map(h => (
                    <th key={h} className="py-2 px-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(r => {
                  const status = r.status as string;
                  const awaiting = status === "pending" || status === "payment_pending";
                  const done = status === "validated" || status === "paid";
                  return (
                    <tr key={r.id as number} className={`border-b border-gray-800 hover:bg-white/[0.02] transition-colors ${r.checkedInAt ? "bg-neon-green/[0.02]" : ""}`}>
                      <td className="py-2 px-3">
                        <span className="text-white">{r.fname as string} {r.lname as string}</span>
                        <br/><span className="text-gray-500">{r.email as string}</span>
                        {!!r.org && <><br/><span className="text-gray-600">{String(r.org)}</span></>}
                      </td>
                      <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green/70">{r.ticketType as string}</span></td>
                      <td className="py-2 px-3"><Badge status={status} /></td>
                      <td className="py-2 px-3">
                        {r.checkedInAt
                          ? <span className="text-neon-green text-xs">✓ {new Date(r.checkedInAt as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="py-2 px-3">
                        {r.onlineCheckedInAt
                          ? <span className="text-cyan-400 text-xs">🌐 {new Date(r.onlineCheckedInAt as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          : r.onlineToken
                            ? <span className="text-gray-600 text-xs">{lang === "en" ? "🔗 pending" : "🔗 en attente"}</span>
                            : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{new Date(r.createdAt as string).toLocaleDateString("fr-FR")}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2 flex-wrap items-center">
                          <button onClick={() => onDetail(r)} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors">{lang === "en" ? "Details" : "Détails"}</button>
                          {awaiting && (
                            <>
                              {canManualValidate && canWrite && (
                                <button disabled={busyId === r.id} onClick={() => validate(r)} className="text-xs px-3 py-1 rounded bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-colors disabled:opacity-50">
                                  {t.validateAndSend}
                                </button>
                              )}
                              {canWrite && <button disabled={busyId === r.id} onClick={() => remind(r)} className="text-xs px-3 py-1 rounded border border-yellow-600/40 text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50">
                                {busyId === r.id ? "…" : lang === "en" ? "✉ Follow up" : "✉ Relancer"}
                              </button>}
                            </>
                          )}
                          {done && <span className="text-xs text-neon-green/60 font-mono">{lang === "en" ? "Ticket sent ✓" : "Billet envoyé ✓"}</span>}
                          {done && canWrite && (
                            <button
                              disabled={busyId === r.id}
                              onClick={async () => {
                                setBusyId(r.id as number);
                                await fetch(`/api/admin/registrations/${r.id}/resend-online`, { method: "POST" });
                                setBusyId(null);
                              }}
                              className="text-xs px-2 py-1 rounded border border-cyan-700/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
                              title={lang === "en" ? "Resend online access link" : "Renvoyer le lien d'accès online"}
                            >
                              {t.resendOnline}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No registrations" : "Aucune inscription"}</p>}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-gray-600 font-mono">
                {lang === "en"
                  ? `${(page - 1) * REG_PAGE_SIZE + 1}–${Math.min(page * REG_PAGE_SIZE, filtered.length)} of ${filtered.length}`
                  : `${(page - 1) * REG_PAGE_SIZE + 1}–${Math.min(page * REG_PAGE_SIZE, filtered.length)} sur ${filtered.length}`}
              </p>
              <div className="flex gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1} className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-500 hover:text-white disabled:opacity-30">«</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-500 hover:text-white disabled:opacity-30">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const n = start + i;
                  return (
                    <button key={n} onClick={() => setPage(n)} className={`text-xs px-2.5 py-1 rounded border transition-colors ${n === page ? "border-neon-green text-neon-green" : "border-gray-800 text-gray-500 hover:text-white"}`}>{n}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-500 hover:text-white disabled:opacity-30">›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-500 hover:text-white disabled:opacity-30">»</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CERT_TABS = [
  { id: "participant", label: "Participants", icon: "🎟", apiPath: "/api/admin/submissions?type=registration", nameField: (r: Record<string,unknown>) => `${r.fname} ${r.lname}`, emailField: "email" },
  { id: "volunteer", label: "Bénévoles", icon: "🙋", apiPath: "/api/admin/submissions?type=volunteer", nameField: (r: Record<string,unknown>) => r.name as string, emailField: "email" },
  { id: "speaker", label: "Speakers", icon: "🎤", apiPath: "/api/admin/speakers", nameField: (r: Record<string,unknown>) => r.name as string, emailField: "email" },
  { id: "ctf_competitor", label: "CTF", icon: "🏆", apiPath: "/api/admin/ctf/participants", nameField: (r: Record<string,unknown>) => (r.ctfCompetitorName || r.fname || r.name) as string, emailField: "email" },
  { id: "organizer", label: "Organisateurs", icon: "👥", apiPath: "/api/admin/team", nameField: (r: Record<string,unknown>) => r.name as string, emailField: "email" },
] as const;

function computeCPE(m: number): number {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h + (r >= 50 ? 1 : r > 0 ? 0.5 : 0);
}

function CertificatesPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { lang } = useAdminT();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<typeof CERT_TABS[number]["id"]>("participant");
  const [people, setPeople] = useState<Record<string, unknown>[]>([]);
  const [badges, setBadges] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [batchIssuing, setBatchIssuing] = useState(false);
  const [filterUnreceived, setFilterUnreceived] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [presenceStats, setPresenceStats] = useState<Map<number, { totalMinutes: number; cpe: number }> | null>(null);

  const tabDef = CERT_TABS.find(t => t.id === activeTab)!;

  const load = useCallback(async () => {
    setLoading(true);
    setPeople([]);
    setBadges([]);
    setPresenceStats(null);
    try {
      const fetches: Promise<Response>[] = [
        fetch(tabDef.apiPath),
        fetch(`/api/admin/badges?type=${activeTab}`),
      ];
      if (activeTab === "participant") {
        fetches.push(fetch("/api/admin/live/presence-stats"));
      }
      const [pRes, bRes, psRes] = await Promise.all(fetches);
      if (pRes.ok) {
        const raw = await pRes.json();
        setPeople(Array.isArray(raw) ? raw : raw.registrations || raw.volunteers || []);
      }
      if (bRes.ok) setBadges(await bRes.json());
      if (psRes?.ok) {
        const statsArr = await psRes.json() as { registrationId: number; totalMinutes: number }[];
        const map = new Map<number, { totalMinutes: number; cpe: number }>();
        for (const s of statsArr) {
          map.set(s.registrationId, { totalMinutes: s.totalMinutes, cpe: computeCPE(s.totalMinutes) });
        }
        setPresenceStats(map);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, tabDef.apiPath]);

  useEffect(() => { load(); setFilterUnreceived(false); setStatus(null); }, [activeTab]);

  const hasBadge = (person: Record<string, unknown>) => {
    const email = person[tabDef.emailField] as string;
    return badges.some(b => (b.recipientEmail as string)?.toLowerCase() === email?.toLowerCase());
  };

  const getBadgeDate = (person: Record<string, unknown>) => {
    const email = person[tabDef.emailField] as string;
    const b = badges.find(b => (b.recipientEmail as string)?.toLowerCase() === email?.toLowerCase());
    return b ? new Date(b.createdAt as string).toLocaleDateString("fr-FR") : null;
  };

  const getBadgeUuid = (person: Record<string, unknown>): string | null => {
    const email = person[tabDef.emailField] as string;
    const b = badges.find(b => (b.recipientEmail as string)?.toLowerCase() === email?.toLowerCase());
    return b ? (b.uuid as string) : null;
  };

  const issueBadge = async (person: Record<string, unknown>, action: "issue" | "resend" = "issue") => {
    const key = person[tabDef.emailField] as string;
    setIssuingId(key);
    await fetch("/api/admin/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        badgeType: activeTab,
        recipientName: tabDef.nameField(person),
        recipientEmail: person[tabDef.emailField],
      }),
    });
    await load();
    setIssuingId(null);
    setStatus(lang === "en" ? `Badge sent to ${tabDef.nameField(person)}` : `Badge envoyé à ${tabDef.nameField(person)}`);
    setTimeout(() => setStatus(null), 3000);
  };

  const batchIssue = async () => {
    const targets = people.filter(p => !hasBadge(p) && (activeTab !== "participant" || (p.status === "validated" && p.checkedInAt != null)));
    if (!targets.length) return;
    if (!(await confirm({ message: lang === "en" ? `Issue ${targets.length} badge(s) for those who haven't received them?` : `Émettre ${targets.length} badge(s) pour les non-reçus ?`, confirmLabel: lang === "en" ? "Issue" : "Émettre" }))) return;
    setBatchIssuing(true);
    for (const p of targets) {
      await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "issue", badgeType: activeTab, recipientName: tabDef.nameField(p), recipientEmail: p[tabDef.emailField] }),
      });
    }
    await load();
    setBatchIssuing(false);
    setStatus(lang === "en" ? `${targets.length} badge(s) issued!` : `${targets.length} badge(s) émis !`);
    setTimeout(() => setStatus(null), 4000);
  };

  const displayed = filterUnreceived ? people.filter(p => !hasBadge(p)) : people;
  const unreceived = people.filter(p => !hasBadge(p) && (activeTab !== "participant" || (p.status === "validated" && p.checkedInAt != null))).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{lang === "en" ? "🎖 Badges & Certificates" : "🎖 Badges & Certificats"}</h1>
          <p className="text-gray-500 text-xs mt-1">{lang === "en" ? "Issue and track badges by category" : "Émettez et suivez les badges par catégorie"}</p>
        </div>
        {canWrite && unreceived > 0 && (
          <button
            onClick={batchIssue}
            disabled={batchIssuing}
            className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green disabled:opacity-50"
          >
            {batchIssuing ? (lang === "en" ? "Issuing…" : "Émission…") : (lang === "en" ? `⚡ Issue for ${unreceived} not received` : `⚡ Émettre pour ${unreceived} non-reçus`)}
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CERT_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded text-xs font-mono transition-all ${activeTab === tab.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-white border border-gray-800"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {status && <div className="mb-4 px-4 py-2 rounded text-xs text-neon-green border border-neon-green/30 bg-neon-green/5">{status}</div>}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setFilterUnreceived(!filterUnreceived)}
          className={`text-xs px-3 py-1.5 rounded border transition-all ${filterUnreceived ? "border-orange-500/50 text-orange-400 bg-orange-500/10" : "border-gray-700 text-gray-500 hover:text-white"}`}
        >
          {filterUnreceived ? (lang === "en" ? "⬜ Not received only" : "⬜ Non reçus seulement") : (lang === "en" ? "📋 All" : "📋 Tous")}
        </button>
        <span className="text-xs text-gray-600">{lang === "en" ? `${displayed.length} / ${people.length} • ${unreceived} without badge` : `${displayed.length} / ${people.length} • ${unreceived} sans badge`}</span>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "Loading…" : "Chargement…"}</p>
      ) : (
        <div className="space-y-2">
          {displayed.map((p, i) => {
            const name = tabDef.nameField(p);
            const email = p[tabDef.emailField] as string;
            const received = hasBadge(p);
            const date = getBadgeDate(p);
            const isIssuing = issuingId === email;
            const personId = p.id as number | undefined;
            const pStat = (activeTab === "participant" && personId != null && presenceStats)
              ? presenceStats.get(personId)
              : undefined;
            // Eligibility: participants must be validated AND checked in; other categories always eligible
            const isEligible = activeTab !== "participant"
              || (p.status === "validated" && p.checkedInAt != null);
            return (
              <div key={i} className="cyber-card rounded-lg px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{name}</p>
                  <p className="text-gray-500 text-xs">{email}</p>
                </div>
                {pStat != null && (
                  <div className="shrink-0 text-center min-w-[90px]">
                    <p className="text-xs text-gray-400">{pStat.totalMinutes} min</p>
                    <p className="text-xs text-neon-green font-bold">{pStat.cpe} CPE</p>
                  </div>
                )}
                <div className="shrink-0 text-center min-w-[120px]">
                  {received ? (
                    <div>
                      <span className="text-neon-green text-xs">{lang === "en" ? "✅ Received" : "✅ Reçu"}</span>
                      {date && <p className="text-gray-600 text-xs">{date}</p>}
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">{lang === "en" ? "⬜ Not received" : "⬜ Non reçu"}</span>
                  )}
                </div>
                {received && getBadgeUuid(p) && (
                  <a
                    href={`/verify/${getBadgeUuid(p)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Visualiser le badge / certificat"
                    className="shrink-0 text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                  >
                    🔍
                  </a>
                )}
                {canWrite && (isEligible ? (
                  <button
                    onClick={() => issueBadge(p, received ? "resend" : "issue")}
                    disabled={isIssuing}
                    className="shrink-0 text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-50"
                    style={received
                      ? { borderColor: "#ffffff20", color: "#888" }
                      : { borderColor: "#00ff9d40", color: "#00ff9d", background: "#00ff9d10" }}
                  >
                    {isIssuing ? "…" : received ? (lang === "en" ? "Resend" : "Renvoyer") : (lang === "en" ? "Issue" : "Émettre")}
                  </button>
                ) : (
                  <span
                    className="shrink-0 text-xs px-3 py-1.5 rounded border"
                    style={{ borderColor: "#ffffff15", color: "#555" }}
                    title={lang === "en" ? "Must be validated and checked in" : "Doit être validé et enregistré"}
                  >
                    {lang === "en" ? "Not eligible" : "Non éligible"}
                  </span>
                ))}
              </div>
            );
          })}
          {!displayed.length && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No results" : "Aucun résultat"}</p>}
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

function SponsorPackageEditor({ pkg, onSave, onDelete, canWrite = true }: { pkg: SponsorPkg; onSave: (data: Partial<SponsorPkg>) => Promise<void>; onDelete: () => Promise<void>; canWrite?: boolean }) {
  const { lang } = useAdminT();
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
        <span className="text-neon-green font-mono text-sm">{draft.price > 0 ? `${draft.price.toLocaleString("fr-FR")} FCFA` : lang === "en" ? "Partnership" : "Partenariat"}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${draft.isVisible ? "text-neon-green bg-neon-green/10" : "text-gray-600 bg-gray-800"}`}>{draft.isVisible ? "Visible" : lang === "en" ? "Hidden" : "Masqué"}</span>
        <span className="text-gray-500 text-xs ml-2">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Tier + colors */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{lang === "en" ? "Identifier (tier)" : "Identifiant (tier)"}</label>
              <input className="cyber-input w-full px-2 py-1.5 rounded text-sm" value={draft.tier} onChange={e => setDraft(d => ({ ...d, tier: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{lang === "en" ? "Color" : "Couleur"}</label>
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
                <p className="text-xs text-gray-500 uppercase">{lang === "en" ? "Perks FR" : "Avantages FR"}</p>
                <button onClick={() => setPerksFr(p => [...p, ""])} className="text-xs text-neon-green hover:text-neon-green/70">{lang === "en" ? "+ Add" : "+ Ajouter"}</button>
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
          {canWrite && (
            <div className="flex items-center justify-between pt-2">
              <button onClick={() => onSave({ isVisible: !draft.isVisible }).then(() => setDraft(d => ({ ...d, isVisible: !d.isVisible })))} className={`text-xs px-3 py-1.5 rounded border ${draft.isVisible ? "border-neon-green/30 text-neon-green" : "border-gray-700 text-gray-500"}`}>
                {draft.isVisible ? "Visible ✓" : lang === "en" ? "Hidden" : "Masqué"}
              </button>
              <div className="flex gap-2">
                <button onClick={() => { if (confirm(lang === "en" ? "Delete this package?" : "Supprimer ce package ?")) onDelete(); }} className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10">{lang === "en" ? "Delete" : "Supprimer"}</button>
                <button onClick={save} disabled={saving} className="btn-neon px-4 py-1.5 rounded text-xs">{saving ? "..." : lang === "en" ? "Save" : "Enregistrer"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SponsorPackagesPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { lang } = useAdminT();
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
    const res = await fetch("/api/admin/sponsor-packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: true }) });
    if (res.status === 409) alert(lang === "en" ? "Packages are already initialized." : "Les packages sont déjà initialisés.");
    else if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error || (lang === "en" ? "Initialization failed." : "Échec de l'initialisation.")); }
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
          <h1 className="text-2xl font-black text-white">{lang === "en" ? "Sponsorship Packages" : "Packages de Sponsoring"}</h1>
          <p className="text-gray-500 text-xs mt-1">{lang === "en" ? "Click on a package to edit it. Data is stored in the database." : "Cliquez sur un package pour le modifier. Les données sont stockées en base."}</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {!packages.length && !loading && (
              <button onClick={seed} className="btn-neon px-4 py-2 rounded text-sm">{lang === "en" ? "🌱 Initialize standard packages" : "🌱 Initialiser packages standard"}</button>
            )}
            <button onClick={() => setAdding(a => !a)} className="btn-neon px-4 py-2 rounded text-sm">{lang === "en" ? "+ New package" : "+ Nouveau package"}</button>
          </div>
        )}
      </div>

      {!canWrite && (
        <div className="mb-4 px-4 py-2 rounded text-xs border border-yellow-500/30 bg-yellow-500/5 text-yellow-400/90">
          {lang === "en" ? "🔒 Read-only access — you cannot modify packages." : "🔒 Accès en lecture seule — vous ne pouvez pas modifier les packages."}
        </div>
      )}

      {adding && (
        <div className="cyber-card rounded-xl p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">{lang === "en" ? "New package identifier (e.g.: STARTUP)" : "Identifiant du nouveau package (ex: STARTUP)"}</label>
            <input autoFocus className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="STARTUP" value={newTier} onChange={e => setNewTier(e.target.value)} onKeyDown={e => e.key === "Enter" && createPackage()} />
          </div>
          <button onClick={createPackage} className="btn-neon px-4 py-2 rounded text-sm">{lang === "en" ? "Create" : "Créer"}</button>
          <button onClick={() => setAdding(false)} className="text-gray-500 text-sm px-2">{lang === "en" ? "Cancel" : "Annuler"}</button>
        </div>
      )}

      <div className="space-y-3">
        {packages.map(pkg => (
          <SponsorPackageEditor
            key={pkg.id}
            pkg={pkg}
            canWrite={canWrite}
            onSave={(data) => savePackage(pkg.id, data)}
            onDelete={() => deletePackage(pkg.id)}
          />
        ))}
        {!packages.length && !loading && (
          <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No packages configured." : "Aucun package configuré."}</p>
        )}
      </div>
    </div>
  );
}
// ---- Event Settings Panel ----
const SETTINGS_FIELDS = [
  { key: "event_date_start", label: "Date de début (ISO)", type: "date", group: "Événement" },
  { key: "event_date", label: "Date de fin (ISO)", type: "date", group: "Événement" },
  { key: "event_date_display_fr", label: "Date affichée (FR) — laisser vide pour auto", type: "text", group: "Événement" },
  { key: "event_date_display_en", label: "Date affichée (EN) — laisser vide pour auto", type: "text", group: "Événement" },
  { key: "event_time_start", label: "Heure d'ouverture", type: "time", group: "Événement" },
  { key: "event_edition", label: "Édition (numéro)", type: "text", group: "Événement" },
  { key: "event_venue", label: "Lieu (nom)", type: "text", group: "Lieu" },
  { key: "event_city", label: "Ville", type: "text", group: "Lieu" },
  { key: "event_country", label: "Pays", type: "text", group: "Lieu" },
  { key: "event_address", label: "Adresse complète", type: "text", group: "Lieu" },
  { key: "event_mode", label: "Mode (ex: Online & On-site)", type: "text", group: "Lieu" },
  { key: "cfp_open_date", label: "Ouverture des soumissions (CFP)", type: "date", group: "CFP" },
  { key: "cfp_close_date", label: "Clôture des soumissions (CFP)", type: "date", group: "CFP" },
  { key: "volunteer_open_date", label: "Ouverture des candidatures bénévoles", type: "date", group: "Bénévoles" },
  { key: "volunteer_close_date", label: "Clôture des candidatures bénévoles", type: "date", group: "Bénévoles" },
  { key: "registration_open_date", label: "Ouverture des inscriptions", type: "date", group: "Inscriptions" },
  { key: "registration_close_date", label: "Clôture des inscriptions", type: "date", group: "Inscriptions" },
  { key: "ctf_tagline_fr", label: "Accroche principale (FR)", type: "text", group: "CTF" },
  { key: "ctf_tagline_en", label: "Accroche principale (EN)", type: "text", group: "CTF" },
  { key: "ctf_prize_main_fr", label: "Gains vainqueur — résumé court (FR)", type: "text", group: "CTF" },
  { key: "ctf_prize_main_en", label: "Gains vainqueur — résumé court (EN)", type: "text", group: "CTF" },
  { key: "ctf_prize_details_fr", label: "Gains vainqueur — détails complets (FR)", type: "text", group: "CTF" },
  { key: "ctf_prize_details_en", label: "Gains vainqueur — détails complets (EN)", type: "text", group: "CTF" },
  { key: "networking_date", label: "Date de début du réseautage (QR)", type: "date", group: "Réseautage (QR)" },
  { key: "networking_end_date", label: "Date de fin du réseautage (QR)", type: "date", group: "Réseautage (QR)" },
  { key: "networking_start", label: "Heure de début (Douala)", type: "time", group: "Réseautage (QR)" },
  { key: "networking_end", label: "Heure de fin (Douala)", type: "time", group: "Réseautage (QR)" },
  { key: "site_base_url", label: "URL de base du site", type: "url", group: "Liens" },
  { key: "url_inscription", label: "Lien → Inscription", type: "url", group: "Liens" },
  { key: "url_cfp", label: "Lien → CFP", type: "url", group: "Liens" },
  { key: "url_benevoles", label: "Lien → Bénévoles", type: "url", group: "Liens" },
  { key: "url_programme", label: "Lien → Programme", type: "url", group: "Liens" },
  { key: "url_ctf", label: "Lien → CTF", type: "url", group: "Liens" },
  { key: "url_sponsor", label: "Lien → Sponsor", type: "url", group: "Liens" },
] as const;

function EventSettingsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { lang } = useAdminT();
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
          <h1 className="text-2xl font-black text-white">{lang === "en" ? "⚙ Event Settings" : "⚙ Paramètres Événement"}</h1>
          <p className="text-gray-500 text-xs mt-1">{lang === "en" ? "Date, location and URLs used across the site and in communications" : "Date, lieu et URLs utilisés sur tout le site et dans les communications"}</p>
        </div>
        {canWrite && <button
          onClick={save}
          disabled={saving}
          style={{ background: "var(--ac)", color: "var(--panel)", border: "none", borderRadius: "6px", padding: "10px 20px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
        >
          {saving ? (lang === "en" ? "Saving…" : "Sauvegarde…") : saved ? (lang === "en" ? "✓ Saved" : "✓ Sauvegardé") : (lang === "en" ? "Save" : "Enregistrer")}
        </button>}
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
                      onChange={v => canWrite && handleChange(field.key, v)}
                      className={`w-full text-sm${!canWrite ? " opacity-60 pointer-events-none" : ""}`}
                    />
                  ) : field.key === "ctf_prize_details_fr" || field.key === "ctf_prize_details_en" ? (
                    <textarea
                      rows={4}
                      value={settings[field.key] || ""}
                      readOnly={!canWrite}
                      onChange={e => canWrite && handleChange(field.key, e.target.value)}
                      className="cyber-input w-full px-3 py-2 rounded text-sm text-white resize-none read-only:opacity-60"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                      placeholder={field.key === "ctf_prize_details_en"
                        ? "Ex: 1st prize: 500,000 XAF + trophy + CTF Winner badge&#10;2nd prize: 200,000 XAF&#10;3rd prize: 100,000 XAF"
                        : "Ex: 1er prix : 500 000 XAF + trophée + badge CTF Winner&#10;2e prix : 200 000 XAF&#10;3e prix : 100 000 XAF"}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={settings[field.key] || ""}
                      readOnly={!canWrite}
                      onChange={e => canWrite && handleChange(field.key, e.target.value)}
                      className="cyber-input w-full px-3 py-2 rounded text-sm text-white read-only:opacity-60"
                      style={{ fontFamily: "'Share Tech Mono', monospace" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="cyber-card rounded-xl p-5 mt-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{lang === "en" ? "Preview — CTAs by content type" : "Aperçu — CTAs par type de contenu"}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { type: "inscriptions", icon: "🎟", label: "Inscriptions" },
            { type: "cfp", icon: "📝", label: "CFP" },
            { type: "ctf", icon: "🏆", label: "CTF" },
            { type: "speaker", icon: "🎤", label: "Speaker/Session" },
            { type: "countdown", icon: "⏱", label: lang === "en" ? "Countdown" : "Compte à rebours" },
            { type: "sponsor", icon: "🏢", label: "Sponsor" },
          ].map(({ type, icon, label }) => {
            const urlKey = type === "inscriptions" || type === "countdown" ? "url_inscription"
              : type === "cfp" ? "url_cfp"
              : type === "ctf" ? "url_ctf"
              : type === "sponsor" ? "url_sponsor"
              : "url_programme";
            return (
              <div key={type} className="rounded p-2" style={{ background: "var(--card)", border: "1px solid var(--bdr)" }}>
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


function SessionsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { t, lang } = useAdminT();
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
    if (!confirm(lang === "en" ? "Initialize the program with standard sessions? (Cancelled if sessions already exist)" : "Initialiser le programme avec les sessions standard ? (Annulé si des sessions existent déjà)")) return;
    setSeeding(true);
    const r = await fetch("/api/admin/sessions/seed", { method: "POST" });
    const j = await r.json();
    if (!r.ok) alert(j.error || (lang === "en" ? "Error" : "Erreur"));
    else { alert(lang === "en" ? `${j.seeded} sessions created.` : `${j.seeded} sessions créées.`); load(); }
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
    if (!confirm(lang === "en" ? "Delete this session?" : "Supprimer cette session ?")) return;
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
        {canWrite && <div className="flex gap-2">
          <button onClick={seed} disabled={seeding} className="text-xs px-3 py-1.5 rounded border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all disabled:opacity-50">
            {seeding ? "…" : t.initStandard}
          </button>
          <button onClick={() => startEdit(null)} className="text-xs px-3 py-1.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20 transition-all">
            + {t.newSession}
          </button>
        </div>}
      </div>

      {/* Edit/create form */}
      {canWrite && showForm && (
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
        <p className="text-gray-600 text-sm font-mono">{t.loading}</p>
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
                {canWrite && <button onClick={() => startEdit(s)} className="text-xs text-gray-500 hover:text-neon-green transition-colors shrink-0">✎</button>}
                {canWrite && <button onClick={() => del(Number(s.id))} className="text-xs text-gray-600 hover:text-red-400 transition-colors shrink-0">✕</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- CTF Panel ----
const CTF_CATEGORIES = ["Web", "Crypto", "Forensics", "Reverse", "Pwn", "OSINT", "Misc"];
const CTF_CATEGORY_COLORS: Record<string, string> = {
  Web: "#00ccff", Crypto: "#ffaa00", Forensics: "#cc00ff",
  Reverse: "#ff6600", Pwn: "#ff0066", OSINT: "#00ff9d", Misc: "#888",
};
const CTF_STAGES = [
  { key: "idea", label: "Idée" },
  { key: "in_progress", label: "En cours" },
  { key: "testing", label: "En test" },
  { key: "validated", label: "Validé" },
  { key: "published", label: "Publié CTFd" },
];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function CTFPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { lang } = useAdminT();
  const [subTab, setSubTab] = useState<"config" | "challenges" | "participants">("config");
  const [config, setConfig] = useState({ ctfdUrl: "", ctfdApiKey: "", ctfDefaultPassword: "", ctfEnabled: "false" });
  const [configSaving, setConfigSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [challenges, setChallenges] = useState<Record<string, unknown>[]>([]);
  const [addForm, setAddForm] = useState({ title: "", category: "Web", difficulty: "medium", points: 100, author: "", notes: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [editChallenge, setEditChallenge] = useState<Record<string, unknown> | null>(null);
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string; role: string; email: string | null }[]>([]);

  const [participants, setParticipants] = useState<Record<string, unknown>[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [reconcileTeam, setReconcileTeam] = useState<{ team1: string; team2: string } | null>(null);
  const [reconcileTo, setReconcileTo] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then((s: Record<string, string>) => {
      setConfig({ ctfdUrl: s.ctfdUrl || "", ctfdApiKey: s.ctfdApiKey || "", ctfDefaultPassword: s.ctfDefaultPassword || "", ctfEnabled: s.ctfEnabled || "false" });
    });
  }, []);

  const loadChallenges = useCallback(async () => {
    const r = await fetch("/api/admin/ctf/challenges");
    if (r.ok) setChallenges(await r.json());
  }, []);

  const loadParticipants = useCallback(async () => {
    const r = await fetch("/api/admin/ctf/participants");
    if (r.ok) setParticipants(await r.json());
  }, []);

  useEffect(() => {
    if (subTab === "challenges") {
      loadChallenges();
      // Team members are the assignable owners for challenges.
      fetch("/api/admin/team").then(r => r.ok ? r.json() : []).then(setTeamMembers).catch(() => {});
    }
    if (subTab === "participants") loadParticipants();
  }, [subTab, loadChallenges, loadParticipants]);

  const saveConfig = async () => {
    setConfigSaving(true);
    await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setConfigSaving(false);
  };

  const testConnection = async () => {
    setTestResult(lang === "en" ? "Test in progress…" : "Test en cours…");
    try {
      const r = await fetch("/api/admin/ctf/test-connection");
      const data = await r.json();
      setTestResult(data.ok ? (lang === "en" ? "✓ CTFd connection successful" : "✓ Connexion CTFd réussie") : `✗ ${data.error || (lang === "en" ? "Cannot reach CTFd" : "Impossible de joindre CTFd")}`);
    } catch {
      setTestResult(lang === "en" ? "✗ Cannot reach CTFd" : "✗ Impossible de joindre CTFd");
    }
  };

  const addChallenge = async () => {
    if (!addForm.title) return;
    await fetch("/api/admin/ctf/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
    setAddForm({ title: "", category: "Web", difficulty: "medium", points: 100, author: "", notes: "" });
    setShowAddForm(false);
    loadChallenges();
  };

  const seedChallenges = async () => {
    if (!confirm(lang === "en" ? "Import the 40 reference challenges (WEB·CRYPTO·FORENSICS·REVERSE·PWN·OSINT·MISC)?" : "Importer les 40 challenges de référence (WEB·CRYPTO·FORENSICS·REVERSE·PWN·OSINT·MISC) ?")) return;
    const r = await fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ctf" }) });
    if (r.ok) { loadChallenges(); }
    else { const j = await r.json().catch(() => ({})); alert(j.error || (lang === "en" ? "Import failed (challenges may already exist)." : "Échec de l'import (des challenges existent peut-être déjà).")); }
  };

  const moveChallenge = async (id: number, status: string) => {
    await fetch(`/api/admin/ctf/challenges/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    loadChallenges();
  };

  const saveChallenge = async () => {
    if (!editChallenge) return;
    setSavingChallenge(true);
    await fetch(`/api/admin/ctf/challenges/${editChallenge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editChallenge.title,
        category: editChallenge.category,
        difficulty: editChallenge.difficulty,
        points: editChallenge.points,
        author: editChallenge.author,
        status: editChallenge.status,
        notes: editChallenge.notes,
        assigneeName: editChallenge.assigneeName || null,
        assigneeEmail: editChallenge.assigneeEmail || null,
      }),
    });
    setSavingChallenge(false);
    setEditChallenge(null);
    loadChallenges();
  };

  const deleteChallenge = async (id: number) => {
    if (!confirm(lang === "en" ? "Delete this challenge?" : "Supprimer ce challenge ?")) return;
    await fetch(`/api/admin/ctf/challenges/${id}`, { method: "DELETE" });
    loadChallenges();
  };

  const syncAll = async () => {
    setSyncing(true); setSyncResult(null);
    const r = await fetch("/api/admin/ctf/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_all" }) });
    const j = await r.json();
    const ok = j.results?.filter((x: Record<string, unknown>) => x.success).length ?? 0;
    const fail = j.results?.filter((x: Record<string, unknown>) => !x.success).length ?? 0;
    setSyncResult(r.ok ? (lang === "en" ? `✓ ${ok} accounts created${fail > 0 ? `, ${fail} errors` : ""}` : `✓ ${ok} comptes créés${fail > 0 ? `, ${fail} erreurs` : ""}`) : `✗ ${j.error}`);
    setSyncing(false); loadParticipants();
  };

  const syncOne = async (id: number) => {
    await fetch("/api/admin/ctf/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_account", registrationIds: [id] }) });
    loadParticipants();
  };

  // Detect team name conflicts (Levenshtein ≤ 2)
  const teamNames = Array.from(new Set(participants.map(p => p.ctfTeamName as string).filter(Boolean)));
  const teamConflicts: { team1: string; team2: string }[] = [];
  for (let i = 0; i < teamNames.length; i++)
    for (let j = i + 1; j < teamNames.length; j++)
      if (levenshtein(teamNames[i].toLowerCase(), teamNames[j].toLowerCase()) <= 2)
        teamConflicts.push({ team1: teamNames[i], team2: teamNames[j] });

  const reconcileTeams = async () => {
    if (!reconcileTeam || !reconcileTo) return;
    const oldName = reconcileTo === reconcileTeam.team1 ? reconcileTeam.team2 : reconcileTeam.team1;
    // Update all participants with old team name to new
    const toUpdate = participants.filter(p => p.ctfTeamName === oldName);
    for (const p of toUpdate) {
      await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ctf-team", id: p.id, ctfTeamName: reconcileTo }) });
    }
    setReconcileTeam(null); setReconcileTo(""); loadParticipants();
  };

  const subTabs = [
    { key: "config", label: "⚙ Config" },
    { key: "challenges", label: "🏁 Challenges" },
    { key: "participants", label: "👤 Participants" },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">⚡ EyesOpen CTF</h1>
        <a href="/ctf" target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-neon-green transition-colors">→ Page publique scoreboard</a>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-800 pb-0">
        {subTabs.map(st => (
          <button key={st.key} onClick={() => setSubTab(st.key)}
            className={`text-xs px-4 py-2 border-b-2 transition-all ${subTab === st.key ? "border-neon-green text-neon-green" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {st.label}
          </button>
        ))}
      </div>

      {subTab === "config" && (
        <div className="max-w-lg space-y-4">
          <div className="cyber-card rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">{lang === "en" ? "CTFd Connection" : "Connexion CTFd"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">URL CTFd</label>
                <input value={config.ctfdUrl} onChange={e => setConfig(c => ({ ...c, ctfdUrl: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="https://ctf.eyesopensecurity.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "CTFd API Key" : "Clé API CTFd"}</label>
                <input type="password" value={config.ctfdApiKey} onChange={e => setConfig(c => ({ ...c, ctfdApiKey: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="ctfd_…" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={testConnection} className="px-3 py-1.5 rounded text-xs border border-gray-700 text-gray-400 hover:text-white transition-colors">{lang === "en" ? "Test connection" : "Tester la connexion"}</button>
                {testResult && <span className={`text-xs ${testResult.startsWith("✓") ? "text-neon-green" : "text-red-400"}`}>{testResult}</span>}
              </div>
            </div>
          </div>
          <div className="cyber-card rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">{lang === "en" ? "CTF Settings" : "Paramètres CTF"}</h3>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">{lang === "en" ? "Passwords are automatically generated — 7 unique characters per competitor, 7 unique characters per team. They are sent to participants by email." : "Les mots de passe sont générés automatiquement — 7 caractères uniques par compétiteur, 7 caractères uniques par équipe. Ils sont envoyés aux participants par email."}</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-5 rounded-full transition-colors relative ${config.ctfEnabled === "true" ? "bg-neon-green/30" : "bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${config.ctfEnabled === "true" ? "right-0.5 bg-neon-green" : "left-0.5 bg-gray-500"}`} />
                </div>
                <input type="checkbox" className="sr-only" checked={config.ctfEnabled === "true"} onChange={e => setConfig(c => ({ ...c, ctfEnabled: e.target.checked ? "true" : "false" }))} />
                <span className="text-sm text-gray-300">{lang === "en" ? "CTF enabled (public scoreboard visible)" : "CTF activé (scoreboard public visible)"}</span>
              </label>
            </div>
          </div>
          {canWrite && <button onClick={saveConfig} disabled={configSaving} className="btn-neon px-4 py-2 rounded text-xs">
            {configSaving ? (lang === "en" ? "Saving…" : "Sauvegarde…") : (lang === "en" ? "Save" : "Sauvegarder")}
          </button>}
        </div>
      )}

      {subTab === "challenges" && (
        <div>
          {/* KPI bar */}
          <div className="flex gap-3 flex-wrap mb-5">
            {CTF_CATEGORIES.map(cat => {
              const count = challenges.filter(c => c.category === cat).length;
              return count > 0 ? (
                <span key={cat} className="text-xs px-2 py-1 rounded font-mono" style={{ background: CTF_CATEGORY_COLORS[cat] + "20", color: CTF_CATEGORY_COLORS[cat], border: `1px solid ${CTF_CATEGORY_COLORS[cat]}40` }}>
                  {cat} × {count}
                </span>
              ) : null;
            })}
            <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 font-mono">Total: {challenges.length}</span>
            <span className="text-xs px-2 py-1 rounded font-mono" style={{ background: "var(--ac-bg)", color: "var(--ac)" }}>
              {lang === "en" ? `✓ ${challenges.filter(c => c.status === "validated" || c.status === "published").length} ready` : `✓ ${challenges.filter(c => c.status === "validated" || c.status === "published").length} prêts`}
            </span>
            {canWrite && challenges.length === 0 && (
              <button onClick={seedChallenges} className="px-3 py-1 rounded text-xs border border-neon-green/40 text-neon-green hover:bg-neon-green/10 transition-colors ml-auto">{lang === "en" ? "⚡ Import 40 challenges" : "⚡ Importer les 40 challenges"}</button>
            )}
            {canWrite && <button onClick={() => setShowAddForm(v => !v)} className={`btn-neon px-3 py-1 rounded text-xs ${challenges.length === 0 ? "" : "ml-auto"}`}>{lang === "en" ? "+ Add challenge" : "+ Ajouter challenge"}</button>}
          </div>

          {canWrite && showAddForm && (
            <div className="cyber-card rounded-xl p-4 mb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Title" : "Titre"}</label>
                  <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} className="cyber-input w-full px-3 py-1.5 rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Category" : "Catégorie"}</label>
                  <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} className="cyber-input w-full px-3 py-1.5 rounded text-sm">
                    {CTF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Difficulty" : "Difficulté"}</label>
                  <select value={addForm.difficulty} onChange={e => setAddForm(f => ({ ...f, difficulty: e.target.value }))} className="cyber-input w-full px-3 py-1.5 rounded text-sm">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Points</label>
                  <input type="number" value={addForm.points} onChange={e => setAddForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))} className="cyber-input w-full px-3 py-1.5 rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Author" : "Auteur"}</label>
                  <input value={addForm.author} onChange={e => setAddForm(f => ({ ...f, author: e.target.value }))} className="cyber-input w-full px-3 py-1.5 rounded text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={addChallenge} className="btn-neon px-3 py-1.5 rounded text-xs">{lang === "en" ? "Add" : "Ajouter"}</button>
                <button onClick={() => setShowAddForm(false)} className="text-gray-500 text-xs hover:text-white">{lang === "en" ? "Cancel" : "Annuler"}</button>
              </div>
            </div>
          )}

          {/* Kanban */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CTF_STAGES.map(stage => {
              const cards = challenges.filter(c => c.status === stage.key);
              return (
                <div key={stage.key} className="cyber-card rounded-xl p-3"
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragId !== null) { moveChallenge(dragId, stage.key); setDragId(null); } }}>
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center justify-between">
                    {lang === "en" ? ({ idea: "Idea", in_progress: "In progress", testing: "Testing", validated: "Validated", published: "Published CTFd" } as Record<string, string>)[stage.key] || stage.label : stage.label} <span className="text-gray-600">{cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {cards.map(c => (
                      <div key={c.id as number} draggable={canWrite} onDragStart={() => canWrite && setDragId(c.id as number)}
                        onClick={() => canWrite && setEditChallenge({ ...c })}
                        className={`rounded-lg p-2.5 ${canWrite ? "cursor-pointer active:cursor-grabbing hover:brightness-125" : ""} transition-all`}
                        style={{ background: CTF_CATEGORY_COLORS[c.category as string] ? CTF_CATEGORY_COLORS[c.category as string] + "15" : "var(--bdr)", border: `1px solid ${CTF_CATEGORY_COLORS[c.category as string] ? CTF_CATEGORY_COLORS[c.category as string] + "40" : "var(--bdr-2)"}` }}>
                        <div className="text-xs font-bold text-white mb-1">{c.title as string}</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: CTF_CATEGORY_COLORS[c.category as string] ? CTF_CATEGORY_COLORS[c.category as string] + "30" : "var(--bdr-2)", color: CTF_CATEGORY_COLORS[c.category as string] || "var(--txt-dim)" }}>{c.category as string}</span>
                          <span className="text-xs text-gray-500">{c.difficulty as string}</span>
                          <span className="text-xs text-gray-400 ml-auto">{c.points as number}pts</span>
                        </div>
                        {!!c.author && <div className="text-xs text-gray-600 mt-1">{c.author as string}</div>}
                        <div className="text-xs mt-1" style={{ color: c.assigneeName ? "#00ccff" : "var(--txt-mute)" }}>
                          {c.assigneeName ? `👤 ${c.assigneeName as string}` : lang === "en" ? "👤 unassigned" : "👤 non assigné"}
                        </div>
                        {canWrite && <button onClick={e => { e.stopPropagation(); deleteChallenge(c.id as number); }} className="text-red-800 hover:text-red-400 text-xs mt-1">{lang === "en" ? "✗ Delete" : "✗ Supprimer"}</button>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Challenge edit modal */}
          {canWrite && editChallenge && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setEditChallenge(null)}>
              <div className="cyber-card rounded-xl p-5 max-w-lg w-full border-neon-green/30" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-sm">{lang === "en" ? "Edit challenge" : "Éditer le challenge"}</h3>
                  <button onClick={() => setEditChallenge(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Title" : "Titre"}</label>
                    <input value={(editChallenge.title as string) || ""} onChange={e => setEditChallenge(p => p ? { ...p, title: e.target.value } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Category" : "Catégorie"}</label>
                    <select value={(editChallenge.category as string) || "Web"} onChange={e => setEditChallenge(p => p ? { ...p, category: e.target.value } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm">
                      {CTF_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Difficulty" : "Difficulté"}</label>
                    <select value={(editChallenge.difficulty as string) || "medium"} onChange={e => setEditChallenge(p => p ? { ...p, difficulty: e.target.value } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Points</label>
                    <input type="number" value={(editChallenge.points as number) ?? 0} onChange={e => setEditChallenge(p => p ? { ...p, points: parseInt(e.target.value) || 0 } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Status" : "Statut"}</label>
                    <select value={(editChallenge.status as string) || "idea"} onChange={e => setEditChallenge(p => p ? { ...p, status: e.target.value } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm">
                      {CTF_STAGES.map(s => <option key={s.key} value={s.key}>{lang === "en" ? ({ idea: "Idea", in_progress: "In progress", testing: "Testing", validated: "Validated", published: "Published CTFd" } as Record<string, string>)[s.key] || s.label : s.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Author" : "Auteur"}</label>
                    <input value={(editChallenge.author as string) || ""} onChange={e => setEditChallenge(p => p ? { ...p, author: e.target.value } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">{lang === "en" ? "Responsible (team member)" : "Responsable (membre d'équipe)"}</label>
                    <select
                      value={(editChallenge.assigneeEmail as string) || ""}
                      onChange={e => {
                        const m = teamMembers.find(x => x.email === e.target.value);
                        setEditChallenge(p => p ? { ...p, assigneeEmail: e.target.value || null, assigneeName: m?.name || null } : p);
                      }}
                      className="cyber-input w-full px-3 py-1.5 rounded text-sm"
                    >
                      <option value="">{lang === "en" ? "— Unassigned —" : "— Non assigné —"}</option>
                      {teamMembers.filter(m => m.email).map(m => (
                        <option key={m.id} value={m.email!}>{m.name} ({m.role})</option>
                      ))}
                    </select>
                    <p className="text-gray-600 text-xs mt-1">{lang === "en" ? "The responsible person receives an email notification upon assignment." : "Le responsable reçoit un email de notification lors de l'assignation."}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Notes</label>
                    <textarea value={(editChallenge.notes as string) || ""} onChange={e => setEditChallenge(p => p ? { ...p, notes: e.target.value } : p)} className="cyber-input w-full px-3 py-1.5 rounded text-sm h-20 resize-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={saveChallenge} disabled={savingChallenge} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">
                    {savingChallenge ? (lang === "en" ? "Saving…" : "Sauvegarde…") : (lang === "en" ? "💾 Save" : "💾 Sauvegarder")}
                  </button>
                  <button onClick={() => { deleteChallenge(editChallenge.id as number); setEditChallenge(null); }} className="text-xs px-3 py-2 rounded" style={{ color: "#ff0066", border: "1px solid #ff006640" }}>{lang === "en" ? "Delete" : "Supprimer"}</button>
                  <button onClick={() => setEditChallenge(null)} className="text-xs text-gray-500 px-3 py-2 hover:text-gray-300">{lang === "en" ? "Cancel" : "Annuler"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === "participants" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-gray-500">{lang === "en" ? `${participants.length} CTF participant(s)` : `${participants.length} participant(s) CTF`}</div>
            <div className="flex gap-2 items-center">
              {syncResult && <span className={`text-xs ${syncResult.startsWith("✓") ? "text-neon-green" : "text-red-400"}`}>{syncResult}</span>}
              {canWrite && <button onClick={syncAll} disabled={syncing} className="btn-neon px-3 py-1.5 rounded text-xs disabled:opacity-50">
                {syncing ? "Sync…" : lang === "en" ? "⚡ Sync all to CTFd" : "⚡ Tout synchroniser sur CTFd"}
              </button>}
            </div>
          </div>

          {teamConflicts.length > 0 && (
            <div className="cyber-card rounded-xl p-4 mb-4" style={{ border: "1px solid #ffaa0040", background: "#ffaa0008" }}>
              <div className="text-xs font-bold text-yellow-400 mb-2">{lang === "en" ? "⚠ Team name conflicts detected" : "⚠ Conflits de noms d'équipe détectés"}</div>
              {teamConflicts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs mb-2">
                  <span className="text-gray-300 font-mono">&quot;{c.team1}&quot;</span>
                  <span className="text-gray-600">≈</span>
                  <span className="text-gray-300 font-mono">&quot;{c.team2}&quot;</span>
                  {canWrite && <button onClick={() => { setReconcileTeam(c); setReconcileTo(c.team1); }} className="px-2 py-0.5 rounded text-xs border border-yellow-600 text-yellow-400 hover:bg-yellow-900/20">
                    {lang === "en" ? "Reconcile" : "Réconcilier"}
                  </button>}
                </div>
              ))}
            </div>
          )}

          {reconcileTeam && (
            <div className="cyber-card rounded-xl p-4 mb-4">
              <div className="text-xs font-bold text-white mb-3">{lang === "en" ? `Reconcile "${reconcileTeam.team1}" and "${reconcileTeam.team2}"` : `Réconcilier "${reconcileTeam.team1}" et "${reconcileTeam.team2}"`}</div>
              <div className="flex gap-2 mb-3">
                {[reconcileTeam.team1, reconcileTeam.team2].map(name => (
                  <button key={name} onClick={() => setReconcileTo(name)}
                    className={`px-3 py-1.5 rounded text-xs border transition-all ${reconcileTo === name ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-400"}`}>
                    {lang === "en" ? `Keep "${name}"` : `Garder "${name}"`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={reconcileTeams} className="btn-neon px-3 py-1.5 rounded text-xs">{lang === "en" ? "Confirm" : "Confirmer"}</button>
                <button onClick={() => setReconcileTeam(null)} className="text-gray-500 text-xs hover:text-white">{lang === "en" ? "Cancel" : "Annuler"}</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="text-left py-2 px-3 font-normal">{lang === "en" ? "Participant" : "Participant"}</th>
                  <th className="text-left py-2 px-3 font-normal">{lang === "en" ? "CTF Username" : "Pseudo CTF"}</th>
                  <th className="text-left py-2 px-3 font-normal">{lang === "en" ? "Team" : "Équipe"}</th>
                  <th className="text-left py-2 px-3 font-normal">{lang === "en" ? "Ticket" : "Ticket"}</th>
                  <th className="text-left py-2 px-3 font-normal">{lang === "en" ? "CTFd Account" : "Compte CTFd"}</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id as number} className="border-b border-gray-900 hover:bg-white/[0.01]">
                    <td className="py-2 px-3 text-white">{p.fname as string} {p.lname as string}<br /><span className="text-gray-500">{p.email as string}</span></td>
                    <td className="py-2 px-3 font-mono text-neon-green">{(p.ctfCompetitorName as string) || <span className="text-gray-600">—</span>}</td>
                    <td className="py-2 px-3 font-mono text-cyan-400">{(p.ctfTeamName as string) || <span className="text-gray-600">solo</span>}</td>
                    <td className="py-2 px-3 text-gray-400">{p.ticketType as string}</td>
                    <td className="py-2 px-3">
                      {p.ctfAccountCreated
                        ? <span className="text-neon-green text-xs">{lang === "en" ? "✓ Created" : "✓ Créé"}</span>
                        : <span className="text-gray-600 text-xs">{lang === "en" ? "Pending" : "En attente"}</span>}
                    </td>
                    <td className="py-2 px-3">
                      {canWrite && !p.ctfAccountCreated && (
                        <button onClick={() => syncOne(p.id as number)} className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors">
                          {lang === "en" ? "Create account" : "Créer compte"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!participants.length && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No CTF participants (registrations with validated CTF ticket)" : "Aucun participant CTF (inscriptions avec ticket CTF validées)"}</p>}
          </div>
        </div>
      )}

    </div>
  );
}

function TransactionsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const { lang } = useAdminT();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [fState, setFState] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/transactions");
    if (r.ok) setRows(await r.json());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = fState ? rows.filter(r => r.state === fState) : rows;

  const resend = async (registrationId: number) => {
    setBusyId(registrationId);
    const res = await fetch("/api/admin/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend", registrationId }),
    });
    setBusyId(null);
    setMsg(res.ok ? (lang === "en" ? "Ticket resent ✓" : "Billet renvoyé ✓") : (lang === "en" ? "Send failed" : "Échec de l'envoi"));
    if (res.ok) load();
    setTimeout(() => setMsg(null), 3000);
  };

  const stateBadge = (s: string) => {
    const map: Record<string, string> = { success: "#00ff9d", failed: "#ff0066", pending: "#ffaa00" };
    const c = map[s] || "#888";
    return <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: c + "20", color: c }}>{s}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">💳 Transactions ({filtered.length})</h1>
          <p className="text-gray-500 text-xs mt-1">{lang === "en" ? "All payment attempts (Mobile Money · Stripe)" : "Toutes les tentatives de paiement (Mobile Money · Stripe)"}</p>
        </div>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors">{lang === "en" ? "↻ Refresh" : "↻ Rafraîchir"}</button>
      </div>

      <div className="flex gap-2 mb-4">
        {["", "success", "pending", "failed"].map(s => (
          <button key={s || "all"} onClick={() => setFState(s)} className={`text-xs px-3 py-1.5 rounded border transition-all ${fState === s ? "border-neon-green/40 text-neon-green bg-neon-green/10" : "border-gray-800 text-gray-500 hover:text-white"}`}>
            {s === "" ? (lang === "en" ? "All" : "Toutes") : s === "success" ? (lang === "en" ? "Successful" : "Réussies") : s === "pending" ? (lang === "en" ? "Pending" : "En attente") : (lang === "en" ? "Failed" : "Échecs")}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 px-4 py-2 rounded text-xs text-neon-green border border-neon-green/30 bg-neon-green/5">{msg}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neon-green/10 text-gray-500 text-left">
              {(lang === "en" ? ["Registrant", "Method / Currency", "Amount", "Provider ref.", "State", "Final response", "Ticket sent", "Date", "Actions"] : ["Inscrit", "Moyen / Devise", "Montant", "Réf. fournisseur", "État", "Réponse finale", "Ticket envoyé", "Date", "Actions"]).map(h => (
                <th key={h} className="py-2 px-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const provider = r.provider as string;
              const isStripe = provider === "stripe";
              const isMtn = provider === "netticket_mtn";
              const isOrange = provider === "netticket_orange";
              const currency = isStripe ? "USD" : "XAF";
              const providerIcon = isStripe ? "💳" : isMtn ? "📱" : isOrange ? "📱" : "—";
              const providerColor = isStripe ? "#00ccff" : isMtn ? "#ffcc00" : isOrange ? "#ff7900" : "#888";
              const providerName = isStripe ? "Stripe" : isMtn ? "MTN MoMo" : isOrange ? "Orange Money" : provider;
              const fmtAmount = isStripe
                ? `$${(r.amount as number).toLocaleString("en-US")}`
                : `${(r.amount as number).toLocaleString("fr-FR")} XAF`;
              return (
                <tr key={r.id as number} className="border-b border-gray-800 hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-3">
                    <span className="text-white">{(r.registrantName as string) || "—"}</span>
                    <br/><span className="text-gray-500">{r.email as string}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                        style={{ background: providerColor + "20", color: providerColor, border: `1px solid ${providerColor}40` }}
                      >
                        {providerIcon} {providerName}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono mt-0.5 block">{currency}</span>
                  </td>
                  <td className="py-2 px-3 text-gray-300 font-mono font-bold" style={{ color: isStripe ? "#00ccff" : "var(--txt-2)" }}>{fmtAmount}</td>
                  <td className="py-2 px-3">
                    {r.providerRef
                      ? <span className="text-gray-500 font-mono text-[10px] max-w-[120px] block truncate" title={r.providerRef as string}>{r.providerRef as string}</span>
                      : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="py-2 px-3">{stateBadge(r.state as string)}</td>
                  <td className="py-2 px-3 text-gray-500 max-w-[180px] truncate" title={r.message as string}>{(r.message as string) || "—"}</td>
                  <td className="py-2 px-3">
                    {r.ticketEmailSent ? <span className="text-neon-green">{lang === "en" ? "✓ Yes" : "✓ Oui"}</span> : <span className="text-gray-600">{lang === "en" ? "✗ No" : "✗ Non"}</span>}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{new Date(r.createdAt as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="py-2 px-3">
                    {canWrite && !!r.registrationId && r.state === "success" && (
                      <button disabled={busyId === r.registrationId} onClick={() => resend(r.registrationId as number)} className="text-xs px-3 py-1 rounded border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-colors disabled:opacity-50">
                        {busyId === r.registrationId ? "…" : lang === "en" ? "✉ Resend" : "✉ Renvoyer"}
                      </button>
                    )}
                    {isStripe && !!r.providerRef && (
                      <a
                        href={`https://dashboard.stripe.com/payments/${r.providerRef}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1 rounded border border-blue-900/40 text-blue-400 hover:bg-blue-900/20 transition-colors block mt-1"
                      >
                        ↗ Stripe
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No transactions" : "Aucune transaction"}</p>}
      </div>
    </div>
  );
}

function TestimonyPanel({ canWrite = true }: { canWrite?: boolean }) {
  const confirm = useConfirm();
  const { lang } = useAdminT();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ quoteEn: "", quoteFr: "", author: "", isVisible: true, sortOrder: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/testimonies");
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ quoteEn: "", quoteFr: "", author: "", isVisible: true, sortOrder: 0 }); setEditing(null); setShowForm(false); };

  const save = async () => {
    const url = editing ? `/api/admin/testimonies/${editing}` : "/api/admin/testimonies";
    await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    resetForm();
    load();
  };

  const del = async (id: number) => {
    if (!(await confirm({ message: lang === "en" ? "Delete this testimony?" : "Supprimer ce témoignage ?", danger: true, confirmLabel: lang === "en" ? "Delete" : "Supprimer" }))) return;
    await fetch(`/api/admin/testimonies/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{lang === "en" ? "💬 Testimonies" : "💬 Témoignages"}</h1>
          <p className="text-gray-500 text-xs mt-1">{lang === "en" ? "Manage reviews displayed in the &quot;What They Say&quot; section of the site" : "Gérez les avis affichés dans la section &quot;What They Say&quot; du site"}</p>
        </div>
        {canWrite && <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "+ Add" : "+ Ajouter"}</button>}
      </div>

      {canWrite && showForm && (
        <div className="cyber-card rounded-xl p-6 mb-6">
          <h3 className="text-neon-green text-sm mb-4">{editing ? (lang === "en" ? "Edit testimony" : "Modifier le témoignage") : (lang === "en" ? "New testimony" : "Nouveau témoignage")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Quote (EN) *" : "Citation (EN) *"}</label>
              <textarea rows={3} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.quoteEn as string) || ""} onChange={e => setForm({ ...form, quoteEn: e.target.value })} placeholder="Quote in English…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Quote (FR)" : "Citation (FR)"} <span className="text-gray-700">— {lang === "en" ? "optional" : "optionnel"}</span></label>
              <textarea rows={3} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.quoteFr as string) || ""} onChange={e => setForm({ ...form, quoteFr: e.target.value })} placeholder={lang === "en" ? "Quote in French… (if empty, EN version will be used)" : "Citation en français… (si vide, la version EN sera utilisée)"} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Author *" : "Auteur *"}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.author as string) || ""} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="ex : EOCON 2024 Attendee" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Display order" : "Ordre d'affichage"}</label>
              <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
              {lang === "en" ? "Visible on site" : "Visible sur le site"}
            </label>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} disabled={!(form.quoteEn as string)?.trim() || !(form.author as string)?.trim()} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green disabled:opacity-40">{lang === "en" ? "Save" : "Sauvegarder"}</button>
            <button onClick={resetForm} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Cancel" : "Annuler"}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-600 text-xs">{lang === "en" ? "Loading…" : "Chargement…"}</p> : items.length === 0 ? (
        <p className="text-gray-600 text-xs text-center py-12">{lang === "en" ? "No testimonies — the site displays default i18n texts." : "Aucun témoignage — le site affiche les textes par défaut de i18n."}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id as number} className={`cyber-card rounded-xl p-5 flex flex-col gap-3 ${!item.isVisible ? "opacity-50" : ""}`}>
              <div className="text-neon-green/40 text-3xl font-serif leading-none">&quot;</div>
              <p className="text-gray-200 text-sm italic leading-relaxed flex-1">{item.quoteEn as string}</p>
              {!!(item.quoteFr) && (
                <p className="text-gray-500 text-xs italic border-t border-gray-800 pt-2">{item.quoteFr as string}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-neon-green/10">
                <p className="text-neon-green/60 text-xs font-mono">— {item.author as string}</p>
                <div className="flex items-center gap-2">
                  {!item.isVisible && <span className="text-xs text-gray-600">{lang === "en" ? "Hidden" : "Masqué"}</span>}
                  <span className="text-xs text-gray-700">#{item.sortOrder as number}</span>
                  {canWrite && <>
                    <button onClick={() => { setForm({ ...item }); setEditing(item.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">✏</button>
                    <button onClick={() => del(item.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">✕</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoPanel({ canWrite = true }: { canWrite?: boolean }) {
  const confirm = useConfirm();
  const { lang } = useAdminT();
  const [videos, setVideos] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ isVisible: true, sortOrder: 0, edition: "2025" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/videos");
    if (r.ok) setVideos(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/admin/videos/${editing}` : "/api/admin/videos";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); setEditing(null); setForm({ isVisible: true, sortOrder: 0, edition: "2025" });
    load();
  };

  const del = async (id: number) => {
    if (!(await confirm({ message: lang === "en" ? "Delete this video?" : "Supprimer cette vidéo ?", danger: true, confirmLabel: lang === "en" ? "Delete" : "Supprimer" }))) return;
    await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
    load();
  };

  const CATEGORIES = ["keynote", "talk", "workshop", "panel"];

  const getYoutubeThumbnail = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">{lang === "en" ? "📹 Video Library" : "📹 Vidéothèque"}</h1>
          <p className="text-gray-500 text-xs mt-1">{lang === "en" ? "Manage session videos from past editions" : "Gérez les vidéos des sessions des éditions passées"}</p>
        </div>
        {canWrite && <button onClick={() => { setForm({ isVisible: true, sortOrder: 0, edition: "2025" }); setEditing(null); setShowForm(true); }} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "+ Add" : "+ Ajouter"}</button>}
      </div>

      {canWrite && showForm && (
        <div className="cyber-card rounded-xl p-6 mb-6">
          <h3 className="text-neon-green text-sm mb-4">{editing ? (lang === "en" ? "Edit video" : "Modifier la vidéo") : (lang === "en" ? "New video" : "Nouvelle vidéo")}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { key: "title", label: "Titre (FR) *" },
              { key: "titleEn", label: "Title (EN)" },
              { key: "youtubeUrl", label: "URL YouTube *" },
              { key: "speaker", label: "Speaker" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Edition" : "Édition"}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.edition as string) || "2025"} onChange={e => setForm({ ...form, edition: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Category" : "Catégorie"}</label>
              <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={(form.category as string) || ""} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">{lang === "en" ? "— None —" : "— Aucune —"}</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-dark-800">{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Description (FR)</label>
              <textarea rows={2} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.description as string) || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Order" : "Ordre"}</label>
              <input type="number" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.sortOrder as number) || 0} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer mt-5">
              <input type="checkbox" checked={!!form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} />
              {lang === "en" ? "Visible on site" : "Visible sur le site"}
            </label>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">{lang === "en" ? "Save" : "Sauvegarder"}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Cancel" : "Annuler"}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-600 text-xs">{lang === "en" ? "Loading…" : "Chargement…"}</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => {
            const thumb = getYoutubeThumbnail(v.youtubeUrl as string);
            return (
              <div key={v.id as number} className="cyber-card rounded-xl overflow-hidden">
                {thumb && <img src={thumb} alt={v.title as string} className="w-full h-32 object-cover" />}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-bold truncate">{v.title as string}</p>
                      {!!(v.speaker) && <p className="text-gray-500 text-xs">{v.speaker as string}</p>}
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--ac-bg)", color: "var(--ac)" }}>EOCON {v.edition as string}</span>
                        {!!(v.category) && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{v.category as string}</span>}
                        {!v.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-500">{lang === "en" ? "Hidden" : "Masqué"}</span>}
                      </div>
                    </div>
                    {canWrite && <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setForm({ ...v }); setEditing(v.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">✏</button>
                      <button onClick={() => del(v.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">✕</button>
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}
          {!videos.length && !loading && <p className="text-gray-600 text-xs py-8 text-center col-span-3">{lang === "en" ? "No videos — click + Add" : "Aucune vidéo — cliquez sur + Ajouter"}</p>}
        </div>
      )}
    </div>
  );
}

function AuditPanel({ canWrite = true }: { canWrite?: boolean } = {}) {
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
        {canWrite && <button onClick={purge} disabled={purging} className="text-xs px-3 py-1.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
          {purging ? "…" : t.purgeOld}
        </button>}
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
        <p className="text-gray-600 text-sm font-mono">{t.loading}</p>
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

// ---- Domain Health Dashboard ----

interface DashboardExtra {
  budget: { category: string; planned: number; actual: number }[];
  logistics: { done: boolean; deadline: string | null }[];
  sessions: { date: string | null }[];
  socialPosts: { status: string }[];
  sponsorProspects: { status: string }[];
  speakerOnboarding: { completed: boolean }[];
  cfpDetailed: { status: string; scheduledInProgramme: boolean }[];
  registrationsPending: number;
  registrationsValidated: number;
}

function HealthDot({ color }: { color: "green" | "orange" | "red" | "grey" }) {
  const map = { green: "#00ff9d", orange: "#ffaa00", red: "#ff0066", grey: "#555" };
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: map[color], boxShadow: `0 0 6px ${map[color]}` }} />;
}

function MiniBar({ value, total, color, danger }: { value: number; total: number; color: string; danger?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const barColor = danger && pct >= 100 ? "#ff0066" : color;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{value} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function DomainCard({
  title, color, health, onNavigate, children, borderTop,
}: {
  title: string; color: string; health: "green" | "orange" | "red" | "grey";
  onNavigate?: () => void; children: React.ReactNode; borderTop?: boolean;
}) {
  const { lang } = useAdminT();
  return (
    <div
      className="cyber-card rounded-xl p-5"
      style={{ borderLeft: `4px solid ${color}`, ...(borderTop ? { borderTop: `1px solid ${color}30` } : {}) }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HealthDot color={health} />
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-xs px-2 py-0.5 rounded border transition-all hover:brightness-125"
            style={{ color, borderColor: color + "50", background: color + "12" }}
          >
            {lang === "en" ? "→ View" : "→ Voir"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-black font-mono" style={{ color: color || "var(--txt-2)", fontFamily: "'Share Tech Mono', monospace" }}>{value}</div>
      <div className="text-gray-600 text-xs mt-0.5 uppercase tracking-wider leading-tight">{label}</div>
    </div>
  );
}

function DashboardHealthPanel({
  stats, extra, analyticsData, onNavigate, canNavigate,
}: {
  stats: Record<string, number>;
  extra: DashboardExtra;
  analyticsData: Record<string, unknown> | null;
  onNavigate: (tab: Tab) => void;
  canNavigate: (tab: Tab) => boolean;
}) {
  const { lang } = useAdminT();
  // ── CFP ──
  const cfpTotal = stats.cfp || 0;
  const cfpAccepted = extra.cfpDetailed.filter(s => s.status === "accepted" || s.status === "onboarding" || s.status === "confirmed" || s.status === "scheduled").length;
  const cfpConfirmed = extra.cfpDetailed.filter(s => s.status === "confirmed" || s.status === "scheduled").length;
  const cfpScheduled = extra.cfpDetailed.filter(s => s.scheduledInProgramme).length;
  const cfpHealth: "green" | "orange" | "red" =
    cfpConfirmed === 0 ? "red" :
    cfpScheduled < cfpConfirmed * 0.5 ? "orange" : "green";

  // ── Programme ──
  const sessTotal = extra.sessions.length;
  const sessScheduled = extra.sessions.filter(s => !!s.date).length;
  const sessBacklog = sessTotal - sessScheduled;
  const sessHealth: "green" | "orange" | "red" =
    sessTotal === 0 || sessScheduled / Math.max(sessTotal, 1) < 0.3 ? "red" :
    sessScheduled / Math.max(sessTotal, 1) < 0.7 ? "orange" : "green";

  // ── Speakers ──
  const speakerTotal = stats.speakers || 0;
  const speakerVisible = speakerTotal; // approximation — visible count from stats
  const onboardingPending = extra.speakerOnboarding.filter(o => !o.completed).length;
  const speakerHealth: "green" | "orange" | "red" =
    speakerTotal === 0 ? "red" : onboardingPending > 0 ? "orange" : "green";

  // ── Inscriptions ──
  const validated = extra.registrationsValidated;
  const pendingPay = extra.registrationsPending;
  const regTotal = validated + pendingPay;
  const capacity = 200;
  const fillPct = Math.round((validated / capacity) * 100);
  const inscHealth: "green" | "orange" | "red" =
    validated === 0 ? "red" : fillPct < 50 ? "orange" : "green";

  // ── Budget ──
  const capital = extra.budget.filter(b => b.category === "revenue").reduce((a, b) => a + b.planned, 0);
  const depenses = extra.budget.filter(b => b.category === "costs").reduce((a, b) => a + b.actual, 0);
  const solde = capital - depenses;
  const remaining = capital - depenses;
  const budgetHealth: "green" | "orange" | "red" =
    depenses > capital ? "red" : remaining < capital * 0.2 ? "orange" : "green";

  // ── Sponsors ──
  const sponsorConfirmed = stats.sponsors || 0;
  const prospectsByStage: Record<string, number> = {};
  for (const p of extra.sponsorProspects) {
    prospectsByStage[p.status] = (prospectsByStage[p.status] || 0) + 1;
  }
  const sponsorHealth: "green" | "orange" | "red" =
    sponsorConfirmed === 0 ? "red" : sponsorConfirmed < 3 ? "orange" : "green";

  // ── Bénévoles ──
  const volTotal = stats.volunteers || 0;
  const volAccepted = (analyticsData?.volAccepted as number) || 0;
  const volWithRole = extra.registrationsPending; // rough — we don't have this separately; show 0
  const volHealth: "green" | "orange" | "red" =
    volAccepted < 5 ? "red" : volAccepted < 10 ? "orange" : "green";

  // ── Logistique ──
  const taskTotal = extra.logistics.length;
  const taskDone = extra.logistics.filter(t => t.done).length;
  const now = new Date();
  const taskOverdue = extra.logistics.filter(t => !t.done && t.deadline && new Date(t.deadline) < now).length;
  const logHealth: "green" | "orange" | "red" =
    taskOverdue > 0 ? "red" : taskDone < taskTotal * 0.5 ? "orange" : "green";

  // ── Communication ──
  const postsFailed = extra.socialPosts.filter(p => p.status === "failed").length;
  const postsScheduled = extra.socialPosts.filter(p => p.status === "scheduled").length;
  const postsPublished = extra.socialPosts.filter(p => p.status === "published").length;
  const commHealth: "green" | "orange" | "red" =
    postsFailed > 0 ? "red" : postsScheduled === 0 ? "orange" : "green";

  // ── Check-in ──
  const checkedIn = stats.checkedIn || 0;
  const checkinRate = validated > 0 ? Math.round((checkedIn / validated) * 100) : 0;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* CFP */}
      <DomainCard title="CFP" color="#cc00ff" health={cfpHealth} onNavigate={canNavigate("pipeline") ? () => onNavigate("pipeline") : undefined}>
        {/* Funnel */}
        <div className="flex items-center gap-1 mb-3">
          {(lang === "en" ? [
            { label: "Submitted", val: cfpTotal },
            { label: "Accepted", val: cfpAccepted },
            { label: "Confirmed", val: cfpConfirmed },
            { label: "Scheduled", val: cfpScheduled },
          ] : [
            { label: "Soumis", val: cfpTotal },
            { label: "Acceptés", val: cfpAccepted },
            { label: "Confirmés", val: cfpConfirmed },
            { label: "Programmés", val: cfpScheduled },
          ]).map((step, i) => (
            <div key={step.label} className="flex items-center gap-1 flex-1">
              <div className="flex-1 rounded-lg p-1.5 text-center" style={{ background: "#cc00ff15", border: "1px solid #cc00ff30" }}>
                <div className="text-base font-black font-mono" style={{ color: "#cc00ff", fontFamily: "'Share Tech Mono', monospace" }}>{step.val}</div>
                <div className="text-gray-600 text-xs leading-tight">{step.label}</div>
              </div>
              {i < 3 && <span className="text-gray-700 text-xs shrink-0">›</span>}
            </div>
          ))}
        </div>
      </DomainCard>

      {/* Programme */}
      <DomainCard title="Programme" color="#00ccff" health={sessHealth} onNavigate={canNavigate("pipeline") ? () => onNavigate("pipeline") : undefined}>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <MetricRow label={lang === "en" ? "Scheduled" : "Programmées"} value={sessScheduled} color="#00ccff" />
          <MetricRow label="Total sessions" value={sessTotal} color="#aaa" />
          <MetricRow label="Backlog" value={sessBacklog} color={sessBacklog > 0 ? "#ffaa00" : "#555"} />
        </div>
        <MiniBar value={sessScheduled} total={Math.max(sessTotal, 1)} color="#00ccff" />
      </DomainCard>

      {/* Speakers */}
      <DomainCard title="Speakers" color="#00ff9d" health={speakerHealth} onNavigate={canNavigate("pipeline") ? () => onNavigate("pipeline") : undefined}>
        <div className="grid grid-cols-3 gap-3">
          <MetricRow label="Total" value={speakerTotal} color="#00ff9d" />
          <MetricRow label={lang === "en" ? "Visible" : "Visibles"} value={speakerVisible} color="#aaa" />
          <MetricRow label={lang === "en" ? "Onboarding pending" : "Onboarding en attente"} value={onboardingPending} color={onboardingPending > 0 ? "#ffaa00" : "#555"} />
        </div>
      </DomainCard>

      {/* Inscriptions */}
      <DomainCard title={lang === "en" ? "Registrations" : "Inscriptions"} color="#ff6600" health={inscHealth} onNavigate={canNavigate("registrations") ? () => onNavigate("registrations") : undefined}>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <MetricRow label={lang === "en" ? "Validated" : "Validées"} value={validated} color="#ff6600" />
          <MetricRow label={lang === "en" ? "Pending" : "En attente"} value={pendingPay} color="#ffaa00" />
          <MetricRow label={lang === "en" ? "Capacity" : "Capacité"} value={`${fillPct}%`} color={fillPct >= 80 ? "#00ff9d" : fillPct >= 50 ? "#ffaa00" : "#ff0066"} />
        </div>
        <MiniBar value={validated} total={capacity} color="#ff6600" />
      </DomainCard>

      {/* Budget */}
      <DomainCard title="Budget" color="#ffaa00" health={budgetHealth} onNavigate={canNavigate("budget") ? () => onNavigate("budget") : undefined}>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <MetricRow label={lang === "en" ? "Capital" : "Capital"} value={capital > 0 ? `${fmt(Math.round(capital / 1000))}k` : "—"} color="#aaa" />
          <MetricRow label={lang === "en" ? "Actual expenses" : "Dépenses réelles"} value={depenses > 0 ? `${fmt(Math.round(depenses / 1000))}k` : "—"} color={depenses > capital ? "#ff0066" : "#ffaa00"} />
          <MetricRow label={lang === "en" ? "Net balance" : "Solde net"} value={capital > 0 ? `${solde >= 0 ? "+" : ""}${fmt(Math.round(solde / 1000))}k` : "—"} color={solde >= 0 ? "#00ff9d" : "#ff0066"} />
        </div>
        <MiniBar value={depenses} total={Math.max(capital, 1)} color="#ffaa00" danger />
      </DomainCard>

      {/* Sponsors */}
      <DomainCard title="Sponsors" color="#ffaa00" health={sponsorHealth} onNavigate={canNavigate("sponsors") ? () => onNavigate("sponsors") : undefined}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <MetricRow label={lang === "en" ? "Confirmed" : "Confirmés"} value={sponsorConfirmed} color="#ffaa00" />
          <MetricRow label={lang === "en" ? "Pipeline total" : "Pipeline total"} value={extra.sponsorProspects.length} color="#aaa" />
        </div>
        <div className="flex flex-wrap gap-1">
          {["contacted", "meeting", "positive", "concluded"].map(stage => (
            prospectsByStage[stage] ? (
              <span key={stage} className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: "#ffaa0015", color: "#ffaa00" }}>
                {stage}: {prospectsByStage[stage]}
              </span>
            ) : null
          ))}
        </div>
      </DomainCard>

      {/* Bénévoles */}
      <DomainCard title={lang === "en" ? "Volunteers" : "Bénévoles"} color="#0066ff" health={volHealth} onNavigate={canNavigate("volunteers") ? () => onNavigate("volunteers") : undefined}>
        <div className="grid grid-cols-3 gap-3">
          <MetricRow label={lang === "en" ? "Applications" : "Candidatures"} value={volTotal} color="#aaa" />
          <MetricRow label={lang === "en" ? "Accepted" : "Acceptés"} value={volAccepted} color="#0066ff" />
          <MetricRow label={lang === "en" ? "Assigned roles" : "Rôles assignés"} value={volWithRole} color="#00ff9d" />
        </div>
      </DomainCard>

      {/* Logistique */}
      <DomainCard title={lang === "en" ? "Logistics" : "Logistique"} color="#ff6600" health={logHealth} onNavigate={canNavigate("logistics") ? () => onNavigate("logistics") : undefined}>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <MetricRow label={lang === "en" ? "Done" : "Faites"} value={taskDone} color="#00ff9d" />
          <MetricRow label="Total" value={taskTotal} color="#aaa" />
          <MetricRow label={lang === "en" ? "Late" : "En retard"} value={taskOverdue} color={taskOverdue > 0 ? "#ff0066" : "#555"} />
        </div>
        <MiniBar value={taskDone} total={Math.max(taskTotal, 1)} color="#ff6600" />
      </DomainCard>

      {/* Communication */}
      <DomainCard title="Communication" color="#cc00ff" health={commHealth} onNavigate={canNavigate("communication") ? () => onNavigate("communication") : undefined}>
        <div className="grid grid-cols-3 gap-3">
          <MetricRow label={lang === "en" ? "Scheduled" : "Planifiés"} value={postsScheduled} color="#ffaa00" />
          <MetricRow label={lang === "en" ? "Published" : "Publiés"} value={postsPublished} color="#00ff9d" />
          <MetricRow label={lang === "en" ? "Failed" : "Échoués"} value={postsFailed} color={postsFailed > 0 ? "#ff0066" : "#555"} />
        </div>
      </DomainCard>

      {/* Check-in */}
      <DomainCard title="Check-in" color="#00ccff" health="grey" onNavigate={canNavigate("registrations") ? () => onNavigate("registrations") : undefined}>
        <div className="grid grid-cols-3 gap-3 mb-2">
          <MetricRow label={lang === "en" ? "Checked in" : "Enregistrés"} value={checkedIn} color="#00ccff" />
          <MetricRow label={lang === "en" ? "Total validated" : "Validés total"} value={validated} color="#aaa" />
          <MetricRow label={lang === "en" ? "Rate" : "Taux"} value={`${checkinRate}%`} color={checkinRate >= 50 ? "#00ff9d" : "#888"} />
        </div>
        <MiniBar value={checkedIn} total={Math.max(validated, 1)} color="#00ccff" />
      </DomainCard>

    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTabRaw] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("admin_tab") as Tab | null;
      if (saved) return saved;
    }
    return "dashboard";
  });
  const setTab = useCallback((t: Tab) => {
    sessionStorage.setItem("admin_tab", t);
    setTabRaw(t);
  }, []);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(false);
  const [dashboardExtra, setDashboardExtra] = useState<DashboardExtra>({
    budget: [],
    logistics: [],
    sessions: [],
    socialPosts: [],
    sponsorProspects: [],
    speakerOnboarding: [],
    cfpDetailed: [],
    registrationsPending: 0,
    registrationsValidated: 0,
  });
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cfpNotes, setCfpNotes] = useState<Record<number, string>>({});
  const [onboarding, setOnboarding] = useState<Record<number, Record<string, boolean | string>>>({});
  const [detail, setDetail] = useState<{ type: string; item: Record<string, unknown> } | null>(null);
  const [sponsorPkgs, setSponsorPkgs] = useState<Record<string, unknown>[]>([]);
  const [sponsorPipelineData, setSponsorPipelineData] = useState<Record<string, unknown>[]>([]);
  const [sponsorAssignees, setSponsorAssignees] = useState<{ id: number; name: string }[]>([]);
  const [lang, setLang] = useState<AdminLang>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("admin_lang") as AdminLang) || "fr";
    return "fr";
  });
  const t = adminI18n[lang];
  const changeLang = (l: AdminLang) => { setLang(l); localStorage.setItem("admin_lang", l); };

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("admin_theme") as "dark" | "light") || "dark";
    return "dark";
  });
  const toggleTheme = () => {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("admin_theme", next);
      return next;
    });
  };
  // Propagate theme to <body> so that CSS can hide .scanlines in light mode
  useEffect(() => {
    if (theme === "light") document.body.setAttribute("data-admin-theme", "light");
    else document.body.removeAttribute("data-admin-theme");
    return () => document.body.removeAttribute("data-admin-theme");
  }, [theme]);

  const router = useRouter();

  // Current user identity + permissions
  const [userInfo, setUserInfo] = useState<{ isLegacy: boolean; id?: number; name: string; email?: string; mfaEnabled?: boolean; mfaRequired?: boolean; isRoot?: boolean; currencySelectorEnabled?: boolean; permissions: Record<string, string> } | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const refreshMe = useCallback(() => {
    fetch("/api/admin/me").then(r => r.ok ? r.json() : null).then(info => {
      if (info) setUserInfo(info);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshMe();
    // Re-fetch permissions every 30 s so changes take effect without reconnecting
    const interval = setInterval(refreshMe, 30_000);
    // Re-fetch immediately when the user switches back to this tab
    const onVisible = () => { if (document.visibilityState === "visible") refreshMe(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshMe]);

  // Tab → required permission key (undefined = always visible)
  const TAB_PERMISSION: Partial<Record<Tab, string | undefined>> = {
    dashboard: undefined,        // always visible
    pilotage: "pilotage",
    pipeline: "cfp",
    sessions: "sessions",
    "past-speakers": "speakers",
    registrations: "registrations",
    volunteers: "volunteers",
    newsletter: "newsletter",
    sponsors: "sponsors",
    "sponsor-pipeline": "sponsor-pipeline",
    prospection: "prospection",
    "prospection-speakers": "prospection-speakers",
    tickets: "tickets",
    "sponsor-packages": "sponsor-packages",
    budget: "budget",
    transactions: "transactions",
    ctf: "ctf",
    live: "live",
    "strategic-plan": "strategic-plan",
    communication: "communication",
    campaigns: "campaigns",
    library: "library",
    "cyber-watch": "cyber-watch",
    logistics: "logistics",
    certificates: "certificates",
    export: "export",
    users: "users",
    profiles: "profiles",
    audit: "audit",
    team: "team",
    video: "video",
    testimony: "testimony",
    settings: "settings",
  };

  const canSeeTab = (tabId: Tab): boolean => {
    if (!userInfo) return tabId === "dashboard"; // hide all protected tabs until identity confirmed
    if (userInfo.isLegacy) return true; // legacy token = full access
    const permKey = TAB_PERMISSION[tabId];
    if (permKey === undefined) return true; // always visible
    // Pilotage tab is also accessible via pilotage-meetings permission
    if (tabId === "pilotage" && !!userInfo.permissions["pilotage-meetings"]) return true;
    return !!userInfo.permissions[permKey as string];
  };

  const canRenderTab = (tabId: Tab): boolean => {
    if (!userInfo) return tabId === "dashboard"; // deny all protected tabs until identity confirmed
    if (userInfo.isLegacy) return true;
    const permKey = TAB_PERMISSION[tabId];
    if (permKey === undefined) return true;
    // Pilotage tab is also accessible via pilotage-meetings permission
    if (tabId === "pilotage" && !!userInfo.permissions["pilotage-meetings"]) return true;
    return !!userInfo.permissions[permKey as string];
  };

  const activeTab = canRenderTab(tab) ? tab : "dashboard";

  // Permission level check for a module (drives read-only UI in panels).
  const can = (moduleKey: string, level: "read" | "write" = "write"): boolean => {
    if (!userInfo || userInfo.isLegacy) return true;
    const lvl = userInfo.permissions[moduleKey];
    return level === "read" ? (lvl === "read" || lvl === "write") : lvl === "write";
  };

  const logout = async () => {
    await Promise.all([
      fetch("/api/admin/login", { method: "DELETE" }),
      fetch("/api/admin/auth/logout", { method: "DELETE" }),
    ]);
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
        const [sRes, pkgRes, pipeRes, assigneesRes] = await Promise.all([
          fetch("/api/admin/sponsors"),
          fetch("/api/admin/sponsor-packages"),
          fetch("/api/admin/sponsor-prospects"),
          fetch("/api/admin/sponsor-prospects/assignees"),
        ]);
        if (sRes.ok) { const json = await sRes.json(); setData(d => ({ ...d, sponsors: json })); }
        if (pkgRes.ok) { const json = await pkgRes.json(); setSponsorPkgs(json); }
        if (pipeRes.ok) { const json = await pipeRes.json(); setSponsorPipelineData(json); }
        if (assigneesRes.ok) { const json = await assigneesRes.json(); setSponsorAssignees(json); }
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

  // Fetch extra data for domain health dashboard
  useEffect(() => {
    const load = async () => {
      const [budgetRes, logRes, sessRes, postsRes, prospectsRes, obRes, cfpRes, regRes] = await Promise.allSettled([
        fetch("/api/admin/budget"),
        fetch("/api/admin/logistics"),
        fetch("/api/admin/sessions"),
        fetch("/api/admin/ai/social-posts"),
        fetch("/api/admin/sponsor-prospects"),
        fetch("/api/admin/profiles?type=onboarding"),
        fetch("/api/admin/submissions?type=cfp"),
        fetch("/api/admin/submissions?type=registration"),
      ]);
      const safeJson = async (r: PromiseSettledResult<Response>): Promise<unknown[]> => {
        if (r.status === "fulfilled" && r.value.ok) { try { return await r.value.json(); } catch { return []; } }
        return [];
      };
      const budget = (await safeJson(budgetRes)) as { category: string; planned: number; actual: number }[];
      const logistics = (await safeJson(logRes)) as { done: boolean; deadline: string | null }[];
      const sessions = (await safeJson(sessRes)) as { date: string | null }[];
      const socialPosts = (await safeJson(postsRes)) as { status: string }[];
      const sponsorProspects = (await safeJson(prospectsRes)) as { status: string }[];
      const cfpRaw = (await safeJson(cfpRes)) as { status: string; pipelineStage?: string }[];
      const cfpDetailed = cfpRaw.map(c => ({
        status: c.status,
        scheduledInProgramme: c.pipelineStage === "scheduled" || c.status === "scheduled",
      }));
      const regRaw = (await safeJson(regRes)) as { status: string }[];
      const registrationsValidated = regRaw.filter(r => r.status === "validated" || r.status === "paid").length;
      const registrationsPending = regRaw.filter(r => r.status === "pending").length;

      // Onboarding: fetch speakers and check if they have talkTitle (basic completion proxy)
      let speakerOnboarding: { completed: boolean }[] = [];
      try {
        const spRes = await fetch("/api/admin/speakers");
        if (spRes.ok) {
          const spData = await spRes.json() as { talkTitle?: string; photoUrl?: string; bio?: string }[];
          speakerOnboarding = spData.map(s => ({
            completed: !!(s.talkTitle && s.photoUrl && s.bio),
          }));
        }
      } catch { /* ignore */ }

      setDashboardExtra({
        budget, logistics, sessions, socialPosts, sponsorProspects,
        speakerOnboarding, cfpDetailed, registrationsPending, registrationsValidated,
      });
    };
    load();
  }, []);

  const save = async (endpoint: string) => {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `${endpoint}/${editing}` : endpoint;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setEditing(null); setForm({}); fetchData(tab); fetchStats(); }
  };

  const del = async (endpoint: string, id: number) => {
    if (!confirm(lang === "en" ? "Delete?" : "Supprimer ?")) return;
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
    tabs: { id: Tab; label: string; icon: string; count?: number }[];
  };

  const tabGroups: TabGroup[] = [
    {
      label: t.overview,
      icon: "🏠",
      tabs: [
        { id: "dashboard", label: t.dashboard, icon: "📊" },
        { id: "pilotage", label: t.pilotageGlobal, icon: "🎯" },
      ],
    },
    {
      label: t.speakersProgram,
      icon: "🎙️",
      tabs: [
        { id: "pipeline", label: t.pipeline, icon: "🧑‍🏫", count: stats.cfp },
        { id: "prospection-speakers", label: t.prospectionSpeakers, icon: "🔭" },
      ],
    },
    {
      label: t.participants,
      icon: "👥",
      tabs: [
        { id: "registrations", label: t.registrations, icon: "🎫", count: stats.registrations },
        { id: "volunteers", label: t.volunteers, icon: "🙋", count: stats.volunteers },
        { id: "newsletter", label: t.newsletter, icon: "📧", count: stats.newsletter },
      ],
    },
    {
      label: t.sponsorsGroup,
      icon: "🤝",
      tabs: [
        { id: "sponsors", label: t.sponsorsActive, icon: "🏅", count: stats.sponsors },
        { id: "sponsor-pipeline", label: t.sponsorPipeline, icon: "📈" },
        { id: "prospection", label: t.prospection, icon: "🔍" },
      ],
    },
    {
      label: t.budget,
      icon: "💰",
      tabs: [
        { id: "tickets", label: t.tickets, icon: "🎟️" },
        { id: "sponsor-packages", label: t.sponsorPackages, icon: "📦" },
        { id: "budget", label: t.budgetTracking, icon: "💸" },
        { id: "transactions", label: "Transactions", icon: "💳" },
      ],
    },
    {
      label: "CTF",
      icon: "🏆",
      tabs: [
        { id: "ctf", label: "EyesOpen CTF", icon: "👩‍💻" },
      ],
    },
    {
      label: t.live,
      icon: "🔴",
      tabs: [
        { id: "live", label: t.studio, icon: "🎬" },
      ],
    },
    {
      label: t.communication,
      icon: "📢",
      tabs: [
        { id: "strategic-plan", label: "Plan stratégique", icon: "♟️" },
        { id: "communication", label: t.communicationPosts, icon: "📱" },
        { id: "campaigns", label: "Campagnes", icon: "📬" },
        { id: "library", label: "Library", icon: "📁" },
        { id: "cyber-watch", label: "Veille cyber", icon: "📡" },
      ],
    },
    {
      label: t.operations,
      icon: "⚙️",
      tabs: [
        { id: "logistics", label: t.logistics, icon: "🚛" },
        { id: "certificates", label: t.certificates, icon: "🎓" },
        { id: "export", label: t.exportCsv, icon: "📤" },
        { id: "users", label: t.users, icon: "👤" },
        { id: "profiles", label: t.profiles, icon: "🛡️" },
        { id: "audit", label: t.auditLog, icon: "📜" },
      ],
    },
    {
      label: t.webSiteGroup,
      icon: "🌐",
      tabs: [
        { id: "past-speakers", label: t.pastSpeakers, icon: "🎤" },
        { id: "team", label: t.team, icon: "👥", count: stats.team },
        { id: "video", label: t.videoteque, icon: "🎞️" },
        { id: "testimony", label: t.testimony, icon: "💬" },
        { id: "settings", label: t.eventSettings, icon: "⚙️" },
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
      const key = (s.date as string) || (lang === "en" ? "No date" : "Sans date");
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const noDate = lang === "en" ? "No date" : "Sans date";
      if (a === noDate) return 1;
      if (b === noDate) return -1;
      return a.localeCompare(b);
    });
    return { groups, sortedKeys };
  })();

  return (
    <AdminThemeContext.Provider value={{ theme, toggleTheme }}>
    <AdminLangContext.Provider value={{ lang, t, setLang: changeLang }}>
    <div data-theme={theme} className="min-h-screen bg-dark-900" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      {/* Detail drawer */}
      {detail && <DetailDrawer item={detail.item} type={detail.type} onClose={() => setDetail(null)} canWrite={can("sponsor-pipeline") || can("prospection")} />}
      {showAccount && userInfo && !userInfo.isLegacy && (
        <AccountModal info={userInfo} onClose={() => setShowAccount(false)} onChanged={refreshMe} />
      )}
      {/* Top bar */}
      <div className="border-b border-neon-green/20 bg-black/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <span className="text-neon-green font-mono text-sm font-bold">&gt; EOCON Eventlyx</span>
        <div className="flex items-center gap-4">
          {userInfo && !userInfo.isLegacy && (
            <button onClick={() => setShowAccount(true)} className="text-gray-400 hover:text-neon-green text-xs font-mono transition-colors">
              👤 {userInfo.name}
            </button>
          )}
          {userInfo && !userInfo.isLegacy && (
            <NotificationBell userEmail={userInfo.email} onGoToPilotage={() => setTab("pilotage")} />
          )}
          <a href="/" target="_blank" className="text-gray-500 hover:text-neon-green text-xs transition-colors">↗ {t.viewSite}</a>
          <button
            onClick={() => changeLang(lang === "fr" ? "en" : "fr")}
            className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-neon-green hover:border-neon-green/40 transition-all font-mono"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
          {/* Light / dark theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? (lang === "en" ? "Switch to light mode" : "Passer en mode clair") : (lang === "en" ? "Switch to dark mode" : "Passer en mode sombre")}
            className="admin-theme-toggle flex items-center gap-1.5 text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-neon-green hover:border-neon-green/40 transition-all font-mono select-none"
          >
            {theme === "dark" ? (
              <><span>☀</span><span className="hidden sm:inline">{lang === "en" ? "Light" : "Clair"}</span></>
            ) : (
              <><span>🌙</span><span className="hidden sm:inline">{lang === "en" ? "Dark" : "Sombre"}</span></>
            )}
          </button>
          <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 transition-colors">{t.logout}</button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? "w-12" : "w-56"} transition-[width] duration-200 min-h-screen border-r border-neon-green/10 bg-black/40 shrink-0 overflow-y-auto flex flex-col`}>
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? (lang === "en" ? "Expand" : "Développer") : (lang === "en" ? "Collapse" : "Réduire")}
            className="flex items-center justify-center h-8 border-b border-neon-green/10 text-neon-green/30 hover:text-neon-green hover:bg-neon-green/5 transition-all shrink-0 w-full"
          >
            <span className="text-sm font-mono">{sidebarCollapsed ? "»" : "«"}</span>
          </button>

          <nav className="flex-1 py-2">
            {visibleTabGroups.map(group => {
              const groupHasActive = group.tabs.some(tabItem => tabItem.id === tab);
              const isGroupCollapsed = !openGroups.has(group.label) && !groupHasActive;
              return (
                <div key={group.label} className="mb-1">
                  {/* Group header */}
                  <button
                    onClick={() => {
                      if (sidebarCollapsed) {
                        setSidebarCollapsed(false);
                      } else {
                        setOpenGroups(prev => {
                          const next = new Set(Array.from(prev));
                          if (next.has(group.label)) next.delete(group.label);
                          else next.add(group.label);
                          return next;
                        });
                      }
                    }}
                    title={sidebarCollapsed ? group.label : undefined}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded mx-1 transition-all ${groupHasActive ? "bg-neon-green/8" : "hover:bg-neon-green/5"}`}
                    style={{ width: sidebarCollapsed ? "calc(100% - 8px)" : "calc(100% - 8px)" }}
                  >
                    <span className="text-base leading-none shrink-0">{group.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left text-xs font-bold uppercase tracking-wider text-neon-green truncate">{group.label}</span>
                        <span className="text-neon-green/40 text-xs shrink-0 transition-transform duration-150" style={{ transform: isGroupCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>
                      </>
                    )}
                  </button>

                  {/* Tab children */}
                  {!sidebarCollapsed && !isGroupCollapsed && (
                    <div className="pl-3 pr-1 mt-0.5 mb-1">
                      {group.tabs.map(tabItem => (
                        <button
                          key={tabItem.id}
                          onClick={() => { if (canSeeTab(tabItem.id)) setTab(tabItem.id); }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-2 mb-0.5 ${tab === tabItem.id ? "bg-neon-green/10 text-neon-green border border-neon-green/30" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]"}`}
                        >
                          <span className="shrink-0 opacity-70">{tabItem.icon}</span>
                          <span className="flex-1 truncate">{tabItem.label}</span>
                          {tabItem.count !== undefined && tabItem.count > 0 && (
                            <span className="text-neon-green/50 text-xs font-mono shrink-0">{tabItem.count}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 min-w-0">

          {/* PIPELINE — Speakers & Programme unified */}
          {activeTab === "pipeline" && <PipelineKanban canWrite={can("cfp")} />}

          {/* PROSPECTION SPEAKERS */}
          {activeTab === "prospection-speakers" && <ProspectionSpeakersPanel canWrite={can("prospection-speakers")} />}

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{t.dashboardTitle}</h1>
                {canSeeTab("registrations") && (
                  <a
                    href="/checkin/scan"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition-all"
                    style={{ background: "var(--ac-bg)", color: "var(--ac)", border: "2px solid var(--ac)", letterSpacing: "0.1em" }}
                  >
                    <span>▣</span> SCANNER QR <span>→</span>
                  </a>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />OK</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#ffaa00" }} />Attention</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#ff0066" }} />Critique</span>
                </div>
              </div>
              <DashboardHealthPanel
                stats={stats}
                extra={dashboardExtra}
                analyticsData={(data.analytics?.[0] as Record<string, unknown>) || null}
                onNavigate={(t: Tab) => { if (canSeeTab(t)) setTab(t); }}
                canNavigate={canSeeTab}
              />
            </div>
          )}

          {/* SPONSORS */}
          {activeTab === "sponsors" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{t.sponsorsTitle}</h1>
              </div>

              {can("sponsors") && showForm && editing !== null && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{lang === "en" ? "Edit Sponsor" : "Modifier le Sponsor"}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(lang === "en" ? [{ key: "name", label: "Sponsor Name *" }, { key: "website", label: "Website" }] : [{ key: "name", label: "Nom du Sponsor *" }, { key: "website", label: "Site Web" }]).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key] as string) || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Sponsor Logo" : "Logo du Sponsor"}</label>
                      <PhotoUploadField
                        value={(form.logoUrl as string) || ""}
                        folder="sponsors"
                        onChange={url => setForm({ ...form, logoUrl: url })}
                      />
                      {!!form.logoUrl && <img src={form.logoUrl as string} alt="logo" className="mt-2 w-16 h-16 object-contain rounded bg-white/5 p-1 border border-gray-700" />}
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
                      {lang === "en" ? "Visible on site" : "Visible sur le site"}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                      <input type="checkbox" checked={!!form.showOnLive} onChange={e => setForm({ ...form, showOnLive: e.target.checked })} />
                      {lang === "en" ? "🔴 Show logo on " : "🔴 Afficher logo sur la page "}<span className="text-neon-green">/live</span>
                    </label>
                    {(() => {
                      const linked = sponsorPipelineData.find(p => String(p.org || "").toLowerCase() === String(form.name || "").toLowerCase());
                      const assigneeName = linked ? sponsorAssignees.find(a => a.id === (linked.assigneeId as number))?.name : null;
                      if (!assigneeName) return null;
                      return (
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Assigned to (prospect)" : "Assigné à (prospect)"}</label>
                          <div className="cyber-input w-full px-3 py-2 rounded text-xs opacity-70 select-none">{assigneeName}</div>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/sponsors")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">{lang === "en" ? "Save" : "Sauvegarder"}</button>
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Cancel" : "Annuler"}</button>
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
                            <div className="flex gap-2 flex-wrap">
                              {!s.isVisible && <span className="text-xs text-gray-600">{lang === "en" ? "Hidden" : "Masqué"}</span>}
                              {!!s.showOnLive && <span className="text-xs text-red-400">🔴 /live</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => {
                              const prospect = sponsorPipelineData.find(p => String(p.org || "").toLowerCase() === String(s.name || "").toLowerCase());
                              const pkg = sponsorPkgs.find(p => String(p.tier || "").toUpperCase() === String(s.tier || "").toUpperCase());
                              let pkgPerks: string[] = [];
                              try { pkgPerks = JSON.parse((pkg?.perksFr as string) || "[]"); } catch { pkgPerks = []; }
                              setDetail({ type: "sponsor", item: { ...s, _prospect: prospect || null, _pkgPerks: pkgPerks } });
                            }} className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded">{lang === "en" ? "Details" : "Détails"}</button>
                            {can("sponsors") && <button onClick={() => { setForm({ ...s }); setEditing(s.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">{lang === "en" ? "Edit" : "Éditer"}</button>}
                            {can("sponsors") && <button onClick={() => del("/api/admin/sponsors", s.id as number)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">{lang === "en" ? "Del." : "Suppr."}</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!data.sponsors?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No sponsors" : "Aucun sponsor"}</p>}
            </div>
          )}

          {/* VOLUNTEERS */}
          {activeTab === "volunteers" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">{t.benevoles} ({(data.volunteers || []).length})</h1>
              {(() => {
                const VOL_TARGET = 20;
                const total = (data.volunteers || []).length;
                const pct = Math.min(100, Math.round((total / VOL_TARGET) * 100));
                const color = pct >= 100 ? "#00ff9d" : pct >= 60 ? "#ffaa00" : "#ff0066";
                return (
                  <div className="rounded-xl border border-gray-800 bg-black/40 px-5 py-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">{lang === "en" ? "Volunteer applications — target" : "Candidatures bénévoles — objectif"} {VOL_TARGET}</span>
                      <span className="text-sm font-black font-mono" style={{ color }}>{total} / {VOL_TARGET} <span className="text-xs font-normal text-gray-500">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-900 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
                    </div>
                  </div>
                );
              })()}
              <div className="mb-8">
                <VolunteerKanban canWrite={can("volunteers")} />
              </div>
              <div className="border-t border-gray-800 pt-6">
                <h2 className="text-sm font-bold text-gray-400 font-mono mb-4 uppercase tracking-wider">{lang === "en" ? "All applications" : "Toutes les candidatures"}</h2>
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
                        {!!v.role && <p className="text-neon-green/70 text-sm">{lang === "en" ? "Desired role" : "Rôle souhaité"} : {v.role as string}</p>}
                        {!!v.city && <p className="text-gray-500 text-xs">{v.city as string}</p>}
                        <p className="text-gray-400 text-xs mt-2 line-clamp-2">{v.motivation as string}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setDetail({ type: "volunteer", item: v })} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors">{lang === "en" ? "Details" : "Détails"}</button>
                        <Badge status={v.status as string} />
                        {can("volunteers") && <select className="cyber-input text-xs px-2 py-1 rounded bg-transparent" value={v.status as string}
                          onChange={e => updateStatus("volunteer", v.id as number, e.target.value)}>
                          <option value="pending" className="bg-dark-800">pending</option>
                          <option value="accepted" className="bg-dark-800">accepted</option>
                          <option value="rejected" className="bg-dark-800">rejected</option>
                        </select>}
                      </div>
                    </div>
                    {v.status === "accepted" && can("volunteers") && (
                      <div className="border-t border-gray-800 pt-3 mt-2">
                        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{lang === "en" ? "Assignment" : "Affectation"}</p>
                        <div className="flex gap-2 flex-wrap">
                          <select
                            className="cyber-input text-xs rounded px-2 py-1 flex-1 min-w-[140px]"
                            defaultValue={(v.assignedRole as string) || ""}
                            disabled={!can("volunteers")}
                            onChange={async (e) => {
                              await fetch("/api/admin/submissions", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ type: "volunteer-assign", id: v.id, assignedRole: e.target.value }),
                              });
                            }}
                          >
                            <option value="">{lang === "en" ? "— Assigned role —" : "— Rôle assigné —"}</option>
                            {existingRoles.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <input
                            type="datetime-local"
                            defaultValue={(v.shiftStart as string)?.slice(0, 16) || ""}
                            className="cyber-input text-xs rounded px-2 py-1"
                            disabled={!can("volunteers")}
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
                            disabled={!can("volunteers")}
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
                {!volunteerList.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No applications" : "Aucune candidature"}</p>}
              </div>
                );
              })()}
              </div>
            </div>
          )}

          {/* REGISTRATIONS */}
          {activeTab === "registrations" && <RegistrationsPanel onDetail={r => setDetail({ type: "registration", item: r })} canManualValidate={!!userInfo?.isRoot && !!userInfo?.currencySelectorEnabled} canWrite={can("registrations")} />}

          {/* NEWSLETTER */}
          {activeTab === "newsletter" && (
            <div>
              <h1 className="text-2xl font-black text-white mb-6">Newsletter ({(data.newsletter || []).length} {lang === "en" ? "subscribers" : "abonnés"})</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neon-green/10 text-gray-500 text-left">
                      <th className="py-2 px-3 font-normal">#</th>
                      <th className="py-2 px-3 font-normal">Email</th>
                      <th className="py-2 px-3 font-normal">{lang === "en" ? "Registration date" : "Date d'inscription"}</th>
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
                {!data.newsletter?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No subscribers" : "Aucun abonné"}</p>}
              </div>
            </div>
          )}

          {/* TEAM */}
          {activeTab === "team" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{lang === "en" ? "Organization team" : "Équipe d'organisation"}</h1>
                {can("team") && <button
                  onClick={() => { setForm({ isVisible: true, sortOrder: 0 }); setEditing(null); setShowForm(true); }}
                  className="btn-neon px-4 py-2 rounded text-xs"
                >
                  {lang === "en" ? "+ Add" : "+ Ajouter"}
                </button>}
              </div>

              {can("team") && showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{editing ? (lang === "en" ? "Edit Member" : "Modifier le Membre") : (lang === "en" ? "New Member" : "Nouveau Membre")}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Name *" : "Nom *"}</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.name as string) || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Role *" : "Rôle *"}</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.role as string) || ""} onChange={e => setForm({ ...form, role: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Email (for management / reminders)" : "Email (pour le pilotage / rappels)"}</label>
                      <input type="email" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.email as string) || ""} onChange={e => setForm({ ...form, email: e.target.value })} />
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
                        {lang === "en" ? "Visible on site" : "Visible sur le site"}
                      </label>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Photo" : "Photo"}</label>
                      <PhotoUploadField
                        value={(form.photoUrl as string) || ""}
                        folder="team"
                        onChange={url => setForm({ ...form, photoUrl: url })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Biography" : "Biographie"}</label>
                      <textarea rows={3} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" value={(form.bio as string) || ""} onChange={e => setForm({ ...form, bio: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/team")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">{lang === "en" ? "Save" : "Sauvegarder"}</button>
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Cancel" : "Annuler"}</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">{lang === "en" ? "Loading..." : "Chargement..."}</p> : (
                <div className="space-y-2">
                  {((data.team || []) as Record<string, unknown>[]).map(m => (
                    <div key={m.id as number} className="cyber-card rounded-lg p-4 flex items-center gap-4">
                      <Avatar photoUrl={m.photoUrl as string} name={m.name as string} size={12} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-sm">{m.name as string}</span>
                          {!m.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{lang === "en" ? "Hidden" : "Masqué"}</span>}
                        </div>
                        <p className="text-neon-green/70 text-xs">{m.role as string}</p>
                        {!!(m.bio as string) && <p className="text-gray-500 text-xs mt-0.5 truncate">{m.bio as string}</p>}
                      </div>
                      {can("team") && <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setForm({ ...m }); setEditing(m.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green transition-colors px-2 py-1 border border-gray-700 rounded">{lang === "en" ? "Edit" : "Éditer"}</button>
                        <button onClick={() => del("/api/admin/team", m.id as number)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-900 rounded">{lang === "en" ? "Del." : "Suppr."}</button>
                      </div>}
                    </div>
                  ))}
                  {!data.team?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No members — click + Add" : "Aucun membre — cliquez sur + Ajouter"}</p>}
                </div>
              )}
            </div>
          )}

          {/* PAST-SPEAKERS */}
          {activeTab === "past-speakers" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-black text-white">{lang === "en" ? "Past Speakers" : "Anciens Intervenants"}</h1>
                {can("speakers") && <button
                  onClick={() => { setForm({ isVisible: true, sortOrder: 0, edition: "2024" }); setEditing(null); setShowForm(true); }}
                  className="btn-neon px-4 py-2 rounded text-xs"
                >
                  {lang === "en" ? "+ Add" : "+ Ajouter"}
                </button>}
              </div>

              {can("speakers") && showForm && (
                <div className="cyber-card rounded-xl p-6 mb-6">
                  <h3 className="text-neon-green text-sm mb-4">{editing ? (lang === "en" ? "Edit Speaker" : "Modifier l'Intervenant") : (lang === "en" ? "New Past Speaker" : "Nouvel Ancien Intervenant")}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Name *" : "Nom *"}</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.name as string) || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Role / Title" : "Rôle / Titre"}</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.role as string) || ""} onChange={e => setForm({ ...form, role: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Company" : "Entreprise"}</label>
                      <input type="text" className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form.company as string) || ""} onChange={e => setForm({ ...form, company: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Country" : "Pays"}</label>
                      <CountrySelect value={(form.country as string) || ""} onChange={v => setForm({ ...form, country: v })} className="w-full text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{lang === "en" ? "Edition (e.g.: 2024)" : "Édition (ex: 2024)"}</label>
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
                        {lang === "en" ? "Visible on site" : "Visible sur le site"}
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => save("/api/admin/past-speakers")} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">{lang === "en" ? "Save" : "Sauvegarder"}</button>
                    <button onClick={cancelForm} className="btn-neon px-4 py-2 rounded text-xs">{lang === "en" ? "Cancel" : "Annuler"}</button>
                  </div>
                </div>
              )}

              {loading ? <p className="text-gray-600 text-xs">{lang === "en" ? "Loading..." : "Chargement..."}</p> : (
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
                          {!ps.isVisible && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{lang === "en" ? "Hidden" : "Masqué"}</span>}
                        </div>
                        <p className="text-gray-400 text-xs">
                          {(ps.role as string) || ""}
                          {(ps.company as string) ? ` · ${ps.company}` : ""}
                          {(ps.country as string) ? ` · ${ps.country}` : ""}
                        </p>
                      </div>
                      {can("speakers") && <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setForm({ ...ps }); setEditing(ps.id as number); setShowForm(true); }} className="text-xs text-gray-400 hover:text-neon-green transition-colors px-2 py-1 border border-gray-700 rounded">{lang === "en" ? "Edit" : "Éditer"}</button>
                        <button onClick={() => del("/api/admin/past-speakers", ps.id as number)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 border border-red-900 rounded">{lang === "en" ? "Del." : "Suppr."}</button>
                      </div>}
                    </div>
                  ))}
                  {!data["past-speakers"]?.length && !loading && <p className="text-gray-600 text-xs py-8 text-center">{lang === "en" ? "No past speakers — click + Add" : "Aucun ancien intervenant — cliquez sur + Ajouter"}</p>}
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && <AdminUsersPanel canWrite={can("users")} canDelete={!!(userInfo?.isLegacy || userInfo?.isRoot)} />}
          {activeTab === "profiles" && <AdminProfilesPanel canWrite={can("profiles")} />}

          {activeTab === "pilotage" && (() => {
            // Only pass meetings-specific perms when the user has an explicit "pilotage-meetings" key;
            // otherwise fall back to the general "pilotage" write/read permission inside PilotagePanel.
            const hasMeetingPerm = !!(userInfo && !userInfo.isLegacy && userInfo.permissions["pilotage-meetings"]);
            return <PilotagePanel canWrite={can("pilotage")} canReadKanban={can("pilotage", "read")} canWriteKanban={can("pilotage", "write")} canReadMeetings={hasMeetingPerm ? can("pilotage-meetings", "read") : undefined} canWriteMeetings={hasMeetingPerm ? can("pilotage-meetings", "write") : undefined} currentUserEmail={userInfo?.email} />;
          })()}
          {activeTab === "settings" && <EventSettingsPanel canWrite={can("settings")} />}

          {/* COMMUNICATION */}
          {activeTab === "strategic-plan" && (
            <StrategicPlanPanel canWrite={can("strategic-plan")} />
          )}

          {activeTab === "communication" && (
            <CommunicationPanel canWrite={can("communication")} />
          )}

          {/* CAMPAIGNS */}
          {activeTab === "campaigns" && <CampaignsPanel canWrite={can("campaigns")} />}

          {/* LIBRARY */}
          {activeTab === "library" && <LibraryPanel canWrite={can("library")} />}

          {/* CYBER WATCH */}
          {activeTab === "cyber-watch" && <CyberWatchPanel canWrite={can("cyber-watch")} />}

          {/* SPONSOR PIPELINE */}
          {activeTab === "sponsor-pipeline" && (
            <SponsorPipelinePanel
              prospects={(data["sponsor-pipeline"] || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("sponsor-pipeline")}
              canWrite={can("sponsor-pipeline")}
            />
          )}

          {/* SPONSOR PACKAGES */}
          {activeTab === "sponsor-packages" && (
            <SponsorPackagesPanel canWrite={can("sponsor-packages")} />
          )}

          {/* PROSPECTION IA */}
          {activeTab === "prospection" && (
            <ProspectionPanel
              leads={(data.prospection || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("prospection")}
              canWrite={can("prospection")}
            />
          )}

          {/* BUDGET */}
          {activeTab === "budget" && (
            <BudgetPanel
              items={(data.budget || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("budget")}
              canWrite={can("budget")}
            />
          )}

          {/* LOGISTICS */}
          {activeTab === "logistics" && (
            <LogisticsPanel
              tasks={(data.logistics || []) as Record<string, unknown>[]}
              onRefresh={() => fetchData("logistics")}
              canWrite={can("logistics")}
            />
          )}

          {/* CTF */}
          {activeTab === "ctf" && <CTFPanel canWrite={can("ctf")} />}

          {/* LIVE */}
          {activeTab === "live" && <LivePanel canWrite={can("live")} />}

          {/* TICKETS */}
          {activeTab === "tickets" && <TicketsPanel canWrite={can("tickets")} />}

          {/* CERTIFICATES */}
          {activeTab === "certificates" && (
            <CertificatesPanel canWrite={can("certificates")} />
          )}

          {/* SESSIONS */}
          {activeTab === "sessions" && <SessionsPanel canWrite={can("sessions")} />}

          {/* TRANSACTIONS */}
          {activeTab === "transactions" && <TransactionsPanel canWrite={can("transactions")} />}

          {/* VIDEO */}
          {activeTab === "video" && <VideoPanel canWrite={can("video")} />}

          {/* TESTIMONY */}
          {activeTab === "testimony" && <TestimonyPanel canWrite={can("testimony")} />}

          {/* AUDIT LOG — super_admin only */}
          {activeTab === "audit" && <AuditPanel canWrite={can("audit")} />}

          {/* EXPORT */}
          {activeTab === "export" && (
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
    </AdminThemeContext.Provider>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ item, type, onClose, canWrite = false }: { item: Record<string, unknown>; type: string; onClose: () => void; canWrite?: boolean }) {
  const { lang } = useAdminT();
  const prospect = item._prospect as Record<string, unknown> | null | undefined;
  const pkgPerks = (item._pkgPerks as string[] | undefined) || [];
  const [perkChecklist, setPerkChecklist] = useState<Record<string, { done: boolean; note: string }>>(() => {
    try { return JSON.parse((prospect?.perkChecklist as string) || "{}"); } catch { return {}; }
  });
  const savePerkChecklist = async (next: Record<string, { done: boolean; note: string }>) => {
    if (!prospect?.id) return;
    await fetch(`/api/admin/sponsor-prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perkChecklist: JSON.stringify(next) }),
    }).catch(() => {});
  };
  const fmt = (v: unknown) => {
    if (v === null || v === undefined || v === "") return <span className="text-gray-600">—</span>;
    if (typeof v === "boolean") return <span className={v ? "text-neon-green" : "text-gray-500"}>{v ? (lang === "en" ? "Yes" : "Oui") : (lang === "en" ? "No" : "Non")}</span>;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString("fr-FR");
    if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://")))
      return <a href={v} target="_blank" rel="noreferrer" className="text-cyan-400 underline break-all">{v}</a>;
    if (typeof v === "string" && v.startsWith("linkedin")) return <a href={`https://${v}`} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{v}</a>;
    return <span className="text-white break-words">{String(v)}</span>;
  };

  const sections: Record<string, { label: string; fields: { key: string; label: string }[] }[]> = lang === "en" ? {
    volunteer: [
      { label: "Identity", fields: [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "city", label: "City" }] },
      { label: "Networks", fields: [{ key: "linkedin", label: "LinkedIn" }, { key: "twitter", label: "X / Twitter" }, { key: "whatsapp", label: "WhatsApp" }] },
      { label: "Application", fields: [{ key: "role", label: "Desired role" }, { key: "hoursPerWeek", label: "Hours / week" }, { key: "langExpression", label: "Language" }, { key: "status", label: "Status" }] },
      { label: "Motivation", fields: [{ key: "motivation", label: "Motivation" }, { key: "experience", label: "Experience" }] },
      { label: "Assignment", fields: [{ key: "assignedRole", label: "Assigned role" }, { key: "shiftStart", label: "Shift start" }, { key: "shiftEnd", label: "Shift end" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Submitted on" }] },
    ],
    registration: [
      { label: "Participant", fields: [{ key: "fname", label: "First name" }, { key: "lname", label: "Last name" }, { key: "email", label: "Email" }, { key: "org", label: "Organization" }, { key: "country", label: "Country" }] },
      { label: "Networks", fields: [{ key: "linkedin", label: "LinkedIn" }, { key: "whatsapp", label: "WhatsApp" }] },
      { label: "Ticket", fields: [{ key: "ticketType", label: "Ticket type" }, { key: "ticketRef", label: "Reference" }, { key: "status", label: "Status" }, { key: "langExpression", label: "Language" }] },
      { label: "Check-in", fields: [{ key: "checkedInAt", label: "Check-in time" }, { key: "checkedInBy", label: "By" }] },
      { label: "CTF", fields: [{ key: "ctfCompetitorName", label: "CTF username" }, { key: "ctfTeamName", label: "CTF team" }, { key: "ctfAccountCreated", label: "CTFd account created" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Registered on" }] },
    ],
    sponsor: [
      { label: "Sponsor", fields: [{ key: "name", label: "Name" }, { key: "tier", label: "Tier" }, { key: "website", label: "Website" }, { key: "logoUrl", label: "Logo URL" }] },
      { label: "Visibility", fields: [{ key: "isVisible", label: "Visible" }, { key: "sortOrder", label: "Order" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Created on" }] },
    ],
    cfp: [
      { label: "Speaker", fields: [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "org", label: "Organization" }, { key: "country", label: "Country" }] },
      { label: "Networks", fields: [{ key: "linkedin", label: "LinkedIn" }, { key: "twitter", label: "X / Twitter" }, { key: "whatsapp", label: "WhatsApp" }] },
      { label: "Proposal", fields: [{ key: "talkTitle", label: "Title" }, { key: "format", label: "Format" }, { key: "langPresentation", label: "Language" }, { key: "pipelineStage", label: "Stage" }, { key: "status", label: "Status" }] },
      { label: "Abstract", fields: [{ key: "abstract", label: "Abstract" }] },
      { label: "Bio", fields: [{ key: "bio", label: "Bio" }] },
      { label: "AI Analysis", fields: [{ key: "aiScore", label: "AI Score" }, { key: "aiAnalysis", label: "AI Analysis" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Submitted on" }, { key: "decisionSentAt", label: "Decision sent" }, { key: "notes", label: "Admin notes" }] },
    ],
    session: [
      { label: "Session", fields: [{ key: "title", label: "Title" }, { key: "type", label: "Type" }, { key: "speakerName", label: "Speaker" }, { key: "room", label: "Room" }] },
      { label: "Schedule", fields: [{ key: "date", label: "Date" }, { key: "time", label: "Start" }, { key: "endTime", label: "End" }] },
      { label: "Content", fields: [{ key: "description", label: "Description" }] },
      { label: "Visibility", fields: [{ key: "isVisible", label: "Visible" }, { key: "sortOrder", label: "Order" }] },
    ],
  } : {
    volunteer: [
      { label: "Identité", fields: [{ key: "name", label: "Nom" }, { key: "email", label: "Email" }, { key: "phone", label: "Téléphone" }, { key: "city", label: "Ville" }] },
      { label: "Réseaux", fields: [{ key: "linkedin", label: "LinkedIn" }, { key: "twitter", label: "X / Twitter" }, { key: "whatsapp", label: "WhatsApp" }] },
      { label: "Candidature", fields: [{ key: "role", label: "Rôle souhaité" }, { key: "hoursPerWeek", label: "Heures / semaine" }, { key: "langExpression", label: "Langue" }, { key: "status", label: "Statut" }] },
      { label: "Motivation", fields: [{ key: "motivation", label: "Motivation" }, { key: "experience", label: "Expérience" }] },
      { label: "Affectation", fields: [{ key: "assignedRole", label: "Rôle assigné" }, { key: "shiftStart", label: "Début shift" }, { key: "shiftEnd", label: "Fin shift" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Soumis le" }] },
    ],
    registration: [
      { label: "Participant", fields: [{ key: "fname", label: "Prénom" }, { key: "lname", label: "Nom" }, { key: "email", label: "Email" }, { key: "org", label: "Organisation" }, { key: "country", label: "Pays" }] },
      { label: "Réseaux", fields: [{ key: "linkedin", label: "LinkedIn" }, { key: "whatsapp", label: "WhatsApp" }] },
      { label: "Billet", fields: [{ key: "ticketType", label: "Type billet" }, { key: "ticketRef", label: "Référence" }, { key: "status", label: "Statut" }, { key: "langExpression", label: "Langue" }] },
      { label: "Check-in", fields: [{ key: "checkedInAt", label: "Heure check-in" }, { key: "checkedInBy", label: "Par" }] },
      { label: "CTF", fields: [{ key: "ctfCompetitorName", label: "Pseudo CTF" }, { key: "ctfTeamName", label: "Équipe CTF" }, { key: "ctfAccountCreated", label: "Compte CTFd créé" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Inscrit le" }] },
    ],
    sponsor: [
      { label: "Sponsor", fields: [{ key: "name", label: "Nom" }, { key: "tier", label: "Tier" }, { key: "website", label: "Site web" }, { key: "logoUrl", label: "Logo URL" }] },
      { label: "Visibilité", fields: [{ key: "isVisible", label: "Visible" }, { key: "sortOrder", label: "Ordre" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Créé le" }] },
    ],
    cfp: [
      { label: "Speaker", fields: [{ key: "name", label: "Nom" }, { key: "email", label: "Email" }, { key: "org", label: "Organisation" }, { key: "country", label: "Pays" }] },
      { label: "Réseaux", fields: [{ key: "linkedin", label: "LinkedIn" }, { key: "twitter", label: "X / Twitter" }, { key: "whatsapp", label: "WhatsApp" }] },
      { label: "Proposition", fields: [{ key: "talkTitle", label: "Titre" }, { key: "format", label: "Format" }, { key: "langPresentation", label: "Langue" }, { key: "pipelineStage", label: "Étape" }, { key: "status", label: "Statut" }] },
      { label: "Abstract", fields: [{ key: "abstract", label: "Abstract" }] },
      { label: "Bio", fields: [{ key: "bio", label: "Bio" }] },
      { label: "Analyse IA", fields: [{ key: "aiScore", label: "Score IA" }, { key: "aiAnalysis", label: "Analyse IA" }] },
      { label: "Meta", fields: [{ key: "createdAt", label: "Soumis le" }, { key: "decisionSentAt", label: "Décision envoyée" }, { key: "notes", label: "Notes admin" }] },
    ],
    session: [
      { label: "Session", fields: [{ key: "title", label: "Titre" }, { key: "type", label: "Type" }, { key: "speakerName", label: "Intervenant" }, { key: "room", label: "Salle" }] },
      { label: "Horaires", fields: [{ key: "date", label: "Date" }, { key: "time", label: "Début" }, { key: "endTime", label: "Fin" }] },
      { label: "Contenu", fields: [{ key: "description", label: "Description" }] },
      { label: "Visibilité", fields: [{ key: "isVisible", label: "Visible" }, { key: "sortOrder", label: "Ordre" }] },
    ],
  };

  const secs = sections[type] || Object.keys(item).map(key => ({ label: "", fields: [{ key, label: key }] }));
  const typeLabels: Record<string, string> = lang === "en" ? { volunteer: "Volunteer", registration: "Registration", sponsor: "Sponsor", cfp: "CFP Submission", session: "Session" } : { volunteer: "Bénévole", registration: "Inscription", sponsor: "Sponsor", cfp: "Soumission CFP", session: "Session" };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-dark-900 border-l border-neon-green/20 z-50 overflow-y-auto" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        <div className="sticky top-0 bg-dark-900 border-b border-neon-green/10 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-neon-green text-xs uppercase tracking-widest">{typeLabels[type] || type}</p>
            <h2 className="text-white font-bold text-lg mt-0.5">
              {(item.name as string) || (item.fname ? `${item.fname} ${item.lname}` : `#${item.id}`)}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none px-2">×</button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {secs.map((sec, si) => (
            <div key={si}>
              {sec.label && <p className="text-neon-green/60 text-xs uppercase tracking-widest mb-3 border-b border-neon-green/10 pb-1">{sec.label}</p>}
              <div className="space-y-3">
                {sec.fields.map(({ key, label }) => {
                  const val = item[key];
                  if (val === null || val === undefined || val === "") return null;
                  const isLong = typeof val === "string" && val.length > 120;
                  return (
                    <div key={key} className={isLong ? "" : "flex gap-3"}>
                      <span className="text-gray-500 text-xs shrink-0 w-32">{label}</span>
                      <div className={`text-sm ${isLong ? "mt-1 text-gray-300 leading-relaxed whitespace-pre-wrap bg-black/20 rounded p-3" : ""}`}>{fmt(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Perks checklist for sponsors that have a concluded prospect */}
          {type === "sponsor" && prospect && pkgPerks.length > 0 && (
            <div className="border-t border-neon-green/10 pt-4">
              <p className="text-neon-green/60 text-xs uppercase tracking-widest mb-3 border-b border-neon-green/10 pb-1">
                {lang === "en" ? "Deliverables checklist" : "Checklist des livrables"} · {item.tier as string}
              </p>
              <p className="text-xs text-gray-600 mb-3">
                {lang === "en" ? "Pipeline status:" : "Statut pipeline :"} <span className="text-gray-400">{prospect.status as string}</span>
                {" · "}{Object.values(perkChecklist).filter(v => v.done).length}/{pkgPerks.length} {lang === "en" ? "delivered" : "livrés"}
              </p>
              <div className="space-y-3">
                {pkgPerks.map((perk, i) => {
                  const entry = perkChecklist[perk] || { done: false, note: "" };
                  return (
                    <div key={i} className="rounded-lg p-3" style={{ background: entry.done ? "#00ff9d08" : "#0a0a0a", border: `1px solid ${entry.done ? "#00ff9d20" : "#1a1a2e"}` }}>
                      <label className={`flex items-start gap-2 ${canWrite ? "cursor-pointer" : "cursor-default"}`}>
                        <input
                          type="checkbox"
                          checked={entry.done}
                          disabled={!canWrite}
                          onChange={e => {
                            if (!canWrite) return;
                            const next = { ...perkChecklist, [perk]: { ...entry, done: e.target.checked } };
                            setPerkChecklist(next);
                            savePerkChecklist(next);
                          }}
                          className="mt-0.5 shrink-0"
                        />
                        <span className={`text-xs ${entry.done ? "line-through text-gray-600" : "text-gray-300"}`}>{perk}</span>
                      </label>
                      <textarea
                        rows={1}
                        placeholder={lang === "en" ? "Notes…" : "Notes…"}
                        value={entry.note}
                        readOnly={!canWrite}
                        onChange={e => { if (canWrite) setPerkChecklist(prev => ({ ...prev, [perk]: { ...entry, note: e.target.value } })); }}
                        onBlur={e => {
                          if (!canWrite) return;
                          const next = { ...perkChecklist, [perk]: { ...entry, note: e.target.value } };
                          setPerkChecklist(next);
                          savePerkChecklist(next);
                        }}
                        className="cyber-input w-full mt-2 px-2 py-1 rounded text-xs resize-none read-only:opacity-60"
                        style={{ minHeight: 28 }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {type === "sponsor" && prospect && pkgPerks.length === 0 && (
            <div className="border-t border-neon-green/10 pt-4">
              <p className="text-neon-green/60 text-xs uppercase tracking-widest mb-2">{lang === "en" ? "Pipeline" : "Pipeline"}</p>
              <p className="text-xs text-gray-500">{lang === "en" ? "Status:" : "Statut :"} {prospect.status as string}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
