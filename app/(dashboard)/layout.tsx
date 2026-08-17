'use client';

import React from 'react';
import Link from 'next/link';
import { Scale, Compass } from 'lucide-react';
import { UserNav } from '@/components/ui/UserNav';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Dashboard Topbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Remates<span className="text-emerald-400">CR</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/auctions"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
              >
                {t.nav.catalog}
              </Link>
              <Link
                href="/map"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                {t.nav.map}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden xl:flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t.nav.dailyIngestionActive}
            </div>

            {/* Language Switcher (ES / EN) */}
            <LanguageSwitcher />

            {/* Investor User Navigation & Watchlist Drawer */}
            <UserNav />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          Remates Judiciales Costa Rica • {t.nav.brandSubtitle}
        </div>
      </footer>
    </div>
  );
}
