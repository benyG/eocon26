"use client";
import { useState, useRef } from "react";

// Column aliases (lowercased header → internal field). Extend freely.
const COL_MAP: Record<string, string> = {
  org: "org", organisation: "org", organization: "org", company: "org", entreprise: "org", "société": "org", societe: "org", nom: "org", name: "org", "raison sociale": "org",
  contact: "contact", "contact person": "contact", personne: "contact", responsable: "contact", "nom du contact": "contact",
  email: "email", "e-mail": "email", mail: "email", courriel: "email",
  phone: "phone", "téléphone": "phone", telephone: "phone", tel: "phone", "numéro": "phone", numero: "phone", "phone number": "phone",
  website: "website", site: "website", "site web": "website", url: "website", web: "website",
  package: "package", tier: "package", niveau: "package", offre: "package", forfait: "package", pack: "package",
  notes: "notes", note: "notes", remarques: "notes", commentaire: "notes", comments: "notes", comment: "notes",
};

const FIELDS = ["org", "contact", "email", "phone", "website", "package", "notes"] as const;
type Field = (typeof FIELDS)[number];

interface Row { [k: string]: string }

export default function SponsorProspectImportModal({ lang, onClose, onDone }: { lang: "fr" | "en"; onClose: () => void; onDone: () => void }) {
  const isFr = lang === "fr";
  const __ = (fr: string, en: string) => (isFr ? fr : en);
  const [step, setStep] = useState<"pick" | "preview" | "importing" | "done">("pick");
  const [rows, setRows] = useState<Row[]>([]);
  const [detected, setDetected] = useState<{ header: string; field: Field | null }[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, imported: 0, errors: 0 });
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];
      const nonEmpty = raw.filter(r => r.some(c => String(c ?? "").trim() !== ""));
      if (nonEmpty.length < 2) { setError(__("Fichier vide ou sans données.", "Empty file or no data.")); return; }

      const headers = (nonEmpty[0] as unknown[]).map(h => String(h ?? "").trim());
      const map = headers.map(h => ({ header: h, field: (COL_MAP[h.toLowerCase()] as Field) ?? null }));
      if (!map.some(m => m.field === "org")) {
        setError(__("Colonne « Organisation » introuvable. Vérifiez l'en-tête.", "No « Organization » column found. Check the header row."));
        return;
      }
      const dataRows: Row[] = [];
      for (let i = 1; i < nonEmpty.length; i++) {
        const cells = nonEmpty[i] as unknown[];
        const obj: Row = {};
        map.forEach((m, idx) => { if (m.field) obj[m.field] = String(cells[idx] ?? "").trim(); });
        if ((obj.org || "").trim()) dataRows.push(obj);
      }
      if (!dataRows.length) { setError(__("Aucune ligne exploitable (organisation manquante).", "No usable rows (missing organization).")); return; }
      setDetected(map);
      setRows(dataRows);
      setStep("preview");
    } catch {
      setError(__("Impossible de lire le fichier. Formats acceptés : .xlsx, .xls, .csv", "Could not read the file. Accepted formats: .xlsx, .xls, .csv"));
    }
  };

  const runImport = async () => {
    setStep("importing");
    let imported = 0, errors = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // assigneeId is intentionally omitted → prospect lands "pending assignment".
      const body: Record<string, unknown> = { status: "prospect" };
      for (const f of FIELDS) if (r[f]) body[f] = r[f];
      try {
        const res = await fetch("/api/admin/sponsor-prospects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) imported++; else errors++;
      } catch { errors++; }
      setProgress({ done: i + 1, total: rows.length, imported, errors });
    }
    setStep("done");
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="cyber-card rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scroll-y" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold">📥 {__("Importer des prospects (XLSX)", "Import prospects (XLSX)")}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {step === "pick" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-800 p-4 text-xs text-gray-400 space-y-2">
              <p className="text-gray-300 font-bold">{__("Structure du fichier Excel", "Excel file structure")}</p>
              <p>{__("La première ligne doit contenir les en-têtes. Colonnes reconnues (ordre libre) :", "The first row must contain headers. Recognized columns (any order):")}</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><b className="text-white">Organisation</b> — {__("nom de l'entreprise (obligatoire)", "company name (required)")}</li>
                <li><b>Contact</b> — {__("personne à contacter", "contact person")}</li>
                <li><b>Email</b>, <b>Téléphone</b>, <b>Site web</b></li>
                <li><b>Package</b> — {__("niveau/offre visé", "target tier/package")}</li>
                <li><b>Notes</b> — {__("remarques", "remarks")}</li>
              </ul>
              <p className="text-gray-500">{__("Les prospects importés restent « en attente d'attribution » : ils n'apparaissent dans le pipeline qu'une fois un responsable « Assigné à » désigné.", "Imported prospects stay « pending assignment »: they only appear in the pipeline once an « Assigned to » owner is set.")}</p>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 rounded p-2">{error}</p>}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button onClick={() => fileRef.current?.click()} className="btn-neon px-4 py-2 rounded text-sm w-full">
              {__("Choisir un fichier .xlsx / .csv", "Choose a .xlsx / .csv file")}
            </button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1">
              {detected.map((d, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded ${d.field ? "bg-neon-green/10 text-neon-green" : "bg-gray-800 text-gray-600"}`}>
                  {d.header}{d.field ? ` → ${d.field}` : ` · ${__("ignorée", "skipped")}`}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">{__(`${rows.length} ligne(s) prête(s) à l'import.`, `${rows.length} row(s) ready to import.`)}</p>
            <div className="overflow-x-auto rounded border border-gray-800">
              <table className="text-xs w-full">
                <thead><tr className="text-gray-500 border-b border-gray-800">
                  {FIELDS.map(f => <th key={f} className="text-left px-2 py-1 font-mono">{f}</th>)}
                </tr></thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-gray-900">
                      {FIELDS.map(f => <td key={f} className="px-2 py-1 text-gray-400 truncate max-w-[120px]">{r[f] || "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && <p className="text-xs text-gray-600">{__(`… et ${rows.length - 5} de plus`, `… and ${rows.length - 5} more`)}</p>}
            <div className="flex gap-2">
              <button onClick={runImport} className="btn-neon px-4 py-2 rounded text-sm">{__(`Importer les ${rows.length}`, `Import ${rows.length}`)}</button>
              <button onClick={() => setStep("pick")} className="px-4 py-2 rounded text-sm text-gray-500 hover:text-white">{__("Retour", "Back")}</button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-3 py-6">
            <p className="text-xs text-gray-400 text-center">{__("Import en cours…", "Importing…")} {progress.done}/{progress.total}</p>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div className="h-full bg-neon-green" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-neon-green text-sm font-bold">✅ {__(`${progress.imported} prospect(s) importé(s)`, `${progress.imported} prospect(s) imported`)}</p>
            {progress.errors > 0 && <p className="text-xs text-red-400">{__(`${progress.errors} en erreur`, `${progress.errors} failed`)}</p>}
            <p className="text-xs text-gray-500">{__("Ils sont en attente d'attribution. Assignez-leur un responsable pour les faire apparaître dans le pipeline.", "They are pending assignment. Assign an owner to make them appear in the pipeline.")}</p>
            <button onClick={() => { onDone(); onClose(); }} className="btn-neon px-4 py-2 rounded text-sm">{__("Fermer et actualiser", "Close and refresh")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
