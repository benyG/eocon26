"use client";
import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/lib/adminLangContext";

interface TargetSocial { id: number; platform: string; lang: string; content: string; imageUrl?: string | null; scheduledAt?: string | null; status: string }
interface TargetCampaign { id: number; name: string; subject: string; status: string; segment: string }

interface ApprovalReq {
  id: number;
  kind: "social" | "campaign";
  action: "schedule" | "publish" | "send";
  targetType: "SocialPost" | "Campaign";
  targetId: number;
  title: string;
  payload?: string | null;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  note?: string | null;
  createdAt: string;
  target: TargetSocial | TargetCampaign | null;
}

const PLATFORM_EMOJI: Record<string, string> = { linkedin: "💼", twitter: "🐦", facebook: "📘", instagram: "📸", whatsapp: "💬" };

export default function ApprovalsPanel() {
  const __ = useLang();
  const [requests, setRequests] = useState<ApprovalReq[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/approvals");
    if (res.ok) {
      const d = await res.json() as { requests: ApprovalReq[]; canApprove: boolean };
      setRequests(d.requests);
      setCanApprove(d.canApprove);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: number, decision: "approve" | "reject") => {
    let note: string | undefined;
    if (decision === "reject") {
      const r = window.prompt(__("Motif du refus (optionnel) :", "Rejection reason (optional):"));
      if (r === null) return; // cancelled
      note = r || undefined;
    } else {
      if (!window.confirm(__("Valider et envoyer cette communication ?", "Approve and send this communication?"))) return;
    }
    setBusyId(id);
    const res = await fetch(`/api/admin/approvals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    if (res.ok) {
      await load();
    } else {
      const e = await res.json().catch(() => ({ error: "Erreur" }));
      alert(e.error || __("Erreur", "Error"));
    }
    setBusyId(null);
  };

  const pending = requests.filter(r => r.status === "pending");
  const history = requests.filter(r => r.status !== "pending");
  const shown = tab === "pending" ? pending : history;

  const renderTarget = (r: ApprovalReq) => {
    if (r.targetType === "SocialPost") {
      const t = r.target as TargetSocial | null;
      if (!t) return null;
      return (
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t.imageUrl && <img src={t.imageUrl} alt="" className="w-16 h-16 rounded object-cover shrink-0" style={{ border: "1px solid var(--bdr)" }} />}
          <div className="min-w-0">
            <p className="text-xs font-mono mb-1" style={{ color: "var(--txt-dim)" }}>
              {PLATFORM_EMOJI[t.platform] || "📱"} {t.platform} · {t.lang?.toUpperCase()}
              {r.action === "schedule" && t.scheduledAt && <> · 📅 {new Date(t.scheduledAt).toLocaleString("fr-FR")}</>}
              {r.action === "publish" && <> · ⚡ {__("Publication immédiate", "Publish now")}</>}
            </p>
            <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: "var(--txt-2)" }}>{t.content}</p>
          </div>
        </div>
      );
    }
    const t = r.target as TargetCampaign | null;
    if (!t) return null;
    return (
      <div>
        <p className="text-xs font-mono mb-1" style={{ color: "var(--txt-dim)" }}>📬 {__("Campagne mailing", "Mailing campaign")}</p>
        <p className="text-sm font-bold" style={{ color: "var(--txt)" }}>{t.name}</p>
        <p className="text-xs" style={{ color: "var(--txt-2)" }}>{__("Objet", "Subject")} : {t.subject}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black font-mono" style={{ color: "var(--txt)" }}>🛡️ {__("Approbations", "Approvals")}</h2>
          <p className="text-xs font-mono" style={{ color: "var(--txt-mute)" }}>
            {canApprove
              ? __("Validez ou refusez les communications soumises avant leur envoi.", "Validate or reject communications before they go out.")
              : __("Communications en attente de validation par un approbateur désigné.", "Communications awaiting validation by a designated approver.")}
          </p>
        </div>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded border font-mono" style={{ borderColor: "var(--bdr-2)", color: "var(--txt-dim)" }}>{loading ? "…" : __("↻ Actualiser", "↻ Refresh")}</button>
      </div>

      <div className="flex gap-2">
        {(["pending", "history"] as const).map(k => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="text-xs px-3 py-1.5 rounded font-mono font-bold"
            style={tab === k
              ? { background: "var(--ac-bg)", color: "var(--ac)", border: "1px solid var(--ac-bdr)" }
              : { border: "1px solid var(--bdr-2)", color: "var(--txt-dim)" }}
          >
            {k === "pending" ? `⏳ ${__("En attente", "Pending")} (${pending.length})` : `📜 ${__("Historique", "History")} (${history.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-xs py-10 text-center font-mono" style={{ color: "var(--txt-mute)" }}>
          {tab === "pending" ? __("Aucune communication en attente. ✅", "Nothing awaiting approval. ✅") : __("Aucun historique.", "No history.")}
        </p>
      )}

      <div className="space-y-3">
        {shown.map(r => (
          <div key={r.id} className="cyber-card rounded-xl p-4" style={{ borderColor: r.status === "pending" ? "var(--ac-bdr)" : "var(--bdr)" }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold font-mono truncate" style={{ color: "var(--txt)" }}>{r.title}</p>
                <p className="text-xs font-mono" style={{ color: "var(--txt-mute)" }}>
                  {__("Soumis par", "Submitted by")} {r.requestedBy} · {new Date(r.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-mono shrink-0" style={
                r.status === "pending" ? { background: "#ffaa0020", color: "#ffaa00" }
                : r.status === "approved" ? { background: "var(--ac-bg)", color: "var(--ac)" }
                : { background: "#ff333320", color: "#ff5555" }
              }>
                {r.status === "pending" ? __("En attente", "Pending") : r.status === "approved" ? __("Validé", "Approved") : __("Refusé", "Rejected")}
              </span>
            </div>

            <div className="rounded-lg p-3 mb-3" style={{ background: "var(--card)" }}>
              {renderTarget(r)}
            </div>

            {r.status !== "pending" && (
              <p className="text-xs font-mono mb-2" style={{ color: "var(--txt-mute)" }}>
                {r.status === "approved" ? "✅" : "❌"} {r.reviewedBy}{r.reviewedAt ? ` · ${new Date(r.reviewedAt).toLocaleString("fr-FR")}` : ""}
                {r.note ? ` — « ${r.note} »` : ""}
              </p>
            )}

            {r.status === "pending" && canApprove && (
              <div className="flex gap-2">
                <button
                  onClick={() => decide(r.id, "approve")}
                  disabled={busyId === r.id}
                  className="text-xs px-3 py-1.5 rounded font-mono font-bold disabled:opacity-50"
                  style={{ background: "var(--ac-bg)", color: "var(--ac)", border: "1px solid var(--ac-bdr)" }}
                >
                  {busyId === r.id ? "…" : `✅ ${__("Valider & envoyer", "Approve & send")}`}
                </button>
                <button
                  onClick={() => decide(r.id, "reject")}
                  disabled={busyId === r.id}
                  className="text-xs px-3 py-1.5 rounded font-mono disabled:opacity-50"
                  style={{ border: "1px solid #ff333360", color: "#ff5555" }}
                >
                  ❌ {__("Refuser", "Reject")}
                </button>
              </div>
            )}
            {r.status === "pending" && !canApprove && (
              <p className="text-xs font-mono" style={{ color: "var(--txt-mute)" }}>{__("En attente d'un approbateur désigné.", "Awaiting a designated approver.")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
