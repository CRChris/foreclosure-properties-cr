'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Auction } from '@/lib/types/auction';
import { AuctionCard } from '@/components/cards/AuctionCard';
import { MetricCard } from '@/components/cards/MetricCard';
import { MapWrapper } from '@/components/map/MapWrapper';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserNav } from '@/components/ui/UserNav';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { fetchAuctions } from '@/lib/supabase/db';
import { 
  Building2, 
  MapPin, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  Search, 
  Scale, 
  Coins, 
  Compass, 
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  const { t, language } = useLanguage();
  const [auctions, setAuctions] = useState<Auction[]>([]);

  useEffect(() => {
    fetchAuctions().then((data) => {
      if (data) setAuctions(data);
    });

    fetch('/api/auctions')
      .then((r) => r.json())
      .then((res) => {
        if (res && Array.isArray(res.data)) {
          setAuctions(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const featuredAuctions = auctions.slice(0, 3);
  const totalAuctions = auctions.length;
  
  // Calculate average discount margin
  const avgMargin = totalAuctions > 0
    ? Math.round(auctions.reduce((acc, curr) => acc + (curr.estimated_margin_pct || 0), 0) / totalAuctions)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Remates<span className="text-emerald-400">CR</span>
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              Poder Judicial CR
            </span>
          </div>

          <nav className="flex items-center gap-2.5 sm:gap-4">
            <Link
              href="/auctions"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              {t.nav.catalog}
            </Link>
            <Link
              href="/map"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:flex items-center gap-1"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              {t.nav.map}
            </Link>

            {/* Language Switcher Button (🇨🇷 ES / 🇺🇸 EN) */}
            <LanguageSwitcher />

            {/* Investor User Navigation & Watchlist */}
            <UserNav />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {language === 'es'
                ? 'Actualizado automáticamente de lunes a viernes (Boletín Judicial)'
                : 'Automated daily updates from Official Judicial Gazette'}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              {language === 'es' ? (
                <>
                  Rastrea y Analiza <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                    Remates Judiciales
                  </span>{' '}
                  en Costa Rica
                </>
              ) : (
                <>
                  Track & Analyze <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                    Judicial Foreclosures
                  </span>{' '}
                  in Costa Rica
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              {language === 'es'
                ? 'Descubre propiedades residenciales, condominios, fincas y lotes comerciales con descuentos de hasta un 50% bajo valor de mercado. Con cálculo automatizado de traspasos e impuestos costarricenses.'
                : 'Discover residential condos, beach estates, farmland, and commercial lots with discounts up to 50% below fair market value. Powered by automated Costa Rican statutory closing tax and IRR calculators.'}
            </p>

            {/* Quick Search CTA Bar */}
            <div className="p-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2 backdrop-blur-md">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Buscar por cantón (Escazú, Jacó, Santa Cruz, Belén)...' : 'Search by canton (Escazú, Jacó, Santa Cruz, Belén)...'}
                  className="w-full bg-slate-950/80 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      window.location.href = `/auctions?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`;
                    }
                  }}
                />
              </div>

              <Link
                href="/auctions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>{language === 'es' ? 'Explorar Remates' : 'Explore Foreclosures'}</span>
              </Link>
            </div>

            {/* Micro value badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {language === 'es' ? '1er, 2do y 3er Remate' : '1st, 2nd & 3rd Calls'}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {language === 'es' ? 'Folio Real y Catastro SIRI' : 'Folio Real & SIRI Cadastre'}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {language === 'es' ? 'Ley 7088 Traspasos & ROI' : 'Statutory Taxes & ROI'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Metric Counters Strip */}
      <section className="border-b border-slate-800/80 bg-slate-900/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title={language === 'es' ? 'Remates en Base' : 'Active Foreclosures'}
              value={totalAuctions}
              subtitle={language === 'es' ? '7 Provincias de Costa Rica' : 'Across 7 Costa Rican Provinces'}
              icon={<Building2 className="w-5 h-5" />}
            />
            <MetricCard
              title={language === 'es' ? 'Margen de Descuento' : 'Discount Margin'}
              value={avgMargin > 0 ? `~${avgMargin}%` : 'Hasta 50%'}
              subtitle={language === 'es' ? 'Respecto al valor de mercado' : 'Below fair market value'}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <MetricCard
              title={language === 'es' ? 'Moneda Dual' : 'Dual Currency'}
              value="USD & CRC"
              subtitle={language === 'es' ? 'Dólares y Colones' : 'US Dollars & Colones'}
              icon={<Coins className="w-5 h-5" />}
            />
            <MetricCard
              title={language === 'es' ? 'Juzgados de Cobro' : 'Judicial Courts'}
              value="100% Oficial"
              subtitle={language === 'es' ? 'Con número de expediente' : 'Verified Court Dockets'}
              icon={<ShieldCheck className="w-5 h-5" />}
            />
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{language === 'es' ? 'Oportunidades Destacadas' : 'Featured Opportunities'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {language === 'es' ? 'Próximos Remates Judiciales' : 'Upcoming Judicial Foreclosures'}
            </h2>
          </div>

          <Link
            href="/auctions"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 group"
          >
            <span>{language === 'es' ? 'Ver catálogo completo' : 'View full catalog'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {featuredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="p-10 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
            <Scale className="w-8 h-8 mx-auto text-slate-500" />
            <p className="text-sm font-bold text-white">{t.empty.waitingTitle}</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {t.empty.waitingDesc}
            </p>
          </div>
        )}
      </section>

      {/* Interactive Map Preview Section */}
      <section className="py-12 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {language === 'es' ? 'Mapa Geoespacial de Subastas' : 'Geospatial Foreclosure Map'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {language === 'es'
                  ? 'Visualiza la ubicación geográfica y distribución de remates en Costa Rica.'
                  : 'Explore geographic distribution of judicial foreclosures with PostGIS coordinates.'}
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>{language === 'es' ? 'Abrir Mapa Completo' : 'Open Full Map'}</span>
            </Link>
          </div>

          <div className="h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <MapWrapper auctions={auctions} height="100%" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">
              CR
            </div>
            <span className="font-semibold text-slate-400">
              Remates Judiciales Costa Rica
            </span>
          </div>
          <p>© {new Date().getFullYear()} {t.nav.brandSubtitle}.</p>
        </div>
      </footer>
    </div>
  );
}
