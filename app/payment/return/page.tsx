"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ReturnInner() {
  const sp = useSearchParams();
  const [state, setState] = useState<"checking" | "success" | "pending">("checking");

  useEffect(() => {
    const registrationId = sp.get("registrationId");
    const token = sp.get("token");
    const sessionId = sp.get("session_id");
    if (!registrationId || !token) { setState("pending"); return; }

    let attempts = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      attempts++;
      try {
        const r = await fetch(
          `/api/payment/stripe/confirm?registrationId=${encodeURIComponent(registrationId)}&token=${encodeURIComponent(token)}${sessionId ? `&session_id=${encodeURIComponent(sessionId)}` : ""}`,
        );
        const d = await r.json();
        if (d.state === "successful") {
          setState("success");
          if (timer) clearInterval(timer);
          return;
        }
      } catch { /* keep polling */ }
      // Webhook may lag a moment; poll up to ~30s before showing the pending note.
      if (attempts >= 10 && timer) { clearInterval(timer); setState("pending"); }
    };

    check();
    timer = setInterval(check, 3000);
    return () => { if (timer) clearInterval(timer); };
  }, [sp]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#030408", color: "#fff", fontFamily: "'Share Tech Mono', monospace", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center", background: "#0a0a0f", border: "1px solid rgba(0,255,157,0.2)", borderRadius: 16, padding: 40 }}>
        {state === "checking" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h1 style={{ color: "#00ff9d", fontSize: 20, marginBottom: 8 }}>Vérification du paiement…</h1>
            <p style={{ color: "#888", fontSize: 13 }}>Merci de patienter quelques instants.</p>
          </>
        )}
        {state === "success" && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h1 style={{ color: "#00ff9d", fontSize: 22, marginBottom: 8 }}>Paiement confirmé !</h1>
            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6 }}>
              Votre inscription à EOCON 2026 est confirmée. Votre billet vous a été envoyé par email.
            </p>
          </>
        )}
        {state === "pending" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
            <h1 style={{ color: "#ffaa00", fontSize: 20, marginBottom: 8 }}>Paiement en cours de traitement</h1>
            <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.6 }}>
              Si votre paiement a abouti, vous recevrez votre billet par email dans quelques minutes.
              En cas de problème, contactez-nous.
            </p>
          </>
        )}
        <Link href="/" style={{ display: "inline-block", marginTop: 28, padding: "10px 24px", border: "2px solid #00ff9d", borderRadius: 8, color: "#00ff9d", fontSize: 13, textDecoration: "none" }}>
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={null}>
      <ReturnInner />
    </Suspense>
  );
}
