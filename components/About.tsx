"use client";
import { Translations } from "@/lib/i18n";

// SVG icons – all rendered in neon-green with a CSS glitch effect
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <rect x="9" y="2" width="6" height="11" rx="3" stroke="#00ff9d" strokeWidth="1.8" fill="none"/>
    <path d="M5 10a7 7 0 0014 0" stroke="#00ff9d" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="12" y1="17" x2="12" y2="21" stroke="#00ff9d" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="21" x2="16" y2="21" stroke="#00ff9d" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const FlagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <line x1="5" y1="2" x2="5" y2="22" stroke="#00ff9d" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M5 3h12l-3 5 3 5H5V3z" stroke="#00ff9d" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
  </svg>
);

const WrenchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a6 6 0 01-7 7l-6 6a2.12 2.12 0 01-3-3l6-6a6 6 0 017-7l-3 3z" stroke="#00ff9d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#00ff9d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <line x1="8" y1="10" x2="16" y2="10" stroke="#00ff9d" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="14" x2="13" y2="14" stroke="#00ff9d" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const pillars = [
  { Icon: MicIcon,    key: "pillar1" as const, accent: "#00ff9d" },
  { Icon: FlagIcon,   key: "pillar2" as const, accent: "#ff0066" },
  { Icon: WrenchIcon, key: "pillar3" as const, accent: "#0066ff" },
  { Icon: ChatIcon,   key: "pillar4" as const, accent: "#cc00ff" },
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

      {/* Glitch keyframes injected once */}
      <style>{`
        @keyframes glitch-shift {
          0%,100% { clip-path: inset(0 0 100% 0); transform: translate(0); }
          10%      { clip-path: inset(10% 0 60% 0); transform: translate(-3px, 1px); }
          20%      { clip-path: inset(50% 0 20% 0); transform: translate(3px, -1px); }
          30%      { clip-path: inset(20% 0 70% 0); transform: translate(-2px, 2px); }
          40%      { clip-path: inset(70% 0 5%  0); transform: translate(2px, -2px); }
          50%      { clip-path: inset(40% 0 40% 0); transform: translate(-3px, 0px); }
          60%      { clip-path: inset(5%  0 80% 0); transform: translate(3px, 1px); }
          70%      { clip-path: inset(80% 0 10% 0); transform: translate(-1px,-1px); }
          80%      { clip-path: inset(30% 0 50% 0); transform: translate(1px, 2px); }
          90%      { clip-path: inset(60% 0 30% 0); transform: translate(-2px,-2px); }
        }
        .glitch-icon { position: relative; display: inline-flex; }
        .glitch-icon::before,
        .glitch-icon::after {
          content: "";
          position: absolute;
          inset: 0;
          background: inherit;
          opacity: 0;
        }
        .glitch-icon:hover::before {
          opacity: 1;
          background: transparent;
          filter: drop-shadow(-3px 0 #ff0066);
          animation: glitch-shift 0.4s steps(1) infinite;
        }
        .glitch-icon:hover::after {
          opacity: 1;
          background: transparent;
          filter: drop-shadow(3px 0 #0066ff);
          animation: glitch-shift 0.4s steps(1) infinite reverse;
        }
        .glitch-icon svg {
          filter: drop-shadow(0 0 8px #00ff9d66);
          transition: filter 0.2s;
        }
        .glitch-icon:hover svg {
          filter: drop-shadow(0 0 14px #00ff9d) drop-shadow(0 0 28px #00ff9d88);
        }
      `}</style>

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
                <div className="flex justify-center mb-4">
                  <span className="glitch-icon">
                    <p.Icon />
                  </span>
                </div>
                <h4 className="font-bold mb-2" style={{ color: p.accent }}>
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
