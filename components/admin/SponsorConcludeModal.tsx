"use client";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/adminLangContext";
import ImageUpload from "@/components/admin/ImageUpload";

interface Perk { id: number; labelFr: string; labelEn: string; category?: string | null; isActivation: boolean; isVisible: boolean; }
interface PackagePerk { perkId: number; quantity: number | null; perk: Perk; }
interface Pkg { id: number; tier: string; nameFr: string; nameEn: string; price: number; packagePerks?: PackagePerk[]; }

interface Selected { perkId: number; labelFr: string; labelEn: string; quantity: number | null; checked: boolean; }

interface Props {
  prospect: { id: number; org: string; package?: string | null; website?: string | null };
  onClose: () => void;
  onConcluded: () => void;
}

// #2 — validates a sponsor: pick the accepted perks (prefilled from the package, plus
// à-la-carte activations), set the deal amount & logo, then create the public Sponsor,
// the delivery checklist (SponsorPerk) and the revenue line in one shot.
export default function SponsorConcludeModal({ prospect, onClose, onConcluded }: Props) {
  const __ = useLang();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tier, setTier] = useState<string>((prospect.package || "").toUpperCase());
  const [name] = useState(prospect.org);
  const [website, setWebsite] = useState(prospect.website || "");
  const [logoUrl, setLogoUrl] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [selected, setSelected] = useState<Record<number, Selected>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/sponsor-packages").then(r => r.ok ? r.json() : []),
      fetch("/api/admin/perks").then(r => r.ok ? r.json() : []),
    ]).then(([pkgs, pks]) => {
      setPackages(pkgs); setPerks(pks); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const pkg = useMemo(() => packages.find(p => p.tier.toUpperCase() === tier.toUpperCase()), [packages, tier]);

  // When the tier changes, prefill the accepted perks from that package.
  useEffect(() => {
    if (!loaded) return;
    const next: Record<number, Selected> = {};
    (pkg?.packagePerks || []).forEach(pp => {
      next[pp.perkId] = { perkId: pp.perkId, labelFr: pp.perk.labelFr, labelEn: pp.perk.labelEn, quantity: pp.quantity, checked: true };
    });
    setSelected(next);
    if (pkg && amount === "") setAmount(String(pkg.price || ""));
  }, [pkg, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (perk: Perk) => {
    setSelected(prev => {
      const cur = prev[perk.id];
      if (cur) return { ...prev, [perk.id]: { ...cur, checked: !cur.checked } };
      return { ...prev, [perk.id]: { perkId: perk.id, labelFr: perk.labelFr, labelEn: perk.labelEn, quantity: null, checked: true } };
    });
  };
  const setQty = (perkId: number, q: string) =>
    setSelected(prev => prev[perkId] ? { ...prev, [perkId]: { ...prev[perkId], quantity: q ? parseInt(q) : null } } : prev);

  const chosen = Object.values(selected).filter(s => s.checked);
  const activations = perks.filter(p => p.isActivation && p.isVisible);
  const standard = perks.filter(p => !p.isActivation && p.isVisible);

  const conclude = async () => {
    setError("");
    if (chosen.length === 0) { setError(__("Sélectionnez au moins une contrepartie acceptée.", "Select at least one accepted perk.")); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/sponsor-prospects/${prospect.id}/conclude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, website, logoUrl, tier: tier || "BRONZE",
        dealAmount: amount ? parseInt(amount) : null,
        perks: chosen.map(s => ({ perkId: s.perkId, labelFr: s.labelFr, labelEn: s.labelEn, quantity: s.quantity })),
      }),
    });
    setSaving(false);
    if (res.ok) { onConcluded(); onClose(); }
    else { const e = await res.json().catch(() => ({})); setError(e.error || __("Échec", "Failed")); }
  };

  const row = (perk: Perk) => {
    const sel = selected[perk.id];
    const checked = !!sel?.checked;
    return (
      <div key={perk.id} className="flex items-center gap-2 py-1.5 border-b border-gray-800/50">
        <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
          <input type="checkbox" checked={checked} onChange={() => toggle(perk)} className="shrink-0" />
          <span className={`text-xs truncate ${checked ? "text-gray-200" : "text-gray-500"}`}>
            {__(perk.labelFr, perk.labelEn)}
            {perk.category && <span className="ml-2 text-gray-700">· {perk.category}</span>}
          </span>
        </label>
        {checked && (
          <input
            type="number" min={1} placeholder={__("Qté", "Qty")}
            value={sel?.quantity ?? ""} onChange={e => setQty(perk.id, e.target.value)}
            className="cyber-input w-16 px-2 py-1 rounded text-xs shrink-0"
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
      <div className="cyber-card rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-gray-800 shrink-0">
          <div>
            <h3 className="text-white font-bold">✅ {__("Conclure le sponsor", "Conclude sponsor")} — {name}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{__("Sélectionnez les contreparties acceptées pour valider et publier le sponsor.", "Select the accepted perks to validate and publish the sponsor.")}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Sponsor identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1">{__("Package / Tier", "Package / Tier")}</label>
              <select value={tier} onChange={e => setTier(e.target.value)} className="cyber-input w-full px-3 py-1.5 rounded text-xs">
                <option value="">{__("— Choisir —", "— Choose —")}</option>
                {(packages.length ? packages.map(p => p.tier) : ["PLATINUM", "GOLD", "SILVER", "BRONZE", "PARTNER"]).map(tr => (
                  <option key={tr} value={tr}>{tr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">{__("Montant négocié (FCFA)", "Agreed amount (FCFA)")}</label>
              <input type="number" min={0} step={50000} value={amount} onChange={e => setAmount(e.target.value)} className="cyber-input w-full px-3 py-1.5 rounded text-xs" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Website</label>
              <input value={website} onChange={e => setWebsite(e.target.value)} className="cyber-input w-full px-3 py-1.5 rounded text-xs" />
            </div>
            <div>
              <ImageUpload value={logoUrl} onChange={setLogoUrl} folder="sponsors" label={__("Logo sponsor", "Sponsor logo")} />
            </div>
          </div>

          {/* Perks from package */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#ffaa00" }}>
              {__("Contreparties du package", "Package perks")} {pkg ? `· ${pkg.tier}` : ""}
            </p>
            {!loaded ? <p className="text-gray-600 text-xs">{__("Chargement…", "Loading…")}</p> : (
              <div className="space-y-0">{standard.map(row)}</div>
            )}
          </div>

          {/* À-la-carte activations (#4) */}
          {activations.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#00ccff" }}>
                {__("Activations à la carte", "À-la-carte activations")}
              </p>
              <div className="space-y-0">{activations.map(row)}</div>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-800 shrink-0">
          <span className="text-gray-500 text-xs">{chosen.length} {__("contrepartie(s) sélectionnée(s)", "perk(s) selected")}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-4 py-2 rounded text-gray-500 hover:text-white">{__("Annuler", "Cancel")}</button>
            <button onClick={conclude} disabled={saving || chosen.length === 0} className="btn-neon px-5 py-2 rounded text-xs disabled:opacity-50">
              {saving ? "…" : `✅ ${__("Valider & publier", "Validate & publish")}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
