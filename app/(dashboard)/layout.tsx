'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Scale, Compass, Activity } from 'lucide-react';
import { UserNav } from '@/components/ui/UserNav';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { HelpButton } from '@/components/help/HelpButton';
import { IngestionLogModal } from '@/components/ingest/IngestionLogModal';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Dashboard Topbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/20 dark:shadow-emerald-950/40">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                REmatrix<span className="text-emerald-600 dark:text-emerald-400">CR</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/auctions"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {t.nav.catalog}
              </Link>
              <Link
                href="/map"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t.nav.map}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Clickable Gazette Ingestion Activity Log Badge */}
            <button
              type="button"
              onClick={() => setIsIngestionModalOpen(true)}
              title="Click to view Gazette ingestion logs & pipeline history"
              className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400 dark:hover:border-emerald-500/50 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">{t.nav.dailyIngestionActive}</span>
              <span className="sm:hidden">Ingestion Log</span>
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400/80 ml-0.5" />
            </button>

            {/* Help & Guide Explainer Button */}
            <HelpButton />

            {/* Theme Toggle (Light / Dark) */}
            <ThemeToggle />

            {/* Language Switcher (ES / EN) */}
            <LanguageSwitcher />

            {/* Investor User Navigation & Watchlist Drawer */}
            <UserNav />
          </div>
        </div>
      </header>

      {/* Ingestion Activity Log Modal */}
      <IngestionLogModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-xs text-slate-500 dark:text-slate-400">
          {/* Micro-Notice Banner */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 text-center sm:text-left">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{t.disclaimer.micro.text}</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">REmatrixCR</span>
              <span>•</span>
              <span className="text-slate-500">{t.nav.brandSubtitle}</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <Link href="/auctions" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {t.nav.catalog}
              </Link>
              <Link href="/map" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {t.nav.map}
              </Link>
              <Link href="/terms" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                {t.nav.terms}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
