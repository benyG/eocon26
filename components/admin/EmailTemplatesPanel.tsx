"use client";
import { useState, useEffect, useCallback } from "react";

// Standard HTML boilerplate prefilled when creating a new email template, so the
// user follows the EOCON visual pattern (heading, greeting, body, neon CTA, signature).
const STANDARD_TEMPLATE_HTML_FR = `<h1>Titre de l'email 🎉</h1>
<p>Bonjour {{fname}},</p>
<p>Votre message principal ici. Présentez l'essentiel en une ou deux phrases claires.</p>
<p>📅 <strong>28 novembre 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroun</strong></p>
<ul>
<li>Point clé n°1</li>
<li>Point clé n°2</li>
<li>Point clé n°3</li>
</ul>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;display:inline-block;">Bouton d'action →</a></p>
<p>À très bientôt,<br>L'équipe EOCON 2026</p>`;

const STANDARD_TEMPLATE_HTML_EN = `<h1>Email title 🎉</h1>
<p>Hi {{fname}},</p>
<p>Your main message here. Get the essentials across in one or two clear sentences.</p>
<p>📅 <strong>November 28, 2026</strong> · 📍 <strong>Hotel Onomo, Douala, Cameroon</strong></p>
<ul>
<li>Key point #1</li>
<li>Key point #2</li>
<li>Key point #3</li>
</ul>
<p><a href="https://eyesopensecurity.com/#inscription" style="background:#00ff9d;color:#000;padding:12px 24px;border-radius:4px;font-weight:bold;text-decoration:none;display:inline-block;">Call to action →</a></p>
<p>See you soon,<br>The EOCON 2026 team</p>`;

// Email templates management: transactional templates (slug-based, edited inline)
// and reusable campaign templates (bilingual FR/EN, used by the Campaigns composer).
export default function EmailTemplatesPanel({ canWrite = true }: { canWrite?: boolean }) {
  const [templates, setTemplates] = useState<Record<string, unknown>[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState<Record<string, unknown>>({});
  const [templateFormError, setTemplateFormError] = useState("");
  // Transactional template editing
  const [txEdits, setTxEdits] = useState<Record<number, { subject: string; htmlBody: string }>>({});
  const [txSaving, setTxSaving] = useState<number | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [refining, setRefining] = useState<number | null>(null);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<Record<string, unknown> | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/admin/email-templates");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

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
    // Bilingual templates require both FR and EN versions so a campaign can always
    // send the right language to every recipient.
    const f = templateForm as Record<string, string>;
    if (!f.name?.trim() || !f.subject?.trim() || !f.htmlBody?.trim() || !f.subjectEn?.trim() || !f.htmlBodyEn?.trim()) {
      setTemplateFormError("Nom + versions FR et EN (sujet & contenu) obligatoires.");
      return;
    }
    setTemplateFormError("");
    const editId = f.id ? parseInt(String(f.id)) : null;
    await fetch(editId ? `/api/admin/email-templates/${editId}` : "/api/admin/email-templates", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name, segment: f.segment || "all",
        subject: f.subject, htmlBody: f.htmlBody,
        subjectEn: f.subjectEn, htmlBodyEn: f.htmlBodyEn,
      }),
    });
    setShowTemplateForm(false);
    setTemplateForm({});
    await loadTemplates();
  };

  const editTemplate = (tpl: Record<string, unknown>) => {
    setTemplateForm({
      id: tpl.id, name: tpl.name, segment: tpl.segment || "all",
      subject: tpl.subject, htmlBody: tpl.htmlBody,
      subjectEn: tpl.subjectEn || "", htmlBodyEn: tpl.htmlBodyEn || "",
    });
    setTemplateFormError("");
    setShowTemplateForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Transactional templates */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Templates Transactionnels</h3>
          {canWrite && <button onClick={seedTransactionalTemplates} className="text-xs px-3 py-1.5 rounded transition-all" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>🔧 Initialiser templates transactionnels</button>}
        </div>
        <div className="space-y-3">
          {templates.filter(tpl => tpl.slug).length === 0 && (
            <p className="text-gray-600 text-xs text-center py-4">Aucun template transactionnel. Cliquez sur &quot;Initialiser&quot; pour créer les 7 templates.</p>
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
                  <p className="text-gray-600 text-xs mb-2">Variables : {vars.map(v => `{{${v}}}`).join(", ")}</p>
                )}
                <input
                  className="cyber-input w-full text-xs rounded px-3 py-2 text-white mb-2"
                  value={edit.subject}
                  onChange={e => setTxEdits(prev => ({ ...prev, [id]: { ...edit, subject: e.target.value } }))}
                  placeholder="Objet email"
                />
                <textarea
                  className="cyber-input w-full text-xs rounded px-3 py-2 text-white h-40 resize-none"
                  value={edit.htmlBody}
                  onChange={e => setTxEdits(prev => ({ ...prev, [id]: { ...edit, htmlBody: e.target.value } }))}
                  placeholder="Corps HTML de l'email"
                />
                {canWrite && <div className="mt-2 flex justify-end">
                  <button onClick={() => saveTxTemplate(id)} disabled={txSaving === id} className="text-xs px-3 py-1.5 rounded" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                    {txSaving === id ? "..." : "Enregistrer"}
                  </button>
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaign email templates */}
      <div className="cyber-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Templates Email Campagnes</h3>
          {canWrite && <div className="flex gap-2">
            <button onClick={seedTemplates} className="text-xs px-3 py-1.5 rounded transition-all" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>⚡ Seeder</button>
            <button onClick={() => { if (showTemplateForm) { setShowTemplateForm(false); } else { setTemplateForm({ htmlBody: STANDARD_TEMPLATE_HTML_FR, htmlBodyEn: STANDARD_TEMPLATE_HTML_EN }); setTemplateFormError(""); setShowTemplateForm(true); } }} className="btn-neon px-3 py-1.5 rounded text-xs">+ Créer</button>
          </div>}
        </div>
        {canWrite && showTemplateForm && (
          <div className="border border-gray-800 rounded-lg p-4 mb-4 space-y-3">
            <input placeholder="Nom du template" className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.name as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
            <select className="cyber-input w-full text-xs rounded px-3 py-2 text-black" value={(templateForm.segment as string) || "all"} onChange={e => setTemplateForm(f => ({ ...f, segment: e.target.value }))}>
              <option value="all">Tous</option>
              <option value="registered">Inscrits</option>
              <option value="cfp_accepted">Speakers acceptés</option>
              <option value="volunteers">Bénévoles acceptés</option>
              <option value="newsletter">Newsletter</option>
            </select>
            <p className="text-gray-600 text-xs">Renseignez les deux langues. L&apos;application envoie automatiquement la version FR ou EN selon la langue du destinataire. Variables : {"{{fname}} {{lname}} {{org}} {{country}} {{ticketType}}"}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {/* FR column */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-neon-green">🇫🇷 Français *</p>
                <input placeholder="Sujet FR" className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.subject as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} />
                <textarea placeholder="Contenu HTML FR" className="cyber-input w-full text-xs rounded px-3 py-2 h-40 resize-y text-white font-mono" value={(templateForm.htmlBody as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, htmlBody: e.target.value }))} />
              </div>
              {/* EN column */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-neon-blue">🇬🇧 English *</p>
                <input placeholder="Subject EN" className="cyber-input w-full text-xs rounded px-3 py-2 text-white" value={(templateForm.subjectEn as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, subjectEn: e.target.value }))} />
                <textarea placeholder="HTML body EN" className="cyber-input w-full text-xs rounded px-3 py-2 h-40 resize-y text-white font-mono" value={(templateForm.htmlBodyEn as string) || ""} onChange={e => setTemplateForm(f => ({ ...f, htmlBodyEn: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={saveTemplate} className="btn-neon px-3 py-1.5 rounded text-xs">Enregistrer</button>
              <button onClick={() => setShowTemplateForm(false)} className="text-gray-500 text-xs hover:text-white px-2">Annuler</button>
              {templateFormError && <span className="text-red-400 text-xs">{templateFormError}</span>}
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
                  <p className="text-gray-500 text-xs">Objet : {previewTemplate.subject as string}</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-900">✕</button>
              </div>
              <div className="p-4" dangerouslySetInnerHTML={{ __html: `<style>td,p,span,div,a,h1,h2,h3,h4,li,body{color:#111!important}</style>${previewTemplate.htmlBody as string}` }} />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {templates.filter(tpl => !tpl.slug).length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 text-xs mb-3">Aucun template campagne. Seedez les templates EOCON 2026 ou créez-en un.</p>
              {canWrite && <button onClick={seedTemplates} className="text-xs px-4 py-2 rounded" style={{ background: "#0066ff15", color: "#0066ff", border: "1px solid #0066ff30" }}>⚡ Seeder les 7 templates EOCON</button>}
            </div>
          )}
          {templates.filter(tpl => !tpl.slug).map(tpl => (
            <div key={tpl.id as number} className="border border-gray-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-xs font-bold">{tpl.name as string}</p>
                    {tpl.subjectEn && tpl.htmlBodyEn
                      ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: "#00ff9d", background: "#00ff9d15" }}>FR + EN</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: "#ffaa00", background: "#ffaa0015" }}>FR seul</span>}
                  </div>
                  <p className="text-gray-500 text-xs">Objet : {tpl.subject as string}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded mt-1 inline-block" style={{ color: "#888", background: "#88888815" }}>{tpl.segment as string}</span>
                  {!!tpl.sentAt && <p className="text-gray-700 text-xs mt-1">Envoyé le {new Date(tpl.sentAt as string).toLocaleDateString("fr-FR")}</p>}
                </div>
                <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                  <button onClick={() => setPreviewTemplate(tpl)} className="text-xs px-2 py-1 rounded" style={{ color: "#888", border: "1px solid #33333380" }}>👁</button>
                  {canWrite && <button onClick={() => editTemplate(tpl)} className="text-xs px-2 py-1 rounded" style={{ color: "#00d4ff", border: "1px solid #00d4ff40" }}>✎ Éditer</button>}
                  {canWrite && <button onClick={() => sendTemplate(tpl.id as number)} disabled={sending === (tpl.id as number)} className="text-xs px-2 py-1 rounded" style={{ background: "#00ff9d15", color: "#00ff9d", border: "1px solid #00ff9d30" }}>
                    {sending === (tpl.id as number) ? "..." : "▶ Envoyer"}
                  </button>}
                </div>
              </div>
              {/* AI refine row */}
              {canWrite && <div className="flex gap-2 pt-2 border-t border-gray-800/50">
                <input
                  type="text"
                  placeholder="Instructions pour l'IA (optionnel)..."
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
                  {refining === (tpl.id as number) ? "IA..." : "✨ Améliorer"}
                </button>
              </div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
