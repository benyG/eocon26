"use client";
import { useState } from "react";
import { translations, Lang } from "@/lib/i18n";
import { useEventSettings } from "@/lib/useEventSettings";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Speakers from "@/components/Speakers";
import Schedule from "@/components/Schedule";
import CTF from "@/components/CTF";
import Workshops from "@/components/Workshops";
import Testimonials from "@/components/Testimonials";
import Sponsors from "@/components/Sponsors";
import CFPSection from "@/components/CFPModal";
import Volunteer from "@/components/Volunteer";
import Venue from "@/components/Venue";
import Team from "@/components/Team";
import Footer from "@/components/Footer";
import RegisterModal from "@/components/RegisterModal";

export default function Home() {
  const [lang, setLang] = useState<Lang>("fr");
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

  return (
    <main className="relative bg-dark-900 min-h-screen">
      <Navbar t={tWithSettings} lang={lang} onLangChange={setLang} onOpenModal={openModal} />

      <Hero t={tWithSettings} onOpenModal={openModal} />
      <About t={tWithSettings} />
      <Speakers t={tWithSettings} onOpenModal={openModal} />
      <Schedule t={tWithSettings} lang={lang} />
      <CTF t={tWithSettings} onOpenModal={openModal} ctfSettings={{ tagline: eventSettings.ctf_tagline, prizeMain: eventSettings.ctf_prize_main, prizeDetails: eventSettings.ctf_prize_details }} />
      <Workshops t={tWithSettings} onOpenModal={openModal} lang={lang} />
      <Testimonials t={tWithSettings} />
      <CFPSection t={tWithSettings} />
      <Volunteer t={tWithSettings} />
      <Sponsors t={tWithSettings} lang={lang} />
      <Team t={tWithSettings} />
      <Venue t={tWithSettings} eventSettings={eventSettings} />
      <Footer t={tWithSettings} eventSettings={eventSettings} />

      {modal === "register" && <RegisterModal t={tWithSettings} onClose={closeModal} lang={lang} />}
      {modal === "cfp" && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: "#0a0a0f", border: "1px solid rgba(0,255,157,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neon-green/10">
              <h2 className="text-lg font-black text-white">{t.cfp.title}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-neon-green transition-colors text-2xl leading-none">×</button>
            </div>
            <div className="px-2 pb-4">
              <CFPSection t={tWithSettings} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
