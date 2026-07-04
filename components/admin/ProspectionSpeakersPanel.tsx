"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SpeakerProfile = {
  id: number;
  speakerId: string;
  name: string;
  title?: string | null;
  org?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
  profileType?: string | null;
  participationModel: string;
  langFr: boolean;
  langEn: boolean;
  langOther?: string | null;
  topicMain?: string | null;
  topicsSecondary: string[];
  keywords?: string | null;
  techLevel?: string | null;
  certifications?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  github?: string | null;
  scholar?: string | null;
  website?: string | null;
  email?: string | null;
  conferencesPast?: string | null;
  videosUrls?: string | null;
  publications?: string | null;
  p1: number; p2: number; p3: number; p4: number; p5: number; p6: number;
  ipScore: number;
  tier: string;
  tierOverride: boolean;
  status: string;
  notes?: string | null;
  aiDraftEmail?: string | null;
  aiDraftBrief?: string | null;
  contacts: SpeakerContact[];
  sources: SpeakerSource[];
};

type SpeakerContact = {
  id: number;
  speakerProfileId: number;
  eventLabel: string;
  contactStatus: string;
  formatProposed?: string | null;
  topicProposed?: string | null;
  assigneeId?: number | null;
  contactedAt?: string | null;
  responseAt?: string | null;
  nextFollowupAt?: string | null;
  notes?: string | null;
};

type SpeakerSource = {
  id: number;
  speakerProfileId: number;
  type: string;
  title?: string | null;
  url?: string | null;
  reliability: string;
  consultedAt?: string | null;
  notes?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS: { key: string; label: string }[] = [
  { key: "TOP-01", label: "Offensive Security & Red Teaming" },
  { key: "TOP-02", label: "Threat Intelligence & Hunting" },
  { key: "TOP-03", label: "Cloud & Infrastructure Security" },
  { key: "TOP-04", label: "AI in Cybersecurity" },
  { key: "TOP-05", label: "Digital Forensics & Incident Response" },
  { key: "TOP-06", label: "Application & API Security" },
  { key: "TOP-07", label: "OT / ICS / SCADA Security" },
  { key: "TOP-08", label: "Privacy & Data Protection" },
  { key: "TOP-09", label: "Governance, Risk & Compliance" },
  { key: "TOP-10", label: "Emerging Threats in Africa" },
  { key: "TOP-11", label: "Open Source Security Tools" },
  { key: "TOP-12", label: "Cybersecurity Awareness & Culture" },
];

const CONTACT_STATUSES = [
  { value: "to_research", labelFr: "À rechercher", labelEn: "To research", color: "#888" },
  { value: "to_contact", labelFr: "À contacter", labelEn: "To contact", color: "#0066ff" },
  { value: "contacted", labelFr: "Contacté", labelEn: "Contacted", color: "#00aaff" },
  { value: "followup1", labelFr: "Relance 1", labelEn: "Follow-up 1", color: "#ff9900" },
  { value: "followup2", labelFr: "Relance 2", labelEn: "Follow-up 2", color: "#ff6600" },
  { value: "interested", labelFr: "Intéressé", labelEn: "Interested", color: "#00cc66" },
  { value: "accepted", labelFr: "Accepté", labelEn: "Accepted", color: "#00ff9d" },
  { value: "confirmed", labelFr: "Confirmé ✓", labelEn: "Confirmed ✓", color: "#00ff9d" },
  { value: "refused", labelFr: "Refusé", labelEn: "Refused", color: "#ff0066" },
  { value: "postponed", labelFr: "Reporté", labelEn: "Postponed", color: "#cc00ff" },
  { value: "not_selected", labelFr: "Non retenu", labelEn: "Not selected", color: "#555" },
  { value: "watchlist", labelFr: "Veille / Long terme", labelEn: "Watchlist", color: "#444" },
];

const TIER_COLORS: Record<string, string> = {
  Tier1: "#00ff9d", Tier2: "#0066ff", Tier3: "#888", Veille: "#444",
};

const PARTICIPATION_COLORS: Record<string, string> = {
  volunteer: "#00ff9d", unknown: "#ffaa00", paid: "#ff0066",
};

const FORMATS = ["keynote", "talk", "lightning", "workshop", "panel"];

const PROFILE_TYPES = [
  "Chercheur", "Universitaire", "Praticien", "Consultant", "CISO",
  "Fondateur", "CERT-CSIRT", "Gouvernement", "Open Source", "Créateur de contenu", "Communauté cyber",
];

const IP_FORMULA = (p: SpeakerProfile) =>
  Math.round(p.p1 * 0.20 + p.p2 * 0.20 + p.p3 * 0.20 + p.p4 * 0.25 + p.p5 * 0.08 + p.p6 * 0.07);

const computeTier = (ip: number, participationModel: string): string => {
  if (participationModel === "paid") return "Veille";
  return ip >= 75 ? "Tier1" : ip >= 50 ? "Tier2" : ip >= 25 ? "Tier3" : "Veille";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
      style={{ background: TIER_COLORS[tier] + "20", color: TIER_COLORS[tier], border: `1px solid ${TIER_COLORS[tier]}40` }}>
      {tier}
    </span>
  );
}

function ParticipationBadge({ model }: { model: string }) {
  const labels: Record<string, { fr: string }> = {
    volunteer: { fr: "Pro bono" }, unknown: { fr: "Inconnu" }, paid: { fr: "Payant" },
  };
  const color = PARTICIPATION_COLORS[model] || "#888";
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: color + "20", color, border: `1px solid ${color}40` }}>
      {labels[model]?.fr ?? model}
    </span>
  );
}

function IpGauge({ score }: { score: number }) {
  const color = score >= 75 ? "#00ff9d" : score >= 50 ? "#0066ff" : score >= 25 ? "#888" : "#444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden" style={{ minWidth: 40 }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── IP Score Editor ──────────────────────────────────────────────────────────

const P_LABELS = [
  { key: "p1", label: "P1 — Pertinence internationale", weight: "20%", hint: "Track record conférences mondiales (RSA, Black Hat, DEF CON…)" },
  { key: "p2", label: "P2 — Alignement thématique EOCON", weight: "20%", hint: "Couverture directe des 12 thématiques CFP" },
  { key: "p3", label: "P3 — Africanité / Diaspora", weight: "20%", hint: "Lien documenté avec l'écosystème africain" },
  { key: "p4", label: "P4 — Accessibilité pro bono ★", weight: "25%", hint: "90-100 = volontaire confirmé · 0-20 = bureau speakers / cachet > 5k€" },
  { key: "p5", label: "P5 — Adéquation format programme", weight: "8%", hint: "Couvre un besoin non encore pourvu dans le programme" },
  { key: "p6", label: "P6 — Visibilité & rayonnement", weight: "7%", hint: "+10k LinkedIn, publications, podcasts, médias" },
] as const;

type PKey = "p1" | "p2" | "p3" | "p4" | "p5" | "p6";

function IPScoreEditor({
  profile, onChange,
}: { profile: Pick<SpeakerProfile, "p1"|"p2"|"p3"|"p4"|"p5"|"p6"|"ipScore"|"tier"|"tierOverride"|"participationModel">; onChange: (key: PKey, val: number) => void }) {
  const ip = IP_FORMULA(profile as SpeakerProfile);
  const tier = profile.tierOverride ? profile.tier : computeTier(ip, profile.participationModel);
  return (
    <div className="space-y-2">
      {P_LABELS.map(({ key, label, weight, hint }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-gray-400">{label} <span className="text-gray-600">({weight})</span></span>
            <span className="text-xs font-mono text-white w-8 text-right">{profile[key]}</span>
          </div>
          <div title={hint}>
            <input
              type="range" min={0} max={100}
              value={profile[key]}
              onChange={e => onChange(key, parseInt(e.target.value))}
              className="w-full h-1 accent-neon-green"
            />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        <span className="text-xs text-gray-500">IP calculé</span>
        <div className="flex items-center gap-2">
          <IpGauge score={ip} />
          <TierBadge tier={tier} />
        </div>
      </div>
      {profile.participationModel === "paid" && (
        <p className="text-xs text-red-400">⚠ Modèle «Payant» → Veille automatique (règle absolue)</p>
      )}
    </div>
  );
}

// ─── Speaker Form (create / edit) ────────────────────────────────────────────

type ProfileForm = Partial<SpeakerProfile> & { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number };

const EMPTY_FORM: ProfileForm = {
  name: "", title: "", org: "", country: "", city: "", region: "",
  bio: "", profileType: "", participationModel: "unknown",
  langFr: false, langEn: true, langOther: "",
  topicMain: "", topicsSecondary: [],
  techLevel: "intermediate", certifications: "",
  linkedin: "", twitter: "", github: "", scholar: "", website: "", email: "",
  conferencesPast: "", videosUrls: "", publications: "",
  p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0,
  status: "active", notes: "",
};

function ProfileForm({
  initial, onSave, onCancel, saving,
}: { initial?: ProfileForm; onSave: (f: ProfileForm) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState<ProfileForm>(initial ?? EMPTY_FORM);
  const [aiEnriching, setAiEnriching] = useState(false);

  const set = (k: keyof ProfileForm, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const enrichWithAI = async () => {
    if (!form.name) return;
    setAiEnriching(true);
    try {
      const res = await fetch("/api/admin/ai/enrich-speaker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, title: form.title, org: form.org, linkedin: form.linkedin, website: form.website }),
      });
      if (res.ok) {
        const d = await res.json();
        setForm(f => ({
          ...f,
          p1: d.p1 ?? f.p1, p2: d.p2 ?? f.p2, p3: d.p3 ?? f.p3,
          p4: d.p4 ?? f.p4, p5: d.p5 ?? f.p5, p6: d.p6 ?? f.p6,
          topicMain: d.topicMain || f.topicMain,
          participationModel: d.participationModel || f.participationModel,
        }));
      }
    } finally { setAiEnriching(false); }
  };

  const ip = IP_FORMULA(form as SpeakerProfile);
  const tier = form.tierOverride ? (form.tier ?? "Tier3") : computeTier(ip, form.participationModel ?? "unknown");

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Identité</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Nom complet *</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={form.name ?? ""} onChange={e => set("name", e.target.value)} placeholder="Nom Prénom" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Titre / Poste</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={form.title ?? ""} onChange={e => set("title", e.target.value)} placeholder="CISO, Security Researcher…" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Organisation</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={form.org ?? ""} onChange={e => set("org", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pays</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={form.country ?? ""} onChange={e => set("country", e.target.value)} placeholder="Cameroun, France…" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ville</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={form.city ?? ""} onChange={e => set("city", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type de profil</label>
            <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={form.profileType ?? ""} onChange={e => set("profileType", e.target.value)}>
              <option value="">— Sélectionner —</option>
              {PROFILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Modèle de participation *</label>
            <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={form.participationModel ?? "unknown"} onChange={e => set("participationModel", e.target.value)}>
              <option value="volunteer">✅ Volontaire / Pro bono</option>
              <option value="unknown">❓ Inconnu — à clarifier</option>
              <option value="paid">⚠️ Payant (confirmé)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Langues */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Langues</p>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={form.langFr ?? false} onChange={e => set("langFr", e.target.checked)} /> Français
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={form.langEn ?? false} onChange={e => set("langEn", e.target.checked)} /> English
          </label>
          <input className="cyber-input px-2 py-1 rounded text-xs flex-1 min-w-[120px]" value={form.langOther ?? ""} onChange={e => set("langOther", e.target.value)} placeholder="Autres langues…" />
        </div>
      </div>

      {/* Expertise */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Expertise</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Thématique principale</label>
            <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={form.topicMain ?? ""} onChange={e => set("topicMain", e.target.value)}>
              <option value="">— Sélectionner —</option>
              {TOPICS.map(t => <option key={t.key} value={t.key}>{t.key} — {t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Niveau technique</label>
            <select className="cyber-input w-full px-3 py-2 rounded text-xs bg-transparent" value={form.techLevel ?? ""} onChange={e => set("techLevel", e.target.value)}>
              <option value="beginner">Débutant</option>
              <option value="intermediate">Intermédiaire</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Mots-clés / certifications</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={form.certifications ?? ""} onChange={e => set("certifications", e.target.value)} placeholder="OSCP, CISSP, PhD, CTF player…" />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Contact & Présence publique</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { key: "email", label: "Email", ph: "speaker@domain.com" },
            { key: "linkedin", label: "LinkedIn URL", ph: "https://linkedin.com/in/…" },
            { key: "twitter", label: "Twitter / X", ph: "@handle" },
            { key: "github", label: "GitHub URL", ph: "https://github.com/…" },
            { key: "scholar", label: "Google Scholar", ph: "URL profil…" },
            { key: "website", label: "Site personnel", ph: "https://…" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={(form[f.key as keyof ProfileForm] as string) ?? ""} onChange={e => set(f.key as keyof ProfileForm, e.target.value)} placeholder={f.ph} />
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {[
            { key: "conferencesPast", label: "Conférences passées" },
            { key: "videosUrls", label: "Vidéos (URLs)" },
            { key: "publications", label: "Publications / Articles (URLs)" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={(form[f.key as keyof ProfileForm] as string) ?? ""} onChange={e => set(f.key as keyof ProfileForm, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* IP Scoring */}
      <div className="cyber-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Score IP (Indice de Priorité)</p>
          <button
            onClick={enrichWithAI}
            disabled={aiEnriching || !form.name}
            className="text-xs px-3 py-1 rounded transition-all"
            style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff40" }}
          >
            {aiEnriching ? "Analyse IA…" : "✨ Suggérer via IA"}
          </button>
        </div>
        <IPScoreEditor
          profile={form as SpeakerProfile}
          onChange={(key, val) => set(key, val)}
        />
      </div>

      {/* Bio & Notes */}
      <div className="grid gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Biographie</label>
          <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={3} value={form.bio ?? ""} onChange={e => set("bio", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes internes (non exportées)</label>
          <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={2} value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} />
        </div>
      </div>

      {/* Score preview */}
      <div className="flex items-center justify-between py-2 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <IpGauge score={ip} />
          <TierBadge tier={tier} />
          <ParticipationBadge model={form.participationModel ?? "unknown"} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onSave({ ...form, ipScore: ip, tier })} disabled={saving || !form.name} className="btn-neon-solid px-4 py-2 rounded text-xs border-2 border-neon-green">
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        <button onClick={onCancel} className="btn-neon px-4 py-2 rounded text-xs">Annuler</button>
      </div>
    </div>
  );
}

// ─── Apollo Search Modal ──────────────────────────────────────────────────────

type ApolloResult = {
  name: string; title?: string; org?: string; linkedin?: string; email?: string;
  aiSuggestion?: { p1?: number; p3?: number; p4?: number; p6?: number; topicMain?: string; participationModel?: string; reason?: string } | null;
};

function ApolloSearchModal({ onClose, onImport }: { onClose: () => void; onImport: (r: ApolloResult) => void }) {
  const [titles, setTitles] = useState("CISO,Security Researcher,Penetration Tester,Threat Intelligence,Red Team");
  const [regions, setRegions] = useState("Cameroon,Nigeria,Senegal,Kenya,France,Canada");
  const [perPage, setPerPage] = useState(15);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ApolloResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setSearching(true); setError(null); setResults([]);
    try {
      const res = await fetch("/api/admin/ai/apollo-speaker-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titles: titles.split(",").map(s => s.trim()).filter(Boolean),
          regions: regions.split(",").map(s => s.trim()).filter(Boolean),
          perPage,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `HTTP ${res.status}`); }
      setResults(await res.json());
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSearching(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="cyber-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neon-green text-sm font-bold">🔍 Recherche Apollo — Speakers</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Titres / Postes (séparés par virgules)</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={titles} onChange={e => setTitles(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Régions / Pays (séparés par virgules)</label>
            <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={regions} onChange={e => setRegions(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Max résultats:</label>
            <select className="cyber-input px-2 py-1 rounded text-xs bg-transparent" value={perPage} onChange={e => setPerPage(Number(e.target.value))}>
              {[5,10,15,20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button onClick={search} disabled={searching} className="btn-neon px-4 py-2 rounded text-xs w-full">
            {searching ? "Recherche Apollo en cours…" : "🔍 Lancer la recherche"}
          </button>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">{results.length} profil(s) trouvé(s) — cliquez pour importer</p>
            {results.map((r, i) => (
              <div key={i} className="border border-gray-800 rounded-lg p-3 hover:border-gray-600 cursor-pointer" onClick={() => { onImport(r); onClose(); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold">{r.name}</p>
                    {r.title && <p className="text-gray-400 text-xs">{r.title}{r.org ? ` @ ${r.org}` : ""}</p>}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {r.linkedin && <span className="text-xs text-blue-400">LinkedIn ✓</span>}
                      {r.email && <span className="text-xs text-green-400">Email ✓</span>}
                      {r.aiSuggestion?.topicMain && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#0066ff20", color: "#0066ff", border: "1px solid #0066ff40" }}>
                          {r.aiSuggestion.topicMain}
                        </span>
                      )}
                      {r.aiSuggestion?.participationModel && (
                        <ParticipationBadge model={r.aiSuggestion.participationModel} />
                      )}
                    </div>
                    {r.aiSuggestion?.reason && <p className="text-gray-600 text-xs mt-1 italic">{r.aiSuggestion.reason}</p>}
                  </div>
                  {r.aiSuggestion && (
                    <div className="text-right shrink-0">
                      <span className="text-xs text-gray-500">P4: <span className="font-mono text-white">{r.aiSuggestion.p4 ?? "?"}</span></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ profile, contact, onClose, onSave }: { profile: SpeakerProfile; contact?: SpeakerContact; onClose: () => void; onSave?: (draft: string) => void }) {
  const [mode, setMode] = useState<"initial" | "followup">(contact?.contactStatus && !["to_research","to_contact"].includes(contact.contactStatus) ? "followup" : "initial");
  const [langPref, setLangPref] = useState<"fr" | "en">(profile.langFr ? "fr" : "en");
  const [emailResult, setEmailResult] = useState<{ subjectFr: string; bodyFr: string; subjectEn: string; bodyEn: string } | null>(() => {
    if (profile.aiDraftEmail) { try { return JSON.parse(profile.aiDraftEmail); } catch { return null; } }
    return null;
  });
  const [generating, setGenerating] = useState(false);
  const [displayLang, setDisplayLang] = useState<"fr" | "en">(langPref);
  const [savedEmail, setSavedEmail] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/ai/speaker-outreach-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name, title: profile.title, org: profile.org,
          topicMain: profile.topicMain, formatProposed: contact?.formatProposed,
          contactStatus: contact?.contactStatus, langPref, mode,
        }),
      });
      if (res.ok) setEmailResult(await res.json());
    } finally { setGenerating(false); }
  };

  const subject = emailResult ? (displayLang === "fr" ? emailResult.subjectFr : emailResult.subjectEn) : "";
  const body = emailResult ? (displayLang === "fr" ? emailResult.bodyFr : emailResult.bodyEn) : "";

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="cyber-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neon-green text-sm font-bold">✉ Email d&apos;invitation — {profile.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex gap-2">
            {(["initial","followup"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className="text-xs px-3 py-1 rounded transition-all"
                style={{ background: mode === m ? "var(--ac-bg)" : "transparent", color: mode === m ? "var(--ac)" : "var(--txt-mute)", border: "1px solid " + (mode === m ? "var(--ac)" : "var(--bdr-2)") }}>
                {m === "initial" ? "Premier contact" : "Relance"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["fr","en"] as const).map(l => (
              <button key={l} onClick={() => setLangPref(l)} className="text-xs px-2 py-1 rounded"
                style={{ background: langPref === l ? "#0066ff20" : "transparent", color: langPref === l ? "#0066ff" : "var(--txt-mute)", border: "1px solid " + (langPref === l ? "#0066ff40" : "var(--bdr-2)") }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <button onClick={generate} disabled={generating} className="btn-neon px-4 py-2 rounded text-xs w-full mb-4">
          {generating ? "Génération IA…" : "✨ Générer l'email"}
        </button>
        {emailResult && (
          <div className="space-y-3">
            <div className="flex gap-2 mb-2">
              {(["fr","en"] as const).map(l => (
                <button key={l} onClick={() => setDisplayLang(l)} className="text-xs px-2 py-1 rounded"
                  style={{ background: displayLang === l ? "#0066ff20" : "transparent", color: displayLang === l ? "#0066ff" : "var(--txt-mute)", border: "1px solid " + (displayLang === l ? "#0066ff40" : "var(--bdr-2)") }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Objet</label>
              <input className="cyber-input w-full px-3 py-2 rounded text-xs" value={subject} readOnly />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Corps</label>
              <textarea className="cyber-input w-full px-3 py-2 rounded text-xs" rows={10} value={body} readOnly />
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => { navigator.clipboard.writeText(`${subject}\n\n${body}`); }} className="text-xs text-gray-400 hover:text-white">
                📋 Copier
              </button>
              {onSave && (
                <button onClick={() => { onSave(JSON.stringify(emailResult)); setSavedEmail(true); setTimeout(() => setSavedEmail(false), 2500); }} className="text-xs px-3 py-1.5 rounded btn-neon">
                  {savedEmail ? "✓ Sauvegardé" : "💾 Sauvegarder"}
                </button>
              )}
              {profile.aiDraftEmail && <span className="text-xs text-gray-600">Brouillon existant chargé</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Brief Modal ──────────────────────────────────────────────────────────────

function BriefModal({ profile, onClose, onSave }: { profile: SpeakerProfile; onClose: () => void; onSave?: (draft: string) => void }) {
  type BriefData = { accroche: string; valeur: string[]; objection: { question: string; reponse: string }; ouverture: string; aEviter: string; brief_complet: string };
  const [brief, setBrief] = useState<BriefData | null>(() => {
    if (profile.aiDraftBrief) { try { return JSON.parse(profile.aiDraftBrief) as BriefData; } catch { return null; } }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [savedBrief, setSavedBrief] = useState(false);

  useEffect(() => {
    if (brief) return; // already loaded from saved draft
    setLoading(true);
    fetch("/api/admin/ai/speaker-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profile.name, title: profile.title, org: profile.org, topicMain: profile.topicMain, linkedin: profile.linkedin, notes: profile.notes, p1: profile.p1, p3: profile.p3, p4: profile.p4 }),
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setBrief(d); }).finally(() => setLoading(false));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="cyber-card rounded-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-neon-green text-sm font-bold">📋 Brief équipe — {profile.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>
        {loading && <p className="text-gray-500 text-xs">Génération du brief…</p>}
        {brief && (
          <div className="space-y-4 text-xs">
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs mb-1">Accroche</p>
              <p className="text-white">{brief.accroche}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs mb-1">Valeur pour ce speaker</p>
              <ul className="space-y-1">{brief.valeur?.map((v, i) => <li key={i} className="text-gray-300 flex gap-2"><span className="text-neon-green">·</span>{v}</li>)}</ul>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs mb-1">Objection probable</p>
              <p className="text-yellow-400">❓ {brief.objection?.question}</p>
              <p className="text-gray-300 mt-1">→ {brief.objection?.reponse}</p>
            </div>
            <div>
              <p className="text-gray-500 uppercase tracking-widest text-xs mb-1">Ouverture suggérée</p>
              <p className="text-blue-400 italic">&ldquo;{brief.ouverture}&rdquo;</p>
            </div>
            <div className="border border-red-900 rounded p-2">
              <p className="text-red-400 uppercase tracking-widest text-xs mb-1">⚠ À éviter</p>
              <p className="text-gray-400">{brief.aEviter}</p>
            </div>
            <div className="border border-gray-800 rounded p-3 bg-gray-900/50">
              <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">Brief complet (à lire avant contact)</p>
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{brief.brief_complet}</p>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => navigator.clipboard.writeText(brief.brief_complet)} className="text-xs text-gray-400 hover:text-white">📋 Copier le brief</button>
              {onSave && (
                <button onClick={() => { onSave(JSON.stringify(brief)); setSavedBrief(true); setTimeout(() => setSavedBrief(false), 2500); }} className="text-xs px-3 py-1.5 rounded btn-neon">
                  {savedBrief ? "✓ Sauvegardé" : "💾 Sauvegarder"}
                </button>
              )}
              {profile.aiDraftBrief && !savedBrief && <span className="text-xs text-gray-600">Brouillon sauvegardé · <button className="underline" onClick={() => { setLoading(true); setBrief(null); fetch("/api/admin/ai/speaker-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: profile.name, title: profile.title, org: profile.org, topicMain: profile.topicMain, linkedin: profile.linkedin, notes: profile.notes, p1: profile.p1, p3: profile.p3, p4: profile.p4 }) }).then(r => r.ok ? r.json() : null).then(d => { if (d) setBrief(d); }).finally(() => setLoading(false)); }}>Régénérer</button></span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Detail Drawer ────────────────────────────────────────────────────

function ProfileDetail({
  profile, canWrite, assignees, onClose, onUpdate, onDelete,
}: {
  profile: SpeakerProfile; canWrite: boolean; assignees: { id: number; name: string }[];
  onClose: () => void; onUpdate: (p: SpeakerProfile) => void; onDelete: (id: number) => void;
}) {
  const [tab, setTab] = useState<"info" | "contacts" | "sources" | "edit">("info");
  const [emailModal, setEmailModal] = useState(false);
  const [briefModal, setBriefModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactForm, setContactForm] = useState<Partial<SpeakerContact>>({ eventLabel: "EOCON 2026", contactStatus: "to_contact", formatProposed: "talk" });
  const [addingContact, setAddingContact] = useState(false);
  const [sourceForm, setSourceForm] = useState<Partial<SpeakerSource>>({ type: "linkedin", reliability: "secondary" });
  const [addingSource, setAddingSource] = useState(false);
  const [findingEmail, setFindingEmail] = useState(false);
  const [foundEmails, setFoundEmails] = useState<{ email: string; source: string; confidence?: number }[]>([]);

  const topicLabel = TOPICS.find(t => t.key === profile.topicMain)?.label;
  const activeContact = profile.contacts[0];

  const saveEdit = async (form: ProfileForm) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/speaker-profiles/${profile.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) { const updated = await res.json(); onUpdate(updated); setTab("info"); }
    } finally { setSaving(false); }
  };

  const saveAiDraft = async (field: "aiDraftEmail" | "aiDraftBrief", value: string) => {
    const res = await fetch(`/api/admin/speaker-profiles/${profile.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) { const updated = await res.json(); onUpdate(updated); }
  };

  const addContact = async () => {
    const res = await fetch("/api/admin/speaker-contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...contactForm, speakerProfileId: profile.id }),
    });
    if (res.ok) {
      const c = await res.json();
      onUpdate({ ...profile, contacts: [...profile.contacts, c] });
      setAddingContact(false);
    }
  };

  const updateContact = async (id: number, data: Partial<SpeakerContact>) => {
    const res = await fetch(`/api/admin/speaker-contacts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdate({ ...profile, contacts: profile.contacts.map(c => c.id === id ? updated : c) });
    }
  };

  const deleteContact = async (id: number) => {
    await fetch(`/api/admin/speaker-contacts/${id}`, { method: "DELETE" });
    onUpdate({ ...profile, contacts: profile.contacts.filter(c => c.id !== id) });
  };

  const addSource = async () => {
    const res = await fetch("/api/admin/speaker-sources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...sourceForm, speakerProfileId: profile.id }),
    });
    if (res.ok) {
      const s = await res.json();
      onUpdate({ ...profile, sources: [...profile.sources, s] });
      setAddingSource(false);
    }
  };

  const deleteSource = async (id: number) => {
    await fetch(`/api/admin/speaker-sources/${id}`, { method: "DELETE" });
    onUpdate({ ...profile, sources: profile.sources.filter(s => s.id !== id) });
  };

  const findEmail = async () => {
    if (!profile.website && !profile.linkedin) return;
    setFindingEmail(true);
    try {
      const res = await fetch("/api/admin/ai/find-prospect-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: profile.website || profile.linkedin }),
      });
      if (res.ok) { const d = await res.json(); setFoundEmails(d.emails || []); }
    } finally { setFindingEmail(false); }
  };

  const archive = async () => {
    if (!confirm("Archiver ce profil ? Il restera consultable mais ne sera plus actif.")) return;
    onDelete(profile.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl h-full bg-dark-800 overflow-y-auto p-5 border-l border-gray-800" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-gray-600 text-xs font-mono">{profile.speakerId}</span>
              <TierBadge tier={profile.tier} />
              <ParticipationBadge model={profile.participationModel} />
            </div>
            <h2 className="text-white font-bold text-base">{profile.name}</h2>
            {(profile.title || profile.org) && (
              <p className="text-gray-400 text-xs">{profile.title}{profile.org ? ` @ ${profile.org}` : ""}</p>
            )}
            {topicLabel && <p className="text-neon-green text-xs mt-0.5">{topicLabel}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs ml-2 shrink-0">✕ Fermer</button>
        </div>

        {/* IP gauge */}
        <div className="mb-4">
          <IpGauge score={profile.ipScore} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap mb-4">
          <button onClick={() => setEmailModal(true)} className="text-xs px-3 py-1.5 rounded" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff40" }}>
            ✉ Email IA{profile.aiDraftEmail ? " ✓" : ""}
          </button>
          <button onClick={() => setBriefModal(true)} className="text-xs px-3 py-1.5 rounded" style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff40" }}>
            📋 Brief équipe{profile.aiDraftBrief ? " ✓" : ""}
          </button>
          {canWrite && <button onClick={() => setTab("edit")} className="text-xs px-3 py-1.5 rounded btn-neon">✏️ Modifier</button>}
          {canWrite && <button onClick={archive} className="text-xs px-3 py-1.5 rounded text-red-400 border border-red-900 hover:border-red-700">Archiver</button>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-800">
          {(["info","contacts","sources","edit"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="text-xs px-3 py-2 capitalize transition-all"
              style={{ color: tab === t ? "var(--ac)" : "var(--txt-mute)", borderBottom: tab === t ? "2px solid var(--ac)" : "2px solid transparent" }}>
              {t === "info" ? "Profil" : t === "contacts" ? `Contacts (${profile.contacts.length})` : t === "sources" ? `Sources (${profile.sources.length})` : "Modifier"}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {tab === "info" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {profile.country && <div><span className="text-gray-500">Pays: </span><span className="text-white">{profile.city ? `${profile.city}, ` : ""}{profile.country}</span></div>}
              {profile.profileType && <div><span className="text-gray-500">Type: </span><span className="text-white">{profile.profileType}</span></div>}
              {(profile.langFr || profile.langEn) && <div><span className="text-gray-500">Langues: </span><span className="text-white">{[profile.langFr && "FR", profile.langEn && "EN", profile.langOther].filter(Boolean).join(" · ")}</span></div>}
              {profile.techLevel && <div><span className="text-gray-500">Niveau: </span><span className="text-white">{profile.techLevel}</span></div>}
            </div>
            {profile.bio && <div><p className="text-gray-500 mb-1">Bio</p><p className="text-gray-300 leading-relaxed">{profile.bio}</p></div>}
            {profile.certifications && <div><p className="text-gray-500 mb-1">Certifications / mots-clés</p><p className="text-gray-300">{profile.certifications}</p></div>}

            {/* Links */}
            <div className="flex gap-2 flex-wrap">
              {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">LinkedIn</a>}
              {profile.github && <a href={profile.github} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline">GitHub</a>}
              {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline">Site</a>}
              {profile.scholar && <a href={profile.scholar} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline">Scholar</a>}
            </div>

            {/* Email */}
            <div>
              <p className="text-gray-500 mb-1">Email de contact</p>
              {profile.email ? (
                <p className="text-neon-green font-mono">{profile.email}</p>
              ) : (
                <div>
                  <button onClick={findEmail} disabled={findingEmail || (!profile.website && !profile.linkedin)} className="text-xs text-gray-400 hover:text-white">
                    {findingEmail ? "Recherche…" : "🔍 Trouver l'email"}
                  </button>
                  {foundEmails.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {foundEmails.map((e, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-gray-300 font-mono">{e.email}</span>
                          <span className="text-gray-600 text-xs">{e.source}</span>
                          {canWrite && <button onClick={() => saveEdit({ ...profile, email: e.email, p1: profile.p1, p2: profile.p2, p3: profile.p3, p4: profile.p4, p5: profile.p5, p6: profile.p6 })} className="text-xs text-neon-green">← Utiliser</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* IP breakdown */}
            <div className="cyber-card rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-2">Détail scoring IP</p>
              {P_LABELS.map(({ key, label, weight }) => (
                <div key={key} className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500 truncate flex-1">{label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1 rounded-full bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full bg-neon-green/60" style={{ width: `${profile[key as PKey]}%` }} />
                    </div>
                    <span className="font-mono text-white w-6 text-right">{profile[key as PKey]}</span>
                    <span className="text-gray-700 w-8">{weight}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                <span className="text-gray-500">IP Total</span>
                <IpGauge score={profile.ipScore} />
              </div>
            </div>
          </div>
        )}

        {/* Contacts tab */}
        {tab === "contacts" && (
          <div className="space-y-3 text-xs">
            {profile.contacts.map(c => {
              const statusMeta = CONTACT_STATUSES.find(s => s.value === c.contactStatus);
              return (
                <div key={c.id} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-mono">{c.eventLabel}</span>
                    {canWrite && <button onClick={() => deleteContact(c.id)} className="text-red-500 hover:text-red-400 text-xs">✕</button>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-2 py-0.5 rounded font-mono" style={{ background: (statusMeta?.color || "#888") + "20", color: statusMeta?.color || "#888", border: `1px solid ${statusMeta?.color || "#888"}40` }}>
                      {statusMeta?.labelFr || c.contactStatus}
                    </span>
                    {c.formatProposed && <span className="text-gray-400 capitalize">{c.formatProposed}</span>}
                  </div>
                  {c.topicProposed && <p className="text-gray-400 mb-2">{c.topicProposed}</p>}
                  {canWrite && (
                    <select className="cyber-input w-full px-2 py-1 rounded text-xs bg-transparent mb-2" value={c.contactStatus}
                      onChange={e => updateContact(c.id, { contactStatus: e.target.value })}>
                      {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelFr}</option>)}
                    </select>
                  )}
                  {c.notes && <p className="text-gray-600 italic">{c.notes}</p>}
                </div>
              );
            })}

            {canWrite && (
              <div>
                {!addingContact ? (
                  <button onClick={() => setAddingContact(true)} className="text-xs btn-neon px-3 py-1.5 rounded">+ Ajouter suivi contact</button>
                ) : (
                  <div className="border border-gray-700 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Édition</label>
                        <input className="cyber-input w-full px-2 py-1 rounded text-xs" value={contactForm.eventLabel ?? "EOCON 2026"} onChange={e => setContactForm(f => ({ ...f, eventLabel: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Statut</label>
                        <select className="cyber-input w-full px-2 py-1 rounded text-xs bg-transparent" value={contactForm.contactStatus ?? "to_contact"} onChange={e => setContactForm(f => ({ ...f, contactStatus: e.target.value }))}>
                          {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.labelFr}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Format proposé</label>
                        <select className="cyber-input w-full px-2 py-1 rounded text-xs bg-transparent" value={contactForm.formatProposed ?? "talk"} onChange={e => setContactForm(f => ({ ...f, formatProposed: e.target.value }))}>
                          {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Assigné à</label>
                        <select className="cyber-input w-full px-2 py-1 rounded text-xs bg-transparent" value={contactForm.assigneeId ?? ""} onChange={e => setContactForm(f => ({ ...f, assigneeId: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">— Personne —</option>
                          {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sujet proposé</label>
                      <input className="cyber-input w-full px-2 py-1 rounded text-xs" value={contactForm.topicProposed ?? ""} onChange={e => setContactForm(f => ({ ...f, topicProposed: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addContact} className="text-xs btn-neon-solid px-3 py-1.5 rounded border border-neon-green">Ajouter</button>
                      <button onClick={() => setAddingContact(false)} className="text-xs text-gray-500">Annuler</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sources tab */}
        {tab === "sources" && (
          <div className="space-y-3 text-xs">
            {profile.sources.map(s => (
              <div key={s.id} className="border border-gray-800 rounded-lg p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400 capitalize">{s.type}</span>
                    <span className="text-gray-700 text-xs">{s.reliability}</span>
                  </div>
                  {s.title && <p className="text-white truncate">{s.title}</p>}
                  {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block">{s.url.slice(0, 60)}…</a>}
                </div>
                {canWrite && <button onClick={() => deleteSource(s.id)} className="text-red-500 hover:text-red-400 shrink-0">✕</button>}
              </div>
            ))}
            {canWrite && (
              !addingSource ? (
                <button onClick={() => setAddingSource(true)} className="text-xs btn-neon px-3 py-1.5 rounded">+ Ajouter source</button>
              ) : (
                <div className="border border-gray-700 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select className="cyber-input w-full px-2 py-1 rounded text-xs bg-transparent" value={sourceForm.type ?? "linkedin"} onChange={e => setSourceForm(f => ({ ...f, type: e.target.value }))}>
                        {["conference","video","linkedin","github","article","bureau","other"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fiabilité</label>
                      <select className="cyber-input w-full px-2 py-1 rounded text-xs bg-transparent" value={sourceForm.reliability ?? "secondary"} onChange={e => setSourceForm(f => ({ ...f, reliability: e.target.value }))}>
                        <option value="primary">Primaire</option>
                        <option value="secondary">Secondaire</option>
                        <option value="to_verify">À vérifier</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Titre</label>
                      <input className="cyber-input w-full px-2 py-1 rounded text-xs" value={sourceForm.title ?? ""} onChange={e => setSourceForm(f => ({ ...f, title: e.target.value }))} placeholder="Page BSides Cape Town 2025…" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">URL</label>
                      <input className="cyber-input w-full px-2 py-1 rounded text-xs" value={sourceForm.url ?? ""} onChange={e => setSourceForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSource} className="text-xs btn-neon-solid px-3 py-1.5 rounded border border-neon-green">Ajouter</button>
                    <button onClick={() => setAddingSource(false)} className="text-xs text-gray-500">Annuler</button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Edit tab */}
        {tab === "edit" && canWrite && (
          <ProfileForm
            initial={profile as ProfileForm}
            onSave={saveEdit}
            onCancel={() => setTab("info")}
            saving={saving}
          />
        )}
      </div>

      {emailModal && <EmailModal profile={profile} contact={activeContact} onClose={() => setEmailModal(false)} onSave={d => saveAiDraft("aiDraftEmail", d)} />}
      {briefModal && <BriefModal profile={profile} onClose={() => setBriefModal(false)} onSave={d => saveAiDraft("aiDraftBrief", d)} />}
    </div>
  );
}

// ─── Dashboard coverage grid ──────────────────────────────────────────────────

function CoverageGrid({ profiles }: { profiles: SpeakerProfile[] }) {
  const active = profiles.filter(p => p.status === "active");
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left text-gray-500 py-2 pr-4 font-normal">Thématique</th>
            <th className="text-center text-gray-500 py-2 px-2 font-normal">Tier 1</th>
            <th className="text-center text-gray-500 py-2 px-2 font-normal">Tier 2</th>
            <th className="text-center text-gray-500 py-2 px-2 font-normal">Confirmés</th>
            <th className="text-center text-gray-500 py-2 px-2 font-normal">Statut</th>
          </tr>
        </thead>
        <tbody>
          {TOPICS.map(topic => {
            const forTopic = active.filter(p => p.topicMain === topic.key);
            const tier1 = forTopic.filter(p => p.tier === "Tier1").length;
            const tier2 = forTopic.filter(p => p.tier === "Tier2").length;
            const confirmed = forTopic.filter(p => {
              const c = p.contacts[0];
              return c && ["accepted","confirmed"].includes(c.contactStatus);
            }).length;
            return (
              <tr key={topic.key} className="border-b border-gray-900 hover:bg-white/2">
                <td className="py-2 pr-4">
                  <span className="text-gray-600 font-mono mr-2">{topic.key}</span>
                  <span className="text-gray-300">{topic.label}</span>
                </td>
                <td className="text-center py-2 px-2">
                  <span className={tier1 > 0 ? "text-neon-green font-mono font-bold" : "text-gray-700"}>{tier1}</span>
                </td>
                <td className="text-center py-2 px-2">
                  <span className={tier2 > 0 ? "text-blue-400 font-mono" : "text-gray-700"}>{tier2}</span>
                </td>
                <td className="text-center py-2 px-2">
                  <span className={confirmed > 0 ? "text-neon-green font-mono font-bold" : "text-gray-700"}>{confirmed}</span>
                </td>
                <td className="text-center py-2 px-2">
                  {confirmed > 0 ? (
                    <span className="text-neon-green">✓</span>
                  ) : tier1 > 0 ? (
                    <span className="text-yellow-400">⚡ Tier1 dispo</span>
                  ) : (
                    <span className="text-red-400">⚠ À couvrir</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── XLSX Import ──────────────────────────────────────────────────────────────

const TOPIC_KEYWORD_MAP: Array<[RegExp, string]> = [
  [/offensiv|red.?team/i, "TOP-01"],
  [/threat.?intel|hunting/i, "TOP-02"],
  [/cloud|infra/i, "TOP-03"],
  [/\bai\b|artificial|machine.?learn/i, "TOP-04"],
  [/forensic|incident|dfir/i, "TOP-05"],
  [/applic|api.?sec/i, "TOP-06"],
  [/\bot\b|ics|scada/i, "TOP-07"],
  [/privacy|data.?prot/i, "TOP-08"],
  [/govern|grc|compliance/i, "TOP-09"],
  [/emerging|afric.*threat/i, "TOP-10"],
  [/open.?source|oss/i, "TOP-11"],
  [/aware|culture|sensibil/i, "TOP-12"],
];

function normalizeTopic(val: string): string | undefined {
  if (!val) return undefined;
  const v = val.trim();
  if (/^top-\d{2}$/i.test(v)) return v.toUpperCase();
  const numMatch = v.match(/^(\d{1,2})[.\s\-–]/);
  if (numMatch) return `TOP-${numMatch[1].padStart(2, "0")}`;
  const numOnly = v.match(/^\d{1,2}$/);
  if (numOnly) return `TOP-${numOnly[0].padStart(2, "0")}`;
  for (const [re, key] of TOPIC_KEYWORD_MAP) if (re.test(v)) return key;
  return undefined;
}

function normalizeParticipation(val: string): string {
  if (!val) return "unknown";
  if (/volont|pro.?bono|gratuit|bénévole|volunteer|free|communaut/i.test(val)) return "volunteer";
  if (/payant|paid|cachet|rémun|bureau|speaker.?fee/i.test(val)) return "paid";
  return "unknown";
}

function normalizeIntCol(val: unknown): number {
  const n = Math.round(parseFloat(String(val ?? "")));
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
}

// Column name → internal field key (lowercase keys for lookup)
// Covers both single-row headers and 2-row ESID format (group header + sub-column)
const COL_MAP: Record<string, string> = {
  // ── Identity ──
  "nom": "name", "nom complet": "name", "name": "name", "full name": "name", "speaker": "name", "prénom nom": "name",
  "poste": "title", "titre": "title", "title": "title", "position": "title", "job title": "title", "fonction": "title",
  "organisation": "org", "organization": "org", "company": "org", "entreprise": "org", "org": "org", "société": "org",
  "organisation / poste": "org",  // merged label in some ESID exports
  "pays": "country", "country": "country",
  "région": "region", "region": "region", "zone": "region", "zone géographique": "region",
  "ville": "city", "city": "city",
  // ── Contact ──
  "linkedin": "linkedin", "linkedin url": "linkedin", "profil linkedin": "linkedin",
  "email": "email", "e-mail": "email", "mail": "email", "courriel": "email", "adresse email": "email",
  // ── Topic / participation ──
  "thématique": "topicMain", "topic": "topicMain", "thematique": "topicMain",
  "thématique principale": "topicMain", "axe thématique": "topicMain", "sujet": "topicMain",
  "modèle de participation": "participationModel", "participation": "participationModel",
  "modèle": "participationModel", "cachet estimé": "participationModel", "cachet": "participationModel",
  // ── P scores — short forms ──
  "p1": "p1", "p2": "p2", "p3": "p3", "p4": "p4", "p5": "p5", "p6": "p6",
  // ── P scores — ESID group-header labels (row 1 in 2-row header files) ──
  "p1 pertinence intl.": "p1", "p1 - pertinence internationale": "p1",
  "p2 alignement eocon": "p2", "p2 - alignement thématique eocon": "p2",
  "p3 africanité / diaspora": "p3", "p3 - africanité / diaspora": "p3",
  "p4 budget": "p4", "p4 - accessibilité & modèle pro bono": "p4",
  "p5 format": "p5", "p5 - adéquation format programme": "p5",
  "p6 visibilité": "p6", "p6 - visibilité & rayonnement": "p6",
  // ── Computed columns — skip (recalculated server-side) ──
  "indice de priorité": "__skip__", "ip": "__skip__", "ip /100": "__skip__",
  "tier": "__skip__", "tier de contact": "__skip__", "#": "__skip__",
  "/100": "__skip__",
  // ── Misc ──
  "notes": "notes", "commentaires": "notes", "observations": "notes", "remarques": "notes", "note": "notes",
  "pertinence": "notes",
  "site web": "website", "website": "website",
  "twitter": "twitter", "github": "github",
  "bio": "bio", "biographie": "bio", "biography": "bio",
  "langue": "__lang__", "langue(s)": "__lang__", "language": "__lang__", "langues": "__lang__", "lang": "__lang__",
  "source": "__source__", "sources": "__source__", "source principale": "__source__",
  "format": "__format__", "format proposé": "__format__", "format de présentation": "__format__",
  "type de profil": "profileType", "profil": "profileType", "catégorie": "profileType",
  "niveau technique": "techLevel", "tech level": "techLevel",
  "certifications": "certifications", "certs": "certifications",
  "conférences passées": "conferencesPast", "past conferences": "conferencesPast",
  "talks passés": "conferencesPast", "historique conférences": "conferencesPast",
  "publications": "publications",
  "keywords": "keywords", "mots-clés": "keywords", "mots clés": "keywords",
};

function buildProfileFromRow(row: unknown[], fieldMap: string[]): ProfileForm | null {
  const get = (field: string): string => {
    const idx = fieldMap.indexOf(field);
    return idx >= 0 ? String(row[idx] ?? "").trim() : "";
  };

  const name = get("name");
  if (!name) return null;

  const langRaw = get("__lang__");
  const langFr = !langRaw || /fr|français|french/i.test(langRaw);
  const langEn = !langRaw || /en|english|anglais/i.test(langRaw);

  const participationRaw = get("participationModel") || get("__source__");
  const participationModel = normalizeParticipation(participationRaw);
  const topicMain = normalizeTopic(get("topicMain")) ?? "";

  const noteParts: string[] = [];
  const sourceVal = get("__source__");
  const notesVal = get("notes");
  const formatVal = get("__format__");
  if (sourceVal) noteParts.push(`Source: ${sourceVal}`);
  if (notesVal) noteParts.push(notesVal);
  if (formatVal) noteParts.push(`Format suggéré: ${formatVal}`);

  return {
    name,
    title: get("title") || undefined,
    org: get("org") || undefined,
    country: get("country") || undefined,
    region: get("region") || undefined,
    city: get("city") || undefined,
    bio: get("bio") || undefined,
    profileType: get("profileType") || undefined,
    participationModel,
    langFr,
    langEn,
    langOther: "",
    topicMain,
    topicsSecondary: [],
    keywords: get("keywords") || undefined,
    techLevel: get("techLevel") || "intermediate",
    certifications: get("certifications") || undefined,
    linkedin: get("linkedin") || undefined,
    twitter: get("twitter") || undefined,
    github: get("github") || undefined,
    scholar: undefined,
    website: get("website") || undefined,
    email: get("email") || undefined,
    conferencesPast: get("conferencesPast") || undefined,
    videosUrls: undefined,
    publications: get("publications") || undefined,
    p1: normalizeIntCol(get("p1")),
    p2: normalizeIntCol(get("p2")),
    p3: normalizeIntCol(get("p3")),
    p4: normalizeIntCol(get("p4")),
    p5: normalizeIntCol(get("p5")),
    p6: normalizeIntCol(get("p6")),
    status: "active",
    notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
  };
}

function XlsxImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"pick" | "preview" | "importing" | "done">("pick");
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<unknown[][]>([]);
  const [previewRows, setPreviewRows] = useState<unknown[][]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, imported: 0, errors: [] as string[] });

  const handleFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

    if (raw.length < 2) { alert("Fichier vide ou illisible."); return; }

    const toStr = (v: unknown) => String(v ?? "").trim();
    const row1 = (raw[0] as unknown[]).map(toStr);
    const row2 = raw.length > 2 ? (raw[1] as unknown[]).map(toStr) : [] as string[];

    // Score each row: how many cells match COL_MAP?
    const scoreRow = (r: string[]) => r.filter(h => h && COL_MAP[h.toLowerCase()] !== undefined).length;
    const s1 = scoreRow(row1);
    const s2 = scoreRow(row2);

    let hdrs: string[];
    let firstDataRow: number;

    if (s2 > s1 && row2.length > 0) {
      // 2-row header: row 2 has the actual column names.
      // For columns where row 2 is empty/unrecognized, fall back to row 1 group label (covers P1-P6).
      hdrs = row2.map((h, i) => {
        const h1 = row1[i] ?? "";
        if (h && COL_MAP[h.toLowerCase()]) return h;        // row 2 recognized → use it
        if (h1 && COL_MAP[h1.toLowerCase()]) return h1;     // row 1 group label recognized → use it
        return h || h1;                                      // best-effort fallback
      });
      firstDataRow = 2;
    } else {
      hdrs = row1;
      firstDataRow = 1;
    }

    const fMap = hdrs.map(h => COL_MAP[h.toLowerCase()] ?? `__unknown_${h}__`);
    const dataRows = raw.slice(firstDataRow).filter(r =>
      (r as unknown[]).some(c => toStr(c) !== "")
    );

    setHeaders(hdrs);
    setFieldMap(fMap);
    setAllRows(dataRows);
    setPreviewRows(dataRows.slice(0, 5));
    setStep("preview");
  };

  const runImport = async () => {
    setStep("importing");
    const nameIdx = fieldMap.indexOf("name");
    const validRows = allRows.filter(r =>
      nameIdx >= 0 && String((r as unknown[])[nameIdx] ?? "").trim() !== ""
    );
    const total = validRows.length;
    setProgress({ done: 0, total, imported: 0, errors: [] });

    let imported = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      const profile = buildProfileFromRow(row as unknown[], fieldMap);
      if (!profile) continue;
      try {
        const res = await fetch("/api/admin/speaker-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        if (res.ok) { imported++; }
        else {
          const msg = await res.text().catch(() => "");
          errors.push(`${profile.name}: ${msg.slice(0, 120)}`);
        }
      } catch (e) {
        errors.push(`${profile.name}: ${String(e)}`);
      }
      setProgress(p => ({ ...p, done: p.done + 1, imported, errors: [...errors] }));
    }

    setProgress({ done: total, total, imported, errors });
    setStep("done");
  };

  const recognized = fieldMap.filter(f => !f.startsWith("__unknown_") && f !== "__skip__").length;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="cyber-card rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-neon-green text-sm font-bold">📥 Import XLSX — Speakers EOCON 2026</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
        </div>

        {step === "pick" && (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-400 text-xs">Format ESID attendu — colonnes : Nom, Organisation, Pays, Région, Langue,<br />Poste, Thématique, Modèle de participation, Email, LinkedIn, P1-P6, Notes…</p>
            <button onClick={() => fileRef.current?.click()} className="btn-neon px-6 py-3 rounded text-sm">
              📂 Choisir le fichier .xlsx / .csv
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {/* Column detection */}
            <div className="border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">
                Colonnes détectées : <span className="text-neon-green font-mono font-bold">{recognized}/{headers.length}</span> reconnues
              </p>
              <div className="flex flex-wrap gap-1.5">
                {headers.map((h, i) => {
                  const isUnknown = fieldMap[i].startsWith("__unknown_");
                  const isSkip = fieldMap[i] === "__skip__";
                  const bg = isUnknown ? "#ff000012" : isSkip ? "#33333320" : "#00ff9d12";
                  const color = isUnknown ? "#ff6666" : isSkip ? "#555" : "#00cc7a";
                  const border = isUnknown ? "#ff444430" : isSkip ? "#44444440" : "#00ff9d30";
                  return (
                    <span key={i} className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: bg, color, border: `1px solid ${border}` }}>
                      {h}
                      {!isUnknown && !isSkip && <span className="opacity-40 ml-1">→ {fieldMap[i]}</span>}
                      {isSkip && <span className="opacity-40 ml-1">ignoré</span>}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Preview table */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Aperçu — 5 premières lignes sur <span className="font-mono text-white">{allRows.length}</span> :</p>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {headers.slice(0, 9).map((h, i) => (
                        <th key={i} className="text-left text-gray-500 py-1.5 pr-4 font-normal whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-900 hover:bg-white/2">
                        {(row as unknown[]).slice(0, 9).map((cell, ci) => (
                          <td key={ci} className="py-1.5 pr-4 text-gray-300 max-w-[140px] truncate">{String(cell ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button onClick={runImport} className="btn-neon px-5 py-2 rounded text-xs">
                🚀 Importer les {allRows.length} profils
              </button>
              <button onClick={() => setStep("pick")} className="text-xs text-gray-500 hover:text-white">
                ← Changer de fichier
              </button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-10 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Import en cours…</span>
                <span className="font-mono">{progress.done}/{progress.total}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-neon-green transition-all duration-200 rounded-full"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
            {progress.errors.length > 0 && (
              <div className="text-xs text-red-400 space-y-1">
                {progress.errors.slice(-3).map((e, i) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-10 space-y-4">
            <p className="text-neon-green text-5xl font-black font-mono">{progress.imported}</p>
            <p className="text-white text-sm">profils importés avec succès</p>
            {progress.errors.length > 0 && (
              <div className="text-left border border-red-900 rounded-lg p-3 mt-4 max-h-40 overflow-y-auto">
                <p className="text-red-400 text-xs mb-2">{progress.errors.length} erreur(s) :</p>
                {progress.errors.map((e, i) => <p key={i} className="text-gray-500 text-xs">{e}</p>)}
              </div>
            )}
            <button onClick={() => { onDone(); onClose(); }} className="btn-neon px-6 py-2 rounded text-xs mt-4">
              ✓ Fermer et actualiser la base
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function ProspectionSpeakersPanel({ canWrite = false }: { canWrite?: boolean }) {
  const [profiles, setProfiles] = useState<SpeakerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"database" | "pipeline" | "dashboard">("database");
  const [selected, setSelected] = useState<SpeakerProfile | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apolloModal, setApolloModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);

  // Filters
  const [filterTier, setFilterTier] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterPM, setFilterPM] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/speaker-profiles");
    if (res.ok) setProfiles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/speaker-prospects/assignees").then(r => r.ok ? r.json() : []).then(setAssignees).catch(() => {});
  }, [load]);

  const filtered = profiles.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterTier !== "all" && p.tier !== filterTier) return false;
    if (filterTopic !== "all" && p.topicMain !== filterTopic) return false;
    if (filterPM !== "all" && p.participationModel !== filterPM) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.org ?? "").toLowerCase().includes(q) || (p.country ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const createProfile = async (form: ProfileForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/speaker-profiles", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (res.ok) { await load(); setShowForm(false); }
    } finally { setSaving(false); }
  };

  const updateProfile = (updated: SpeakerProfile) => {
    setProfiles(ps => ps.map(p => p.id === updated.id ? updated : p));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const archiveProfile = async (id: number) => {
    await fetch(`/api/admin/speaker-profiles/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "archived" }),
    });
    setSelected(null);
    await load();
  };

  const importFromApollo = (result: ApolloResult) => {
    const form: ProfileForm = {
      ...EMPTY_FORM,
      name: result.name,
      title: result.title ?? "",
      org: result.org ?? "",
      linkedin: result.linkedin ?? "",
      email: result.email ?? "",
      p1: result.aiSuggestion?.p1 ?? 0,
      p2: 0,
      p3: result.aiSuggestion?.p3 ?? 0,
      p4: result.aiSuggestion?.p4 ?? 50,
      p5: 0,
      p6: result.aiSuggestion?.p6 ?? 0,
      topicMain: result.aiSuggestion?.topicMain ?? "",
      participationModel: result.aiSuggestion?.participationModel ?? "unknown",
    };
    setShowForm(true);
    // Pre-populate form
    setTimeout(() => {
      setShowForm(false);
      setTimeout(() => {
        (window as unknown as { __apolloImport?: ProfileForm }).__apolloImport = form;
        setShowForm(true);
      }, 10);
    }, 0);
  };

  // Stats
  const active = profiles.filter(p => p.status === "active");
  const byTier = { Tier1: active.filter(p => p.tier === "Tier1").length, Tier2: active.filter(p => p.tier === "Tier2").length, Tier3: active.filter(p => p.tier === "Tier3").length, Veille: active.filter(p => p.tier === "Veille").length };
  const contacted = active.filter(p => p.contacts.some(c => ["contacted","followup1","followup2","interested","accepted","confirmed"].includes(c.contactStatus))).length;
  const confirmed = active.filter(p => p.contacts.some(c => ["accepted","confirmed"].includes(c.contactStatus))).length;

  // Pipeline view groups
  const pipelineGroups = CONTACT_STATUSES.filter(s => !["to_research","watchlist"].includes(s.value)).map(s => ({
    status: s,
    profiles: active.filter(p => p.contacts.some(c => c.contactStatus === s.value)),
  })).filter(g => g.profiles.length > 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">🔭 Prospection Speakers</h1>
          <p className="text-gray-500 text-xs mt-1">Base permanente · Scoring IP · Suivi contacts · IA intégrée</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canWrite && (
            <>
              <button onClick={() => setImportModal(true)} className="text-xs px-3 py-1.5 rounded" style={{ background: "#ff990015", color: "#ff9900", border: "1px solid #ff990040" }}>
                📥 Importer XLSX
              </button>
              <button onClick={() => setApolloModal(true)} className="text-xs px-3 py-1.5 rounded" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff40" }}>
                🌍 Recherche Apollo
              </button>
              <button onClick={() => setShowForm(true)} className="btn-neon px-4 py-2 rounded text-xs">+ Nouveau profil</button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total actifs", value: active.length, color: "var(--ac)" },
          { label: "Tier 1", value: byTier.Tier1, color: "#00ff9d" },
          { label: "Tier 2", value: byTier.Tier2, color: "#0066ff" },
          { label: "Contactés", value: contacted, color: "#ffaa00" },
          { label: "Confirmés", value: confirmed, color: "#00ff9d" },
          { label: "Archivés", value: profiles.filter(p => p.status === "archived").length, color: "#444" },
        ].map(s => (
          <div key={s.label} className="cyber-card rounded-lg p-3 text-center">
            <div className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-gray-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {(["database","pipeline","dashboard"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className="text-xs px-4 py-2 transition-all"
            style={{ color: view === v ? "var(--ac)" : "var(--txt-mute)", borderBottom: view === v ? "2px solid var(--ac)" : "2px solid transparent" }}>
            {v === "database" ? "📋 Base" : v === "pipeline" ? "📈 Pipeline contacts" : "📊 Couverture thématique"}
          </button>
        ))}
      </div>

      {/* Database view */}
      {view === "database" && (
        <div>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-4">
            <input className="cyber-input px-3 py-1.5 rounded text-xs flex-1 min-w-[180px]" placeholder="Rechercher (nom, org, pays)…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="cyber-input px-2 py-1.5 rounded text-xs bg-transparent" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
              <option value="all">Tous tiers</option>
              {["Tier1","Tier2","Tier3","Veille"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="cyber-input px-2 py-1.5 rounded text-xs bg-transparent" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
              <option value="all">Toutes thématiques</option>
              {TOPICS.map(t => <option key={t.key} value={t.key}>{t.key}</option>)}
            </select>
            <select className="cyber-input px-2 py-1.5 rounded text-xs bg-transparent" value={filterPM} onChange={e => setFilterPM(e.target.value)}>
              <option value="all">Tous modèles</option>
              <option value="volunteer">Pro bono</option>
              <option value="unknown">Inconnu</option>
              <option value="paid">Payant</option>
            </select>
            <select className="cyber-input px-2 py-1.5 rounded text-xs bg-transparent" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="active">Actifs</option>
              <option value="archived">Archivés</option>
              <option value="all">Tous</option>
            </select>
          </div>

          {loading && <p className="text-gray-600 text-xs py-8 text-center">Chargement…</p>}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-sm">Aucun profil trouvé.</p>
              {canWrite && <p className="text-gray-700 text-xs mt-2">Créez votre premier profil ou lancez une recherche Apollo.</p>}
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p => {
              const topicLabel = TOPICS.find(t => t.key === p.topicMain)?.label;
              const activeContact = p.contacts[0];
              const contactMeta = activeContact ? CONTACT_STATUSES.find(s => s.value === activeContact.contactStatus) : null;
              return (
                <div key={p.id} className="cyber-card rounded-xl p-4 cursor-pointer hover:border-gray-600 transition-all" onClick={() => setSelected(p)}>
                  <div className="flex items-start gap-3">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600 font-bold shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold truncate">{p.name}</p>
                      {p.title && <p className="text-gray-500 text-xs truncate">{p.title}</p>}
                      {p.org && <p className="text-gray-600 text-xs truncate">{p.org}</p>}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <TierBadge tier={p.tier} />
                        <ParticipationBadge model={p.participationModel} />
                      </div>
                      <IpGauge score={p.ipScore} />
                    </div>
                    {topicLabel && (
                      <p className="text-gray-500 text-xs truncate">{p.topicMain} · {topicLabel}</p>
                    )}
                    {contactMeta && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: contactMeta.color + "20", color: contactMeta.color }}>
                          {contactMeta.labelFr}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      {p.email && <span className="text-green-400 text-xs">📧</span>}
                      {p.linkedin && <span className="text-blue-400 text-xs">in</span>}
                      {p.langFr && <span className="text-xs text-gray-600">FR</span>}
                      {p.langEn && <span className="text-xs text-gray-600">EN</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline view */}
      {view === "pipeline" && (
        <div className="space-y-4">
          {pipelineGroups.length === 0 && (
            <p className="text-gray-600 text-xs py-8 text-center">Aucun contact actif en pipeline. Ajoutez des suivis depuis les fiches profil.</p>
          )}
          {pipelineGroups.map(({ status: s, profiles: ps }) => (
            <div key={s.value}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold" style={{ color: s.color }}>{s.labelFr}</span>
                <span className="text-xs text-gray-600">({ps.length})</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ps.map(p => {
                  const c = p.contacts.find(ct => ct.contactStatus === s.value);
                  return (
                    <div key={p.id} className="border border-gray-800 rounded-lg p-3 cursor-pointer hover:border-gray-600" onClick={() => setSelected(p)}>
                      <div className="flex items-center gap-2 mb-1">
                        <TierBadge tier={p.tier} />
                        <span className="text-white text-xs font-bold truncate flex-1">{p.name}</span>
                      </div>
                      {p.title && <p className="text-gray-500 text-xs truncate">{p.title}{p.org ? ` @ ${p.org}` : ""}</p>}
                      {c?.formatProposed && <p className="text-gray-600 text-xs capitalize mt-1">{c.formatProposed}</p>}
                      {c?.nextFollowupAt && (
                        <p className="text-xs mt-1" style={{ color: new Date(c.nextFollowupAt) < new Date() ? "#ff0066" : "#888" }}>
                          Relance: {new Date(c.nextFollowupAt).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard / coverage view */}
      {view === "dashboard" && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Couverture thématique — vue comité de programme</h2>
          <CoverageGrid profiles={profiles} />
        </div>
      )}

      {/* New profile form */}
      {showForm && canWrite && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
          <div className="cyber-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neon-green text-sm font-bold">Nouveau profil speaker</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>
            <ProfileForm
              initial={(typeof window !== "undefined" && (window as unknown as { __apolloImport?: ProfileForm }).__apolloImport) ? (() => {
                const f = (window as unknown as { __apolloImport?: ProfileForm }).__apolloImport!;
                delete (window as unknown as { __apolloImport?: ProfileForm }).__apolloImport;
                return f;
              })() : undefined}
              onSave={createProfile}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <ProfileDetail
          profile={selected}
          canWrite={canWrite}
          assignees={assignees}
          onClose={() => setSelected(null)}
          onUpdate={updateProfile}
          onDelete={archiveProfile}
        />
      )}

      {/* Apollo modal */}
      {apolloModal && (
        <ApolloSearchModal
          onClose={() => setApolloModal(false)}
          onImport={importFromApollo}
        />
      )}

      {/* XLSX import modal */}
      {importModal && (
        <XlsxImportModal
          onClose={() => setImportModal(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
