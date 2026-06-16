"use client";
import { useState, useEffect } from "react";
import { translations, Lang } from "@/lib/i18n";
import { useEventSettings } from "@/lib/useEventSettings";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Speakers from "@/components/Speakers";
import Schedule from "@/components/Schedule";
import Videoteque from "@/components/Videoteque";
import CTF from "@/components/CTF";
import Workshops from "@/components/Workshops";
import Testimonials from "@/components/Testimonials";
import Sponsors from "@/components/Sponsors";
import CFP from "@/components/CFP";
import CFPModal from "@/components/CFPModal";
import Volunteer from "@/components/Volunteer";
import Venue from "@/components/Venue";
import Team from "@/components/Team";
import Footer from "@/components/Footer";
import RegisterModal from "@/components/RegisterModal";
import VolunteerModal from "@/components/VolunteerModal";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [modal, setModal] = useState<string | null>(null);
  const eventSettings = useEventSettings();

  const t = translations[lang];

  // Overlay i18n strings with live DB values
  const dateFr = eventSettings.event_date_display_fr;
  const dateEn = eventSettings.event_date_display_en;
  const venue = eventSettings.event_venue;
  const city = eventSettings.event_city;
  const country = eventSettings.event_country;
  const address = eventSettings.event_address;

  const tWithSettings = {
    ...t,
    hero: {
      ...t.hero,
      date: lang === "fr" ? dateFr : dateEn,
      location: `${venue} · ${city}, ${country}`,
    },
    register: {
      ...t.register,
      subtitle: lang === "fr" ? `${dateFr} · ${venue}, ${city}` : `${dateEn} · ${venue}, ${city}`,
    },
    venue: {
      ...t.venue,
      subtitle: `${venue} · ${city}, ${country}`,
      address: `${address}`,
    },
    footer: {
      ...t.footer,
    },
  };

  const openModal = (m: string) => setModal(m);
  const closeModal = () => setModal(null);

  // Deep links (shareable):
  //  - /?modal=register|cfp|volunteer|sponsor|sponsor-deck → opens that modal
  //  - /?modal=ctf|programme → scrolls directly to the matching section
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = new URLSearchParams(window.location.search).get("modal");
    if (!m) return;
    if (["register", "cfp", "volunteer", "sponsor", "sponsor-deck"].includes(m)) {
      setModal(m);
    } else if (m === "ctf" || m === "programme") {
      const id = m === "ctf" ? "ctf" : "schedule";
      let tries = 0;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        if (tries++ < 20) setTimeout(tryScroll, 250);
      };
      tryScroll();
    }
  }, []);

  return (
    <main className="relative bg-dark-900 min-h-screen">
      <Navbar t={tWithSettings} lang={lang} onLangChange={setLang} onOpenModal={openModal} />

      <Hero t={tWithSettings} onOpenModal={openModal} />
      <About t={tWithSettings} />
      <Speakers t={tWithSettings} onOpenModal={openModal} />
      <CTF t={tWithSettings} onOpenModal={openModal} ctfSettings={{
        tagline: (lang === "fr" ? eventSettings.ctf_tagline_fr : eventSettings.ctf_tagline_en) || eventSettings.ctf_tagline,
        prizeMain: (lang === "fr" ? eventSettings.ctf_prize_main_fr : eventSettings.ctf_prize_main_en) || eventSettings.ctf_prize_main,
        prizeDetails: (lang === "fr" ? eventSettings.ctf_prize_details_fr : eventSettings.ctf_prize_details_en) || eventSettings.ctf_prize_details,
      }} />
      <Workshops t={tWithSettings} onOpenModal={openModal} lang={lang} />
      <Sponsors t={tWithSettings} lang={lang} deepLink={modal === "sponsor" ? "sponsor" : modal === "sponsor-deck" ? "deck" : null} onDeepLinkConsumed={closeModal} />
      <Schedule t={tWithSettings} lang={lang} />
      <Testimonials t={tWithSettings} />
      <CFP t={tWithSettings} onOpenModal={() => openModal("cfp")} />
      <Volunteer t={tWithSettings} onOpenModal={() => openModal("volunteer")} />
      <Team t={tWithSettings} />
      <Videoteque t={tWithSettings} lang={lang} />
      <Venue t={tWithSettings} eventSettings={eventSettings} />
      <Footer t={tWithSettings} eventSettings={eventSettings} />

      {modal === "register" && <RegisterModal t={tWithSettings} onClose={closeModal} lang={lang} />}
      {modal === "volunteer" && <VolunteerModal t={tWithSettings} onClose={closeModal} lang={lang} />}
      {modal === "cfp" && <CFPModal t={tWithSettings} onClose={closeModal} />}
    </main>
  );
}
