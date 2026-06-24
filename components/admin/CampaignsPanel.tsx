"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import EmailTemplatesPanel from "@/components/admin/EmailTemplatesPanel";

// ── Contact / Subscriber types ─────────────────────────────────────────────────
interface Subscriber {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  profession?: string | null;
  company?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  source?: string | null;
  createdAt: string;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Segment {
  audience: "registrations" | "newsletter" | "cfp_accepted" | "cfp_onboarding" | "cfp_confirmed" | "cfp_scheduled" | "volunteers";
  statuses?: string[];
  ticketTypes?: string[];
  countries?: string[];
  langs?: string[];
  hasCtf?: boolean;
  checkedIn?: boolean;
  roles?: string[];
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
  volunteerRoles: string[];
  total: number;
}

const AUDIENCES: { key: Segment["audience"]; label: string }[] = [
  { key: "registrations", label: "Inscrits" },
  { key: "newsletter", label: "Newsletter" },
  { key: "cfp_accepted", label: "Speakers acceptés" },
  { key: "cfp_onboarding", label: "Speakers — onboarding" },
  { key: "cfp_confirmed", label: "Speakers — confirmés" },
  { key: "cfp_scheduled", label: "Speakers — programmés" },
  { key: "volunteers", label: "Bénévoles acceptés" },
];

function parseSeg(raw: string): Segment {
  try { const p = JSON.parse(raw); if (p?.audience) return p; } catch { /* legacy */ }
  if (raw === "newsletter" || raw === "cfp_accepted" || raw === "volunteers") return { audience: raw };
  if (raw === "cfp_onboarding" || raw === "cfp_confirmed" || raw === "cfp_scheduled") return { audience: raw };
  return { audience: "registrations" };
}

const STATUS_BADGE: Record<string, { c: string; label: string }> = {
  draft:   { c: "#888",    label: "Brouillon" },
  sending: { c: "#ffaa00", label: "Envoi en cours" },
  sent:    { c: "#00ff9d", label: "Envoyée" },
  failed:  { c: "#ff0066", label: "Échec" },
};

const STANDARD_HTML_FR = `<h1>Titre de l'email 🎉</h1>
<p>Bonjour {{fname}},</p>
<p>Votre message principal ici.</p>
<p>📅 <strong>28 novembre 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroun</strong></p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;display:inline-block;">Bouton d'action →</a></p>
<p>À très bientôt,<br>L'équipe EOCON 2026</p>`;

const STANDARD_HTML_EN = `<h1>Email title 🎉</h1>
<p>Hi {{fname}},</p>
<p>Your main message here.</p>
<p>📅 <strong>November 28, 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroon</strong></p>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;display:inline-block;">Call to action →</a></p>
<p>See you soon,<br>The EOCON 2026 team</p>`;

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function CampaignsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [subTab, setSubTab] = useState<"campaigns" | "templates" | "system" | "contacts">("campaigns");
  const [initialTemplateId, setInitialTemplateId] = useState<number | null>(null);

  // Contacts / subscriber state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number; total: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSubscribers = useCallback(async () => {
    setSubLoading(true);
    const r = await fetch("/api/admin/newsletter/subscribers");
    if (r.ok) setSubscribers(await r.json());
    setSubLoading(false);
  }, []);

  const deleteSubscriber = async (id: number) => {
    if (!confirm("Supprimer ce contact ?")) return;
    await fetch("/api/admin/newsletter/subscribers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSubscribers(prev => prev.filter(s => s.id !== id));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvText((ev.target?.result as string) || "");
    reader.readAsText(file, "UTF-8");
  };

  const runImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    const r = await fetch("/api/admin/newsletter/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    const data = await r.json();
    if (!r.ok) { setImportError(data.error || "Erreur"); } else { setImportResult(data); loadSubscribers(); }
    setImporting(false);
  };

  // Template modal state
  const [showTplModal, setShowTplModal] = useState(false);
  const [editTpl, setEditTpl] = useState<EmailTemplate | null>(null);
  const [tplForm, setTplForm] = useState({ name: "", subject: "", htmlBody: STANDARD_HTML_FR, subjectEn: "", htmlBodyEn: STANDARD_HTML_EN });
  const [tplSaving, setTplSaving] = useState(false);
  const [previewTpl, setPreviewTpl] = useState<{ html: string; lang: "fr" | "en" } | null>(null);

  // Campaign templates = non-slug templates
  const campaignTemplates = templates.filter(t => !t.slug);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/campaigns");
    if (r.ok) setCampaigns(await r.json());
    setLoading(false);
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/email-templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    load();
    fetch("/api/admin/campaigns/audience").then(r => r.ok ? r.json() : null).then(setFacets).catch(() => {});
    loadTemplates();
  }, [load, loadTemplates]);

  useEffect(() => {
    if (subTab === "contacts") loadSubscribers();
  }, [subTab, loadSubscribers]);

  const openNew = (tplId?: number) => {
    setEditing(null);
    setInitialTemplateId(tplId ?? null);
    setShowEditor(true);
  };

  const openEdit = (c: Campaign) => { setEditing(c); setInitialTemplateId(null); setShowEditor(true); };

  const del = async (id: number) => {
    if (!confirm("Supprimer cette campagne ?")) return;
    await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
    load();
  };

  const openTplCreate = () => {
    setEditTpl(null);
    setTplForm({ name: "", subject: "", htmlBody: STANDARD_HTML_FR, subjectEn: "", htmlBodyEn: STANDARD_HTML_EN });
    setShowTplModal(true);
  };

  const openTplEdit = (t: EmailTemplate) => {
    setEditTpl(t);
    setTplForm({ name: t.name, subject: t.subject, htmlBody: t.htmlBody, subjectEn: t.subjectEn || "", htmlBodyEn: t.htmlBodyEn || "" });
    setShowTplModal(true);
  };

  const saveTpl = async () => {
    setTplSaving(true);
    const body = JSON.stringify({ name: tplForm.name || "Sans titre", subject: tplForm.subject, htmlBody: tplForm.htmlBody, subjectEn: tplForm.subjectEn || null, htmlBodyEn: tplForm.htmlBodyEn || null });
    if (editTpl) {
      await fetch(`/api/admin/email-templates/${editTpl.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      await fetch("/api/admin/email-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    }
    setTplSaving(false);
    setShowTplModal(false);
    loadTemplates();
  };

  const deleteTpl = async (id: number) => {
    if (!confirm("Supprimer ce modèle ? Les campagnes utilisant ce modèle ne seront pas affectées.")) return;
    await fetch(`/api/admin/email-templates/${id}`, { method: "DELETE" });
    loadTemplates();
  };

  const previewHtml = async (tpl: EmailTemplate, lang: "fr" | "en") => {
    const htmlBody = lang === "en" ? tpl.htmlBodyEn : tpl.htmlBody;
    if (!htmlBody) return;
    const r = await fetch("/api/admin/campaigns/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ htmlBody }) });
    if (r.ok) { const d = await r.json(); setPreviewTpl({ html: d.html, lang }); }
  };

  if (showEditor) {
    return <CampaignEditor
      campaign={editing}
      templates={campaignTemplates}
      facets={facets}
      initialTemplateId={initialTemplateId}
      onClose={() => { setShowEditor(false); setInitialTemplateId(null); load(); }}
    />;
  }

  const TABS = [
    { key: "campaigns" as const, label: "📣 Campagnes", count: campaigns.length },
    { key: "templates" as const, label: "📋 Modèles campagne", count: campaignTemplates.length },
    { key: "contacts" as const, label: "📇 Contacts", count: subscribers.length || undefined },
    { key: "system" as const, label: "📧 Templates système" },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-6">
        {TABS.map(st => (
          <button
            key={st.key}
            onClick={() => setSubTab(st.key)}
            className={`text-xs px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 ${subTab === st.key ? "border-neon-green text-neon-green" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {st.label}
            {"count" in st && st.count > 0 && (
              <span className={`text-xs font-mono px-1 rounded ${subTab === st.key ? "bg-neon-green/20" : "bg-gray-800"}`}>{st.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ─────────────────────────────────────────────────── */}
      {subTab === "campaigns" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white">📣 Campagnes email</h1>
              <p className="text-gray-500 text-xs mt-1">Segmentez l&apos;audience, choisissez un modèle et envoyez · suivi des envois</p>
            </div>
            {canWrite && (
              <div className="flex gap-2">
                {campaignTemplates.length === 0 && (
                  <button onClick={() => setSubTab("templates")} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors">
                    + Créer un modèle d&apos;abord
                  </button>
                )}
                <button onClick={() => openNew()} className="btn-neon px-4 py-2 rounded text-xs">+ Nouvelle campagne</button>
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-gray-600 text-xs">Chargement…</p>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-xs gap-3">
              <span className="text-4xl">📭</span>
              <span>Aucune campagne pour l&apos;instant.</span>
              {canWrite && <button onClick={() => openNew()} className="text-neon-green text-xs underline">Créer votre première campagne</button>}
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
                        <td className="py-2.5 px-3 font-mono" style={{ color: "#888" }}>{isSent ? c.sentCount : "—"}</td>
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
        </>
      )}

      {/* ── CAMPAIGN TEMPLATES TAB ────────────────────────────────────────── */}
      {subTab === "templates" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white">📋 Modèles de campagne</h1>
              <p className="text-gray-500 text-xs mt-1">Modèles bilingues FR/EN réutilisables pour vos campagnes email</p>
            </div>
            {canWrite && (
              <button onClick={openTplCreate} className="btn-neon px-4 py-2 rounded text-xs">+ Nouveau modèle</button>
            )}
          </div>

          {campaignTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 text-xs gap-3">
              <span className="text-4xl">📄</span>
              <span>Aucun modèle de campagne.</span>
              {canWrite && <button onClick={openTplCreate} className="text-neon-green text-xs underline">Créer votre premier modèle</button>}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaignTemplates.map(t => {
                const hasEn = !!(t.subjectEn && t.htmlBodyEn);
                return (
                  <div key={t.id} className="cyber-card rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{t.name}</p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{t.subject || "—"}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "#00ff9d20", color: "#00ff9d", border: "1px solid #00ff9d30" }}>FR</span>
                        {hasEn
                          ? <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "#00ccff20", color: "#00ccff", border: "1px solid #00ccff30" }}>EN</span>
                          : <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "#ff006620", color: "#ff0066", border: "1px solid #ff006630" }}>EN ✗</span>
                        }
                      </div>
                    </div>

                    {t.subjectEn && (
                      <p className="text-gray-600 text-xs truncate italic">{t.subjectEn}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-gray-800">
                      <button onClick={() => previewHtml(t, "fr")} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors">👁 FR</button>
                      {hasEn && <button onClick={() => previewHtml(t, "en")} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white transition-colors">👁 EN</button>}
                      <button
                        onClick={() => { openNew(t.id); }}
                        className="text-xs px-2 py-1 rounded border border-neon-green/40 text-neon-green hover:bg-neon-green/10 transition-colors"
                      >
                        🚀 Utiliser
                      </button>
                      {canWrite && (
                        <>
                          <button onClick={() => openTplEdit(t)} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-neon-green transition-colors ml-auto">Éditer</button>
                          <button onClick={() => deleteTpl(t.id)} className="text-xs px-2 py-1 rounded border border-red-900 text-red-400 hover:text-red-300 transition-colors">✕</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SYSTEM TEMPLATES TAB ─────────────────────────────────────────── */}
      {subTab === "system" && (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-black text-white">📧 Templates système</h1>
            <p className="text-gray-500 text-xs mt-1">Emails transactionnels automatiques : confirmation d&apos;inscription, billet, rappels CTF…</p>
          </div>
          <EmailTemplatesPanel canWrite={canWrite} />
        </div>
      )}

      {/* ── TEMPLATE EDIT MODAL ────────────────────────────────────────────── */}
      {showTplModal && (
        <div className="fixed inset-0 bg-black/90 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowTplModal(false)}>
          <div className="cyber-card rounded-xl p-6 max-w-4xl w-full mt-8 mb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-base">{editTpl ? "Éditer le modèle" : "Nouveau modèle de campagne"}</h2>
              <button onClick={() => setShowTplModal(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nom du modèle *</label>
                <input value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="ex : Rappel J-7 inscrits" />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-neon-green uppercase tracking-widest">Version FR</p>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Objet FR *</label>
                    <input value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-xs" placeholder="ex : EOCON 2026 — Votre billet" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Corps HTML FR *</label>
                    <textarea rows={14} value={tplForm.htmlBody} onChange={e => setTplForm(f => ({ ...f, htmlBody: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-xs font-mono resize-y" />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Version EN <span className="text-gray-600 font-normal normal-case">(optionnel)</span></p>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Subject EN</label>
                    <input value={tplForm.subjectEn} onChange={e => setTplForm(f => ({ ...f, subjectEn: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-xs" placeholder="ex : EOCON 2026 — Your ticket" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">HTML Body EN</label>
                    <textarea rows={14} value={tplForm.htmlBodyEn} onChange={e => setTplForm(f => ({ ...f, htmlBodyEn: e.target.value }))} className="cyber-input w-full px-3 py-2 rounded text-xs font-mono resize-y" />
                  </div>
                </div>
              </div>

              <p className="text-gray-700 text-xs">Variables disponibles : {"{{fname}} {{lname}} {{org}} {{country}} {{ticketType}}"}</p>

              <div className="flex gap-3 pt-2">
                <button onClick={saveTpl} disabled={tplSaving || !tplForm.name || !tplForm.subject || !tplForm.htmlBody} className="btn-neon px-5 py-2 rounded text-xs disabled:opacity-40">
                  {tplSaving ? "Sauvegarde…" : editTpl ? "Mettre à jour" : "Créer le modèle"}
                </button>
                <button onClick={() => setShowTplModal(false)} className="text-gray-500 text-xs hover:text-white px-3 py-2">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTACTS TAB ─────────────────────────────────────────────────── */}
      {subTab === "contacts" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white">📇 Contacts newsletter</h1>
              <p className="text-gray-500 text-xs mt-1">
                {subscribers.length} contact{subscribers.length !== 1 ? "s" : ""} · audience utilisée pour les campagnes &ldquo;Newsletter&rdquo;
              </p>
            </div>
            {canWrite && (
              <button
                onClick={() => { setShowImport(true); setCsvText(""); setImportResult(null); setImportError(null); }}
                className="btn-neon px-4 py-2 rounded text-xs"
              >
                ⬆ Importer CSV Mailchimp
              </button>
            )}
          </div>

          {subLoading ? (
            <p className="text-gray-600 text-xs">Chargement…</p>
          ) : subscribers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-600 text-xs gap-3">
              <span className="text-4xl">📭</span>
              <span>Aucun contact pour l&apos;instant.</span>
              {canWrite && (
                <button onClick={() => { setShowImport(true); setCsvText(""); setImportResult(null); setImportError(null); }} className="text-neon-green text-xs underline">
                  Importer depuis Mailchimp
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800 text-left">
                    <th className="py-2 px-3 font-medium">Email</th>
                    <th className="py-2 px-3 font-medium">Prénom</th>
                    <th className="py-2 px-3 font-medium">Nom</th>
                    <th className="py-2 px-3 font-medium">Téléphone</th>
                    <th className="py-2 px-3 font-medium">Profession</th>
                    <th className="py-2 px-3 font-medium">Entreprise</th>
                    <th className="py-2 px-3 font-medium">Source</th>
                    {canWrite && <th className="py-2 px-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(s => (
                    <tr key={s.id} className="border-b border-gray-900 hover:bg-white/5">
                      <td className="py-2 px-3 text-white font-mono">{s.email}</td>
                      <td className="py-2 px-3 text-gray-300">{s.firstName || <span className="text-gray-700">—</span>}</td>
                      <td className="py-2 px-3 text-gray-300">{s.lastName || <span className="text-gray-700">—</span>}</td>
                      <td className="py-2 px-3 text-gray-400">{s.phone || <span className="text-gray-700">—</span>}</td>
                      <td className="py-2 px-3 text-gray-400">{s.profession || <span className="text-gray-700">—</span>}</td>
                      <td className="py-2 px-3 text-gray-400">{s.company || <span className="text-gray-700">—</span>}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${s.source === "import" ? "bg-blue-900/40 text-blue-400" : "bg-gray-800 text-gray-500"}`}>
                          {s.source || "form"}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => deleteSubscriber(s.id)} className="text-xs text-red-400 px-2 py-1 border border-red-900 rounded hover:bg-red-900/20">✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── IMPORT MODAL ──────────────────────────────────────────────── */}
          {showImport && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowImport(false)}>
              <div className="bg-[#0d0d0d] border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
                  <h2 className="text-white font-bold text-sm">⬆ Importer des contacts Mailchimp</h2>
                  <button onClick={() => setShowImport(false)} className="text-gray-500 hover:text-white">✕</button>
                </div>

                <div className="p-5 overflow-y-auto flex flex-col gap-4">
                  {/* Format hint */}
                  <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-3 text-xs text-blue-300">
                    <p className="font-semibold mb-1">Format attendu (export Mailchimp CSV) :</p>
                    <code className="font-mono text-blue-200 text-[11px]">
                      Email Address,First Name,Last Name,Phone Number,Profession,Company,Twitter,Linkedin
                    </code>
                    <p className="mt-1.5 text-blue-400">Les contacts déjà présents seront enrichis (données manquantes complétées) et non dupliqués.</p>
                  </div>

                  {/* File picker */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Choisir un fichier CSV :</p>
                    <div className="flex gap-2 items-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:border-neon-green hover:text-neon-green transition-colors"
                      >
                        📂 Parcourir…
                      </button>
                      {csvText && <span className="text-xs text-neon-green">✓ Fichier chargé ({csvText.split("\n").length - 1} lignes)</span>}
                    </div>
                  </div>

                  {/* Or paste */}
                  <div>
                    <p className="text-gray-400 text-xs mb-2">— ou coller le contenu CSV ici :</p>
                    <textarea
                      value={csvText}
                      onChange={e => setCsvText(e.target.value)}
                      placeholder={"Email Address,First Name,Last Name,Phone Number,Profession,Company,Twitter,Linkedin\njohn@example.com,John,Doe,..."}
                      rows={6}
                      className="cyber-input w-full text-xs rounded px-3 py-2 font-mono resize-y"
                    />
                  </div>

                  {importError && (
                    <p className="text-red-400 text-xs bg-red-950/30 border border-red-800/40 rounded p-2">{importError}</p>
                  )}

                  {importResult && (
                    <div className="bg-neon-green/10 border border-neon-green/30 rounded-lg p-3 text-xs">
                      <p className="text-neon-green font-bold mb-1">✓ Import terminé ({importResult.total} lignes traitées)</p>
                      <div className="flex gap-4 text-gray-300">
                        <span><span className="text-neon-green font-mono">{importResult.imported}</span> nouveau{importResult.imported !== 1 ? "x" : ""}</span>
                        <span><span className="text-blue-400 font-mono">{importResult.updated}</span> enrichi{importResult.updated !== 1 ? "s" : ""}</span>
                        <span><span className="text-gray-500 font-mono">{importResult.skipped}</span> ignoré{importResult.skipped !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 px-5 py-3 border-t border-gray-800">
                  <button
                    onClick={runImport}
                    disabled={importing || !csvText.trim()}
                    className="btn-neon px-5 py-2 rounded text-xs disabled:opacity-40"
                  >
                    {importing ? "Import en cours…" : "Importer"}
                  </button>
                  <button onClick={() => setShowImport(false)} className="text-gray-500 text-xs hover:text-white px-3 py-2">Fermer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HTML PREVIEW MODAL ────────────────────────────────────────────── */}
      {previewTpl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={() => setPreviewTpl(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 shrink-0">
              <span className="text-white text-xs font-mono">Aperçu {previewTpl.lang.toUpperCase()}</span>
              <button onClick={() => setPreviewTpl(null)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <iframe title="preview" srcDoc={previewTpl.html} className="w-full flex-1 bg-white" style={{ minHeight: "60vh" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign Editor / composer ────────────────────────────────────────────────
function CampaignEditor({ campaign, templates, facets, initialTemplateId, onClose }: { campaign: Campaign | null; templates: EmailTemplate[]; facets: Facets | null; initialTemplateId?: number | null; onClose: () => void }) {
  const readOnly = !!campaign && campaign.status !== "draft";
  const [name, setName] = useState(campaign?.name || "");
  const [templateId, setTemplateId] = useState<number | null>(campaign?.templateId ?? initialTemplateId ?? null);
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

  const tpl = templates.find(t => t.id === templateId) || null;
  const content = {
    subject: tpl?.subject ?? campaign?.subject ?? "",
    htmlBody: tpl?.htmlBody ?? campaign?.htmlBody ?? "",
    subjectEn: tpl?.subjectEn ?? campaign?.subjectEn ?? "",
    htmlBodyEn: tpl?.htmlBodyEn ?? campaign?.htmlBodyEn ?? "",
  };
  const hasEn = !!(content.subjectEn && content.htmlBodyEn);

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
    if (!confirm(`Envoyer la campagne « ${name || "Sans titre"} » à ${count} destinataire(s) ? Cette action est définitive.`)) return;
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
  const isVol = seg.audience === "volunteers";

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

            <div>
              <label className="block text-xs text-gray-500 mb-1">Modèle d&apos;email (bilingue FR / EN) *</label>
              {readOnly ? (
                <div className="cyber-input w-full px-3 py-2 rounded text-xs text-gray-300">
                  {tpl?.name || campaign?.subject || "—"}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-yellow-500/80 text-xs py-2">
                  Aucun modèle disponible. <button onClick={onClose} className="underline">Créez-en un dans l&apos;onglet Modèles campagne</button>.
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

            {tpl && (
              <div className="rounded-lg border border-gray-800 p-3 space-y-2">
                <div>
                  <p className="text-gray-600 text-xs">Sujet FR</p>
                  <p className="text-white text-xs">{content.subject || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">Sujet EN</p>
                  <p className={`text-xs ${hasEn ? "text-white" : "text-yellow-500/80"}`}>{content.subjectEn || "— (version EN manquante)"}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => doPreview("fr")} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:border-neon-green hover:text-neon-green">👁 Aperçu FR</button>
                  <button onClick={() => doPreview("en")} disabled={!hasEn} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:border-neon-blue hover:text-neon-blue disabled:opacity-40">👁 Aperçu EN</button>
                </div>
              </div>
            )}
            <p className="text-gray-700 text-xs">Variables : {"{{fname}} {{lname}} {{org}} {{country}} {{ticketType}}"}</p>
          </div>

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

            {isVol && facets && facets.volunteerRoles?.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Affectation (rôle)</label>
                <div className="flex flex-wrap gap-1.5">
                  {facets.volunteerRoles.map(v => {
                    const on = (seg.roles || []).includes(v);
                    return (
                      <button key={v} disabled={readOnly} onClick={() => {
                        setSeg(s => {
                          const cur = new Set(s.roles || []);
                          if (cur.has(v)) cur.delete(v); else cur.add(v);
                          return { ...s, roles: Array.from(cur) };
                        });
                      }}
                        className={`text-xs px-2 py-1 rounded border transition-all ${on ? "border-neon-green text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-500 hover:border-gray-500"} disabled:opacity-50`}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500">Destinataires correspondants</p>
              <p className="text-3xl font-black" style={{ color: count ? "#00ff9d" : "#555" }}>{count ?? "…"}</p>
              {sample.length > 0 && (
                <p className="text-gray-700 text-xs mt-1 truncate">{sample.join(", ")}{count && count > sample.length ? "…" : ""}</p>
              )}
            </div>
          </div>

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
                  Le suivi des délivrances et clics est alimenté par les webhooks Resend.
                </p>
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
