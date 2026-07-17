// Compose the player-facing CTFd description from the Challenge Matrix fields.
// Structured (LOCATION / CONTEXT / OBJECTIVE) and bilingual (ENG + FR), per the
// matrix Usage Notes. The on-solve "revelation" and the internal technique hint
// are deliberately NOT included here — they must never appear before a solve.

export interface BriefFields {
  title: string;
  fragmentCode?: string | null;
  isPrimeSeal?: boolean | null;
  locationEn?: string | null; locationFr?: string | null;
  artifactEn?: string | null; artifactFr?: string | null;
  contextEn?: string | null; contextFr?: string | null;
  objectiveEn?: string | null; objectiveFr?: string | null;
}

function line(en?: string | null, fr?: string | null): string {
  const parts: string[] = [];
  if (en) parts.push(`ENG · ${en}`);
  if (fr) parts.push(`FR · ${fr}`);
  return parts.join("\n");
}

export function composeCtfdDescription(ch: BriefFields): string {
  const loc = line(
    [ch.locationEn, ch.artifactEn].filter(Boolean).join(" — ") || null,
    [ch.locationFr, ch.artifactFr].filter(Boolean).join(" — ") || null,
  );
  const ctx = line(ch.contextEn, ch.contextFr);
  const obj = line(ch.objectiveEn, ch.objectiveFr);

  const blocks: string[] = [];
  if (loc) blocks.push(`📍 LOCATION — LIEU\n${loc}`);
  if (ctx) blocks.push(`🧩 CONTEXT — CONTEXTE\n${ctx}`);
  if (obj) blocks.push(`🎯 OBJECTIVE — OBJECTIF\n${obj}`);
  if (ch.fragmentCode) blocks.push(`— Reality Fragment ${ch.fragmentCode}${ch.isPrimeSeal ? " · PRIME SEAL" : ""}`);

  return blocks.join("\n\n").trim() || ch.title;
}
