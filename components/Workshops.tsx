"use client";
import { Translations } from "@/lib/i18n";

const levelColors: Record<string, string> = {
  Beginner: "#00ff9d",
  Débutant: "#00ff9d",
  Intermediate: "#ffaa00",
  Intermédiaire: "#ffaa00",
  Advanced: "#ff0066",
  Avancé: "#ff0066",
};

const levelIcons: Record<string, string> = {
  Beginner: "▮▯▯",
  Débutant: "▮▯▯",
  Intermediate: "▮▮▯",
  Intermédiaire: "▮▮▯",
  Advanced: "▮▮▮",
  Avancé: "▮▮▮",
};

export default function Workshops({ t, onOpenModal }: { t: Translations; onOpenModal: (m: string) => void }) {
  return (
    <section id="workshops" className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; LS WORKSHOPS/
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.workshops.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.workshops.subtitle}</p>
          <p className="text-gray-500 text-sm mt-2">{t.workshops.description}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {t.workshops.items.map((w, i) => {
            const color = levelColors[w.level] || "#00ff9d";
            const icon = levelIcons[w.level] || "▮▯▯";
            return (
              <div key={i} className="cyber-card rounded-xl p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{w.title}</h3>
                    <p className="text-gray-500 text-sm">{w.desc}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl ml-4 shrink-0"
                    style={{ background: color + "15", border: `1px solid ${color}30` }}>
                    🛠
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {t.workshops.level}:
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color, fontFamily: "'Share Tech Mono', monospace" }}>
                      {icon} {w.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {t.workshops.duration}:
                    </span>
                    <span className="text-xs font-mono" style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>
                      ⏱ {w.duration}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenModal("register")}
                  className="w-full py-2 rounded text-xs font-mono uppercase tracking-wider transition-all"
                  style={{
                    background: "transparent",
                    border: `1px solid ${color}40`,
                    color,
                    fontFamily: "'Share Tech Mono', monospace",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = color + "20";
                    (e.target as HTMLButtonElement).style.borderColor = color;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = "transparent";
                    (e.target as HTMLButtonElement).style.borderColor = color + "40";
                  }}
                >
                  {t.workshops.register}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
