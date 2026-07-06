"use client";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/adminLangContext";

interface SponsorPerk { id: number; labelFr: string; labelEn: string; quantity: number | null; done: boolean; note: string | null; }
interface Perk { id: number; labelFr: string; labelEn: string; isActivation: boolean; isVisible: boolean; }

// Delivery checklist for a concluded sponsor — the accepted perks double as tasks.
export default function SponsorPerksChecklist({ sponsorId, canWrite = true }: { sponsorId: number; canWrite?: boolean }) {
  const __ = useLang();
  const [rows, setRows] = useState<SponsorPerk[]>([]);
  const [catalog, setCatalog] = useState<Perk[]>([]);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/sponsors/${sponsorId}/perks`).then(r => r.ok ? r.json() : []).then(setRows).catch(() => {});
  }, [sponsorId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/admin/perks").then(r => r.ok ? r.json() : []).then(setCatalog).catch(() => {}); }, []);

  const patch = async (id: number, data: Partial<SponsorPerk>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    await fetch(`/api/admin/sponsor-perks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).catch(() => {});
  };
  const remove = async (id: number) => {
    setRows(prev => prev.filter(r => r.id !== id));
    await fetch(`/api/admin/sponsor-perks/${id}`, { method: "DELETE" }).catch(() => {});
  };
  const addPerk = async (perk: Perk) => {
    setAdding(false);
    const res = await fetch(`/api/admin/sponsors/${sponsorId}/perks`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ perkId: perk.id, labelFr: perk.labelFr, labelEn: perk.labelEn }),
    });
    if (res.ok) load();
  };

  const doneCount = rows.filter(r => r.done).length;
  const usedIds = new Set(rows.map(r => r.labelEn));
  const addable = catalog.filter(p => p.isVisible && !usedIds.has(p.labelEn));

  return (
    <div className="border-t border-gray-800 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#ffaa00" }}>
          {__("Checklist des livrables", "Deliverables checklist")}
        </p>
        <span className="text-xs text-gray-600">{doneCount}/{rows.length} {__("livrés", "delivered")}</span>
      </div>
      <div className="space-y-3">
        {rows.map(p => (
          <div key={p.id} className={`rounded-lg p-3 border ${p.done ? "border-neon-green/20 bg-neon-green/5" : "border-gray-800 bg-gray-900/30"}`}>
            <div className="flex items-start gap-2">
              <label className={`flex items-start gap-2 flex-1 ${canWrite ? "cursor-pointer" : ""}`}>
                <input type="checkbox" checked={p.done} disabled={!canWrite} onChange={e => canWrite && patch(p.id, { done: e.target.checked })} className="mt-0.5 shrink-0" />
                <span className={`text-xs ${p.done ? "line-through text-gray-600" : "text-gray-300"}`}>
                  {p.quantity && p.quantity > 1 ? `${p.quantity}× ` : ""}{__(p.labelFr, p.labelEn)}
                </span>
              </label>
              {canWrite && <button onClick={() => remove(p.id)} className="text-red-500/50 hover:text-red-400 text-xs shrink-0">✕</button>}
            </div>
            <textarea
              rows={1} placeholder={__("Notes…", "Notes…")} defaultValue={p.note || ""} readOnly={!canWrite}
              onBlur={e => canWrite && patch(p.id, { note: e.target.value })}
              className="cyber-input w-full mt-2 px-2 py-1 rounded text-xs resize-none read-only:opacity-60" style={{ minHeight: 28 }}
            />
          </div>
        ))}
        {rows.length === 0 && <p className="text-gray-700 text-xs">{__("Aucune contrepartie enregistrée.", "No perks recorded.")}</p>}
      </div>

      {canWrite && (
        <div className="mt-3">
          {!adding ? (
            <button onClick={() => setAdding(true)} className="text-xs px-3 py-1.5 rounded" style={{ background: "#00ccff15", color: "#00ccff", border: "1px solid #00ccff30" }}>
              + {__("Ajouter une activation à la carte", "Add à-la-carte activation")}
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {addable.map(p => (
                <button key={p.id} onClick={() => addPerk(p)} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-neon-green/40">
                  {p.isActivation ? "⚡ " : ""}{__(p.labelFr, p.labelEn)}
                </button>
              ))}
              <button onClick={() => setAdding(false)} className="text-xs px-2 py-1 text-gray-500 hover:text-white">{__("Fermer", "Close")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
