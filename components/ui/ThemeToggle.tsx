'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === 'dark';
  const label = isDark
    ? language === 'es'
      ? 'Cambiar a modo claro'
      : 'Switch to light mode'
    : language === 'es'
    ? 'Cambiar a modo oscuro'
    : 'Switch to dark mode';

  const text = isDark
    ? language === 'es'
      ? 'Modo Claro'
      : 'Light'
    : language === 'es'
    ? 'Modo Oscuro'
    : 'Dark';

  if (!mounted) {
    return (
      <div className={`inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 w-9 h-9 ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-200 cursor-pointer shadow-sm
        bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300
        dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800 dark:hover:border-slate-700
        hover:scale-105 active:scale-95 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold">{text}</span>
      )}
    </button>
  );
}
