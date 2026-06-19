"use client";
import { useState, useEffect } from "react";

export interface EventSettings {
  event_date_start: string;
  event_date: string;
  event_date_display_fr: string;
  event_date_display_en: string;
  event_time_start: string;
  event_venue: string;
  event_city: string;
  event_country: string;
  event_address: string;
  event_mode: string;
  cfp_open_date: string;
  cfp_close_date: string;
  volunteer_open_date: string;
  volunteer_close_date: string;
  registration_open_date: string;
  registration_close_date: string;
  site_base_url: string;
  url_inscription: string;
  url_cfp: string;
  url_benevoles: string;
  url_programme: string;
  url_ctf: string;
  url_sponsor: string;
  programme_start_date: string;
  [key: string]: string;
}

const DEFAULTS: EventSettings = {
  event_date_start: "2026-11-23",
  event_date: "2026-11-28",
  event_date_display_fr: "",
  event_date_display_en: "",
  event_time_start: "08:00",
  event_venue: "Hotel Onomo",
  event_city: "Douala",
  event_country: "Cameroun",
  event_address: "Hotel Onomo, Boulevard de la Liberté, Douala, Cameroun",
  event_mode: "Online & On-site",
  cfp_open_date: "",
  cfp_close_date: "",
  volunteer_open_date: "",
  volunteer_close_date: "",
  registration_open_date: "",
  registration_close_date: "",
  site_base_url: "https://eyesopensecurity.com",
  url_inscription: "https://eyesopensecurity.com/#inscription",
  url_cfp: "https://eyesopensecurity.com/#cfp",
  url_benevoles: "https://eyesopensecurity.com/#benevoles",
  url_programme: "https://eyesopensecurity.com/#programme",
  url_ctf: "https://eyesopensecurity.com/#ctf",
  url_sponsor: "https://eyesopensecurity.com/?modal=sponsor",
  programme_start_date: "",
};

export function useEventSettings(): EventSettings {
  const [settings, setSettings] = useState<EventSettings>(DEFAULTS);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((data: Record<string, string>) => {
        setSettings(prev => ({ ...prev, ...data } as EventSettings));
      })
      .catch(() => {});
  }, []);

  return settings;
}
