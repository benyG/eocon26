"use client";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/adminLangContext";

export interface Perk {
  id: number; labelFr: string; labelEn: string; category: string | null;
  isActivation: boolean; isVisible: boolean; sortOrder: number;
}

const BLANK = { labelFr: "", labelEn: "", category: "", isActivation: false };

// The perk catalog (single source of truth for building packages and validating
// sponsors). Used in the Sponsor Packages tab.
export default function PerksCatalogManager({ canWrite = true, onChange }: { canWrite?: boolean; onChange?: () => void }) {
  const __ = useLang();
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ ...BLANK });
  const [seeding, setSeeding] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/perks").then(r => r.ok ? r.json() : []).then((d) => { setPerks(d); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.labelFr || !form.labelEn) return;
    const res = await fetch("/api/admin/perks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setForm({ ...BLANK }); load(); onChange?.(); }
  };
  const patch = async (id: number, data: Partial<Perk>) => {
    setPerks(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    await fetch(`/api/admin/perks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).catch(() => {});
    onChange?.();
  };
  const remove = async (id: number) => {
    if (!confirm(__("Supprimer ce perk du catalogue ?", "Delete this perk from the catalog?"))) return;
    setPerks(prev => prev.filter(p => p.id !== id));
    await fetch(`/api/admin/perks/${id}`, { method: "DELETE" }).catch(() => {});
    onChange?.();
  };
  const seed = async () => {
    setSeeding(true);
    await fetch("/api/admin/perks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seed: true }) }).catch(() => {});
    setSeeding(false); load(); onChange?.();
  };

  return (
    <div className="cyber-card rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-left flex-1 min-w-0">
          <span className="text-gray-500 text-xs w-3 shrink-0">{open ? "▾" : "▸"}</span>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-sm">🧩 {__("Catalogue de contreparties", "Perk catalog")} <span className="text-gray-600 font-normal">({perks.length})</span></h3>
            <p className="text-gray-600 text-xs">{__("Table centrale : construit les packages et la validation des sponsors.", "Central table: builds packages and sponsor validation.")}</p>
          </div>
        </button>
        {canWrite && perks.length === 0 && loaded && (
          <button onClick={seed} disabled={seeding} className="text-xs px-3 py-1.5 rounded border border-neon-green/30 text-neon-green shrink-0">
            {seeding ? "…" : __("Initialiser le catalogue", "Seed catalog")}
          </button>
        )}
      </div>

      {open && (<>
      <div className="space-y-1 mt-3">
        {perks.map(p => (
          <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-gray-800/50">
            <input value={p.labelFr} disabled={!canWrite} onChange={e => setPerks(prev => prev.map(x => x.id === p.id ? { ...x, labelFr: e.target.value } : x))} onBlur={e => patch(p.id, { labelFr: e.target.value })} className="cyber-input flex-1 px-2 py-1 rounded text-xs" />
            <input value={p.labelEn} disabled={!canWrite} onChange={e => setPerks(prev => prev.map(x => x.id === p.id ? { ...x, labelEn: e.target.value } : x))} onBlur={e => patch(p.id, { labelEn: e.target.value })} className="cyber-input flex-1 px-2 py-1 rounded text-xs" />
            <input value={p.category || ""} placeholder={__("Catégorie", "Category")} disabled={!canWrite} onChange={e => setPerks(prev => prev.map(x => x.id === p.id ? { ...x, category: e.target.value } : x))} onBlur={e => patch(p.id, { category: e.target.value })} className="cyber-input w-24 px-2 py-1 rounded text-xs" />
            <button onClick={() => canWrite && patch(p.id, { isActivation: !p.isActivation })} title={__("Activation à la carte", "À-la-carte activation")} className={`text-xs px-2 py-1 rounded shrink-0 ${p.isActivation ? "text-cyan-300 bg-cyan-500/10 border border-cyan-500/30" : "text-gray-600 border border-gray-800"}`}>⚡</button>
            {canWrite && <button onClick={() => remove(p.id)} className="text-red-500/50 hover:text-red-400 text-xs px-1 shrink-0">✕</button>}
          </div>
        ))}
        {loaded && perks.length === 0 && <p className="text-gray-700 text-xs py-2">{__("Catalogue vide.", "Empty catalog.")}</p>}
      </div>

      {canWrite && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
          <input value={form.labelFr as string} onChange={e => setForm(f => ({ ...f, labelFr: e.target.value }))} placeholder="Label FR" className="cyber-input flex-1 px-2 py-1 rounded text-xs" />
          <input value={form.labelEn as string} onChange={e => setForm(f => ({ ...f, labelEn: e.target.value }))} placeholder="Label EN" className="cyber-input flex-1 px-2 py-1 rounded text-xs" />
          <input value={form.category as string} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder={__("Catégorie", "Category")} className="cyber-input w-24 px-2 py-1 rounded text-xs" />
          <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0"><input type="checkbox" checked={!!form.isActivation} onChange={e => setForm(f => ({ ...f, isActivation: e.target.checked }))} />⚡</label>
          <button onClick={create} className="btn-neon px-3 py-1 rounded text-xs shrink-0">+ {__("Ajouter", "Add")}</button>
        </div>
      )}
      </>)}
    </div>
  );
}
