import { getEventSettings } from "@/lib/settings";

// Event facts pulled from EventSettings (source of truth) for document headers/footers.
export interface EventContext {
  edition: string;
  dateFr: string;
  dateEn: string;
  venue: string;
  mode: string;
}

export async function getEventContext(): Promise<EventContext> {
  const s = await getEventSettings();
  const venue = [s.event_venue, s.event_city || "Douala", s.event_country || "Cameroun"]
    .filter(Boolean).join(", ");
  return {
    edition: s.event_edition || "7",
    dateFr: s.event_date_display_fr || "28 novembre 2026",
    dateEn: s.event_date_display_en || "November 28, 2026",
    venue,
    mode: s.event_mode || "",
  };
}

// One-line event context string, e.g. "7ème édition · 28 novembre 2026 · Douala, Cameroun · Hybride".
export function eventContextLine(ctx: EventContext, lang: "fr" | "en"): string {
  const edition = lang === "en" ? `${ctx.edition}th edition` : `${ctx.edition}ème édition`;
  const date = lang === "en" ? ctx.dateEn : ctx.dateFr;
  return [edition, date, ctx.venue, ctx.mode].filter(Boolean).join(" · ");
}
