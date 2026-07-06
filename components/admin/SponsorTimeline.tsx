"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/adminLangContext";

interface Ev { at: string; kind: string; label: string; detail?: string; future?: boolean }
const ICON: Record<string, string> = { created: "🆕", contact: "📞", email: "✉️", reminder: "⏰", next: "🔜", concluded: "✅", document: "📄" };
const COLOR: Record<string, string> = { created: "#888", contact: "#0066ff", email: "#cc00ff", reminder: "#ff6600", next: "#00ccff", concluded: "#00e066", document: "#00ccff" };

// Activity history for a prospect, assembled server-side from real records.
export default function SponsorTimeline({ prospectId }: { prospectId: number }) {
  const __ = useLang();
  const [data, setData] = useState<{ upcoming: Ev[]; past: Ev[] } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !data) fetch(`/api/admin/sponsor-prospects/${prospectId}/timeline`).then(r => r.ok ? r.json() : null).then(setData).catch(() => {});
  }, [open, data, prospectId]);

  const row = (e: Ev, i: number) => (
    <div key={e.kind + e.at + i} className="flex items-start gap-2 py-1.5">
      <span className="shrink-0" style={{ color: COLOR[e.kind] || "#888" }}>{ICON[e.kind] || "•"}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-xs ${e.future ? "text-gray-400 italic" : "text-gray-200"}`}>{e.label}{e.detail && <span className="text-gray-500"> · {e.detail}</span>}</p>
        <p className="text-xs text-gray-600 font-mono">{new Date(e.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
    </div>
  );

  return (
    <div className="border-t border-gray-800 pt-3">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300">
        <span>{open ? "▾" : "▸"}</span> 🕓 {__("Historique", "History")}
      </button>
      {open && (
        <div className="mt-2 pl-1">
          {!data ? <p className="text-xs text-gray-600">{__("Chargement…", "Loading…")}</p> : (
            <>
              {data.upcoming.map(row)}
              {data.upcoming.length > 0 && data.past.length > 0 && <div className="h-px bg-gray-800 my-2" />}
              {data.past.map(row)}
              {data.upcoming.length === 0 && data.past.length === 0 && <p className="text-xs text-gray-600">{__("Aucun évènement.", "No events.")}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
