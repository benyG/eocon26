"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string | null;
  photoUrl: string | null;
  linkedin: string | null;
  twitter: string | null;
}

const accentColors = ["#00ff9d", "#ff0066", "#0066ff", "#cc00ff", "#ff6600", "#00ccff"];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function Team({ t }: { t: Translations }) {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch("/api/team").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setMembers(d);
    }).catch(() => {});
  }, []);

  if (members.length === 0) return null;

  return (
    <section id="team" className="py-24 px-4 relative bg-dark-800/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; WHOAMI --team
          </p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            {(t as any).team?.title ?? "Équipe d'Organisation"}
          </h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {(t as any).team?.subtitle ?? "Les personnes derrière EOCON 2026"}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {members.map((m, i) => (
            <div key={m.id} className="cyber-card rounded-xl p-5 text-center group cursor-default">
              {m.photoUrl ? (
                <img
                  src={m.photoUrl}
                  alt={m.name}
                  className="w-20 h-20 rounded-full mx-auto mb-3 object-cover ring-2 transition-all group-hover:ring-4"
                  style={{ outline: `2px solid ${accentColors[i % accentColors.length]}40` }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-black font-bold text-xl transition-transform group-hover:scale-110"
                  style={{ background: accentColors[i % accentColors.length], fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {initials(m.name)}
                </div>
              )}
              <h4 className="font-bold text-white text-sm mb-1">{m.name}</h4>
              <p className="text-neon-green/70 text-xs mb-2 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{m.role}</p>
              {m.bio && <p className="text-gray-600 text-xs leading-relaxed hidden group-hover:block">{m.bio}</p>}
              <div className="flex justify-center gap-2 mt-2">
                {m.linkedin && (
                  <a href={m.linkedin} target="_blank" rel="noopener noreferrer"
                    className="text-gray-600 hover:text-neon-blue text-xs transition-colors">in</a>
                )}
                {m.twitter && (
                  <a href={m.twitter} target="_blank" rel="noopener noreferrer"
                    className="text-gray-600 hover:text-neon-green text-xs transition-colors">𝕏</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
