"use client";
import { useState } from "react";
import { Translations } from "@/lib/i18n";

import { EventSettings } from "@/lib/useEventSettings";

export default function Footer({ t, eventSettings }: { t: Translations; eventSettings?: EventSettings }) {
  const [email, setEmail] = useState("");
  const [nlState, setNlState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setNlState("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setNlState(res.ok ? "ok" : "err");
  }

  const socials = [
    { label: "Twitter/X", href: "https://twitter.com/237HACKERS", icon: "𝕏" },
    { label: "LinkedIn", href: "https://linkedin.com/company/eyesopen-association", icon: "in" },
    { label: "Instagram", href: "https://instagram.com/eyesopsi", icon: "◎" },
    { label: "YouTube", href: "https://youtube.com/@eyesopensecurity", icon: "▶" },
  ];

  const links = [
    { label: t.nav.about, href: "#about" },
    { label: t.nav.speakers, href: "#speakers" },
    { label: t.nav.schedule, href: "#schedule" },
    { label: t.nav.ctf, href: "#ctf" },
    { label: t.nav.workshops, href: "#workshops" },
    { label: t.nav.cfp, href: "#cfp" },
    { label: t.nav.volunteer, href: "#volunteer" },
    { label: t.nav.sponsors, href: "#sponsors" },
  ];

  return (
    <footer className="border-t border-neon-green/10 py-16 px-4 bg-black/60">
      <div className="max-w-6xl mx-auto">

        {/* Newsletter banner */}
        <div className="mb-12 p-6 rounded-2xl border border-neon-green/20 bg-neon-green/5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              &gt; NEWSLETTER
            </p>
            <p className="text-white font-bold text-sm">
              {t.footer.newsletter_label}
            </p>
          </div>
          {nlState === "ok" ? (
            <p className="text-neon-green text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              ✓ {t.footer.newsletter_ok}
            </p>
          ) : (
            <form onSubmit={subscribe} className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="cyber-input px-3 py-2 rounded text-sm flex-1 sm:w-56"
              />
              <button
                type="submit"
                disabled={nlState === "loading"}
                className="btn-neon-solid px-4 py-2 rounded text-sm border border-neon-green disabled:opacity-50 whitespace-nowrap"
              >
                {nlState === "loading" ? "..." : t.footer.newsletter_cta}
              </button>
            </form>
          )}
          {nlState === "err" && (
            <p className="text-red-400 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Erreur, réessayez.
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="text-3xl font-black text-neon-green mb-2 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              &gt; EOCON_26
            </div>
            <p className="text-gray-500 text-sm mb-4">{t.footer.tagline}</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              {t.footer.org} · eyesopensecurity.com<br />
              contact@eyesopensecurity.com<br />
              +1 581-849-3838
            </p>
            <div className="flex gap-3 mt-4">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded border border-neon-green/20 flex items-center justify-center text-gray-500 hover:text-neon-green hover:border-neon-green/50 transition-all text-sm font-mono"
                  aria-label={s.label}
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-neon-green text-xs font-mono uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {t.footer.links}
            </h4>
            <ul className="space-y-2">
              {links.map(l => (
                <li key={l.href}>
                  <a href={l.href} className="text-gray-500 hover:text-neon-green text-sm transition-colors font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    &gt; {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact/Event info */}
          <div>
            <h4 className="text-neon-green text-xs font-mono uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Event Info
            </h4>
            <div className="space-y-3 text-sm text-gray-500 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              <p>📅 {eventSettings?.event_date_display_fr || "28 Nov 2026"}</p>
              <p>📍 {eventSettings?.event_venue || "Hotel Onomo"}<br />&nbsp;&nbsp;&nbsp;&nbsp;{eventSettings?.event_city || "Douala"}, {eventSettings?.event_country || "Cameroun"}</p>
              <p>🌐 EN / FR</p>
              <p>#EOCON #EOCTF</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-neon-green/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-700 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            © 2026 {t.footer.org}. {t.footer.rights}
          </p>
          <p className="text-gray-700 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            Designed with ❤ for Africa's cybersecurity community
          </p>
        </div>
      </div>
    </footer>
  );
}
