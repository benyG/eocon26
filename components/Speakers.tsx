"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface Speaker {
  id: number;
  name: string;
  role: string;
  company: string;
  country: string;
  photoUrl: string | null;
  isKeynote: boolean;
  talkTitle: string | null;
  talkAbstract: string | null;
}

const pastSpeakers = [
  { name: "Abene Bertin", role: "Sr. Information Security Architect", country: "Canada", initials: "AB" },
  { name: "Chioma Chigozie-Okwum", role: "Director, Spiritan University", country: "Nigeria", initials: "CC" },
  { name: "Simon Nolet", role: "Spécialiste Sécurité Offensive", country: "Canada", initials: "SN" },
  { name: "Bernard Wanyama", role: "President, ISACA Kampala", country: "Uganda", initials: "BW" },
  { name: "Shruti Kalsi", role: "Director at EY-Parthenon", country: "India", initials: "SK" },
  { name: "Tomslin Samme-Nlar", role: "CEO CyberDefenz, Pentester", country: "Cameroon", initials: "TS" },
  { name: "Kevin Monkam", role: "Information Security Architect", country: "France", initials: "KM" },
  { name: "Honoré Tapoko", role: "Sr. Cybersecurity Engineer", country: "United States", initials: "HT" },
  { name: "Blay Abu Safian", role: "CEO of Inveteck Global", country: "Ghana", initials: "BA" },
  { name: "Isaac Noumba", role: "Security Product Manager at F5", country: "United States", initials: "IN" },
  { name: "Sagar Tiwari", role: "Independent OSINT Researcher", country: "Australia", initials: "ST" },
  { name: "Stephen Pullum", role: "Founder Africurity", country: "United States", initials: "SP" },
];

const accentColors = [
  "#00ff9d", "#ff0066", "#0066ff", "#cc00ff",
  "#ff6600", "#00ccff", "#ffff00", "#ff3399",
  "#00ff9d", "#ff0066", "#0066ff", "#cc00ff",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function SpeakerCard({ speaker, color }: { speaker: Speaker; color: string }) {
  return (
    <div className="cyber-card rounded-xl p-5 text-center group cursor-default">
      {speaker.photoUrl ? (
        <img
          src={speaker.photoUrl}
          alt={speaker.name}
          className="w-16 h-16 rounded-full mx-auto mb-3 object-cover transition-transform group-hover:scale-110"
        />
      ) : (
        <div
          className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-black font-bold text-lg transition-transform group-hover:scale-110"
          style={{ background: color, fontFamily: "'Share Tech Mono', monospace" }}
        >
          {initials(speaker.name)}
        </div>
      )}
      <h4 className="font-bold text-white text-sm mb-1">{speaker.name}</h4>
      {speaker.isKeynote && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          KEYNOTE
        </span>
      )}
      <p className="text-gray-500 text-xs mb-1">{speaker.role}{speaker.company ? ` · ${speaker.company}` : ""}</p>
      {speaker.talkTitle && (
        <p className="text-gray-600 text-xs italic mb-2 line-clamp-2">"{speaker.talkTitle}"</p>
      )}
      <span
        className="inline-block text-xs px-2 py-0.5 rounded-full border text-neon-green/70"
        style={{ borderColor: "rgba(0,255,157,0.2)", fontFamily: "'Share Tech Mono', monospace" }}
      >
        {speaker.country}
      </span>
    </div>
  );
}

function PastSpeakerCard({ name, role, country, initials: ini, color }: {
  name: string; role: string; country: string; initials: string; color: string;
}) {
  return (
    <div className="cyber-card rounded-xl p-5 text-center group cursor-default">
      <div
        className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-black font-bold text-lg transition-transform group-hover:scale-110"
        style={{ background: color, fontFamily: "'Share Tech Mono', monospace" }}
      >
        {ini}
      </div>
      <h4 className="font-bold text-white text-sm mb-1">{name}</h4>
      <p className="text-gray-500 text-xs mb-2">{role}</p>
      <span
        className="inline-block text-xs px-2 py-0.5 rounded-full border text-neon-green/70"
        style={{ borderColor: "rgba(0,255,157,0.2)", fontFamily: "'Share Tech Mono', monospace" }}
      >
        {country}
      </span>
    </div>
  );
}

function TBACard() {
  return (
    <div className="cyber-card rounded-xl p-5 text-center border-dashed flex flex-col items-center justify-center h-40">
      <div className="text-3xl mb-2 opacity-50">?</div>
      <div className="text-gray-600 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        TBA
      </div>
    </div>
  );
}

export default function Speakers({ t, onOpenModal }: { t: Translations; onOpenModal: (m: string) => void }) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  useEffect(() => {
    fetch("/api/speakers").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSpeakers(data);
    }).catch(() => {});
  }, []);

  const tbaCount = Math.max(0, 6 - speakers.length);

  return (
    <section id="speakers" className="py-24 px-4 relative bg-dark-800/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; LOADING SPEAKERS.JSON
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">{t.speakers.title}</h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t.speakers.subtitle}</p>
        </div>

        {/* 2026 speakers */}
        <div className="mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {speakers.map((s, i) => (
              <SpeakerCard key={s.id} speaker={s} color={accentColors[i % accentColors.length]} />
            ))}
            {Array.from({ length: tbaCount }).map((_, i) => <TBACard key={`tba-${i}`} />)}
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-4 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              {t.speakers.tba_desc}
            </p>
            <button
              onClick={() => onOpenModal("cfp")}
              className="btn-neon px-6 py-3 rounded text-sm"
            >
              {t.speakers.cta}
            </button>
          </div>
        </div>

        {/* Past speakers */}
        <div>
          <h3 className="text-xl font-bold text-center text-gray-400 mb-8 font-mono uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            — {t.speakers.past_title} —
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pastSpeakers.map((s, i) => (
              <PastSpeakerCard key={s.name} {...s} color={accentColors[i % accentColors.length]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
