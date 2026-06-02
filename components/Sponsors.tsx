"use client";
import { Translations } from "@/lib/i18n";

export default function Sponsors({ t }: { t: Translations }) {
  const tiers = t.sponsors.tiers;

  return (
    <section id="sponsors" className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; CAT SPONSORS.MD
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.sponsors.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.sponsors.subtitle}</p>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl mx-auto">{t.sponsors.description}</p>
        </div>

        {/* Sponsor placeholder logos */}
        <div className="mb-16 p-8 rounded-2xl border border-dashed border-neon-green/10 text-center">
          <p className="text-gray-600 text-sm font-mono mb-6" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {/* sponsor logos will appear here */}
            [ SPONSOR LOGOS COMING SOON ]
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-32 h-16 rounded border border-dashed border-gray-800 flex items-center justify-center"
              >
                <span className="text-gray-700 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>SPONSOR</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className="cyber-card rounded-xl p-6 flex flex-col"
              style={{
                borderColor: tier.color + "40",
                background: i === 0 ? "rgba(229,228,226,0.03)" : undefined,
              }}
            >
              <div
                className="text-sm font-black uppercase tracking-widest mb-4 font-mono"
                style={{ color: tier.color, fontFamily: "'Share Tech Mono', monospace" }}
              >
                ◆ {tier.name}
              </div>
              <ul className="space-y-2 flex-1">
                {tier.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-400">
                    <span style={{ color: tier.color }} className="mt-0.5 shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <a
            href="mailto:sponsors@eyesopensecurity.com"
            className="inline-block btn-neon-solid px-8 py-4 rounded text-sm border-2 border-neon-green"
          >
            {t.sponsors.cta}
          </a>
          <p className="text-gray-600 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {t.sponsors.contact}
          </p>
        </div>
      </div>
    </section>
  );
}
