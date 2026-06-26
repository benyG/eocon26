"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useCheckinAuth } from "@/hooks/useCheckinAuth";

type CheckinResult = {
  success?: boolean;
  registration?: { id: number; fname: string; lname: string; email: string; ticketType: string; checkedInAt: string; checkedInBy: string };
  error?: string;
  checkedInAt?: string;
  checkedInBy?: string;
};

type ScanState = "idle" | "scanning" | "success" | "duplicate" | "error";

export default function QRScannerPage() {
  const { state: authState } = useCheckinAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef<boolean>(false);

  const [state, setState] = useState<ScanState>("idle");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [error, setError] = useState<string>("");
  const [supported, setSupported] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [cameraAvailable, setCameraAvailable] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraAvailable(false);
      const isHttp = typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost";
      setError(isHttp
        ? "La caméra nécessite HTTPS. Accédez à cette page via https://"
        : "Caméra non disponible sur ce navigateur.");
    }
  }, []);

  const resetScan = useCallback(() => {
    setTimeout(() => {
      setState("scanning");
      setResult(null);
      lastScannedRef.current = "";
      cooldownRef.current = false;
    }, 2500);
  }, []);

  const processUrl = useCallback(async (url: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    lastScannedRef.current = url;

    let payload = url;
    const match = url.match(/\/checkin\/(.+)$/);
    if (match) payload = decodeURIComponent(match[1]);

    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, operatorName: "Scanner J-Day" }),
      });
      const json: CheckinResult = await res.json();
      setResult(json);
      if (res.ok && json.success) { setState("success"); setScanCount((c: number) => c + 1); }
      else if (res.status === 409) setState("duplicate");
      else setState("error");
    } catch {
      setState("error");
      setResult({ error: "Erreur réseau" });
    }
    resetScan();
  }, [resetScan]);

  // Attach stream once video element is in the DOM (state = scanning)
  useEffect(() => {
    if (state !== "scanning") return;
    if (!streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [state]);

  const startCamera = useCallback(async () => {
    if (!cameraAvailable) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      // Set state first so the <video> renders, then the effect above attaches the stream
      setState("scanning");
    } catch (e) {
      setError(`Impossible d'accéder à la caméra: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [cameraAvailable]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  useEffect(() => {
    if (state !== "scanning") return;
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const hasBarcodeDetector = "BarcodeDetector" in window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = hasBarcodeDetector ? new (window as any).BarcodeDetector({ formats: ["qr_code"] }) : null;
    if (!hasBarcodeDetector) setSupported(false);
    let active = true;
    const scan = async () => {
      if (!active || state !== "scanning") return;
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      if (detector) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const codes = await detector.detect(canvas) as Array<any>;
          if (codes.length > 0) {
            const raw: string = codes[0].rawValue;
            if (raw && raw !== lastScannedRef.current && !cooldownRef.current) { await processUrl(raw); return; }
          }
        } catch { /* ignore */ }
      }
      rafRef.current = requestAnimationFrame(scan);
    };
    rafRef.current = requestAnimationFrame(scan);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [state, processUrl]);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const cfg = {
    idle:      { bg: "#050a0e", border: "#1a2a3a",   color: "#00ccff", icon: "📷", title: "Scanner QR Check-in" },
    scanning:  { bg: "#050a0e", border: "#00ff9d40", color: "#00ff9d", icon: "",   title: "" },
    success:   { bg: "#001a0d", border: "#00ff9d",   color: "#00ff9d", icon: "✓", title: "CHECK-IN VALIDÉ" },
    duplicate: { bg: "#1a0000", border: "#ff0066",   color: "#ff0066", icon: "🚨", title: "DÉJÀ ENREGISTRÉ" },
    error:     { bg: "#1a0000", border: "#ff0066",   color: "#ff0066", icon: "✗", title: "QR INVALIDE" },
  }[state as ScanState];

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

  return (
    <div style={{ minHeight: "100vh", background: "#050a0e", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", fontFamily: "'Share Tech Mono', monospace" }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ color: "#00ff9d", fontSize: 11, letterSpacing: 4, margin: 0 }}>&gt; EOCON_SCANNER</p>
          <p style={{ color: "#333", fontSize: 10, margin: 0 }}>J-Day · Douala 2026</p>
        </div>
        {scanCount > 0 && <div style={{ background: "#00ff9d15", border: "1px solid #00ff9d30", borderRadius: 20, padding: "4px 12px" }}><span style={{ color: "#00ff9d", fontSize: 12, fontWeight: "bold" }}>{scanCount} check-ins</span></div>}
      </div>

      <div style={{ width: "100%", maxWidth: 480, background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 20, overflow: "hidden", transition: "all 0.3s ease" }}>
        {state === "scanning" && (
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#000" }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 200, height: 200, position: "relative" }}>
                {[["0,0"],["auto,0"],["0,auto"],["auto,auto"]].map(([pos], i) => {
                  const [l, t] = pos.split(",");
                  return <div key={i} style={{ position: "absolute", [l==="0"?"left":"right"]: 0, [t==="0"?"top":"bottom"]: 0, width: 32, height: 32, borderTop: t==="0"?"3px solid #00ff9d":"none", borderBottom: t!=="0"?"3px solid #00ff9d":"none", borderLeft: l==="0"?"3px solid #00ff9d":"none", borderRight: l!=="0"?"3px solid #00ff9d":"none" }} />;
                })}
                <div style={{ position: "absolute", left: 4, right: 4, height: 2, background: "linear-gradient(90deg,transparent,#00ff9d,transparent)", animation: "scanline 1.5s ease-in-out infinite", top: "50%" }} />
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center" }}>
              <span style={{ background: "#000000aa", color: "#00ff9d", fontSize: 11, padding: "4px 12px", borderRadius: 20, letterSpacing: 2 }}>
                {!supported ? "BarcodeDetector non supporté — Chrome requis" : "Pointez vers le QR code"}
              </span>
            </div>
          </div>
        )}

        {state !== "scanning" && (
          <div style={{ padding: 32, textAlign: "center", minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {state === "idle" && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
                <p style={{ color: "#666", fontSize: 12, marginBottom: 24, lineHeight: 1.6 }}>Scannez les QR codes des billets pour valider le check-in automatiquement.</p>
                {error && <div style={{ background: "#1a0000", border: "1px solid #ff006640", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}><p style={{ color: "#ff4444", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{error}</p></div>}
                {cameraAvailable && <button onClick={startCamera} style={{ background: "#00ff9d", color: "#000", border: "none", padding: "14px 32px", borderRadius: 12, fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", letterSpacing: 2 }}>DÉMARRER LE SCANNER</button>}
              </>
            )}
            {(state === "success" || state === "duplicate" || state === "error") && (
              <>
                <div style={{ fontSize: 52, color: cfg.color, marginBottom: 8 }}>{cfg.icon}</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: cfg.color, letterSpacing: 3, marginBottom: 16 }}>{cfg.title}</div>
                {state === "success" && result?.registration && (
                  <>
                    <div style={{ color: "#ffffff", fontSize: 22, fontWeight: "bold", fontFamily: "Georgia, serif", marginBottom: 8 }}>{result.registration.fname} {result.registration.lname}</div>
                    <span style={{ background: "#00ff9d20", color: "#00ff9d", padding: "4px 16px", borderRadius: 20, fontSize: 12 }}>{result.registration.ticketType}</span>
                    <div style={{ color: "#444", fontSize: 11, marginTop: 8 }}>{new Date(result.registration.checkedInAt).toLocaleTimeString("fr-FR")}</div>
                  </>
                )}
                {state === "duplicate" && (
                  <>
                    {result?.checkedInAt && (
                      <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                        Check-in déjà effectué le {new Date(result.checkedInAt).toLocaleString("fr-FR")}{result.checkedInBy ? ` par ${result.checkedInBy}` : ""}
                      </div>
                    )}
                    <div style={{ background: "#2a0000", border: "1px solid #ff006680", borderRadius: 10, padding: "14px 18px", textAlign: "left" }}>
                      <p style={{ color: "#ff4444", fontSize: 13, fontWeight: "bold", margin: "0 0 8px", letterSpacing: 1 }}>⚠ Tentative de fraude ?</p>
                      <p style={{ color: "#cc8888", fontSize: 12, margin: "0 0 6px", lineHeight: 1.6 }}>
                        Une notification a été envoyée à la sécurité.
                      </p>
                      <p style={{ color: "#ffaa44", fontSize: 12, margin: 0, fontWeight: "bold", lineHeight: 1.6 }}>
                        Veuillez notifier également le chef de protocole.
                      </p>
                    </div>
                  </>
                )}
                {state === "error" && <div style={{ color: "#aaa", fontSize: 13 }}>{result?.error || "QR code non reconnu"}</div>}
                <p style={{ color: "#333", fontSize: 11, marginTop: 16 }}>Reprise automatique dans 2.5s…</p>
              </>
            )}
          </div>
        )}

        {state === "scanning" && (
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1a2a1a" }}>
            <span style={{ color: "#333", fontSize: 10, letterSpacing: 1 }}>SCANNER ACTIF</span>
            <button onClick={stopCamera} style={{ background: "transparent", border: "1px solid #333", color: "#666", padding: "6px 16px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Arrêter</button>
          </div>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: 480, marginTop: 12 }}><ManualInput onSubmit={processUrl} /></div>
      <div style={{ marginTop: 20, display: "flex", gap: 16 }}>
        <a href="/checkin" style={{ color: "#333", fontSize: 11, textDecoration: "none" }}>← Liste participants</a>
        <a href="/admin" style={{ color: "#333", fontSize: 11, textDecoration: "none" }}>Admin →</a>
      </div>
      <style>{`@keyframes scanline { 0%,100%{transform:translateY(-50px);opacity:0} 10%,90%{opacity:1} 50%{transform:translateY(50px)} }`}</style>
    </div>
  );
}

function ManualInput({ onSubmit }: { onSubmit: (val: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <form onSubmit={e => { e.preventDefault(); if (val.trim()) { onSubmit(val.trim()); setVal(""); } }} style={{ display: "flex", gap: 8 }}>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Saisie manuelle du payload QR…"
        style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1a2a3a", color: "#aaa", padding: "8px 12px", borderRadius: 8, fontSize: 11, fontFamily: "monospace", outline: "none" }} />
      <button type="submit" style={{ background: "#1a2a3a", border: "1px solid #2a3a4a", color: "#00ccff", padding: "8px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>OK</button>
    </form>
  );
}
