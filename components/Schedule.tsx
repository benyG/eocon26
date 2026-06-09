"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface Session {
  id: number;
  date: string | null;
  time: string;
  endTime: string | null;
  title: string;
  type: string;
  speakerName: string | null;
  room: string | null;
  description: string | null;
  sortOrder: number;
  isVisible?: boolean;
}

const EVENT_DATE = "2026-11-28";
const EVENT_LOCATION = "Hotel Onomo, Douala, Cameroun";

const typeColors: Record<string, string> = {
  keynote: "#00ff9d", talk: "#0066ff", workshop: "#ff6600",
  panel: "#cc00ff", break: "#444", logistics: "#666",
};
const typeLabels: Record<string, { en: string; fr: string }> = {
  keynote: { en: "Keynote", fr: "Keynote" },
  talk: { en: "Talk", fr: "Conférence" },
  workshop: { en: "Workshop", fr: "Atelier" },
  panel: { en: "Panel", fr: "Panel" },
  break: { en: "Break", fr: "Pause" },
  logistics: { en: "Logistics", fr: "Logistique" },
};
const DEFAULT_DURATION: Record<string, number> = {
  keynote: 60, talk: 45, workshop: 90, panel: 60, break: 15, logistics: 15,
};

function toICSDateTime(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function endICSDateTime(dateStr: string, timeStr: string, endTimeStr: string | null, type: string): string {
  if (endTimeStr) return toICSDateTime(dateStr, endTimeStr);
  const [h, m] = timeStr.split(":").map(Number);
  const mins = DEFAULT_DURATION[type] ?? 45;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, m + mins, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function buildSessionICS(s: Session): string {
  const date = s.date || EVENT_DATE;
  const uid = `eocon2026-session-${s.id}@eocon.eyesopensecurity.com`;
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const summary = (s.speakerName ? `${s.title} — ${s.speakerName}` : s.title).replace(/,/g, "\\,");
  const location = (s.room ? `${s.room}, ${EVENT_LOCATION}` : EVENT_LOCATION).replace(/,/g, "\\,");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//EOCON 2026//eyesopensecurity.com//FR",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`, `DTSTAMP:${now}`,
    `DTSTART;TZID=Africa/Douala:${toICSDateTime(date, s.time)}`,
    `DTEND;TZID=Africa/Douala:${endICSDateTime(date, s.time, s.endTime, s.type)}`,
    `SUMMARY:EOCON 2026 — ${summary}`,
    `LOCATION:${location}`,
    s.description ? `DESCRIPTION:${s.description.replace(/\n/g, "\\n").replace(/,/g, "\\,")}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function buildFullICS(sessions: Session[]): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const events = sessions.filter(s => s.type !== "break" && s.type !== "logistics").map(s => {
    const date = s.date || EVENT_DATE;
    const summary = (s.speakerName ? `${s.title} — ${s.speakerName}` : s.title).replace(/,/g, "\\,");
    const location = (s.room ? `${s.room}, ${EVENT_LOCATION}` : EVENT_LOCATION).replace(/,/g, "\\,");
    return [
      "BEGIN:VEVENT",
      `UID:eocon2026-s${s.id}@eocon.eyesopensecurity.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Africa/Douala:${toICSDateTime(date, s.time)}`,
      `DTEND;TZID=Africa/Douala:${endICSDateTime(date, s.time, s.endTime, s.type)}`,
      `SUMMARY:EOCON 2026 — ${summary}`,
      `LOCATION:${location}`,
      s.description ? `DESCRIPTION:${s.description.replace(/\n/g, "\\n").replace(/,/g, "\\,")}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//EOCON 2026//eyesopensecurity.com//FR",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:EOCON 2026",
    "X-WR-TIMEZONE:Africa/Douala",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function googleCalUrl(s: Session): string {
  const date = s.date || EVENT_DATE;
  const dtStart = toICSDateTime(date, s.time);
  const dtEnd = endICSDateTime(date, s.time, s.endTime, s.type);
  const text = encodeURIComponent(`EOCON 2026 — ${s.speakerName ? `${s.title} — ${s.speakerName}` : s.title}`);
  const loc = encodeURIComponent(s.room ? `${s.room}, ${EVENT_LOCATION}` : EVENT_LOCATION);
  const desc = encodeURIComponent(s.description || "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dtStart}/${dtEnd}&location=${loc}&details=${desc}`;
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const btnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  background: "transparent", border: "none", color: "#ccc",
  padding: "6px 10px", borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontFamily: "'Share Tech Mono', monospace", textAlign: "left",
};

function CalBtn({ session, lang }: { session: Session; lang: "en" | "fr" }) {
  const [open, setOpen] = useState(false);
  if (session.type === "break" || session.type === "logistics") return null;
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title={lang === "fr" ? "Ajouter à mon calendrier" : "Add to calendar"}
        style={{
          background: "transparent", border: "1px solid #00ff9d30", color: "#00ff9d50",
          borderRadius: 6, padding: "2px 7px", fontSize: 11, cursor: "pointer",
          fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.5,
          transition: "all 0.2s",
        }}
      >📅</button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", top: "110%", right: 0, zIndex: 100,
            background: "#0a0a0f", border: "1px solid #00ff9d40",
            borderRadius: 10, padding: 8, minWidth: 200,
            boxShadow: "0 8px 32px rgba(0,255,157,0.08)",
          }}>
            <p style={{ color: "#00ff9d", fontSize: 9, letterSpacing: 2, margin: "2px 4px 8px", fontFamily: "'Share Tech Mono', monospace" }}>
              {lang === "fr" ? "AJOUTER AU CALENDRIER" : "ADD TO CALENDAR"}
            </p>
            <button style={btnStyle} onClick={() => { window.open(googleCalUrl(session), "_blank"); setOpen(false); }}>
              <span>📅</span> Google Calendar
            </button>
            <button style={btnStyle} onClick={() => { downloadICS(buildSessionICS(session), `eocon2026-${session.id}.ics`); setOpen(false); }}>
              <span>🗓</span>
              <span>
                {lang === "fr" ? "Fichier .ics" : ".ics file"}
                <span style={{ display: "block", color: "#555", fontSize: 10 }}>Outlook · Apple · autres</span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Schedule({ t, lang }: { t: Translations; lang: "en" | "fr" }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/sessions").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSessions(data);
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  if (loaded && sessions.length === 0) {
    return (
      <section id="schedule" className="py-24 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>&gt; CAT PROGRAM.TXT</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span className="section-glitch" data-text={t.schedule.title}>{t.schedule.title}</span>
          </h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-600 text-sm font-mono mt-8" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {lang === "fr" ? "// Programme en cours de construction — revenez bientôt" : "// Programme under construction — check back soon"}
          </p>
        </div>
      </section>
    );
  }

  const countable = sessions.filter(s => s.type !== "break" && s.type !== "logistics");

  return (
    <section id="schedule" className="py-24 px-4 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-neon-green text-xs font-mono uppercase tracking-widest mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>&gt; CAT PROGRAM.TXT</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            <span className="section-glitch" data-text={t.schedule.title}>{t.schedule.title}</span>
          </h2>
          <div className="section-line mx-auto mb-6" />
          <p className="text-gray-400">{t.schedule.subtitle}</p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs text-gray-500" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
              {typeLabels[type]?.[lang] ?? type}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-16 top-0 bottom-0 w-px bg-gradient-to-b from-neon-green/30 via-neon-green/10 to-transparent" />
          <div className="space-y-3">
            {sessions.map(session => {
              const color = typeColors[session.type] ?? "#888";
              const displayTitle = session.speakerName ? `${session.title} — ${session.speakerName}` : session.title;
              return (
                <div key={session.id} className="flex gap-4 group">
                  <div className="w-12 shrink-0 text-right text-xs text-neon-green/60 pt-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    {session.time}
                  </div>
                  <div className="relative flex items-start pt-4">
                    <div className="w-3 h-3 rounded-full border-2 shrink-0 mt-0.5 transition-all group-hover:scale-150"
                      style={{ borderColor: color, background: session.type === "break" || session.type === "logistics" ? "transparent" : color + "40" }} />
                  </div>
                  <div className="flex-1 p-4 rounded-lg mb-1 transition-all group-hover:bg-white/[0.03]"
                    style={{ borderLeft: `3px solid ${color}`, background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{displayTitle}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded opacity-60"
                        style={{ color, background: color + "20", fontFamily: "'Share Tech Mono', monospace" }}>
                        {typeLabels[session.type]?.[lang] ?? session.type}
                      </span>
                      {session.room && (
                        <span className="text-xs text-gray-600" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{session.room}</span>
                      )}
                      <CalBtn session={session} lang={lang} />
                    </div>
                    {session.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{session.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add full programme to calendar */}
        {countable.length > 0 && (
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => downloadICS(buildFullICS(sessions), "eocon2026-programme-complet.ics")}
              className="text-xs border border-neon-green/30 text-neon-green/70 hover:text-neon-green hover:border-neon-green/60 hover:bg-neon-green/5 transition-all px-4 py-2 rounded-lg font-mono"
              style={{ fontFamily: "'Share Tech Mono', monospace" }}
            >
              🗓 {lang === "fr" ? "Télécharger le programme complet (.ics)" : "Download full programme (.ics)"}
            </button>
          </div>
        )}

        <p className="text-center text-gray-600 text-sm mt-8 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          * {lang === "en" ? "Program subject to change" : "Programme susceptible de modification"}
        </p>
      </div>
    </section>
  );
}
