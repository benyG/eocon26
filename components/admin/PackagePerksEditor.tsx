"use client";
import { useEffect, useState, useCallback } from "react";
import { useLang } from "@/lib/adminLangContext";

interface Perk { id: number; labelFr: string; labelEn: string; category: string | null; isActivation: boolean; isVisible: boolean; }
interface Assigned { perkId: number; quantity: number | null; }

// Build a package from the perk catalog (with optional quantities), instead of free-text
// perk lines. Saves via PUT and regenerates the public perksFr/perksEn JSON server-side.
export default function PackagePerksEditor({ packageId, canWrite = true, refreshKey }: { packageId: number; canWrite?: boolean; refreshKey?: number }) {
  const __ = useLang();
  const [catalog, setCatalog] = useState<Perk[]>([]);
  const [assigned, setAssigned] = useState<Record<number, Assigned>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const load = useCallback(async () => {
    const [cat, rows] = await Promise.all([
      fetch("/api/admin/perks").then(r => r.ok ? r.json() : []),
      fetch(`/api/admin/sponsor-packages/${packageId}/perks`).then(r => r.ok ? r.json() : []),
    ]);
    setCatalog(cat);
    const map: Record<number, Assigned> = {};
    (rows as { perkId: number; quantity: number | null }[]).forEach(r => { map[r.perkId] = { perkId: r.perkId, quantity: r.quantity }; });
    setAssigned(map);
  }, [packageId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const toggle = (perkId: number) => setAssigned(prev => {
    const next = { ...prev };
    if (next[perkId]) delete next[perkId]; else next[perkId] = { perkId, quantity: null };
    return next;
  });
  const setQty = (perkId: number, q: string) => setAssigned(prev => prev[perkId] ? { ...prev, [perkId]: { perkId, quantity: q ? parseInt(q) : null } } : prev);

  const save = async () => {
    setSaving(true); setSavedMsg("");
    const perks = Object.values(assigned);
    const res = await fetch(`/api/admin/sponsor-packages/${packageId}/perks`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ perks }),
    });
    setSaving(false);
    if (res.ok) { setSavedMsg("✓"); setTimeout(() => setSavedMsg(""), 2000); }
  };

  const visible = catalog.filter(p => p.isVisible);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase">{__("Contreparties du package", "Package perks")}</p>
        {canWrite && (
          <button onClick={save} disabled={saving} className="text-xs px-3 py-1 rounded border border-neon-green/30 text-neon-green disabled:opacity-50">
            {saving ? "…" : savedMsg || __("Enregistrer les perks", "Save perks")}
          </button>
        )}
      </div>
      {visible.length === 0 && <p className="text-gray-700 text-xs">{__("Catalogue vide — initialisez-le ci-dessus.", "Empty catalog — seed it above.")}</p>}
      <div className="grid md:grid-cols-2 gap-x-4 gap-y-1">
        {visible.map(p => {
          const on = !!assigned[p.id];
          return (
            <div key={p.id} className="flex items-center gap-2 py-1">
              <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                <input type="checkbox" checked={on} disabled={!canWrite} onChange={() => toggle(p.id)} className="shrink-0" />
                <span className={`text-xs truncate ${on ? "text-gray-200" : "text-gray-500"}`}>
                  {p.isActivation ? "⚡ " : ""}{__(p.labelFr, p.labelEn)}
                </span>
              </label>
              {on && (
                <input type="number" min={1} placeholder={__("Qté", "Qty")} value={assigned[p.id].quantity ?? ""} disabled={!canWrite}
                  onChange={e => setQty(p.id, e.target.value)} className="cyber-input w-14 px-2 py-0.5 rounded text-xs shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
