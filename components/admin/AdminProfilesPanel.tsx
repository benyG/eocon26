"use client";
import { useState, useEffect } from "react";

// Permission modules grouped exactly like the admin navbar sections.
// Each entry's `key` is the permission key checked by canSeeTab in the dashboard.
const NAV_GROUPS: { label: string; modules: { key: string; label: string }[] }[] = [
  { label: "Vue d'ensemble", modules: [
    { key: "pilotage", label: "🎯 Pilotage global" },
  ] },
  { label: "Speakers & Programme", modules: [
    { key: "cfp", label: "Pipeline (CFP / Programme)" },
  ] },
  { label: "Participants", modules: [
    { key: "registrations", label: "Inscriptions" },
    { key: "volunteers", label: "Bénévoles" },
    { key: "newsletter", label: "Newsletter" },
  ] },
  { label: "Sponsors", modules: [
    { key: "sponsors", label: "Sponsors" },
    { key: "sponsor-pipeline", label: "Pipeline Sponsors" },
    { key: "prospection", label: "Prospection" },
  ] },
  { label: "Budget", modules: [
    { key: "tickets", label: "Billets" },
    { key: "sponsor-packages", label: "Packages Sponsors" },
    { key: "budget", label: "Budget" },
    { key: "transactions", label: "Transactions" },
  ] },
  { label: "CTF", modules: [
    { key: "ctf", label: "EyesOpen CTF" },
  ] },
  { label: "Communication", modules: [
    { key: "communication", label: "Communication" },
    { key: "strategic-plan", label: "Plan Stratégique" },
    { key: "campaigns", label: "Campagnes inscrits" },
    { key: "library", label: "Library" },
    { key: "cyber-watch", label: "Veille cyber" },
  ] },
  { label: "Opérations", modules: [
    { key: "logistics", label: "Logistique" },
    { key: "certificates", label: "Certificats" },
    { key: "export", label: "Export" },
    { key: "users", label: "Utilisateurs" },
    { key: "profiles", label: "Profils & Accès" },
    { key: "audit", label: "Journal d'audit" },
  ] },
  { label: "Web Site", modules: [
    { key: "speakers", label: "Anciens Speakers" },
    { key: "team", label: "Équipe" },
    { key: "video", label: "Vidéothèque" },
    { key: "testimony", label: "Témoignages" },
    { key: "settings", label: "Paramètres Événement" },
  ] },
];

type Level = "write" | "read" | "none";

interface Permissions {
  [key: string]: Level | undefined;
}

interface Profile {
  id: number;
  slug: string;
  name: string;
  description: string;
  color: string;
  permissions: string;
  isSystem: boolean;
  _count?: { users: number };
}

function parsePerms(raw: string): Permissions {
  try { return JSON.parse(raw); } catch { return {}; }
}

export default function AdminProfilesPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [editPerms, setEditPerms] = useState<Permissions>({});
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("#888888");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#00ff9d");

  // Coordo Global escalation email (used by the Pilotage reminders cron).
  const [coordoEmail, setCoordoEmail] = useState("");
  const [coordoSaved, setCoordoSaved] = useState(false);

  useEffect(() => { load(); loadCoordo(); }, []);

  async function load() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  async function loadCoordo() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) { const s = await res.json(); setCoordoEmail(s.pilotage_coordo_email || ""); }
  }

  async function saveCoordo() {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilotage_coordo_email: coordoEmail }),
    });
    setCoordoSaved(true);
    setTimeout(() => setCoordoSaved(false), 3000);
  }

  function selectProfile(p: Profile) {
    setSelected(p);
    setEditPerms(parsePerms(p.permissions));
    setEditName(p.name);
    setEditDesc(p.description);
    setEditColor(p.color);
  }

  function togglePerm(mod: string) {
    const cur = editPerms[mod] ?? "none";
    const next: Level = cur === "none" ? "read" : cur === "read" ? "write" : "none";
    const updated = { ...editPerms };
    if (next === "none") delete updated[mod]; else updated[mod] = next;
    setEditPerms(updated);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/admin/profiles/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc, color: editColor, permissions: editPerms }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfiles(ps => ps.map(p => p.id === updated.id ? updated : p));
      setSelected(updated);
    }
    setSaving(false);
  }

  async function deleteProfile() {
    if (!selected || selected.isSystem) return;
    if (!confirm(`Supprimer le profil "${selected.name}" ?`)) return;
    const res = await fetch(`/api/admin/profiles/${selected.id}`, { method: "DELETE" });
    if (res.ok) {
      setProfiles(ps => ps.filter(p => p.id !== selected.id));
      setSelected(null);
    }
  }

  async function createProfile() {
    if (!newSlug || !newName) return;
    const res = await fetch("/api/admin/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newSlug.toLowerCase().replace(/\s+/g, "_"), name: newName, description: newDesc, color: newColor, permissions: {} }),
    });
    if (res.ok) {
      const p = await res.json();
      setProfiles(ps => [...ps, p]);
      setCreating(false);
      setNewSlug(""); setNewName(""); setNewDesc(""); setNewColor("#00ff9d");
      selectProfile(p);
    }
  }

  const permColor = (l?: Level) =>
    l === "write" ? "#00ff9d" : l === "read" ? "#ffaa00" : "#444";

  const permLabel = (l?: Level) =>
    l === "write" ? "write" : l === "read" ? "read" : "—";

  return (
    <div className="flex flex-col gap-4" style={{ minHeight: "600px" }}>
      {/* Pilotage — Coordo Global escalation contact */}
      <div style={{ background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <div style={{ color: "#00ff9d", fontFamily: "monospace", fontSize: "12px", marginBottom: "4px" }}>🎯 PILOTAGE — Email Coordo Global (escalades)</div>
          <div style={{ color: "#666", fontSize: "11px" }}>Destinataire des alertes de tâches en retard du module Pilotage global.</div>
        </div>
        <input
          value={coordoEmail}
          onChange={e => setCoordoEmail(e.target.value)}
          placeholder="contact@eyesopensecurity.com"
          style={{ flex: 1, minWidth: "220px", background: "#111", border: "1px solid #333", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "13px" }}
        />
        <button
          onClick={saveCoordo}
          style={{ background: "#00ff9d", color: "#000", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
        >
          {coordoSaved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      <div className="flex gap-4" style={{ minHeight: "600px" }}>
      {/* Profile list */}
      <div style={{ width: "260px", flexShrink: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ color: "#00ff9d", fontFamily: "monospace", fontSize: "13px" }}>PROFILS ADMIN</span>
          <button
            onClick={() => setCreating(true)}
            style={{ background: "#00ff9d", color: "#000", border: "none", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
          >
            + Nouveau
          </button>
        </div>

        {creating && (
          <div style={{ background: "#111", border: "1px solid #00ff9d44", borderRadius: "6px", padding: "12px", marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", color: "#00ff9d", marginBottom: "8px" }}>Nouveau profil</div>
            <input
              placeholder="Slug (ex: moderateur)"
              value={newSlug}
              onChange={e => setNewSlug(e.target.value)}
              style={{ width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "6px 8px", borderRadius: "4px", fontSize: "12px", marginBottom: "6px", boxSizing: "border-box" }}
            />
            <input
              placeholder="Nom"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "6px 8px", borderRadius: "4px", fontSize: "12px", marginBottom: "6px", boxSizing: "border-box" }}
            />
            <input
              placeholder="Description"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              style={{ width: "100%", background: "#0a0a0f", border: "1px solid #333", color: "#fff", padding: "6px 8px", borderRadius: "4px", fontSize: "12px", marginBottom: "6px", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", color: "#888" }}>Couleur</label>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: "36px", height: "24px", border: "none", borderRadius: "4px", cursor: "pointer", background: "transparent" }} />
              <span style={{ fontSize: "11px", color: "#888" }}>{newColor}</span>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={createProfile} style={{ flex: 1, background: "#00ff9d", color: "#000", border: "none", borderRadius: "4px", padding: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}>Créer</button>
              <button onClick={() => setCreating(false)} style={{ flex: 1, background: "#222", color: "#888", border: "none", borderRadius: "4px", padding: "6px", fontSize: "12px", cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => selectProfile(p)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: selected?.id === p.id ? "#111" : "transparent",
                border: `1px solid ${selected?.id === p.id ? p.color + "88" : "#222"}`,
                borderRadius: "6px", padding: "10px 12px", cursor: "pointer", textAlign: "left", width: "100%",
              }}
            >
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              <div>
                <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}>{p.name}</div>
                {p.isSystem && <div style={{ color: "#555", fontSize: "10px" }}>système</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile editor */}
      {selected ? (
        <div style={{ flex: 1, background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: "8px", padding: "20px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: editColor, flexShrink: 0 }} />
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{ flex: 1, background: "#111", border: "1px solid #333", color: "#fff", padding: "8px 12px", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", minWidth: "180px" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "11px", color: "#888" }}>Couleur</label>
              <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: "36px", height: "30px", border: "none", borderRadius: "4px", cursor: "pointer", background: "transparent" }} />
            </div>
            <button
              onClick={save}
              disabled={saving}
              style={{ background: "#00ff9d", color: "#000", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
            >
              {saving ? "Saving…" : "Enregistrer"}
            </button>
            {!selected.isSystem && (
              <button
                onClick={deleteProfile}
                style={{ background: "transparent", color: "#ff4444", border: "1px solid #ff444444", borderRadius: "6px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" }}
              >
                Supprimer
              </button>
            )}
          </div>

          <input
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            placeholder="Description"
            style={{ width: "100%", background: "#111", border: "1px solid #222", color: "#ccc", padding: "8px 12px", borderRadius: "6px", fontSize: "13px", marginBottom: "20px", boxSizing: "border-box" }}
          />

          <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#555", marginBottom: "12px" }}>
            Slug: <span style={{ color: "#888" }}>{selected.slug}</span>
            {selected.isSystem && <span style={{ color: "#555", marginLeft: "12px" }}>· profil système (protégé)</span>}
          </div>

          <div style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
            Cliquez pour cycler : <span style={{ color: "#444" }}>— aucun</span> → <span style={{ color: "#ffaa00" }}>read</span> → <span style={{ color: "#00ff9d" }}>write</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#00ff9d", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px", borderBottom: "1px solid #1a1a2e", paddingBottom: "4px" }}>
                  {group.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
                  {group.modules.map(({ key, label }) => {
                    const level = editPerms[key] as Level | undefined;
                    return (
                      <button
                        key={key}
                        onClick={() => togglePerm(key)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#111", border: `1px solid ${permColor(level)}33`,
                          borderRadius: "6px", padding: "10px 12px", cursor: "pointer", textAlign: "left",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <span style={{ color: "#ccc", fontSize: "13px" }}>{label}</span>
                        <span style={{
                          color: permColor(level), fontSize: "11px", fontFamily: "monospace",
                          background: permColor(level) + "22", borderRadius: "3px", padding: "2px 6px",
                        }}>
                          {permLabel(level)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: "14px" }}>
          Sélectionnez un profil pour le modifier
        </div>
      )}
      </div>
    </div>
  );
}
