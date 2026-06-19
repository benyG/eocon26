"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Segment {
  audience: "registrations" | "newsletter" | "cfp_accepted" | "volunteers";
  statuses?: string[];
  ticketTypes?: string[];
  countries?: string[];
  langs?: string[];
  hasCtf?: boolean;
  checkedIn?: boolean;
}

interface Campaign {
  id: number;
  name: string;
  templateId?: number | null;
  subject: string;
  htmlBody: string;
  subjectEn?: string | null;
  htmlBodyEn?: string | null;
  segment: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  bouncedCount?: number;
  sentAt: string | null;
  createdAt: string;
}

interface EmailTemplate {
  id: number;
  slug?: string | null;
  name: string;
  subject: string;
  htmlBody: string;
  subjectEn?: string | null;
  htmlBodyEn?: string | null;
}

interface Facets {
  statuses: string[];
  ticketTypes: string[];
  countries: string[];
  langs: string[];
  total: number;
}

const AUDIENCES: { key: Segment["audience"]; label: string }[] = [
  { key: "registrations", label: "Inscrits" },
  { key: "newsletter", label: "Newsletter" },
  { key: "cfp_accepted", label: "Speakers acceptés" },
  { key: "volunteers", label: "Bénévoles acceptés" },
];

function parseSeg(raw: string): Segment {
  try { const p = JSON.parse(raw); if (p?.audience) return p; } catch { /* legacy */ }
  if (raw === "newsletter" || raw === "cfp_accepted" || raw === "volunteers") return { audience: raw };
  return { audience: "registrations" };
}

const STATUS_BADGE: Record<string, { c: string; label: string }> = {
  draft:   { c: "#888",    label: "Brouillon" },
  sending: { c: "#ffaa00", label: "Envoi en cours" },
  sent:    { c: "#00ff9d", label: "Envoyée" },
  failed:  { c: "#ff0066", label: "Échec" },
};

export default function CampaignsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/campaigns");
    if (r.ok) setCampaigns(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/campaigns/audience").then(r => r.ok ? r.json() : null).then(setFacets).catch(() => {});
    // Reusable campaign templates only (transactional ones carry a slug).
    fetch("/api/admin/email-templates").then(r => r.ok ? r.json() : null)
      .then((list: EmailTemplate[] | null) => { if (list) setTemplates(list.filter(t => !t.slug)); })
      .catch(() => {});
  }, [load]);

  const openNew = () => { setEditing(null); setShowEditor(true); };
  const openEdit = (c: Campaign) => { setEditing(c); setShowEditor(true); };

  const del = async (id: number) => {
    if (!confirm("Supprimer cette campagne ?")) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    load();
  };

  if (showEditor) {
    return <CampaignEditor
      campaign={editing}
      templates={templates}
      facets={facets}
      onClose={() => { setShowEditor(false); load(); }}
    />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">📣 Campagnes inscrits</h1>
          <p className="text-gray-500 text-xs mt-1">Choisissez un modèle bilingue, segmentez l&apos;audience et envoyez · suivi des envois</p>
        </div>
        {canWrite && <button onClick={openNew} className="btn-neon px-4 py-2 rounded text-xs">+ Nouvelle campagne</button>}
      </div>

      {loading ? (
        <p className="text-gray-600 text-xs">Chargement…</p>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-xs gap-3">
          <span>Aucune campagne pour l&apos;instant.</span>
          {canWrite && <button onClick={openNew} className="text-neon-green text-xs underline">Créer votre première campagne</button>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800 text-left">
                <th className="py-2 px-3 font-medium">Nom</th>
                <th className="py-2 px-3 font-medium">Statut</th>
                <th className="py-2 px-3 font-medium">Destinataires</th>
                <th className="py-2 px-3 font-medium">Envoyés</th>
                <th className="py-2 px-3 font-medium">Délivrés</th>
                <th className="py-2 px-3 font-medium">Cliqués</th>
                <th className="py-2 px-3 font-medium">Échecs</th>
                <th className="py-2 px-3 font-medium">Date</th>
                <th className="py-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                const isSent = c.status === "sent" || c.status === "failed";
                const pct = (n: number) => c.sentCount > 0 ? Math.round((n / c.sentCount) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b border-gray-900 hover:bg-white/5">
                    <td className="py-2.5 px-3">
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-gray-600 truncate max-w-[240px]">{c.subject}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-mono" style={{ background: badge.c + "20", color: badge.c }}>{badge.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-300 font-mono">{c.recipientCount || "—"}</td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: "#888" }}>
                      {isSent ? c.sentCount : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: "#00ff9d" }}>
                      {isSent ? `${c.deliveredCount ?? 0} (${pct(c.deliveredCount ?? 0)}%)` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: "#00d4ff" }}>
                      {isSent ? `${c.clickedCount ?? 0} (${pct(c.clickedCount ?? 0)}%)` : "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono" style={{ color: c.failedCount ? "#ff0066" : "#555" }}>{c.failedCount || "—"}</td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {c.sentAt ? new Date(c.sentAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : new Date(c.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openEdit(c)} className="text-xs text-gray-400 hover:text-neon-green px-2 py-1 border border-gray-700 rounded">
                          {c.status === "draft" && canWrite ? "Éditer" : "Voir"}
                        </button>
                        {canWrite && c.status === "draft" && (
                          <button onClick={() => del(c.id)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded">✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Editor / composer ────────────────────────────────────────────────────────
function CampaignEditor({ campaign, templates, facets, onClose }: { campaign: Campaign | null; templates: EmailTemplate[]; facets: Facets | null; onClose: () => void }) {
  const readOnly = !!campaign && campaign.status !== "draft";
  const [name, setName] = useState(campaign?.name || "");
  const [templateId, setTemplateId] = useState<number | null>(campaign?.templateId ?? null);
  const [seg, setSeg] = useState<Segment>(campaign ? parseSeg(campaign.segment) : { audience: "registrations" });
  const [id, setId] = useState<number | null>(campaign?.id ?? null);

  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLang, setPreviewLang] = useState<"fr" | "en">("fr");
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLang, setTestLang] = useState<"fr" | "en">("fr");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Campaign | null>(campaign);
  const [resending, setResending] = useState<"undelivered" | "unclicked" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The currently selected template (source of bilingual content).
  const tpl = templates.find(t => t.id === templateId) || null;
  // For a sent campaign the template may no longer exist — fall back to the snapshot.
  const content = {
    subject: tpl?.subject ?? campaign?.subject ?? "",
    htmlBody: tpl?.htmlBody ?? campaign?.htmlBody ?? "",
    subjectEn: tpl?.subjectEn ?? campaign?.subjectEn ?? "",
    htmlBodyEn: tpl?.htmlBodyEn ?? campaign?.htmlBodyEn ?? "",
  };
  const hasEn = !!(content.subjectEn && content.htmlBodyEn);

  // For a sent campaign, pull the live delivery/click metrics from the detail endpoint.
  useEffect(() => {
    if (!readOnly || !campaign) return;
    fetch(`/api/admin/campaigns/${campaign.id}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setMetrics(d); }).catch(() => {});
  }, [readOnly, campaign]);

  const doResend = async (mode: "undelivered" | "unclicked") => {
    if (!campaign) return;
    const label = mode === "undelivered" ? "non-délivrés" : "non-cliqués";
    if (!confirm(`Renvoyer la campagne aux destinataires ${label} ?`)) return;
    setResending(mode); setMsg(null);
    const r = await fetch(`/api/admin/campaigns/${campaign.id}/resend`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }),
    });
    setResending(null);
    if (r.ok) {
      const d = await r.json();
      setMsg(`✓ Renvoi ${label} : ${d.sent} envoyés, ${d.failed} échec(s)`);
      fetch(`/api/admin/campaigns/${campaign.id}`).then(res => res.ok ? res.json() : null).then(dd => { if (dd) setMetrics(dd); }).catch(() => {});
    } else {
      const e = await r.json().catch(() => ({}));
      setMsg(`✗ ${e.error || "Échec du renvoi"}`);
    }
  };

  // Live audience count whenever the segment changes.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/campaigns/audience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seg) })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (active && d) { setCount(d.count); setSample(d.sample || []); } })
      .catch(() => {});
    return () => { active = false; };
  }, [seg]);

  const persist = useCallback(async (): Promise<number | null> => {
    if (readOnly) return id;
    setSaving(true);
    const body = JSON.stringify({ name: name || "Sans titre", templateId, segment: seg });
    let cid = id;
    if (cid) {
      await fetch(`/api/admin/campaigns/${cid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (r.ok) { const c = await r.json(); cid = c.id; setId(cid); }
    }
    setSaving(false);
    return cid;
  }, [readOnly, id, name, templateId, seg]);

  // Debounced autosave for drafts.
  useEffect(() => {
    if (readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { persist(); }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, templateId, seg]);

  const doPreview = async (lang: "fr" | "en") => {
    const htmlBody = lang === "en" ? content.htmlBodyEn : content.htmlBody;
    const r = await fetch("/api/admin/campaigns/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ htmlBody }) });
    if (r.ok) { const d = await r.json(); setPreviewHtml(d.html); setPreviewLang(lang); setShowPreview(true); }
  };

  const sendTest = async () => {
    if (!testEmail.trim() || !tpl) return;
    setMsg(null);
    const subject = testLang === "en" ? content.subjectEn : content.subject;
    const htmlBody = testLang === "en" ? content.htmlBodyEn : content.htmlBody;
    const r = await fetch("/api/admin/campaigns/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testEmail, subject, htmlBody }) });
    setMsg(r.ok ? `✓ Email de test (${testLang.toUpperCase()}) envoyé à ${testEmail}` : "✗ Échec de l'envoi du test");
  };

  const sendCampaign = async () => {
    if (!tpl) { setMsg("✗ Choisissez un modèle d'email"); return; }
    if (!count) { setMsg("✗ Aucun destinataire pour ce segment"); return; }
    if (!confirm(`Envoyer la campagne « ${name || "Sans titre"} » à ${count} destinataire(s) ? Chaque destinataire reçoit la version correspondant à sa langue. Cette action est définitive.`)) return;
    setSending(true); setMsg(null);
    const cid = await persist();
    if (!cid) { setSending(false); setMsg("✗ Échec de l'enregistrement"); return; }
    const r = await fetch(`/api/admin/campaigns/${cid}/send`, { method: "POST" });
    setSending(false);
    if (r.ok) { const d = await r.json(); setMsg(`✓ Campagne envoyée : ${d.sent} envoyés, ${d.failed} échec(s)`); setTimeout(onClose, 1500); }
    else { const e = await r.json().catch(() => ({})); setMsg(`✗ ${e.error || "Échec de l'envoi"}`); }
  };

  const toggle = (field: "statuses" | "ticketTypes" | "countries" | "langs", val: string) => {
    setSeg(s => {
      const cur = new Set(s[field] || []);
      if (cur.has(val)) cur.delete(val); else cur.add(val);
      return { ...s, [field]: Array.from(cur) };
    });
  };

  const triState = (field: "hasCtf" | "checkedIn") => {
    setSeg(s => {
      const cur = s[field];
      const next = cur === undefined ? true : cur === true ? false : undefined;
      return { ...s, [field]: next };
    });
  };

  const FilterChips = ({ field, values }: { field: "statuses" | "ticketTypes" | "countries" | "langs"; values: string[] }) => (
    <div className="flex flex-wrap gap-1.5">
      {values.length === 0 && <span className="text-gray-700 text-xs">—</span>}
      {values.map(v => {
        const on = (seg[field] || []).includes(v);
        return (
          <button key={v} disabled={readOnly} onClick={() => toggle(field, v)}
            className={`text-xs px-2 py-1 rounded border transition-all ${on ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-500 hover:border-gray-500"} disabled:opacity-50`}>
            {v}
          </button>
        );
      })}
    </div>
  );

  const isReg = seg.audience === "registrations";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-white text-sm">← Retour</button>
          <h1 className="text-xl font-black text-white">{readOnly ? "📣 Détail campagne" : campaign ? "📣 Éditer la campagne" : "📣 Nouvelle campagne"}</h1>
          {saving && <span className="text-gray-600 text-xs">enregistrement…</span>}
          {readOnly && <span className="text-xs text-yellow-500 bg-yellow-500/10 rounded px-2 py-0.5">Lecture seule (envoyée)</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* LEFT — content */}
        <div className="space-y-4">
          <div className="cyber-card rounded-xl p-5 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom interne de la campagne</label>
              <input disabled={readOnly} value={name} onChange={e => setName(e.target.value)} className="cyber-input w-full px-3 py-2 rounded text-xs" placeholder="ex : Rappel J-7 inscrits" />
            </div>

            {/* Template selector */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Modèle d&apos;email (bilingue FR / EN) *</label>
              {readOnly ? (
                <div className="cyber-input w-full px-3 py-2 rounded text-xs text-gray-300">
                  {tpl?.name || campaign?.subject || "—"}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-yellow-500/80 text-xs py-2">
                  Aucun modèle disponible. Créez-en un dans <span className="font-bold">Communication → Emails &amp; Templates</span>.
                </p>
              ) : (
                <select
                  value={templateId ?? ""}
                  onChange={e => setTemplateId(e.target.value ? parseInt(e.target.value) : null)}
                  className="cyber-input w-full px-3 py-2 rounded text-xs"
                >
                  <option value="">— Choisir un modèle —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.subjectEn && t.htmlBodyEn ? "  (FR + EN)" : "  (FR seul)"}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected template summary */}
            {tpl && (
              <div className="rounded-lg border border-gray-800 p-3 space-y-2">
                <div>
                  <p className="text-gray-600 text-xs">Sujet FR</p>
                  <p className="text-white text-xs">{content.subject || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">Sujet EN</p>
                  <p className={`text-xs ${hasEn ? "text-white" : "text-yellow-500/80"}`}>{content.subjectEn || "— (version EN manquante : les anglophones recevront la version FR)"}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => doPreview("fr")} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:border-neon-green hover:text-neon-green">👁 Aperçu FR</button>
                  <button onClick={() => doPreview("en")} disabled={!hasEn} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:border-neon-blue hover:text-neon-blue disabled:opacity-40">👁 Aperçu EN</button>
                </div>
              </div>
            )}
            <p className="text-gray-700 text-xs">Chaque destinataire reçoit automatiquement la version correspondant à sa langue (FR par défaut). Variables : {"{{fname}} {{lname}} {{org}} {{country}} {{ticketType}}"}</p>
          </div>

          {/* Test email */}
          {!readOnly && tpl && (
            <div className="cyber-card rounded-xl p-5">
              <label className="block text-xs text-gray-500 mb-2">✉️ Envoyer un email de test</label>
              <div className="flex gap-2 mb-2">
                {(["fr", "en"] as const).map(l => (
                  <button key={l} onClick={() => setTestLang(l)} disabled={l === "en" && !hasEn}
                    className={`text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-40 ${testLang === l ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-500"}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={testEmail} onChange={e => setTestEmail(e.target.value)} className="cyber-input flex-1 px-3 py-2 rounded text-xs" placeholder="votre@email.com" />
                <button onClick={sendTest} disabled={!testEmail.trim()} className="text-xs px-4 py-2 rounded border border-gray-700 text-gray-300 hover:border-neon-green hover:text-neon-green disabled:opacity-40">Tester</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — audience + send */}
        <div className="space-y-4">
          <div className="cyber-card rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neon-green">Segment / Audience</h3>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Base</label>
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCES.map(a => (
                  <button key={a.key} disabled={readOnly} onClick={() => setSeg({ audience: a.key })}
                    className={`text-xs px-3 py-1.5 rounded border transition-all ${seg.audience === a.key ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-500 hover:border-gray-500"} disabled:opacity-50`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {isReg && facets && (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Statut d&apos;inscription</label>
                  <FilterChips field="statuses" values={facets.statuses} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Type de billet</label>
                  <FilterChips field="ticketTypes" values={facets.ticketTypes} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Pays</label>
                  <FilterChips field="countries" values={facets.countries} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Langue</label>
                  <FilterChips field="langs" values={facets.langs} />
                </div>
                <div className="flex gap-2">
                  <button disabled={readOnly} onClick={() => triState("hasCtf")}
                    className={`text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-50 ${seg.hasCtf === undefined ? "border-gray-700 text-gray-500" : seg.hasCtf ? "border-neon-green text-neon-green bg-neon-green/10" : "border-red-700 text-red-400 bg-red-500/10"}`}>
                    CTF : {seg.hasCtf === undefined ? "tous" : seg.hasCtf ? "oui" : "non"}
                  </button>
                  <button disabled={readOnly} onClick={() => triState("checkedIn")}
                    className={`text-xs px-3 py-1.5 rounded border transition-all disabled:opacity-50 ${seg.checkedIn === undefined ? "border-gray-700 text-gray-500" : seg.checkedIn ? "border-neon-green text-neon-green bg-neon-green/10" : "border-red-700 text-red-400 bg-red-500/10"}`}>
                    Check-in : {seg.checkedIn === undefined ? "tous" : seg.checkedIn ? "oui" : "non"}
                  </button>
                </div>
              </>
            )}

            {/* Live count */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500">Destinataires correspondants</p>
              <p className="text-3xl font-black" style={{ color: count ? "#00ff9d" : "#555" }}>{count ?? "…"}</p>
              {sample.length > 0 && (
                <p className="text-gray-700 text-xs mt-1 truncate">{sample.join(", ")}{count && count > sample.length ? "…" : ""}</p>
              )}
            </div>
          </div>

          {/* Send */}
          {!readOnly && (
            <div className="cyber-card rounded-xl p-5">
              <button onClick={sendCampaign} disabled={sending || !count || !tpl} className="btn-neon-solid w-full py-3 rounded text-sm border-2 border-neon-green disabled:opacity-40">
                {sending ? "Envoi en cours…" : `🚀 Envoyer à ${count ?? 0} destinataire(s)`}
              </button>
              {!tpl && <p className="text-gray-600 text-xs mt-2 text-center">Choisissez un modèle d&apos;email pour activer l&apos;envoi.</p>}
              {msg && <p className={`text-xs mt-3 text-center ${msg.startsWith("✓") ? "text-neon-green" : "text-red-400"}`}>{msg}</p>}
            </div>
          )}

          {readOnly && campaign && (() => {
            const m = metrics || campaign;
            const sent = m.sentCount || 0;
            const delivered = m.deliveredCount ?? 0;
            const opened = m.openedCount ?? 0;
            const clicked = m.clickedCount ?? 0;
            const pct = (n: number) => sent > 0 ? Math.round((n / sent) * 100) : 0;
            const undelivered = Math.max(sent - delivered, 0);
            const unclicked = Math.max(delivered - clicked, 0);
            const stat = (label: string, val: number, sub: string, color: string) => (
              <div className="rounded-lg border border-gray-800 p-3 text-center">
                <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
                <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                <p className="text-gray-700 text-xs">{sub}</p>
              </div>
            );
            return (
              <div className="cyber-card rounded-xl p-5 space-y-4">
                <div className="text-xs text-gray-400">
                  Envoyée le <span className="text-white">{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString("fr-FR") : "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stat("Envoyés", sent, `${m.recipientCount} ciblés`, "#888")}
                  {stat("Délivrés", delivered, `${pct(delivered)}%`, "#00ff9d")}
                  {stat("Ouverts", opened, `${pct(opened)}%`, "#ffaa00")}
                  {stat("Cliqués", clicked, `${pct(clicked)}%`, "#00d4ff")}
                </div>
                {m.failedCount > 0 && <p className="text-xs text-red-400">Échecs d&apos;envoi : {m.failedCount}</p>}
                <p className="text-gray-700 text-xs leading-relaxed">
                  Le suivi des délivrances et clics est alimenté par les webhooks Resend (le suivi des ouvertures/clics doit être activé sur le domaine d&apos;envoi).
                </p>

                {/* Resend actions */}
                <div className="border-t border-gray-800 pt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-neon-green">Renvoi ciblé</p>
                  <button onClick={() => doResend("undelivered")} disabled={!!resending || undelivered === 0}
                    className="w-full text-xs px-3 py-2 rounded border border-gray-700 text-gray-300 hover:border-neon-green hover:text-neon-green disabled:opacity-40 text-left">
                    {resending === "undelivered" ? "Renvoi en cours…" : `↻ Renvoyer aux non-délivrés (${undelivered})`}
                  </button>
                  <button onClick={() => doResend("unclicked")} disabled={!!resending || unclicked === 0}
                    className="w-full text-xs px-3 py-2 rounded border border-gray-700 text-gray-300 hover:border-neon-blue hover:text-neon-blue disabled:opacity-40 text-left">
                    {resending === "unclicked" ? "Renvoi en cours…" : `↻ Renvoyer aux non-cliqués (${unclicked})`}
                  </button>
                  {msg && <p className={`text-xs mt-1 ${msg.startsWith("✓") ? "text-neon-green" : "text-red-400"}`}>{msg}</p>}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 shrink-0">
              <span className="text-white text-xs font-mono">Aperçu {previewLang.toUpperCase()} — {(previewLang === "en" ? content.subjectEn : content.subject) || "(sans sujet)"}</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <iframe title="preview" srcDoc={previewHtml} className="w-full flex-1 bg-white" style={{ minHeight: "60vh" }} />
          </div>
        </div>
      )}
    </div>
  );
}
