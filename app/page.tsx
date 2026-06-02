"use client";
import { useState } from "react";
import { translations, Lang } from "@/lib/i18n";
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
import Footer from "@/components/Footer";
import RegisterModal from "@/components/RegisterModal";

export default function Home() {
  const [lang, setLang] = useState<Lang>("fr");
  const [modal, setModal] = useState<string | null>(null);

  const t = translations[lang];

  const openModal = (m: string) => setModal(m);
  const closeModal = () => setModal(null);

  return (
    <main className="relative bg-dark-900 min-h-screen">
      <Navbar t={t} lang={lang} onLangChange={setLang} onOpenModal={openModal} />

      <Hero t={t} onOpenModal={openModal} />
      <About t={t} />
      <Speakers t={t} onOpenModal={openModal} />
      <Schedule t={t} lang={lang} />
      <CTF t={t} onOpenModal={openModal} />
      <Workshops t={t} onOpenModal={openModal} />
      <Testimonials t={t} />
      <CFPSection t={t} />
      <Volunteer t={t} />
      <Sponsors t={t} />
      <Venue t={t} />
      <Footer t={t} />

      {modal === "register" && <RegisterModal t={t} onClose={closeModal} />}
    </main>
  );
}
