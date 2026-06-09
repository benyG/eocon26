"use client";
import { Translations } from "@/lib/i18n";

export default function Testimonials({ t }: { t: Translations }) {
  return (
    <section className="py-20 px-4 relative bg-dark-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; GREP "FEEDBACK" ATTENDEES.LOG
          </p>
          <h2 className="text-3xl font-black text-white">
            <span className="section-glitch" data-text={t.testimonials.title}>{t.testimonials.title}</span>
          </h2>
          <div className="section-line mx-auto mt-4" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.testimonials.items.map((item, i) => (
            <div key={i} className="cyber-card rounded-xl p-6 flex flex-col">
              <div className="text-neon-green/40 text-4xl font-serif mb-3 leading-none">"</div>
              <p className="text-gray-300 text-sm flex-1 italic leading-relaxed">{item.quote}</p>
              <div className="mt-4 pt-4 border-t border-neon-green/10">
                <p className="text-neon-green/60 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  — {item.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
