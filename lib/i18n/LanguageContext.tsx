'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Translations } from './types';
import { TRANSLATIONS } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: TRANSLATIONS.es,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  // Load language preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('remates_language') as Language | null;
      if (stored === 'es' || stored === 'en') {
        setLanguageState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('remates_language', lang);
    } catch {
      // ignore
    }
  };

  const t = TRANSLATIONS[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
