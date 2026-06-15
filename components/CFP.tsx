"use client";
import { Translations } from "@/lib/i18n";

export default function CFP({ t, onOpenModal }: { t: Translations; onOpenModal: () => void }) {
  const formats = [t.cfp.format1, t.cfp.format2, t.cfp.format3, t.cfp.format4];

  return (
    <section id="cfp" className="py-24 px-4 relative bg-dark-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; OPEN CFP.FORM
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span className="section-glitch" data-text={t.cfp.title}>{t.cfp.title}</span>
          </h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-neon-green/60 text-lg max-w-2xl mx-auto">{t.cfp.subtitle}</p>
          <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto">{t.cfp.description}</p>
          <div className="mt-4 inline-block px-4 py-1.5 bg-neon-green/10 border border-neon-green/30 rounded-full text-neon-green text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            ⏰ {t.cfp.deadline}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Topics */}
          <div>
            <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              &gt; {t.cfp.topics_title}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {t.cfp.topics.map((topic, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-400 group hover:text-gray-200 transition-colors">
                  <span className="text-neon-green/40 font-mono text-xs w-6 shrink-0" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="w-px h-4 bg-neon-green/20 group-hover:bg-neon-green/60 transition-colors" />
                  {topic}
                </div>
              ))}
            </div>
          </div>

          {/* Formats + CTA */}
          <div className="space-y-8">
            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.cfp.formats_title}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {formats.map((label) => (
                  <div key={label} className="cyber-card rounded-lg p-3 text-sm text-gray-400 text-center">
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="cyber-card rounded-2xl p-8 text-center flex flex-col items-center gap-4">
              <div className="text-5xl">🎤</div>
              <h3 className="text-white font-bold text-xl">{t.cfp.form.title}</h3>
              <button
                onClick={onOpenModal}
                className="btn-neon-solid px-8 py-3 rounded text-sm border-2 border-neon-green"
              >
                {t.cfp.form.submit}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
