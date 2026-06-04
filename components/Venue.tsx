"use client";
import { Translations } from "@/lib/i18n";
import { EventSettings } from "@/lib/useEventSettings";

interface VenueProps {
  t: Translations;
  eventSettings?: EventSettings;
}

export default function Venue({ t, eventSettings }: VenueProps) {
  const venue = eventSettings?.event_venue || "Hotel Onomo";
  const city = eventSettings?.event_city || "Douala";
  const country = eventSettings?.event_country || "Cameroun";
  const address = eventSettings?.event_address || t.venue.address;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${venue} ${city}`)}`;

  return (
    <section id="venue" className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; LOCATE EOCON2026
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.venue.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-neon-green/60 text-lg">{t.venue.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Map placeholder */}
          <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <div
              className="w-full h-full cyber-grid-bg flex items-center justify-center"
              style={{ minHeight: "300px", background: "rgba(0,0,0,0.8)" }}
            >
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-16 h-16 rounded-full bg-neon-green/20 border-2 border-neon-green flex items-center justify-center text-3xl animate-pulse">
                    📍
                  </div>
                  <div className="absolute -inset-4 rounded-full border border-neon-green/30 animate-ping" />
                </div>
                <p className="mt-4 text-neon-green font-mono text-sm" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  {venue}
                </p>
                <p className="text-gray-500 text-xs mt-1">{city}, {country}</p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-xs btn-neon px-4 py-2 rounded"
                >
                  Open in Google Maps ↗
                </a>
              </div>
            </div>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-neon-green" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-green" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-neon-green" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-neon-green" />
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">🏨</span>
                <div>
                  <h3 className="text-white font-bold text-lg">{venue} {city}</h3>
                  <p className="text-neon-green/60 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    ★★★★ — {city}, {country}
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{t.venue.description}</p>
              <p className="text-gray-500 text-xs mt-3 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                📍 {address}
              </p>
            </div>

            <div className="cyber-card rounded-xl p-6">
              <h3 className="text-neon-green font-mono text-sm uppercase tracking-wider mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                &gt; {t.venue.getting_there}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span>✈️</span>
                  <span>{t.venue.airport}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span>🚕</span>
                  <span>{t.venue.transport}</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-400">
                  <span>🏨</span>
                  <span>{t.venue.accommodation}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
