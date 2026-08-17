import React from 'react';
import Link from 'next/link';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { AuctionCard } from '@/components/cards/AuctionCard';
import { MetricCard } from '@/components/cards/MetricCard';
import { MapWrapper } from '@/components/map/MapWrapper';
import { formatCurrency } from '@/lib/utils';
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
  SlidersHorizontal
} from 'lucide-react';

export default function HomePage() {
  const featuredAuctions = MOCK_AUCTIONS.slice(0, 3);
  const totalAuctions = MOCK_AUCTIONS.length;
  
  // Calculate average discount margin
  const avgMargin = Math.round(
    MOCK_AUCTIONS.reduce((acc, curr) => acc + (curr.estimated_margin_pct || 0), 0) / totalAuctions
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/50">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Remates<span className="text-emerald-400">CR</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-wider text-slate-400 ml-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                Poder Judicial CR
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <Link
              href="/auctions"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Explorar Subastas
            </Link>
            <Link
              href="/map"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:flex items-center gap-1"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              Mapa Interactivo
            </Link>
            <Link
              href="/auctions"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-emerald-950/40 transition-all hover:scale-102"
            >
              <span>Ver Oportunidades</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Actualizado diariamente con el Boletín Judicial Oficial
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
              Rastrea y Analiza <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Remates Judiciales
              </span>{' '}
              en Costa Rica
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Descubre propiedades residenciales, comerciales, agrícolas y lotes turísticos con descuentos de hasta un 50% bajo valor de mercado. Con cálculo automatizado de traspasos e impuestos costarricenses.
            </p>

            {/* Quick Filter Bar */}
            <div className="p-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-2 backdrop-blur-md">
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Cantón (Escazú, Jacó, Santa Ana, San Carlos)..."
                  className="w-full bg-slate-950/80 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <Link
                href="/auctions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02] shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Buscar Remates</span>
              </Link>
            </div>

            {/* Micro value badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1er, 2do y 3er Remate
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Folio Real y Catastro
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Sin Costo de API
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
              title="Remates Activos"
              value={totalAuctions}
              subtitle="En las 7 provincias de CR"
              icon={<Building2 className="w-5 h-5" />}
            />
            <MetricCard
              title="Descuento Promedio"
              value={`~${avgMargin}%`}
              subtitle="Respecto al valor de mercado"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <MetricCard
              title="Moneda Dual"
              value="USD & CRC"
              subtitle="Dólares y Colones"
              icon={<Coins className="w-5 h-5" />}
            />
            <MetricCard
              title="Juzgados Oficiales"
              value="100%"
              subtitle="Con número de expediente"
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
              <span>Oportunidades Destacadas</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Próximos Remates Judiciales
            </h2>
          </div>

          <Link
            href="/auctions"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 group"
          >
            <span>Ver todas las {totalAuctions} propiedades</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      </section>

      {/* Interactive Map Preview Section */}
      <section className="py-12 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Mapa Geoespacial de Subastas
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Visualiza la ubicación geográfica y distribución de remates en Costa Rica.
              </p>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition-colors"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Abrir Mapa Completo</span>
            </Link>
          </div>

          <div className="h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <MapWrapper auctions={MOCK_AUCTIONS} height="100%" />
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
          <p>© {new Date().getFullYear()} Plataforma de Análisis Inmobiliario Judicial. Datos extraídos del Boletín Judicial Oficial.</p>
        </div>
      </footer>
    </div>
  );
}
