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
  subject: string;
  htmlBody: string;
  segment: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
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
      facets={facets}
      onClose={() => { setShowEditor(false); load(); }}
    />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">📣 Campagnes inscrits</h1>
          <p className="text-gray-500 text-xs mt-1">Composez, segmentez et envoyez des emails aux inscrits · suivi des envois</p>
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
                <th className="py-2 px-3 font-medium">Échecs</th>
                <th className="py-2 px-3 font-medium">Date</th>
                <th className="py-2 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
                const openRate = c.recipientCount > 0 ? Math.round((c.sentCount / c.recipientCount) * 100) : 0;
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
                    <td className="py-2.5 px-3 font-mono" style={{ color: "#00ff9d" }}>
                      {c.status === "sent" || c.status === "failed" ? `${c.sentCount} (${openRate}%)` : "—"}
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
function CampaignEditor({ campaign, facets, onClose }: { campaign: Campaign | null; facets: Facets | null; onClose: () => void }) {
  const readOnly = !!campaign && campaign.status !== "draft";
  const [name, setName] = useState(campaign?.name || "");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [htmlBody, setHtmlBody] = useState(campaign?.htmlBody || "");
  const [seg, setSeg] = useState<Segment>(campaign ? parseSeg(campaign.segment) : { audience: "registrations" });
  const [id, setId] = useState<number | null>(campaign?.id ?? null);

  const [count, setCount] = useState<number | null>(null);
  const [sample, setSample] = useState<string[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const body = JSON.stringify({ name: name || "Sans titre", subject, htmlBody, segment: seg });
    let cid = id;
    if (cid) {
      await fetch(`/api/admin/campaigns/${cid}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (r.ok) { const c = await r.json(); cid = c.id; setId(cid); }
    }
    setSaving(false);
    return cid;
  }, [readOnly, id, name, subject, htmlBody, seg]);

  // Debounced autosave for drafts.
  useEffect(() => {
    if (readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { persist(); }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, subject, htmlBody, seg]);

  const doPreview = async () => {
    const r = await fetch("/api/admin/campaigns/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ htmlBody }) });
    if (r.ok) { const d = await r.json(); setPreviewHtml(d.html); setShowPreview(true); }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setMsg(null);
    const r = await fetch("/api/admin/campaigns/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: testEmail, subject, htmlBody }) });
    setMsg(r.ok ? `✓ Email de test envoyé à ${testEmail}` : "✗ Échec de l'envoi du test");
  };

  const sendCampaign = async () => {
    if (!subject.trim() || !htmlBody.trim()) { setMsg("✗ Sujet et contenu requis"); return; }
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
              <label className="block text-xs text-gray-500 mb-1">Sujet de l&apos;email *</label>
              <input disabled={readOnly} value={subject} onChange={e => setSubject(e.target.value)} className="cyber-input w-full px-3 py-2 rounded text-xs" placeholder="Bonjour {{fname}}, …" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-gray-500">Contenu HTML *</label>
                <span className="text-gray-700 text-xs">Variables : {"{{fname}} {{lname}} {{org}} {{country}} {{ticketType}}"}</span>
              </div>
              <textarea disabled={readOnly} value={htmlBody} onChange={e => setHtmlBody(e.target.value)} rows={12} className="cyber-input w-full px-3 py-2 rounded text-xs font-mono resize-y" placeholder="<p>Bonjour {{fname}},</p><p>…</p>" />
              <p className="text-gray-700 text-xs mt-1">Le contenu est automatiquement habillé dans le template EOCON (en-tête, pied de page).</p>
            </div>
            <div className="flex gap-2">
              <button onClick={doPreview} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-300 hover:border-neon-green hover:text-neon-green">👁 Prévisualiser</button>
            </div>
          </div>

          {/* Test email */}
          {!readOnly && (
            <div className="cyber-card rounded-xl p-5">
              <label className="block text-xs text-gray-500 mb-2">✉️ Envoyer un email de test</label>
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
              <button onClick={sendCampaign} disabled={sending || !count} className="btn-neon-solid w-full py-3 rounded text-sm border-2 border-neon-green disabled:opacity-40">
                {sending ? "Envoi en cours…" : `🚀 Envoyer à ${count ?? 0} destinataire(s)`}
              </button>
              {msg && <p className={`text-xs mt-3 text-center ${msg.startsWith("✓") ? "text-neon-green" : "text-red-400"}`}>{msg}</p>}
            </div>
          )}

          {readOnly && campaign && (
            <div className="cyber-card rounded-xl p-5 text-xs space-y-1">
              <p className="text-gray-400">Envoyée le <span className="text-white">{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString("fr-FR") : "—"}</span></p>
              <p className="text-gray-400">Destinataires : <span className="text-white">{campaign.recipientCount}</span></p>
              <p className="text-gray-400">Envoyés : <span className="text-neon-green">{campaign.sentCount}</span> · Échecs : <span className="text-red-400">{campaign.failedCount}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 shrink-0">
              <span className="text-white text-xs font-mono">Prévisualisation — {subject || "(sans sujet)"}</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <iframe title="preview" srcDoc={previewHtml} className="w-full flex-1 bg-white" style={{ minHeight: "60vh" }} />
          </div>
        </div>
      )}
    </div>
  );
}
