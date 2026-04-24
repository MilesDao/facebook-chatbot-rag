"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "@/lib/auth";

type Language = "en" | "vi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

import enTranslations from '../locales/en.json';
import viTranslations from '../locales/vi.json';

const translations: Record<Language, Record<string, string>> = {
  en: enTranslations,
  vi: viTranslations
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    apiFetch("/api/settings/language")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.value && (data.value === "en" || data.value === "vi")) {
          setLanguageState(data.value);
        }
      })
      .catch(err => console.error("Failed to load language settings:", err));
  }, []);

  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      await apiFetch("/api/settings/language", {
        method: "POST",
        body: JSON.stringify({ value: newLang })
      });
    } catch (err) {
      console.error("Failed to save language settings:", err);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
