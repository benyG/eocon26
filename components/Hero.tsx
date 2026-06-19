"use client";
import { useState, useEffect } from "react";
import { Translations } from "@/lib/i18n";
import { useEventSettings } from "@/lib/useEventSettings";
import { evaluateCfpWindow } from "@/lib/cfpWindow";

interface HeroProps {
  t: Translations;
  onOpenModal: (modal: string) => void;
}

function Countdown({ targetDate, t }: { targetDate: Date; t: Translations }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const units = [
    { val: timeLeft.days, label: t.hero.days },
    { val: timeLeft.hours, label: t.hero.hours },
    { val: timeLeft.minutes, label: t.hero.minutes },
    { val: timeLeft.seconds, label: t.hero.seconds },
  ];

  return (
    <div className="flex gap-4 justify-center flex-wrap">
      {units.map(({ val, label }) => (
        <div key={label} className="text-center">
          <div
            className="neon-border rounded-lg w-20 h-20 flex items-center justify-center text-3xl font-bold text-neon-green"
            style={{ fontFamily: "'Share Tech Mono', monospace", background: "rgba(0,255,157,0.05)" }}
          >
            {String(val).padStart(2, "0")}
          </div>
          <div className="mt-2 text-xs text-gray-500 uppercase tracking-widest" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Animated particles */
function Particles() {
  const dots = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 8 + Math.random() * 12,
    size: 1 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full bg-neon-green opacity-30"
          style={{
            left: `${d.x}%`,
            bottom: 0,
            width: d.size,
            height: d.size,
            animation: `particleDrift ${d.duration}s ${d.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function Hero({ t, onOpenModal }: HeroProps) {
  const settings = useEventSettings();
  const regWin = evaluateCfpWindow(settings.registration_open_date, settings.registration_close_date);
  const registrationClosed = regWin.hasWindow && !regWin.open;
  const conferenceDate = new Date("2026-11-28T09:00:00");

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden cyber-grid-bg"
    >
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-dark-900/60 to-dark-900/90 pointer-events-none" />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neon-green/5 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-neon-blue/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-neon-pink/5 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      <Particles />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Main glitch title */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black mb-4 leading-none select-none">
          <span
            className="glitch neon-text"
            data-text="EOCON"
            style={{ fontFamily: "'Share Tech Mono', monospace" }}
          >
            EOCON
          </span>
        </h1>

        {/* Edition badge — sits right below the glitch title */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-neon-green/30 rounded-full bg-neon-green/5">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
          <span className="text-neon-green text-xs font-mono uppercase tracking-widest" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {t.hero.edition}
          </span>
        </div>

        <p className="text-neon-green/70 text-lg sm:text-2xl font-mono mb-2 tracking-widest uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          {t.hero.tagline}
        </p>

        <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
          {t.hero.subtitle}
        </p>

        {/* Date & Location */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 text-sm">
          <div className="flex items-center gap-2 text-neon-green/80 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t.hero.date}
          </div>
          <div className="hidden sm:block text-gray-600">|</div>
          <div className="flex items-center gap-2 text-neon-green/80 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t.hero.location}
          </div>
        </div>

        {/* Countdown */}
        <div className="mb-12">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-4 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {t.hero.countdown_label}
          </p>
          <Countdown targetDate={conferenceDate} t={t} />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {registrationClosed ? (
            <span
              className="px-8 py-4 rounded text-sm border-2 border-gray-700 text-gray-600 font-mono cursor-not-allowed"
              title="Inscriptions closes · Registrations closed"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              🔒 {t.hero.cta_register}
            </span>
          ) : (
            <button
              onClick={() => onOpenModal("register")}
              className="btn-neon-solid px-8 py-4 rounded text-sm border-2 border-neon-green"
            >
              {t.hero.cta_register}
            </button>
          )}
          <button
            onClick={() => onOpenModal("cfp")}
            className="btn-neon px-8 py-4 rounded text-sm"
          >
            {t.hero.cta_cfp}
          </button>
        </div>

        {/* Hashtags */}
        <div className="mt-10 flex gap-4 justify-center text-gray-600 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          <span>#EOCON</span>
          <span>#EOCTF</span>
          <span>#SecureTheFuture</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <div className="w-px h-10 bg-gradient-to-b from-neon-green to-transparent" />
        <svg className="w-4 h-4 text-neon-green/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
