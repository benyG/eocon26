"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface Speaker {
  id: number;
  name: string;
  title: string;
  role?: string;
  company: string;
  country: string;
  bio: string;
  photoUrl: string | null;
  isKeynote: boolean;
  talkTitle: string | null;
  talkAbstract: string | null;
  talkFormat: string | null;
  twitter: string | null;
  linkedin: string | null;
}

interface PastSpeaker {
  id: number;
  name: string;
  role: string;
  company: string | null;
  country: string | null;
  edition: string | null;
  photoUrl: string | null;
}

const FALLBACK_PAST: PastSpeaker[] = [
  { id: -1, name: "Abene Bertin", role: "Sr. Information Security Architect", company: null, country: "Canada", edition: null, photoUrl: null },
  { id: -2, name: "Chioma Chigozie-Okwum", role: "Director, Spiritan University", company: null, country: "Nigeria", edition: null, photoUrl: null },
  { id: -3, name: "Simon Nolet", role: "Spécialiste Sécurité Offensive", company: null, country: "Canada", edition: null, photoUrl: null },
  { id: -4, name: "Bernard Wanyama", role: "President, ISACA Kampala", company: null, country: "Uganda", edition: null, photoUrl: null },
  { id: -5, name: "Shruti Kalsi", role: "Director at EY-Parthenon", company: null, country: "India", edition: null, photoUrl: null },
  { id: -6, name: "Tomslin Samme-Nlar", role: "CEO CyberDefenz, Pentester", company: null, country: "Cameroon", edition: null, photoUrl: null },
  { id: -7, name: "Kevin Monkam", role: "Information Security Architect", company: null, country: "France", edition: null, photoUrl: null },
  { id: -8, name: "Honoré Tapoko", role: "Sr. Cybersecurity Engineer", company: null, country: "United States", edition: null, photoUrl: null },
  { id: -9, name: "Blay Abu Safian", role: "CEO of Inveteck Global", company: null, country: "Ghana", edition: null, photoUrl: null },
  { id: -10, name: "Isaac Noumba", role: "Security Product Manager at F5", company: null, country: "United States", edition: null, photoUrl: null },
  { id: -11, name: "Sagar Tiwari", role: "Independent OSINT Researcher", company: null, country: "Australia", edition: null, photoUrl: null },
  { id: -12, name: "Stephen Pullum", role: "Founder Africurity", company: null, country: "United States", edition: null, photoUrl: null },
];

const accentColors = [
  "#00ff9d", "#ff0066", "#0066ff", "#cc00ff",
  "#ff6600", "#00ccff", "#ffff00", "#ff3399",
  "#00ff9d", "#ff0066", "#0066ff", "#cc00ff",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function SpeakerModal({ speaker, color, onClose }: { speaker: Speaker; color: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const role = speaker.title || speaker.role || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="cyber-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ border: `1px solid ${color}40` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 flex gap-5 items-start" style={{ borderBottom: `1px solid ${color}20` }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
          <div className="shrink-0">
            {speaker.photoUrl ? (
              <img
                src={speaker.photoUrl}
                alt={speaker.name}
                className="w-24 h-24 rounded-full object-cover border-2"
                style={{ borderColor: color }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-black font-bold text-2xl border-2"
                style={{ background: color, borderColor: color, fontFamily: "'Share Tech Mono', monospace" }}
              >
                {initials(speaker.name)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {speaker.isKeynote && (
                <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: `${color}20`, color }}>
                  KEYNOTE
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-white mb-1">{speaker.name}</h3>
            <p className="text-sm mb-2" style={{ color }}>{role}{speaker.company ? ` · ${speaker.company}` : ""}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full border text-gray-400" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                🌍 {speaker.country}
              </span>
              {speaker.twitter && (
                <a
                  href={speaker.twitter.startsWith("http") ? speaker.twitter : `https://twitter.com/${speaker.twitter.replace("@", "")}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{ color: "#1da1f2" }}
                >
                  𝕏 {speaker.twitter.startsWith("@") ? speaker.twitter : `@${speaker.twitter}`}
                </a>
              )}
              {speaker.linkedin && (
                <a
                  href={speaker.linkedin.startsWith("http") ? speaker.linkedin : `https://linkedin.com/in/${speaker.linkedin}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{ color: "#0077b5" }}
                >
                  in LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {speaker.bio && (
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${color}20` }}>
            <h4 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color }}>Bio</h4>
            <p className="text-gray-400 text-sm leading-relaxed">{speaker.bio}</p>
          </div>
        )}

        {/* Talk */}
        {speaker.talkTitle && (
          <div className="px-6 py-4" style={{ borderBottom: `1px solid ${color}20` }}>
            <h4 className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color }}>Talk</h4>
            <p className="text-white font-bold mb-2">"{speaker.talkTitle}"</p>
            {speaker.talkFormat && (
              <span className="text-xs px-2 py-0.5 rounded-full border mb-3 inline-block" style={{ borderColor: `${color}40`, color }}>
                {speaker.talkFormat}
              </span>
            )}
            {speaker.talkAbstract && (
              <p className="text-gray-400 text-sm leading-relaxed mt-2">{speaker.talkAbstract}</p>
            )}
          </div>
        )}

        {/* Calendar card */}
        <div className="px-6 py-4">
          <h4 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color }}>📅 EOCON 2026</h4>
          <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
            <div className="text-center shrink-0 rounded-lg p-3" style={{ background: `${color}15`, minWidth: 64 }}>
              <div className="text-xs font-mono uppercase" style={{ color }}>NOV</div>
              <div className="text-3xl font-black text-white leading-none">28</div>
              <div className="text-xs font-mono text-gray-500">2026</div>
            </div>
            <div>
              <p className="text-white font-bold text-sm">EOCON 2026 — 7ème Édition</p>
              <p className="text-gray-400 text-xs mt-0.5">📍 Hotel Onomo · Douala, Cameroon</p>
              <p className="text-gray-500 text-xs mt-0.5">Conférence internationale en cybersécurité</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeakerCard({ speaker, color, lang }: { speaker: Speaker; color: string; lang?: string }) {
  const [showModal, setShowModal] = useState(false);
  const role = speaker.title || speaker.role || "";

  return (
    <>
      <div
        className="cyber-card rounded-xl p-5 text-center group cursor-pointer relative overflow-hidden"
        onClick={() => setShowModal(true)}
      >
        {/* Photo agrandie */}
        {speaker.photoUrl ? (
          <img
            src={speaker.photoUrl}
            alt={speaker.name}
            className="w-28 h-28 rounded-full mx-auto mb-3 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-28 h-28 rounded-full mx-auto mb-3 flex items-center justify-center text-black font-bold text-2xl transition-transform duration-300 group-hover:scale-105"
            style={{ background: color, fontFamily: "'Share Tech Mono', monospace" }}
          >
            {initials(speaker.name)}
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
          style={{ background: "rgba(3,4,8,0.88)", backdropFilter: "blur(4px)" }}
        >
          <p className="text-white font-black text-sm px-3 text-center leading-tight">{speaker.name}</p>
          <p className="text-xs px-3 text-center" style={{ color }}>{role}</p>
          <div className="flex gap-2 mt-1 flex-wrap justify-center px-2">
            {speaker.twitter && (
              <a
                href={speaker.twitter.startsWith("http") ? speaker.twitter : `https://twitter.com/${speaker.twitter.replace("@", "")}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "#1da1f220", color: "#1da1f2" }}
              >
                𝕏 Twitter
              </a>
            )}
            {speaker.linkedin && (
              <a
                href={speaker.linkedin.startsWith("http") ? speaker.linkedin : `https://linkedin.com/in/${speaker.linkedin}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "#0077b520", color: "#0077b5" }}
              >
                in LinkedIn
              </a>
            )}
          </div>
          <button
            className="mt-2 text-xs px-4 py-1.5 rounded font-bold"
            style={{ background: color, color: "#000", fontFamily: "'Share Tech Mono', monospace" }}
          >
            More infos →
          </button>
        </div>

        {/* Info visible par défaut */}
        <h4 className="font-bold text-white text-sm mb-1">{speaker.name}</h4>
        {speaker.isKeynote && (
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            KEYNOTE
          </span>
        )}
        <p className="text-gray-500 text-xs mb-1">{role}{speaker.company ? ` · ${speaker.company}` : ""}</p>
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

      {showModal && (
        <SpeakerModal speaker={speaker} color={color} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function PastSpeakerCard({ name, role, country, initials: ini, color, photoUrl, edition }: {
  name: string; role: string; country: string; initials: string; color: string;
  photoUrl?: string | null; edition?: string | null;
}) {
  return (
    <div className="cyber-card rounded-xl p-5 text-center group cursor-default">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="w-20 h-20 rounded-full mx-auto mb-3 object-cover transition-transform group-hover:scale-110"
        />
      ) : (
        <div
          className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-black font-bold text-xl transition-transform group-hover:scale-110"
          style={{ background: color, fontFamily: "'Share Tech Mono', monospace" }}
        >
          {ini}
        </div>
      )}
      <h4 className="font-bold text-white text-sm mb-1">{name}</h4>
      <p className="text-gray-500 text-xs mb-2">{role}</p>
      <span
        className="inline-block text-xs px-2 py-0.5 rounded-full border text-neon-green/70"
        style={{ borderColor: "rgba(0,255,157,0.2)", fontFamily: "'Share Tech Mono', monospace" }}
      >
        {country}
      </span>
      {edition && (
        <p className="text-gray-700 text-xs mt-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          EOCON {edition}
        </p>
      )}
    </div>
  );
}

function TBACard() {
  return (
    <div className="cyber-card rounded-xl p-5 text-center border-dashed flex flex-col items-center justify-center h-48">
      <div className="text-3xl mb-2 opacity-50">?</div>
      <div className="text-gray-600 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        TBA
      </div>
    </div>
  );
}

export default function Speakers({ t, onOpenModal }: { t: Translations; onOpenModal: (m: string) => void }) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [pastSpeakers, setPastSpeakers] = useState<PastSpeaker[]>([]);

  useEffect(() => {
    fetch("/api/speakers").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSpeakers(data);
    }).catch(() => {});
    fetch("/api/past-speakers").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setPastSpeakers(data);
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
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span className="section-glitch" data-text={t.speakers.title}>{t.speakers.title}</span>
          </h2>
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
              className="btn-neon-solid px-6 py-3 rounded text-sm"
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
              <PastSpeakerCard
                key={s.id}
                name={s.name}
                role={s.role}
                country={s.country || ""}
                initials={initials(s.name)}
                color={accentColors[i % accentColors.length]}
                photoUrl={s.photoUrl}
                edition={s.edition}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
