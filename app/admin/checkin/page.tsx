"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type CheckinResult = {
  success?: boolean;
  registration?: {
    id: number;
    fname: string;
    lname: string;
    email: string;
    ticketType: string;
    checkedInAt: string;
    checkedInBy: string;
  };
  error?: string;
  checkedInAt?: string;
  checkedInBy?: string;
};

type HistoryEntry = {
  id: number;
  name: string;
  ticketType: string;
  time: string;
  status: "ok" | "duplicate" | "error";
};

export default function CheckinPage() {
  const [payload, setPayload] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [resultType, setResultType] = useState<"success" | "duplicate" | "error" | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<{ checkedIn: number; total: number }>({ checkedIn: 0, total: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("checkin_operator");
    if (saved) setOperatorName(saved);
    fetchStats();
    inputRef.current?.focus();
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        // Count checked-in registrations
        const regRes = await fetch("/api/admin/submissions?type=registration");
        if (regRes.ok) {
          const regs = await regRes.json() as Record<string, unknown>[];
          const checkedIn = regs.filter(r => r.checkedInAt).length;
          setStats({ checkedIn, total: json.registrations || regs.length });
        } else {
          setStats(s => ({ ...s, total: json.registrations || 0 }));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const doCheckin = useCallback(async (p: string) => {
    const trimmed = p.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: trimmed, operatorName: operatorName || "Opérateur" }),
      });
      const json: CheckinResult = await res.json();
      setResult(json);
      if (res.ok && json.success && json.registration) {
        setResultType("success");
        const entry: HistoryEntry = {
          id: json.registration.id,
          name: `${json.registration.fname} ${json.registration.lname}`,
          ticketType: json.registration.ticketType,
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "ok",
        };
        setHistory(prev => [entry, ...prev].slice(0, 10));
        fetchStats();
      } else if (res.status === 409) {
        setResultType("duplicate");
        const entry: HistoryEntry = {
          id: Date.now(),
          name: "Déjà scanné",
          ticketType: "—",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "duplicate",
        };
        setHistory(prev => [entry, ...prev].slice(0, 10));
      } else {
        setResultType("error");
        const entry: HistoryEntry = {
          id: Date.now(),
          name: json.error || "Erreur",
          ticketType: "—",
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          status: "error",
        };
        setHistory(prev => [entry, ...prev].slice(0, 10));
      }
    } catch {
      setResultType("error");
      setResult({ error: "Erreur réseau" });
    } finally {
      setIsSubmitting(false);
      setPayload("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [operatorName, isSubmitting, fetchStats]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doCheckin(payload);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayload(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (e.target.value.trim()) doCheckin(e.target.value);
    }, 500);
  };

  const handleOperatorSave = (name: string) => {
    setOperatorName(name);
    localStorage.setItem("checkin_operator", name);
  };

  const statusConfig = {
    success: { bg: "#00ff9d15", border: "#00ff9d", text: "#00ff9d", icon: "✓", title: "CHECK-IN OK" },
    duplicate: { bg: "#ff660015", border: "#ff6600", text: "#ff6600", icon: "⚠", title: "DÉJÀ ENREGISTRÉ" },
    error: { bg: "#ff006615", border: "#ff0066", text: "#ff0066", icon: "✗", title: "ERREUR" },
  };

  const historyColors = { ok: "#00ff9d", duplicate: "#ff6600", error: "#ff0066" };

  return (
    <div
      className="min-h-screen bg-black flex flex-col"
      style={{ fontFamily: "'Share Tech Mono', monospace", background: "#050a0e" }}
    >
      {/* Top bar */}
      <div className="border-b border-neon-green/20 bg-black/90 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-neon-green font-mono font-bold text-lg tracking-widest">&#62; EOCON_CHECKIN</span>
          <div
            className="text-2xl font-black font-mono px-4 py-1 rounded"
            style={{ background: "#00ff9d15", border: "1px solid #00ff9d40", color: "#00ff9d" }}
          >
            {stats.checkedIn} / {stats.total}
            <span className="text-xs text-gray-500 ml-2 font-normal">check-ins</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="/admin/checkin/test" style={{ color: "#555", fontSize: 11, textDecoration: "none" }}>🧪 Test QR</a>
          <a href="/admin" className="text-xs text-gray-500 hover:text-neon-green transition-colors">← Admin</a>
        </div>
      </div>

      <div className="flex flex-1 gap-0">
        {/* Main scanner area */}
        <div className="flex-1 flex flex-col items-center justify-start pt-12 px-6">
          {/* Operator name */}
          <div className="w-full max-w-lg mb-6">
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Opérateur</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded text-sm"
              style={{
                background: "#0a0f14",
                border: "1px solid #333",
                color: "#aaa",
                fontFamily: "'Share Tech Mono', monospace",
              }}
              value={operatorName}
              onChange={e => handleOperatorSave(e.target.value)}
              placeholder="Votre nom..."
            />
          </div>

          {/* Scanner input */}
          <div className="w-full max-w-lg mb-8">
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-2">Scanner / Coller le QR Payload</label>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              className="w-full px-5 py-4 rounded-xl text-xl font-mono"
              style={{
                background: "#0a1a10",
                border: "2px solid #00ff9d60",
                color: "#00ff9d",
                fontFamily: "'Share Tech Mono', monospace",
                outline: "none",
                boxShadow: "0 0 20px #00ff9d10",
              }}
              value={payload}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Scannez ou collez ici..."
              disabled={isSubmitting}
            />
            <p className="text-gray-600 text-xs mt-2 text-center">
              Appuyez sur <span className="text-neon-green/60">Entrée</span> ou attendez 500ms après le scan
            </p>
          </div>

          {/* Result banner */}
          {resultType && result && (() => {
            const cfg = statusConfig[resultType];
            return (
              <div
                className="w-full max-w-lg rounded-2xl p-6 mb-6 transition-all"
                style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, boxShadow: `0 0 30px ${cfg.border}20` }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-5xl leading-none" style={{ color: cfg.text }}>{cfg.icon}</div>
                  <div className="flex-1">
                    <div className="font-black text-xl tracking-widest mb-1" style={{ color: cfg.text }}>{cfg.title}</div>
                    {resultType === "success" && result.registration && (
                      <>
                        <div className="text-white text-2xl font-bold mb-1">
                          {result.registration.fname} {result.registration.lname}
                        </div>
                        <div className="text-gray-400 text-sm">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-mono mr-2"
                            style={{ background: "#00ff9d20", color: "#00ff9d" }}
                          >
                            {result.registration.ticketType}
                          </span>
                          {result.registration.email}
                        </div>
                        <div className="text-gray-600 text-xs mt-2">
                          {new Date(result.registration.checkedInAt).toLocaleTimeString("fr-FR")} — par {result.registration.checkedInBy}
                        </div>
                      </>
                    )}
                    {resultType === "duplicate" && (
                      <>
                        <div className="text-white text-lg font-bold mb-1">Billet déjà utilisé</div>
                        {result.checkedInAt && (
                          <div className="text-gray-400 text-sm">
                            Check-in le {new Date(result.checkedInAt).toLocaleString("fr-FR")}
                            {result.checkedInBy ? ` — par ${result.checkedInBy}` : ""}
                          </div>
                        )}
                      </>
                    )}
                    {resultType === "error" && (
                      <div className="text-white text-lg font-bold">{result.error || "QR code invalide"}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="w-full max-w-lg">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progression check-in</span>
                <span>{Math.round((stats.checkedIn / stats.total) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-900 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(stats.checkedIn / stats.total) * 100}%`, background: "#00ff9d" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* History sidebar */}
        <div
          className="w-80 border-l shrink-0 p-4 overflow-y-auto"
          style={{ borderColor: "#00ff9d15", background: "#020608" }}
        >
          <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-4">Derniers check-ins</h2>
          {history.length === 0 && (
            <p className="text-gray-700 text-xs text-center py-8">Aucun check-in pour l&apos;instant</p>
          )}
          <div className="space-y-2">
            {history.map((entry, i) => (
              <div
                key={`${entry.id}-${i}`}
                className="rounded-lg p-3"
                style={{ background: historyColors[entry.status] + "10", borderLeft: `3px solid ${historyColors[entry.status]}` }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white text-sm font-bold truncate">{entry.name}</span>
                  <span className="text-gray-600 text-xs shrink-0 ml-2">{entry.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  {entry.ticketType !== "—" && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: historyColors[entry.status] + "20", color: historyColors[entry.status] }}>
                      {entry.ticketType}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: historyColors[entry.status] }}>
                    {entry.status === "ok" ? "✓ OK" : entry.status === "duplicate" ? "⚠ Doublon" : "✗ Erreur"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
