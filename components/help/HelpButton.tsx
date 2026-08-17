'use client';

import React, { useState } from 'react';
import { HelpCircle, BookOpen } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ForeclosureGuideModal } from './ForeclosureGuideModal';

export function HelpButton({ className = '' }: { className?: string }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const isEn = language === 'en';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 text-xs font-bold transition-all shadow-sm ${className}`}
        title={isEn ? 'How Foreclosure Auctions Work in Costa Rica' : 'Guía de Remates Judiciales en Costa Rica'}
      >
        <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>{isEn ? 'Help & Guide' : 'Guía & Ayuda'}</span>
      </button>

      {/* Interactive Explainer Modal */}
      <ForeclosureGuideModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
