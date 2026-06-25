"use client";
import { createContext, useContext } from "react";
import { adminI18n, AdminLang, AdminTranslations } from "@/lib/adminI18n";

export type { AdminLang, AdminTranslations };
export { adminI18n };

export const AdminLangContext = createContext<{
  lang: AdminLang;
  t: AdminTranslations;
  setLang: (l: AdminLang) => void;
}>({
  lang: "fr",
  t: adminI18n.fr,
  setLang: () => {},
});

export const useAdminT = () => useContext(AdminLangContext);

/** Inline bilingual helper — use when a string is not in adminI18n.
 *  const __ = useLang(); then __("texte FR", "EN text")
 */
export function useLang(): (fr: string, en: string) => string {
  const { lang } = useContext(AdminLangContext);
  return (fr: string, en: string) => (lang === "en" ? en : fr);
}
