// Parser for docs/roadmap-equipe.md → steering tasks + meetings.
// Designed to never throw: any unparsable line yields a task with dueDate = null.

export interface ParsedTask {
  title: string;
  phase: number;
  pole: string;
  subTeam: string | null;
  dueDate: Date | null;
  isMilestone: boolean;
  priority: string; // low | medium | high | critical
  status: string;
  sortOrder: number;
}

export interface ParsedMeeting {
  title: string;
  type: string; // collective | subteam
  subTeam: string | null;
  scheduledAt: Date;
  agenda: string | null;
  location: string | null;
}

// 18 roles → clean name + sub-team mapping (see plan).
const POLES: Record<number, { name: string; subTeam: string }> = {
  1: { name: "Coordo Global", subTeam: "Général" },
  2: { name: "Resp. Partenaire/Sponsor", subTeam: "Sponsors" },
  3: { name: "Resp. Programme & Speaker", subTeam: "Contenu" },
  4: { name: "Resp. Communication & Marketing", subTeam: "Contenu" },
  5: { name: "Resp. Plateforme Cloud (CTF)", subTeam: "Tech" },
  6: { name: "Resp. Site Web", subTeam: "Tech" },
  7: { name: "Resp. Budget", subTeam: "Sponsors" },
  8: { name: "R Réseaux des Volontaires", subTeam: "Volontaires" },
  9: { name: "R Infographie", subTeam: "Contenu" },
  10: { name: "Resp. Prog AV Live Streaming", subTeam: "Tech" },
  11: { name: "Coordonnateur Local", subTeam: "Logistique" },
  12: { name: "Resp. Logistique", subTeam: "Logistique" },
  13: { name: "Resp. Technique/AV Salle", subTeam: "Tech" },
  14: { name: "Resp. Protocole & Accueil", subTeam: "Logistique" },
  15: { name: "Resp. Prise Vidéo Caméra", subTeam: "Tech" },
  16: { name: "Resp. Partenaires Locaux", subTeam: "Sponsors" },
  17: { name: "Resp. Animation/Présentation", subTeam: "Logistique" },
  18: { name: "Référent Sécurité & Incidents", subTeam: "Logistique" },
};

const MONTHS: Record<string, number> = {
  janvier: 0, janv: 0, février: 1, fevrier: 1, fevr: 1, fév: 1, mars: 2,
  avril: 3, avr: 3, mai: 4, juin: 5, juillet: 6, juil: 6, août: 7, aout: 7,
  septembre: 8, sept: 8, octobre: 9, oct: 9, novembre: 10, nov: 10,
  décembre: 11, decembre: 11, déc: 11, dec: 11,
};

const MONTH_RE =
  /(janvier|janv|février|fevrier|fevr|fév|mars|avril|avr|mai|juin|juillet|juil|août|aout|septembre|sept|octobre|oct|novembre|nov|décembre|decembre|déc|dec)/g;

const EVENT_YEAR = 2026;

// Parse a French date cell. Returns null for vague/time-only values.
// Handles ranges ("14–18 juin", "16 juil – 31 août", "1–31 oct") by taking the
// last day before the last month, and optional times ("27 nov 18h00").
export function parseFrDate(raw: string): Date | null {
  const s = raw.replace(/\*\*/g, "").trim().toLowerCase();
  if (!s) return null;

  MONTH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let lastMonth: string | null = null;
  let lastIdx = -1;
  while ((m = MONTH_RE.exec(s)) !== null) {
    lastMonth = m[1];
    lastIdx = m.index;
  }
  if (lastMonth === null) return null; // no month → "En continu", "06h00", etc.
  const month = MONTHS[lastMonth];
  if (month === undefined) return null;

  const before = s.slice(0, lastIdx);
  const dayMatches = before.match(/\d{1,2}/g);
  let day = dayMatches && dayMatches.length ? parseInt(dayMatches[dayMatches.length - 1], 10) : 1;
  if (!(day >= 1 && day <= 31)) day = 1;

  let hour = 0;
  let min = 0;
  const tm = s.match(/(\d{1,2})h(\d{2})?/);
  if (tm) {
    hour = parseInt(tm[1], 10);
    min = tm[2] ? parseInt(tm[2], 10) : 0;
  }

  const d = new Date(Date.UTC(EVENT_YEAR, month, day, hour, min, 0));
  return isNaN(d.getTime()) ? null : d;
}

function splitRow(line: string): string[] {
  // "| a | b | c |" → ["a","b","c"]
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, "")) || c === "");
}

const SUBTEAM_KEYWORDS: { kw: string; name: string }[] = [
  { kw: "contenu", name: "Contenu" },
  { kw: "sponsors", name: "Sponsors" },
  { kw: "tech", name: "Tech" },
  { kw: "logistique", name: "Logistique" },
  { kw: "volontaires", name: "Volontaires" },
];

function classify(title: string): { isMilestone: boolean; priority: string } {
  const t = title.toLowerCase();
  if (title.includes("⚠️") || t.includes("clôture") || t.includes("cloture") || t.includes("deadline")) {
    return { isMilestone: true, priority: "critical" };
  }
  if (t.includes("objectif")) {
    return { isMilestone: true, priority: "high" };
  }
  return { isMilestone: false, priority: "medium" };
}

export function parseRoadmap(md: string): { tasks: ParsedTask[]; meetings: ParsedMeeting[] } {
  const tasks: ParsedTask[] = [];
  const meetings: ParsedMeeting[] = [];
  const seenMeetingKeys = new Set<string>();

  let section: "role" | "collective" | "subteam" | "other" = "other";
  let currentPole: { name: string; subTeam: string } | null = null;
  let currentPhase = 1;
  let pendingSubTeam: string | null = null; // sub-team whose date line we expect next
  let sortOrder = 0;

  const lines = md.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    try {
      // ── Headings ──────────────────────────────────────────────────────────
      if (line.startsWith("#")) {
        const roleMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);
        if (roleMatch) {
          const num = parseInt(roleMatch[1], 10);
          currentPole = POLES[num] || { name: roleMatch[2].trim(), subTeam: "Général" };
          currentPhase = 1;
          section = "role";
          pendingSubTeam = null;
          continue;
        }
        if (/points de rencontre collectifs/i.test(line)) {
          section = "collective";
          pendingSubTeam = null;
          continue;
        }
        if (/points de rencontre sous-équipes/i.test(line)) {
          section = "subteam";
          pendingSubTeam = null;
          continue;
        }
        // Sub-team heading inside the sub-team section
        if (section === "subteam" && /sous-équipe/i.test(line)) {
          const found = SUBTEAM_KEYWORDS.find((s) => new RegExp(s.kw, "i").test(line));
          pendingSubTeam = found ? found.name : null;
          continue;
        }
        // Phase heading inside a role
        const phaseMatch = line.match(/phase\s*(\d)/i);
        if (phaseMatch && section === "role") {
          currentPhase = parseInt(phaseMatch[1], 10) || currentPhase;
          continue;
        }
        // Any other heading exits role/collective parsing modes
        if (/^#/.test(line) && !line.startsWith("###")) {
          if (section !== "subteam") section = "other";
          pendingSubTeam = null;
        }
        continue;
      }

      // ── Sub-team date line ──────────────────────────────────────────────────
      if (section === "subteam" && pendingSubTeam && !line.startsWith("|")) {
        const segments = line.split("·");
        for (const seg of segments) {
          const clean = seg.replace(/\*\*/g, "").trim();
          if (!clean) continue;
          const d = parseFrDate(clean);
          if (!d) continue;
          const location = /sur site/i.test(clean) ? "Sur site" : null;
          const key = `subteam|${pendingSubTeam}|${d.toISOString()}`;
          if (seenMeetingKeys.has(key)) continue;
          seenMeetingKeys.add(key);
          meetings.push({
            title: `Réunion sous-équipe ${pendingSubTeam}`,
            type: "subteam",
            subTeam: pendingSubTeam,
            scheduledAt: d,
            agenda: null,
            location,
          });
        }
        pendingSubTeam = null;
        continue;
      }

      // ── Table rows ──────────────────────────────────────────────────────────
      if (line.startsWith("|")) {
        const cells = splitRow(line);
        if (isSeparatorRow(cells)) continue;

        if (section === "collective") {
          // | # | Date | Type | Ordre du jour |
          if (cells.length < 4) continue;
          if (/^#$/.test(cells[0]) || /^date$/i.test(cells[1])) continue; // header
          const d = parseFrDate(cells[1]);
          if (!d) continue;
          const ref = cells[0].replace(/\*\*/g, "").trim();
          const typeLabel = cells[2].replace(/\*\*/g, "").trim();
          const key = `collective|${ref}|${d.toISOString()}`;
          if (seenMeetingKeys.has(key)) continue;
          seenMeetingKeys.add(key);
          meetings.push({
            title: `${ref} — ${typeLabel}`,
            type: "collective",
            subTeam: null,
            scheduledAt: d,
            agenda: cells[3] ? cells[3].replace(/\*\*/g, "").trim() : null,
            location: /présentiel|sur site/i.test(typeLabel) ? "Présentiel" : null,
          });
          continue;
        }

        if (section === "role" && currentPole) {
          // Header rows: "| Date | Action |", "| Heure | Action |", "| Action |"
          const lowerCells = cells.map((c) => c.toLowerCase());
          if (lowerCells.includes("action") || lowerCells[0] === "date" || lowerCells[0] === "heure") {
            continue;
          }
          let dateCell: string | null = null;
          let title: string;
          if (cells.length >= 2) {
            dateCell = cells[0];
            title = cells[1];
          } else {
            title = cells[0];
          }
          title = title.replace(/\*\*/g, "").trim();
          if (!title) continue;
          const dueDate = dateCell ? parseFrDate(dateCell) : null;
          const { isMilestone, priority } = classify(cells.join(" "));
          tasks.push({
            title,
            phase: currentPhase,
            pole: currentPole.name,
            subTeam: currentPole.subTeam,
            dueDate,
            isMilestone,
            priority,
            status: "todo",
            sortOrder: sortOrder++,
          });
          continue;
        }
      }
    } catch {
      // Never crash the seed on a single bad line.
      continue;
    }
  }

  return { tasks, meetings };
}
