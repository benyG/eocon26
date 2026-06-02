"use client";
import { useState, useEffect } from "react";
import { Lang, Translations } from "@/lib/i18n";

interface NavbarProps {
  t: Translations;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  onOpenModal: (modal: string) => void;
}

export default function Navbar({ t, lang, onLangChange, onOpenModal }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: t.nav.about, href: "#about" },
    { label: t.nav.speakers, href: "#speakers" },
    { label: t.nav.schedule, href: "#schedule" },
    { label: t.nav.ctf, href: "#ctf" },
    { label: t.nav.workshops, href: "#workshops" },
    { label: t.nav.sponsors, href: "#sponsors" },
    { label: t.nav.cfp, href: "#cfp" },
    { label: t.nav.volunteer, href: "#volunteer" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-b border-neon-green/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2 group">
          <span className="font-mono font-bold text-xl text-neon-green group-hover:animate-glitch" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; EOCON_26
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-gray-400 hover:text-neon-green transition-colors duration-200 font-mono uppercase tracking-wider"
              style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem" }}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Lang toggle */}
          <button
            onClick={() => onLangChange(lang === "en" ? "fr" : "en")}
            className="text-xs font-mono border border-neon-green/40 text-neon-green px-2 py-1 rounded hover:bg-neon-green/10 transition-colors"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            {lang === "en" ? "FR" : "EN"}
          </button>

          <button
            onClick={() => onOpenModal("register")}
            className="hidden sm:block btn-neon text-xs px-4 py-2 rounded"
          >
            {t.nav.register}
          </button>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-neon-green p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-black/95 border-t border-neon-green/20 px-4 py-4 space-y-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-gray-400 hover:text-neon-green transition-colors font-mono"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              &gt; {item.label}
            </a>
          ))}
          <button
            onClick={() => { setMenuOpen(false); onOpenModal("register"); }}
            className="w-full btn-neon text-sm px-4 py-2 rounded mt-4"
          >
            {t.nav.register}
          </button>
        </div>
      )}
    </nav>
  );
}
