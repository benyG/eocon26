"use client";
import { Translations } from "@/lib/i18n";

const typeColors: Record<string, string> = {
  keynote: "#00ff9d",
  talk: "#0066ff",
  workshop: "#ff6600",
  panel: "#cc00ff",
  break: "#444",
  logistics: "#666",
};

const typeLabels: Record<string, { en: string; fr: string }> = {
  keynote: { en: "Keynote", fr: "Keynote" },
  talk: { en: "Talk", fr: "Conférence" },
  workshop: { en: "Workshop", fr: "Atelier" },
  panel: { en: "Panel", fr: "Panel" },
  break: { en: "Break", fr: "Pause" },
  logistics: { en: "Logistics", fr: "Logistique" },
};

export default function Schedule({ t, lang }: { t: Translations; lang: "en" | "fr" }) {
  const items = t.schedule.items;

  return (
    <section id="schedule" className="py-24 px-4 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; CAT PROGRAM.TXT
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.schedule.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400">{t.schedule.subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs text-gray-500" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
              {typeLabels[type][lang]}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-neon-green/30 via-neon-green/10 to-transparent" />

          <div className="space-y-3">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 group"
              >
                {/* Time */}
                <div
                  className="w-12 shrink-0 text-right text-xs text-neon-green/60 pt-4"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {item.time}
                </div>

                {/* Dot */}
                <div className="relative flex items-start pt-4">
                  <div
                    className="w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 transition-all group-hover:scale-150"
                    style={{
                      borderColor: typeColors[item.type],
                      background: item.type === "break" || item.type === "logistics" ? "transparent" : typeColors[item.type] + "40",
                    }}
                  />
                </div>

                {/* Content */}
                <div
                  className={`flex-1 p-4 rounded-lg mb-1 transition-all group-hover:bg-white/[0.03] type-${item.type}`}
                  style={{
                    borderLeft: `3px solid ${typeColors[item.type]}`,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{item.title}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded opacity-60"
                      style={{
                        color: typeColors[item.type],
                        background: typeColors[item.type] + "20",
                        fontFamily: "'Share Tech Mono', monospace",
                      }}
                    >
                      {typeLabels[item.type][lang]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-8 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          * {lang === "en" ? "Program subject to change" : "Programme susceptible de modification"}
        </p>
      </div>
    </section>
  );
}
