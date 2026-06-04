"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface RegEntry { id: number; fname: string; lname: string; ticketType: string; status: string; ticketRef: string | null; }
interface QRData { id: number; name: string; ticketRef: string; ticketType: string; status: string; qrDataUrl: string; payload: string; }

export default function TestQRPage() {
  const [regs, setRegs] = useState<RegEntry[]>([]);
  const [selected, setSelected] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/checkin/test-qr").then(r => r.json()).then(setRegs).catch(() => {});
  }, []);

  const loadQR = async (id: number) => {
    setLoading(true);
    const data = await fetch(`/api/admin/checkin/test-qr?id=${id}`).then(r => r.json());
    setSelected(data);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e0e0e0", fontFamily: "'Share Tech Mono', monospace", padding: "32px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Link href="/admin/checkin" style={{ color: "#00ff9d", textDecoration: "none", fontSize: 12 }}>← Retour au Check-in</Link>
        <h1 style={{ color: "#00ff9d", fontSize: 24, margin: "16px 0 4px" }}>&gt; TEST QR CODE</h1>
        <p style={{ color: "#555", fontSize: 12, marginBottom: 8 }}>Sélectionnez une inscription pour générer son QR code de test</p>
        <div style={{ padding: "8px 12px", background: "#ffaa0010", border: "1px solid #ffaa0030", borderRadius: 8, marginBottom: 24 }}>
          <p style={{ color: "#ffaa00", fontSize: 11, margin: 0 }}>⚠️ Pour test uniquement — scanner ce code sur la page Check-in pour valider le workflow</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 24 }}>
          <div>
            <p style={{ color: "#888", fontSize: 11, marginBottom: 12, textTransform: "uppercase" }}>Inscriptions récentes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {regs.map(r => (
                <button key={r.id} onClick={() => loadQR(r.id)}
                  style={{ background: selected?.id === r.id ? "#00ff9d15" : "#111", border: `1px solid ${selected?.id === r.id ? "#00ff9d40" : "#222"}`, borderRadius: 8, padding: "12px 16px", textAlign: "left", cursor: "pointer", color: "#e0e0e0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold", color: "#fff" }}>{r.fname} {r.lname}</span>
                    <span style={{ fontSize: 10, color: r.status === "validated" ? "#00ff9d" : "#ffaa00", background: (r.status === "validated" ? "#00ff9d" : "#ffaa00") + "15", padding: "2px 8px", borderRadius: 4 }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{r.ticketType} · #{r.id}</div>
                </button>
              ))}
              {regs.length === 0 && <p style={{ color: "#444", fontSize: 12 }}>Aucune inscription en base</p>}
            </div>
          </div>

          {selected && (
            <div style={{ background: "#111", border: "1px solid #00ff9d20", borderRadius: 12, padding: 24, textAlign: "center" }}>
              <p style={{ color: "#00ff9d", fontSize: 11, marginBottom: 16, textTransform: "uppercase" }}>QR Code — {selected.ticketRef}</p>
              {loading ? (
                <p style={{ color: "#555", fontSize: 12 }}>Chargement...</p>
              ) : (
                <img src={selected.qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, border: "4px solid #00ff9d", borderRadius: 8, marginBottom: 16 }} />
              )}
              <div style={{ textAlign: "left", marginTop: 16 }}>
                <p style={{ margin: "4px 0", fontSize: 12 }}><span style={{ color: "#555" }}>Participant : </span>{selected.name}</p>
                <p style={{ margin: "4px 0", fontSize: 12 }}><span style={{ color: "#555" }}>Type : </span>{selected.ticketType}</p>
                <p style={{ margin: "4px 0", fontSize: 12 }}><span style={{ color: "#555" }}>Statut : </span><span style={{ color: selected.status === "validated" ? "#00ff9d" : "#ffaa00" }}>{selected.status}</span></p>
                <p style={{ margin: "4px 0", fontSize: 12 }}><span style={{ color: "#555" }}>Payload : </span><code style={{ color: "#00ff9d", fontSize: 10 }}>{selected.payload}</code></p>
              </div>
              {selected.status !== "validated" && (
                <div style={{ marginTop: 16, padding: 12, background: "#ffaa0010", border: "1px solid #ffaa0030", borderRadius: 8 }}>
                  <p style={{ color: "#ffaa00", fontSize: 11, margin: 0 }}>⚠️ Statut non validé — le check-in sera refusé</p>
                </div>
              )}
              {selected.status === "validated" && (
                <div style={{ marginTop: 16, padding: 12, background: "#00ff9d10", border: "1px solid #00ff9d30", borderRadius: 8 }}>
                  <p style={{ color: "#00ff9d", fontSize: 11, margin: 0 }}>✓ Check-in autorisé — scannez sur la page check-in</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
