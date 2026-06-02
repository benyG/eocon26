"use client";
import { Translations } from "@/lib/i18n";

export default function CTF({ t, onOpenModal }: { t: Translations; onOpenModal: (m: string) => void }) {
  const steps = [t.ctf.step1, t.ctf.step2, t.ctf.step3, t.ctf.step4];

  return (
    <section id="ctf" className="py-24 px-4 relative bg-dark-800/50 overflow-hidden">
      {/* BG decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-pink/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <p className="text-neon-pink text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; ./launch_ctf.sh
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span style={{ color: "#ff0066" }}>Eyes</span>
            <span style={{ color: "#0066ff" }}>Open</span>
            <span className="text-white">CTF</span>
          </h2>
          <div className="section-line mx-auto mb-6" style={{ background: "linear-gradient(90deg, #ff0066, transparent)" }} />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.ctf.description}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: stats & disciplines */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: t.ctf.disciplines, icon: "🎯" },
                { val: t.ctf.challenges, icon: "🚩" },
                { val: t.ctf.points, icon: "⚡" },
                { val: t.ctf.teams, icon: "👥" },
              ].map((s) => (
                <div key={s.val} className="cyber-card rounded-xl p-4 text-center" style={{ borderColor: "rgba(255,0,102,0.2)" }}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-neon-pink font-bold text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Disciplines */}
            <div className="cyber-card rounded-xl p-6" style={{ borderColor: "rgba(255,0,102,0.15)" }}>
              <h3 className="text-neon-pink font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; Disciplines
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {t.ctf.disc_list.map((d, i) => (
                  <div key={d} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-neon-pink/60 font-mono text-xs" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
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
                border: "2px solid #ff0066",
                color: "#ff0066",
                fontFamily: "'Share Tech Mono', monospace",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = "#ff0066";
                (e.target as HTMLButtonElement).style.color = "#000";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.color = "#ff0066";
              }}
            >
              {t.ctf.cta}
            </button>
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
                      background: "rgba(255,0,102,0.1)",
                      border: "1px solid rgba(255,0,102,0.3)",
                      color: "#ff0066",
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
    </section>
  );
}
