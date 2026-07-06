// Structured follow-up cadence for sponsor prospects: J+2 / J+5 / J+10 / J+15.
// Mirrors the reminderStage CSV pattern used by the pilotage cron.

export const FOLLOWUP_STEPS = [2, 5, 10, 15] as const;
export const stageLabel = (days: number) => `J+${days}`;

// Statuses that are still "in play" and worth chasing. Concluded/lost/paused stop the cadence.
export const ACTIVE_FOLLOWUP_STATUSES = ["contacted", "meeting", "positive"];

const DAY_MS = 86_400_000;

export function parseStages(csv: string | null | undefined): string[] {
  return csv ? csv.split(",").map(s => s.trim()).filter(Boolean) : [];
}

// Given the first-contact date and the stages already sent, return the next due
// reminder (stage label + due date), or null when the cadence is exhausted.
export function nextFollowup(
  contactedAt: Date | null | undefined,
  sentCsv: string | null | undefined,
): { stage: string; dueAt: Date } | null {
  if (!contactedAt) return null;
  const sent = parseStages(sentCsv);
  const base = new Date(contactedAt).getTime();
  for (const days of FOLLOWUP_STEPS) {
    const label = stageLabel(days);
    if (!sent.includes(label)) {
      return { stage: label, dueAt: new Date(base + days * DAY_MS) };
    }
  }
  return null;
}

// Convenience: the fields to persist when (re)starting the cadence after an outreach.
export function followupResetFields(now: Date, existingContactedAt?: Date | null) {
  const contactedAt = existingContactedAt || now;
  const next = nextFollowup(contactedAt, "");
  return {
    contactedAt,
    lastContactAt: now,
    followupStage: "",
    nextFollowupAt: next?.dueAt ?? null,
  };
}
