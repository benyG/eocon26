"use client";
import { Translations } from "@/lib/i18n";

const pillars = [
  { icon: "🎤", key: "pillar1" as const, accent: "#00ff9d" },
  { icon: "🚩", key: "pillar2" as const, accent: "#ff0066" },
  { icon: "🛠", key: "pillar3" as const, accent: "#0066ff" },
  { icon: "💬", key: "pillar4" as const, accent: "#cc00ff" },
];

export default function About({ t }: { t: Translations }) {
  const stats = [
    { num: t.about.stat1_num, label: t.about.stat1_label },
    { num: t.about.stat2_num, label: t.about.stat2_label },
    { num: t.about.stat3_num, label: t.about.stat3_label },
    { num: t.about.stat4_num, label: t.about.stat4_label },
  ];

  return (
    <section id="about" className="py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-800/50 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; INIT ABOUT.SH
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.about.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-neon-green/60 text-lg max-w-2xl mx-auto">{t.about.subtitle}</p>
        </div>

        {/* Description */}
        <div className="grid md:grid-cols-2 gap-12 mb-16 items-center">
          <div className="space-y-4">
            <p className="text-gray-300 leading-relaxed text-lg">{t.about.description}</p>
            <p className="text-gray-400 leading-relaxed">{t.about.p2}</p>
            <div className="flex items-center gap-2 mt-6">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
              <span className="text-neon-green text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                #EOCON #EOCTF #SecureTheFuture
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="cyber-card rounded-xl p-6 text-center">
                <div
                  className="text-3xl font-black mb-1"
                  style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace", textShadow: "0 0 20px #00ff9d" }}
                >
                  {s.num}
                </div>
                <div className="text-gray-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pillars */}
        <div className="text-center mb-10">
          <h3 className="text-xl font-bold text-neon-green/80 font-mono uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {t.about.pillars}
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map((p) => {
            const titleKey = `${p.key}` as "pillar1" | "pillar2" | "pillar3" | "pillar4";
            const descKey = `${p.key}_desc` as "pillar1_desc" | "pillar2_desc" | "pillar3_desc" | "pillar4_desc";
            return (
              <div key={p.key} className="cyber-card rounded-xl p-6 text-center group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {p.icon}
                </div>
                <h4 className="font-bold text-white mb-2" style={{ color: p.accent }}>
                  {t.about[titleKey as keyof typeof t.about] as string}
                </h4>
                <p className="text-gray-500 text-sm">
                  {t.about[descKey as keyof typeof t.about] as string}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
