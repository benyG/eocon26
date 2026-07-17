"use client";
import { useState } from "react";
import { Translations } from "@/lib/i18n";

interface CTFSettings {
  tagline?: string;
  prizeMain?: string;
  prizeDetails?: string;
}

export default function CTF({ t, onOpenModal, ctfSettings = {} }: { t: Translations; onOpenModal: (m: string) => void; ctfSettings?: CTFSettings }) {
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const steps = [t.ctf.step1, t.ctf.step2, t.ctf.step3, t.ctf.step4];

  return (
    <section id="ctf" className="py-24 px-4 relative bg-dark-800/50 overflow-hidden">
      <style>{`
        @keyframes ctf-glitch {
          0%, 95%, 100% { clip-path: none; transform: none; }
          96% { clip-path: inset(20% 0 50% 0); transform: translateX(-4px); }
          97% { clip-path: inset(60% 0 10% 0); transform: translateX(4px); }
          98% { clip-path: inset(40% 0 30% 0); transform: translateX(-2px); }
          99% { clip-path: inset(10% 0 70% 0); transform: translateX(2px); }
        }
        @keyframes ctf-glitch2 {
          0%, 92%, 100% { clip-path: none; transform: none; opacity: 0; }
          93% { clip-path: inset(30% 0 40% 0); transform: translateX(6px); opacity: 0.7; }
          94% { clip-path: inset(70% 0 5% 0); transform: translateX(-6px); opacity: 0.7; }
          95% { opacity: 0; }
        }
        .ctf-glitch-wrap { position: relative; display: inline-block; }
        .ctf-glitch-wrap::before {
          content: attr(data-text);
          position: absolute; inset: 0;
          background: linear-gradient(90deg, #00ff9d, #0066ff, #fff);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: ctf-glitch 4s infinite;
          pointer-events: none;
        }
        .ctf-glitch-wrap::after {
          content: attr(data-text);
          position: absolute; inset: 0;
          color: #ff0066;
          animation: ctf-glitch2 4s infinite;
          pointer-events: none;
        }
      `}</style>

      {/* BG decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(0,255,157,0.05)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; ./launch_ctf.sh
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span className="ctf-glitch-wrap" data-text="EyesOpenCTF">
              EyesOpenCTF
            </span>
          </h2>
          <div className="section-line mx-auto mb-6" style={{ background: "linear-gradient(90deg, #00ff9d, transparent)" }} />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{ctfSettings.tagline || t.ctf.description}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: stats & disciplines */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: t.ctf.disciplines, icon: "🎯" },
                { val: t.ctf.challenges, icon: "🚩" },
                { val: t.ctf.teams, icon: "👥" },
              ].map((s) => (
                <div key={s.val} className="cyber-card rounded-xl p-4 text-center" style={{ borderColor: "rgba(0,255,157,0.2)" }}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-bold text-sm font-mono" style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>
                    {s.val}
                  </div>
                </div>
              ))}

              {/* CTF Prize card */}
              <div className="cyber-card rounded-xl p-4 text-center" style={{ borderColor: "rgba(255,215,0,0.3)", background: "rgba(255,215,0,0.04)" }}>
                <div className="text-2xl mb-1">🏆</div>
                <div className="font-bold text-sm font-mono" style={{ color: "#ffd700", fontFamily: "'Share Tech Mono', monospace" }}>
                  {ctfSettings.prizeMain || t.ctf.points}
                </div>
                {ctfSettings.prizeDetails && (
                  <button
                    onClick={() => setShowPrizeModal(true)}
                    className="text-xs mt-1 underline underline-offset-2 transition-colors"
                    style={{ color: "#ffd70099", fontFamily: "'Share Tech Mono', monospace" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ffd700")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#ffd70099")}
                  >
                    plus de détails
                  </button>
                )}
              </div>
            </div>

            {/* Disciplines */}
            <div className="cyber-card rounded-xl p-6" style={{ borderColor: "rgba(0,255,157,0.15)" }}>
              <h3 className="font-mono text-sm uppercase tracking-wider mb-4" style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; Disciplines
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {t.ctf.disc_list.map((d, i) => (
                  <div key={d} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="font-mono text-xs" style={{ color: "rgba(0,255,157,0.5)", fontFamily: "'Share Tech Mono', monospace" }}>
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onOpenModal("register")}
              className="w-full py-4 rounded font-mono font-bold uppercase tracking-wider text-sm transition-all"
              style={{
                background: "transparent",
                border: "2px solid #00ff9d",
                color: "#00ff9d",
                fontFamily: "'Share Tech Mono', monospace",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#00ff9d";
                (e.target as HTMLButtonElement).style.color = "#000";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.color = "#00ff9d";
              }}
            >
              {t.ctf.cta}
            </button>

            {/* Mission Briefing — in-universe lore portal */}
            <a
              href="/ctf-briefing.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded p-4 transition-all"
              style={{ border: "1px solid rgba(0,204,255,0.25)", background: "rgba(0,204,255,0.04)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,204,255,0.10)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,204,255,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,204,255,0.04)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,204,255,0.25)"; }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl" aria-hidden>🛰️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: "#00ccff", fontFamily: "'Share Tech Mono', monospace" }}>
                    {t.ctf.briefing}
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t.ctf.briefing_hint}</p>
                </div>
              </div>
            </a>
          </div>

          {/* Right: how it works */}
          <div>
            <h3 className="text-white font-bold text-xl mb-6">{t.ctf.how_title}</h3>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all group-hover:scale-110"
                    style={{
                      background: "rgba(0,255,157,0.1)",
                      border: "1px solid rgba(0,255,157,0.3)",
                      color: "#00ff9d",
                      fontFamily: "'Share Tech Mono', monospace",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className="text-gray-300 text-sm">{step}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Terminal decoration */}
            <div className="mt-8 rounded-xl overflow-hidden border border-neon-green/10">
              <div className="bg-dark-700 px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-gray-600 text-xs ml-2 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  ctf@eocon2026:~
                </span>
              </div>
              <div className="bg-black/80 p-4 font-mono text-sm space-y-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                <p><span className="text-neon-green">$</span> <span className="text-gray-300">./connect_arena.sh</span></p>
                <p className="text-gray-500">Connecting to EyesOpen CTF arena...</p>
                <p className="text-neon-green">✓ Connection established</p>
                <p className="text-gray-500">Loading 40 challenges...</p>
                <p><span className="text-neon-pink">!</span> <span className="text-gray-300">48 hours on the clock</span></p>
                <p className="text-neon-green cursor">Good luck, hacker</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prize details modal */}
      {showPrizeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="max-w-md w-full rounded-2xl p-6"
            style={{ background: "#0a0a0f", border: "1px solid rgba(255,215,0,0.3)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">🏆 Gains CTF</h3>
              <button onClick={() => setShowPrizeModal(false)} className="text-gray-500 hover:text-white text-2xl leading-none transition-colors">×</button>
            </div>
            <div
              className="text-gray-300 text-sm whitespace-pre-line leading-relaxed"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              {ctfSettings.prizeDetails}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
