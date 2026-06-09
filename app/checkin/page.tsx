"use client";
import { useState, useEffect, useCallback } from "react";
import { useCheckinAuth } from "@/hooks/useCheckinAuth";

type Reg = {
  id: number;
  fname: string;
  lname: string;
  email: string;
  ticketType: string;
  status: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
};

export default function CheckinHubPage() {
  const { state: authState, userName } = useCheckinAuth();
  const [regs, setRegs] = useState<Reg[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkinLoading, setCheckinLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/submissions?type=registration").catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setRegs(Array.isArray(data) ? data : data.registrations || []);
    } else {
      setError("Accès refusé. Connectez-vous à l'admin d'abord.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const manualCheckin = async (reg: Reg) => {
    if (!confirm(`Check-in manuel pour ${reg.fname} ${reg.lname} ?`)) return;
    setCheckinLoading(reg.id);
    const res = await fetch("/api/admin/checkin/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: reg.id, operatorName: "Hôtesse" }),
    });
    const json = await res.json();
    if (res.ok) {
      setMsg({ text: `✓ Check-in validé pour ${reg.fname} ${reg.lname}`, ok: true });
      load();
    } else {
      setMsg({ text: json.error || "Erreur", ok: false });
    }
    setCheckinLoading(null);
    setTimeout(() => setMsg(null), 4000);
  };

  const filtered = regs.filter(r =>
    r.status === "validated" &&
    (`${r.fname} ${r.lname} ${r.email}`).toLowerCase().includes(search.toLowerCase())
  );

  if (authState === "loading") return (
    <div style={{ minHeight: "100vh", background: "#050a0e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#00ff9d", fontSize: 13, letterSpacing: 2 }}>
      VÉRIFICATION ACCÈS…
    </div>
  );
  if (authState === "denied") return (
    <div style={{ minHeight: "100vh", background: "#050a0e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: 32 }}>
      <div style={{ color: "#ff0066", fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginBottom: 12 }}>ACCÈS REFUSÉ</div>
      <div style={{ color: "#888", fontSize: 12, textAlign: "center", maxWidth: 300 }}>Votre compte n&apos;a pas les droits sur le check-in.<br/>Contactez l&apos;administrateur.</div>
    </div>
  );

  // userName is available for display if needed: {userName}
  void userName;

  return (
    <div style={{ minHeight: "100vh", background: "#050a0e", fontFamily: "'Share Tech Mono', monospace", color: "#e0e0e0", padding: "0" }}>
      {/* Top bar */}
      <div style={{ borderBottom: "1px solid #00ff9d20", background: "#020608", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#00ff9d", fontWeight: "bold", letterSpacing: 3, fontSize: 14 }}>&gt; EOCON_CHECKIN</span>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/admin/checkin" style={{ color: "#555", fontSize: 11, textDecoration: "none" }}>Mode scanner →</a>
          <a href="/admin" style={{ color: "#555", fontSize: 11, textDecoration: "none" }}>Admin →</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1 style={{ color: "#fff", fontSize: 20, marginBottom: 4 }}>Inscrits validés</h1>
        <p style={{ color: "#555", fontSize: 11, marginBottom: 24 }}>
          {filtered.length} inscrits · {filtered.filter(r => r.checkedInAt).length} check-ins
        </p>

        {msg && (
          <div style={{ background: msg.ok ? "#001a0d" : "#1a0000", border: `1px solid ${msg.ok ? "#00ff9d" : "#ff0066"}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 12, color: msg.ok ? "#00ff9d" : "#ff0066" }}>
            {msg.text}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Recherche par nom ou email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", background: "#0a0f14", border: "1px solid #00ff9d40", borderRadius: 8, padding: "10px 16px", color: "#e0e0e0", fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 16, fontFamily: "'Share Tech Mono', monospace" }}
        />

        {error && <p style={{ color: "#ff0066", fontSize: 12 }}>{error}</p>}
        {loading && <p style={{ color: "#555", fontSize: 12 }}>Chargement…</p>}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(r => (
              <div key={r.id} style={{ background: r.checkedInAt ? "#00ff9d08" : "#0a0f14", border: `1px solid ${r.checkedInAt ? "#00ff9d30" : "#1a2030"}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>{r.fname} {r.lname}</div>
                  <div style={{ color: "#555", fontSize: 11, marginTop: 2 }}>{r.email}</div>
                </div>
                <span style={{ background: "#00ff9d15", color: "#00ff9d80", padding: "3px 10px", borderRadius: 12, fontSize: 11 }}>{r.ticketType}</span>
                {r.checkedInAt ? (
                  <span style={{ color: "#00ff9d", fontSize: 11 }}>
                    ✓ {new Date(r.checkedInAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  <button
                    onClick={() => manualCheckin(r)}
                    disabled={checkinLoading === r.id}
                    style={{ background: "#00ff9d15", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "6px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", opacity: checkinLoading === r.id ? 0.5 : 1 }}
                  >
                    {checkinLoading === r.id ? "…" : "Check-in"}
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 32 }}>Aucun résultat</p>}
          </div>
        )}
      </div>
    </div>
  );
}
