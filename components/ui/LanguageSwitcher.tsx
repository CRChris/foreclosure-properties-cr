'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs shadow-inner">
      <button
        type="button"
        onClick={() => setLanguage('es')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all duration-200 ${
          language === 'es'
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
        title="Español (Costa Rica)"
      >
        <span className="text-[11px]">🇨🇷</span>
        <span>ES</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all duration-200 ${
          language === 'en'
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
        title="English"
      >
        <span className="text-[11px]">🇺🇸</span>
        <span>EN</span>
      </button>
    </div>
  );
}
