"use client";
import { Translations } from "@/lib/i18n";

interface VolunteerProps {
  t: Translations;
  onOpenModal: () => void;
}

export default function Volunteer({ t, onOpenModal }: VolunteerProps) {
  return (
    <section id="volunteer" className="py-24 px-4 relative bg-dark-800/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; JOIN --volunteer EOCON2026
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.volunteer.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-neon-green/60 text-lg max-w-2xl mx-auto">{t.volunteer.subtitle}</p>
          <p className="text-gray-400 text-sm mt-3 max-w-2xl mx-auto">{t.volunteer.description}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left: perks & roles */}
          <div className="space-y-8">
            {/* Perks */}
            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.volunteer.perks_title}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {t.volunteer.perks.map((p, i) => (
                  <div key={i} className="cyber-card rounded-lg p-3 flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-neon-green">⬡</span>
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div>
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.volunteer.roles_title}
              </h3>
              <div className="space-y-3">
                {t.volunteer.roles.map((r, i) => (
                  <div key={i} className="cyber-card rounded-lg p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green text-xs font-mono shrink-0" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm">{r.title}</h4>
                      <p className="text-gray-500 text-xs mt-1">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col justify-center items-start">
            <h3 className="text-white font-bold text-xl mb-6">{t.volunteer.form.title}</h3>
            <p className="text-gray-400 text-sm mb-8 max-w-sm">{t.volunteer.description}</p>
            <button
              onClick={onOpenModal}
              className="btn-neon-solid px-8 py-3 rounded text-sm border-2 border-neon-green"
            >
              {t.volunteer.form.submit}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
