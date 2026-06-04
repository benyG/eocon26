"use client";
import { useState, useEffect } from "react";

const ALL_MODULES = [
  "cfp", "speakers", "onboarding", "sessions", "workshops",
  "volunteers", "registrations", "newsletter", "sponsors",
  "sponsor-pipeline", "budget", "logistics", "communication",
  "team", "export", "users", "prospection", "certificates",
] as const;

type Module = (typeof ALL_MODULES)[number];
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

const MODULE_LABELS: Record<Module, string> = {
  cfp: "CFP",
  speakers: "Speakers",
  onboarding: "Onboarding",
  sessions: "Programme",
  workshops: "Ateliers",
  volunteers: "Bénévoles",
  registrations: "Inscriptions",
  newsletter: "Newsletter",
  sponsors: "Sponsors",
  "sponsor-pipeline": "Pipeline Sponsors",
  budget: "Budget",
  logistics: "Logistique",
  communication: "Communication",
  team: "Équipe",
  export: "Export",
  users: "Utilisateurs",
  prospection: "Prospection",
  certificates: "Certificats",
};

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

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/admin/profiles");
    if (res.ok) setProfiles(await res.json());
  }

  function selectProfile(p: Profile) {
    setSelected(p);
    setEditPerms(parsePerms(p.permissions));
    setEditName(p.name);
    setEditDesc(p.description);
    setEditColor(p.color);
  }

  function togglePerm(mod: Module) {
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
    <div className="flex gap-4 h-full" style={{ minHeight: "600px" }}>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
            {ALL_MODULES.map(mod => {
              const level = editPerms[mod] as Level | undefined;
              return (
                <button
                  key={mod}
                  onClick={() => togglePerm(mod)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#111", border: `1px solid ${permColor(level)}33`,
                    borderRadius: "6px", padding: "10px 12px", cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ color: "#ccc", fontSize: "13px" }}>{MODULE_LABELS[mod]}</span>
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
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: "14px" }}>
          Sélectionnez un profil pour le modifier
        </div>
      )}
    </div>
  );
}
