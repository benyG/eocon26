"use client";
import { useState, useEffect } from "react";

interface ScoreEntry {
  rank: number;
  name: string;
  score: number;
  solves: number;
  lastSolve?: string;
}

interface ScoresResponse {
  configured: boolean;
  scores: ScoreEntry[];
  error?: string;
}

const glitchStyle = `
@keyframes glitch-shadow {
  0%   { text-shadow: 3px 0 #ff0066, -3px 0 #00ccff; transform: skewX(0deg); }
  5%   { text-shadow: -3px 0 #ff0066, 3px 0 #00ccff; transform: skewX(-1deg); }
  10%  { text-shadow: 3px 1px #ff0066, -3px -1px #00ccff; transform: skewX(0deg); }
  15%  { text-shadow: -2px 0 #ff0066, 2px 0 #00ccff; transform: skewX(0.5deg); }
  20%  { text-shadow: 3px 0 #ff0066, -3px 0 #00ccff; transform: skewX(0deg); }
  85%  { text-shadow: 3px 0 #ff0066, -3px 0 #00ccff; transform: skewX(0deg); }
  90%  { text-shadow: -4px 0 #ff0066, 4px 0 #00ccff; transform: skewX(1deg); }
  92%  { text-shadow: 4px 0 #ff0066, -4px 0 #00ccff; transform: skewX(-0.5deg); }
  95%  { text-shadow: -3px 0 #ff0066, 3px 0 #00ccff; transform: skewX(0deg); }
  100% { text-shadow: 3px 0 #ff0066, -3px 0 #00ccff; transform: skewX(0deg); }
}
@keyframes glitch-flicker {
  0%, 97%, 100% { opacity: 1; }
  98% { opacity: 0.85; }
  99% { opacity: 1; }
}
.glitch {
  animation: glitch-shadow 4s infinite, glitch-flicker 6s infinite;
  font-family: 'Share Tech Mono', monospace;
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
`;

const RANK_COLORS = ["#ffaa00", "#cccccc", "#ff6600"];

export default function CTFScoreboard() {
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchScores = async () => {
    try {
      const res = await fetch("/api/public/ctf/scores");
      if (res.ok) {
        const d = await res.json() as ScoresResponse;
        setData(d);
        setLastUpdate(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!fullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setFullscreen(!fullscreen);
  };

  return (
    <>
      <style>{glitchStyle}</style>
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#fff",
          fontFamily: "'Share Tech Mono', monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scanline effect */}
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            height: "2px",
            background: "rgba(0,255,157,0.1)",
            animation: "scanline 8s linear infinite",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Grid bg */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: "linear-gradient(rgba(0,255,157,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,157,0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <button
              onClick={toggleFullscreen}
              style={{
                position: "absolute", top: 20, right: 20,
                background: "transparent", border: "1px solid #333",
                color: "#666", padding: "6px 12px", borderRadius: 6,
                cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}
            >
              {fullscreen ? "⊡ Quitter" : "⊞ Plein écran"}
            </button>
            <div
              className="glitch"
              style={{
                fontSize: "clamp(2rem, 8vw, 4rem)",
                fontWeight: 900,
                color: "#00ff9d",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              EyesOpen CTF
            </div>
            <div style={{ color: "#00ccff", fontSize: "clamp(0.75rem, 2.5vw, 1.1rem)", letterSpacing: "0.25em", fontWeight: 700, marginBottom: 6 }}>
              EOCON 2026 — 7e Édition
            </div>
            <div style={{ color: "#00ccff", fontSize: "clamp(0.7rem, 2.5vw, 1rem)", letterSpacing: "0.3em", opacity: 0.7 }}>
              ▶ SCOREBOARD LIVE ◀
            </div>
            {lastUpdate && (
              <div style={{ color: "#444", fontSize: 11, marginTop: 8 }}>
                Mis à jour : {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Scoreboard */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ height: 60, background: "#111", borderRadius: 12, marginBottom: 8, opacity: 0.5 + i * 0.1, animation: "pulse 1s infinite" }} />
              ))}
            </div>
          ) : !data?.configured ? (
            <div style={{ textAlign: "center", padding: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
              <div style={{ color: "#666", fontSize: 16 }}>Scoreboard non disponible — CTFd non configuré</div>
            </div>
          ) : data.error ? (
            <div style={{ textAlign: "center", padding: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
              <div style={{ color: "#ff0066", fontSize: 16 }}>{data.error}</div>
            </div>
          ) : data.scores.length === 0 ? (
            <div style={{ textAlign: "center", padding: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏁</div>
              <div style={{ color: "#666", fontSize: 16 }}>Le CTF n&apos;a pas encore commencé — revenez bientôt !</div>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 120px 100px", gap: 16, padding: "8px 16px", color: "#444", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", borderBottom: "1px solid #1a1a1a", marginBottom: 8 }}>
                <span>Rang</span>
                <span>Équipe / Joueur</span>
                <span style={{ textAlign: "right" }}>Score</span>
                <span style={{ textAlign: "right" }}>Solves</span>
              </div>
              {data.scores.map((entry, i) => (
                <div
                  key={entry.rank}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 120px 100px",
                    gap: 16,
                    padding: "16px",
                    marginBottom: 8,
                    borderRadius: 12,
                    background: i === 0 ? "linear-gradient(135deg, #ffaa0015, #0a0a0a)" : i === 1 ? "linear-gradient(135deg, #cccccc08, #0a0a0a)" : i === 2 ? "linear-gradient(135deg, #ff660015, #0a0a0a)" : "#111",
                    border: `1px solid ${i < 3 ? (RANK_COLORS[i] + "40") : "#1a1a1a"}`,
                    transition: "transform 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                      fontSize: i < 3 ? 20 : 16,
                      fontWeight: 900,
                      color: i < 3 ? RANK_COLORS[i] : "#555",
                      fontFamily: "inherit",
                    }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{
                      fontSize: i === 0 ? 20 : 16,
                      fontWeight: i < 3 ? 900 : 400,
                      color: i < 3 ? "#fff" : "#ccc",
                    }}>
                      {entry.name}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <span style={{
                      fontSize: i === 0 ? 22 : 18,
                      fontWeight: 900,
                      color: "#00ff9d",
                      fontFamily: "inherit",
                    }}>
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <span style={{ color: "#00ccff", fontFamily: "inherit" }}>{entry.solves}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: 48, color: "#333", fontSize: 11 }}>
            Données mises à jour toutes les 30s · Powered by CTFd
            <span style={{ marginLeft: 16 }}>|</span>
            <span style={{ marginLeft: 16 }}>EOCON 2026 · Hotel Onomo, Douala</span>
          </div>
        </div>
      </div>
    </>
  );
}
