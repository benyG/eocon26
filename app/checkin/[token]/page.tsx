"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Result = {
  success?: boolean;
  registration?: { id: number; fname: string; lname: string; email: string; ticketType: string; checkedInAt: string; checkedInBy: string };
  error?: string;
  checkedInAt?: string;
  checkedInBy?: string;
};

export default function CheckinTokenPage() {
  const params = useParams();
  const token = decodeURIComponent(String(params.token || ""));
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "duplicate" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); setResult({ error: "Token manquant" }); return; }
    fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: token, operatorName: "Scan automatique" }),
    })
      .then(async res => {
        const json: Result = await res.json();
        setResult(json);
        if (res.ok && json.success) setStatus("success");
        else if (res.status === 409) setStatus("duplicate");
        else setStatus("error");
      })
      .catch(() => { setStatus("error"); setResult({ error: "Erreur réseau" }); });
  }, [token]);

  const cfg = {
    loading: { bg: "#0a1420", border: "#0066ff", color: "#0066ff", icon: "⏳", title: "Vérification…" },
    success: { bg: "#001a0d", border: "#00ff9d", color: "#00ff9d", icon: "✓", title: "CHECK-IN VALIDÉ" },
    duplicate: { bg: "#1a0d00", border: "#ff6600", color: "#ff6600", icon: "⚠", title: "DÉJÀ ENREGISTRÉ" },
    error: { bg: "#1a0000", border: "#ff0066", color: "#ff0066", icon: "✗", title: "ERREUR" },
  }[status as "loading" | "success" | "duplicate" | "error"];

  return (
    <div style={{ minHeight: "100vh", background: "#050a0e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Share Tech Mono', monospace" }}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ color: "#00ff9d", fontSize: 11, letterSpacing: 4, margin: "0 0 4px", textTransform: "uppercase" }}>&gt; EOCON_CHECKIN</p>
          <p style={{ color: "#333", fontSize: 11, margin: 0 }}>2026 · Douala, Cameroun</p>
        </div>

        {/* Result card */}
        <div style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 16, padding: 32, textAlign: "center", boxShadow: `0 0 40px ${cfg.border}20` }}>
          <div style={{ fontSize: 56, color: cfg.color, marginBottom: 8 }}>{cfg.icon}</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: cfg.color, letterSpacing: 3, marginBottom: 16 }}>{cfg.title}</div>

          {status === "success" && result?.registration && (
            <>
              <div style={{ color: "#ffffff", fontSize: 24, fontWeight: "bold", marginBottom: 8, fontFamily: "Georgia, serif" }}>
                {result.registration.fname} {result.registration.lname}
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ background: "#00ff9d20", color: "#00ff9d", padding: "4px 12px", borderRadius: 20, fontSize: 12 }}>
                  {result.registration.ticketType}
                </span>
              </div>
              <div style={{ color: "#555", fontSize: 12, marginTop: 8 }}>
                {result.registration.email}
              </div>
              <div style={{ color: "#333", fontSize: 11, marginTop: 8 }}>
                {new Date(result.registration.checkedInAt).toLocaleTimeString("fr-FR")} — {result.registration.checkedInBy}
              </div>
            </>
          )}

          {status === "duplicate" && (
            <>
              <div style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>Billet déjà utilisé</div>
              {result?.checkedInAt && (
                <div style={{ color: "#555", fontSize: 12 }}>
                  Check-in le {new Date(result.checkedInAt).toLocaleString("fr-FR")}
                  {result.checkedInBy ? ` — par ${result.checkedInBy}` : ""}
                </div>
              )}
            </>
          )}

          {status === "error" && (
            <div style={{ color: "#fff", fontSize: 16 }}>{result?.error || "QR code invalide"}</div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/checkin" style={{ color: "#333", fontSize: 11, textDecoration: "none" }}>← Retour à l&apos;accueil</a>
        </div>
      </div>
    </div>
  );
}
