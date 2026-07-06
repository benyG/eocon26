"use client";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/adminLangContext";

interface DocType {
  key: string; order: number; nameFr: string; nameEn: string;
  objectiveFr: string; objectiveEn: string; stageFr: string; stageEn: string;
  issuer: "organizer" | "billing"; appliesTo: "general" | "prospect" | "sponsor"; kind: string;
}
interface Sponsor { id: number; name: string; email: string | null; tier: string; }
interface Prospect { id: number; org: string; email: string | null; package: string | null; status: string; }
interface Template { docKey: string; nameFr: string; nameEn: string; bodyFr: string; bodyEn: string; isCustom: boolean; }

const STAGE_COLOR: Record<string, string> = { Prospection: "#888", Prospecting: "#888", "Négociation": "#0066ff", Negotiation: "#0066ff", Closing: "#00e066", "Post-signature": "#cc00ff", "Post-signing": "#cc00ff", Activation: "#ff6600" };
const VARS = ["{{sponsor_name}}", "{{tier}}", "{{amount}}", "{{PERKS}}", "{{sector}}", "{{event_date}}", "{{event_venue}}", "{{deadline_print}}", "{{deadline_digital}}", "{{organizer_name}}", "{{organizer_email}}", "{{date}}", "{{doc_number}}", "{{SIGNATURE}}"];

export default function DocumentsPanel({ canWrite = true }: { canWrite?: boolean }) {
  const __ = useLang();
  const [docs, setDocs] = useState<DocType[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [target, setTarget] = useState<string>("");        // "sponsor:ID" | "prospect:ID" | ""
  const [lang, setDocLang] = useState<"fr" | "en">("fr");
  const [editDoc, setEditDoc] = useState<DocType | null>(null);
  const [sendDoc, setSendDoc] = useState<DocType | null>(null);

  useEffect(() => {
    fetch("/api/admin/documents").then(r => r.ok ? r.json() : []).then(setDocs).catch(() => {});
    fetch("/api/admin/sponsors").then(r => r.ok ? r.json() : []).then(setSponsors).catch(() => {});
    fetch("/api/admin/sponsor-prospects").then(r => r.ok ? r.json() : []).then(setProspects).catch(() => {});
  }, []);

  const [tType, tId] = target ? target.split(":") : ["", ""];
  const sponsorId = tType === "sponsor" ? parseInt(tId) : undefined;
  const prospectId = tType === "prospect" ? parseInt(tId) : undefined;
  const selSponsor = sponsors.find(s => s.id === sponsorId);
  const selProspect = prospects.find(p => p.id === prospectId);
  const targetEmail = selSponsor?.email || selProspect?.email || "";
  const targetName = selSponsor?.name || selProspect?.org || "";

  const enabledFor = (d: DocType): boolean => {
    if (d.appliesTo === "general") return true;
    if (d.appliesTo === "prospect") return !!(sponsorId || prospectId);
    return !!sponsorId; // sponsor-only docs
  };
  const paramsFor = (d: DocType): string => {
    const p = new URLSearchParams({ lang });
    if (d.appliesTo !== "general") {
      if (sponsorId) p.set("sponsorId", String(sponsorId));
      else if (prospectId) p.set("prospectId", String(prospectId));
    }
    return p.toString();
  };

  const download = (d: DocType) => window.open(`/api/admin/documents/${d.key}?${paramsFor(d)}`, "_blank");

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">📄 {__("Documents & Contrats", "Documents & Contracts")}</h1>
          <p className="text-gray-500 text-xs mt-1">{__("Générer, personnaliser et envoyer tous les documents du parcours sponsor.", "Generate, customize and send every document of the sponsor journey.")}</p>
        </div>
        {/* Language toggle */}
        <div className="flex gap-1 border border-gray-800 rounded-lg p-1">
          {(["fr", "en"] as const).map(l => (
            <button key={l} onClick={() => setDocLang(l)} className={`text-xs px-3 py-1 rounded ${lang === l ? "bg-neon-green/15 text-neon-green" : "text-gray-500"}`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Target selector */}
      <div className="cyber-card rounded-xl p-4 mb-5">
        <label className="text-xs text-gray-500 block mb-1">{__("Cible du document (sponsor conclu ou prospect)", "Document target (concluded sponsor or prospect)")}</label>
        <select value={target} onChange={e => setTarget(e.target.value)} className="cyber-input w-full px-3 py-2 rounded text-xs">
          <option value="">{__("— Aucune (documents généraux uniquement) —", "— None (general documents only) —")}</option>
          {sponsors.length > 0 && (
            <optgroup label={__("Sponsors conclus", "Concluded sponsors")}>
              {sponsors.map(s => <option key={`s${s.id}`} value={`sponsor:${s.id}`}>{s.name} · {s.tier}</option>)}
            </optgroup>
          )}
          {prospects.length > 0 && (
            <optgroup label={__("Prospects (pipeline)", "Prospects (pipeline)")}>
              {prospects.map(p => <option key={`p${p.id}`} value={`prospect:${p.id}`}>{p.org}{p.package ? ` · ${p.package}` : ""} · {p.status}</option>)}
            </optgroup>
          )}
        </select>
        {target && <p className="text-xs text-gray-600 mt-2">{__("Cible", "Target")} : <span className="text-gray-300">{targetName}</span>{targetEmail ? <span className="text-neon-green/60"> · {targetEmail}</span> : <span className="text-yellow-500/70"> · {__("pas d'email", "no email")}</span>}</p>}
      </div>

      {/* Document cards (chronological) */}
      <div className="space-y-3">
        {docs.map(d => {
          const enabled = enabledFor(d);
          const stage = lang === "en" ? d.stageEn : d.stageFr;
          const color = STAGE_COLOR[stage] || "#888";
          return (
            <div key={d.key} className={`cyber-card rounded-xl p-4 ${enabled ? "" : "opacity-50"}`}>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ background: color + "20", color }}>{d.order}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{lang === "en" ? d.nameEn : d.nameFr}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: color + "18", color }}>{stage}</span>
                    <span className="text-xs text-gray-600">· {d.issuer === "billing" ? __("Facturation (Examboot)", "Billing (Examboot)") : __("Organisateur (EyesOpen)", "Organizer (EyesOpen)")}</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{lang === "en" ? d.objectiveEn : d.objectiveFr}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => download(d)} disabled={!enabled} className="text-xs px-3 py-1.5 rounded disabled:cursor-not-allowed" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                      👁 {__("Aperçu / Télécharger", "Preview / Download")}
                    </button>
                    {d.kind === "template" && canWrite && (
                      <button onClick={() => setEditDoc(d)} className="text-xs px-3 py-1.5 rounded" style={{ background: "#0066ff15", color: "#3b82f6", border: "1px solid #0066ff30" }}>
                        ✏️ {__("Personnaliser", "Customize")}
                      </button>
                    )}
                    {canWrite && (
                      <button onClick={() => setSendDoc(d)} disabled={!enabled} className="text-xs px-3 py-1.5 rounded disabled:cursor-not-allowed" style={{ background: "#cc00ff15", color: "#cc00ff", border: "1px solid #cc00ff30" }}>
                        ✉️ {__("Envoyer", "Send")}
                      </button>
                    )}
                    {!enabled && <span className="text-xs text-gray-700 self-center">{d.appliesTo === "sponsor" ? __("→ sélectionnez un sponsor conclu", "→ select a concluded sponsor") : __("→ sélectionnez une cible", "→ select a target")}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editDoc && <TemplateEditor doc={editDoc} onClose={() => setEditDoc(null)} />}
      {sendDoc && (
        <SendModal doc={sendDoc} lang={lang}
          sponsorId={sponsorId} prospectId={prospectId}
          defaultEmail={targetEmail} targetName={targetName}
          onClose={() => setSendDoc(null)} />
      )}
    </div>
  );
}

// ── Template editor ──
function TemplateEditor({ doc, onClose }: { doc: DocType; onClose: () => void }) {
  const __ = useLang();
  const [tpl, setTpl] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/document-templates").then(r => r.ok ? r.json() : []).then((rows: Template[]) => setTpl(rows.find(t => t.docKey === doc.key) || null)).catch(() => {});
  }, [doc.key]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!tpl) return;
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/document-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docKey: doc.key, bodyFr: tpl.bodyFr, bodyEn: tpl.bodyEn, nameFr: tpl.nameFr, nameEn: tpl.nameEn }) });
    setSaving(false);
    setMsg(res.ok ? "✓" : __("Échec", "Failed"));
    if (res.ok) load();
  };
  const reset = async () => {
    if (!confirm(__("Réinitialiser ce modèle au texte par défaut ?", "Reset this template to the default text?"))) return;
    await fetch(`/api/admin/document-templates?docKey=${doc.key}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="cyber-card rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800 shrink-0">
          <div>
            <h3 className="text-white font-bold">✏️ {__("Personnaliser", "Customize")} — {tpl?.nameFr}</h3>
            <p className="text-gray-600 text-xs mt-0.5">{__("Marquage : ## Titre · - puce · {{PERKS}} · {{SIGNATURE}} · {{variables}}", "Markup: ## Heading · - bullet · {{PERKS}} · {{SIGNATURE}} · {{variables}}")}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        {!tpl ? <p className="p-6 text-gray-500 text-xs">{__("Chargement…", "Loading…")}</p> : (
          <div className="p-4 overflow-y-auto space-y-3">
            <div className="flex flex-wrap gap-1">
              {VARS.map(v => <code key={v} className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{v}</code>)}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Corps FR</label>
                <textarea value={tpl.bodyFr} onChange={e => setTpl({ ...tpl, bodyFr: e.target.value })} rows={18} className="cyber-input w-full px-3 py-2 rounded text-xs font-mono resize-y" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Body EN</label>
                <textarea value={tpl.bodyEn} onChange={e => setTpl({ ...tpl, bodyEn: e.target.value })} rows={18} className="cyber-input w-full px-3 py-2 rounded text-xs font-mono resize-y" />
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-800 shrink-0">
          <button onClick={reset} className="text-xs px-3 py-2 rounded border border-gray-700 text-gray-400 hover:text-white">↩ {__("Réinitialiser", "Reset default")}</button>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs text-neon-green">{msg}</span>}
            <button onClick={save} disabled={saving || !tpl} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">{saving ? "…" : __("Enregistrer", "Save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Send modal ──
function SendModal({ doc, lang, sponsorId, prospectId, defaultEmail, targetName, onClose }: {
  doc: DocType; lang: "fr" | "en"; sponsorId?: number; prospectId?: number; defaultEmail: string; targetName: string; onClose: () => void;
}) {
  const __ = useLang();
  const name = lang === "en" ? doc.nameEn : doc.nameFr;
  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState(`EOCON 2026 — ${name}`);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const send = async () => {
    setSending(true); setMsg("");
    const res = await fetch(`/api/admin/documents/${doc.key}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sponsorId, prospectId, lang, recipient: to, subject, message }),
    });
    setSending(false);
    if (res.ok) { setMsg(__("Envoyé ✓", "Sent ✓")); setTimeout(onClose, 900); }
    else { const e = await res.json().catch(() => ({})); setMsg(e.error || __("Échec", "Failed")); }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="cyber-card rounded-xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h3 className="text-white font-bold">✉️ {__("Envoyer", "Send")} — {name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600">{__("Le PDF est généré et joint automatiquement.", "The PDF is generated and attached automatically.")} {targetName && <span className="text-gray-400">· {targetName}</span>}</p>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{__("Destinataire", "Recipient")}</label>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="email@societe.com" className="cyber-input w-full px-3 py-2 rounded text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{__("Objet", "Subject")}</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="cyber-input w-full px-3 py-2 rounded text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Message</label>
            <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder={__("Laisser vide pour le message par défaut.", "Leave empty for the default message.")} className="cyber-input w-full px-3 py-2 rounded text-xs resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800">
          {msg && <span className="text-xs text-neon-green mr-auto">{msg}</span>}
          <button onClick={onClose} className="text-xs px-4 py-2 rounded text-gray-500 hover:text-white">{__("Annuler", "Cancel")}</button>
          <button onClick={send} disabled={sending || !to} className="btn-neon px-4 py-2 rounded text-xs disabled:opacity-50">{sending ? "…" : __("Envoyer", "Send")}</button>
        </div>
      </div>
    </div>
  );
}
