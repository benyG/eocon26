"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface Workshop {
  id: number;
  title: string;
  description: string;
  level: string;
  duration: string;
  maxSeats: number | null;
  instructor: string | null;
}

const levelColors: Record<string, string> = {
  beginner: "#00ff9d", debutant: "#00ff9d",
  intermediate: "#ffaa00", intermediaire: "#ffaa00",
  advanced: "#ff0066", avance: "#ff0066",
};

const levelIcons: Record<string, string> = {
  beginner: "▮▯▯", debutant: "▮▯▯",
  intermediate: "▮▮▯", intermediaire: "▮▮▯",
  advanced: "▮▮▮", avance: "▮▮▮",
};

const levelLabels: Record<string, { fr: string; en: string }> = {
  beginner:     { fr: "Débutant",     en: "Beginner" },
  intermediate: { fr: "Intermédiaire", en: "Intermediate" },
  advanced:     { fr: "Avancé",       en: "Advanced" },
};

export default function Workshops({ t, onOpenModal, lang }: { t: Translations; onOpenModal: (m: string) => void; lang?: "fr" | "en" }) {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/workshops").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setWorkshops(d);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const items = workshops.map(w => ({ ...w, level: w.level.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") }));

  return (
    <section id="workshops" className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; LS WORKSHOPS/
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span className="section-glitch" data-text={t.workshops.title}>{t.workshops.title}</span>
          </h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.workshops.subtitle}</p>
          <p className="text-gray-500 text-sm mt-2">{t.workshops.description}</p>
        </div>

        {loaded && items.length === 0 && (
          <p className="text-center text-gray-600 py-8 font-mono text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            // Ateliers à venir — restez connectés
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-6">
          {items.map((w) => {
            const color = levelColors[w.level] || "#00ff9d";
            const icon = levelIcons[w.level] || "▮▯▯";
            const levelLabel = levelLabels[w.level]?.[lang ?? "fr"] ?? w.level;
            return (
              <div key={w.id} className="cyber-card rounded-xl p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{w.title}</h3>
                    <p className="text-gray-500 text-sm">{w.description}</p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl ml-4 shrink-0"
                    style={{ background: color + "15", border: `1px solid ${color}30` }}
                  >
                    🛠
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {t.workshops.level}:
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color, fontFamily: "'Share Tech Mono', monospace" }}>
                      {icon} {levelLabel}
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
                  {w.maxSeats && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        👥 {w.maxSeats} places
                      </span>
                    </div>
                  )}
                </div>
                {w.instructor && (
                  <p className="text-neon-green/50 text-xs mb-3 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    🎓 {w.instructor}
                  </p>
                )}
                <button
                  onClick={() => onOpenModal("register")}
                  className="w-full py-2 rounded text-xs font-mono uppercase tracking-wider transition-all"
                  style={{ background: "transparent", border: `1px solid ${color}40`, color, fontFamily: "'Share Tech Mono', monospace" }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = color + "20"; (e.target as HTMLButtonElement).style.borderColor = color; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "transparent"; (e.target as HTMLButtonElement).style.borderColor = color + "40"; }}
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
