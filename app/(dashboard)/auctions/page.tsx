'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { Auction } from '@/lib/types/auction';
import { AuctionCard } from '@/components/cards/AuctionCard';
import { AuctionFilterBar, FilterState, ViewMode } from '@/components/filters/AuctionFilterBar';
import { MapWrapper } from '@/components/map/MapWrapper';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { fetchAuctions } from '@/lib/supabase/db';
import {
  Search,
  MapPin,
  TrendingUp,
  Scale,
  Sparkles,
  Columns2,
  LayoutGrid,
  Map as MapIcon,
  RotateCcw,
  Building,
  Layers,
} from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  search: '',
  province: 'all',
  currency: 'all',
  minPrice: '',
  maxPrice: '',
  minMargin: 0,
  callStage: 'all',
  category: 'all',
  timeframe: 'all',
  sortBy: 'date_asc',
};

export default function AuctionsPage() {
  const [auctionsData, setAuctionsData] = useState<Auction[]>(MOCK_AUCTIONS);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(MOCK_AUCTIONS[0]?.id || null);
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  // Load live auctions from Supabase or API route on mount
  useEffect(() => {
    fetchAuctions().then((data) => {
      if (data && data.length > 0) {
        setAuctionsData(data);
        if (data[0]) setSelectedAuctionId(data[0].id);
      }
    });

    fetch('/api/auctions')
      .then((res) => res.json())
      .then((res) => {
        if (res && Array.isArray(res.data) && res.data.length > 0) {
          setAuctionsData(res.data);
          if (res.data[0]) setSelectedAuctionId(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Ref to card containers for automatic smooth scrolling
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter & sort auctions based on active filters
  const filteredAuctions = useMemo(() => {
    return auctionsData.filter((auction) => {
      // 1. Text Search Filter (Canton, District, Province, Expediente, Folio, Bank, Summary)
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const matchesQuery =
          auction.canton.toLowerCase().includes(q) ||
          auction.district.toLowerCase().includes(q) ||
          auction.province.toLowerCase().includes(q) ||
          auction.expediente_number.toLowerCase().includes(q) ||
          auction.folio_real.toLowerCase().includes(q) ||
          auction.plaintiff.toLowerCase().includes(q) ||
          (auction.legal_summary && auction.legal_summary.toLowerCase().includes(q)) ||
          (auction.address_description && auction.address_description.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      // 2. Province Filter
      if (filters.province !== 'all' && auction.province !== filters.province) {
        return false;
      }

      // 3. Currency Filter
      if (filters.currency !== 'all' && auction.currency !== filters.currency) {
        return false;
      }

      // 4. Minimum Margin Filter
      if (filters.minMargin > 0) {
        const margin = auction.estimated_margin_pct || 0;
        if (margin < filters.minMargin) return false;
      }

      // 5. Category Filter
      if (filters.category !== 'all' && auction.property_category !== filters.category) {
        return false;
      }

      // 6. Price Range Filters
      if (filters.minPrice !== '') {
        const minVal = parseFloat(filters.minPrice);
        if (!isNaN(minVal) && auction.base_price_call_1 < minVal) {
          return false;
        }
      }
      if (filters.maxPrice !== '') {
        const maxVal = parseFloat(filters.maxPrice);
        if (!isNaN(maxVal) && auction.base_price_call_1 > maxVal) {
          return false;
        }
      }

      // 7. Timeframe Filter
      if (filters.timeframe !== 'all') {
        const auctionDate = new Date(auction.auction_date_call_1).getTime();
        const now = new Date().getTime();
        const diffDays = (auctionDate - now) / (1000 * 60 * 60 * 24);

        if (filters.timeframe === '7_days' && (diffDays < 0 || diffDays > 7)) return false;
        if (filters.timeframe === '15_days' && (diffDays < 0 || diffDays > 15)) return false;
        if (filters.timeframe === '30_days' && (diffDays < 0 || diffDays > 30)) return false;
        if (filters.timeframe === '60_days' && (diffDays < 0 || diffDays > 60)) return false;
      }

      // 8. Auction Call Stage Filter
      if (filters.callStage === 'call_2' && !auction.base_price_call_2) return false;
      if (filters.callStage === 'call_3' && !auction.base_price_call_3) return false;

      return true;
    }).sort((a, b) => {
      // Sorting
      if (filters.sortBy === 'date_asc') {
        return new Date(a.auction_date_call_1).getTime() - new Date(b.auction_date_call_1).getTime();
      }
      if (filters.sortBy === 'date_desc') {
        return new Date(b.auction_date_call_1).getTime() - new Date(a.auction_date_call_1).getTime();
      }
      if (filters.sortBy === 'margin_desc') {
        return (b.estimated_margin_pct || 0) - (a.estimated_margin_pct || 0);
      }
      if (filters.sortBy === 'price_asc') {
        return a.base_price_call_1 - b.base_price_call_1;
      }
      if (filters.sortBy === 'price_desc') {
        return b.base_price_call_1 - a.base_price_call_1;
      }
      if (filters.sortBy === 'area_desc') {
        return b.area_m2 - a.area_m2;
      }
      return 0;
    });
  }, [filters, auctionsData]);

  // Aggregate KPI metrics
  const kpiStats = useMemo(() => {
    const total = filteredAuctions.length;
    if (total === 0) return { total: 0, avgMargin: 0, highestDiscount: 0, totalUSD: 0 };

    const margins = filteredAuctions.map((a) => a.estimated_margin_pct || 0);
    const avgMargin = margins.reduce((acc, curr) => acc + curr, 0) / total;
    const highestDiscount = Math.max(...margins);

    const totalUSD = filteredAuctions
      .filter((a) => a.currency === 'USD')
      .reduce((sum, a) => sum + a.base_price_call_1, 0);

    return {
      total,
      avgMargin: Math.round(avgMargin * 10) / 10,
      highestDiscount: Math.round(highestDiscount * 10) / 10,
      totalUSD,
    };
  }, [filteredAuctions]);

  // When selected auction changes on map, auto-scroll left card into view
  const handleSelectAuction = (auction: Auction) => {
    setSelectedAuctionId(auction.id);
    const cardEl = cardRefs.current[auction.id];
    if (cardEl && viewMode === 'split') {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const selectedAuction = filteredAuctions.find((a) => a.id === selectedAuctionId) || filteredAuctions[0] || null;

  return (
    <div className="space-y-5">
      {/* Header Banner & Live Investor KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-emerald-400" />
            <span>Remates Judiciales Costa Rica</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Plataforma de inteligencia inmobiliaria judicial con georreferenciación PostGIS y análisis de márgenes de descuento.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm text-xs">
            <span className="text-slate-400">Total Listados: </span>
            <strong className="text-emerald-400 font-mono">{kpiStats.total}</strong>
          </div>
          {kpiStats.avgMargin > 0 && (
            <div className="bg-emerald-950/70 border border-emerald-800/40 rounded-xl px-3 py-1.5 shadow-sm text-xs flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Margen Promedio: </span>
              <strong className="text-emerald-300 font-mono">+{kpiStats.avgMargin}%</strong>
            </div>
          )}
          {kpiStats.highestDiscount > 0 && (
            <div className="hidden sm:flex bg-amber-950/70 border border-amber-800/40 rounded-xl px-3 py-1.5 shadow-sm text-xs items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Máx. Descuento: </span>
              <strong className="text-amber-300 font-mono">+{kpiStats.highestDiscount}%</strong>
            </div>
          )}
        </div>
      </div>

      {/* Filter Component */}
      <AuctionFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalResults={filteredAuctions.length}
      />

      {/* Mobile/Tablet Tab Switcher (Visible only on small screens) */}
      <div className="lg:hidden flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'list'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Columns2 className="w-4 h-4" />
          <span>Lista ({filteredAuctions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            mobileTab === 'map'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>Mapa Interactivo</span>
        </button>
      </div>

      {/* Main Content Layout based on View Mode */}
      {filteredAuctions.length > 0 ? (
        <>
          {/* 1. SPLIT VIEW (Desktop default: Left scrollable list 42% + Right Sticky Map 58%) */}
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Scrollable List of Auction Cards */}
              <div
                className={`lg:col-span-5 space-y-4 lg:max-h-[calc(100vh-210px)] lg:overflow-y-auto lg:pr-2 ${
                  mobileTab === 'map' ? 'hidden lg:block' : 'block'
                }`}
              >
                {filteredAuctions.map((auction) => (
                  <div
                    key={auction.id}
                    ref={(el) => {
                      cardRefs.current[auction.id] = el;
                    }}
                  >
                    <AuctionCard
                      auction={auction}
                      isSelected={selectedAuctionId === auction.id}
                      onSelect={(a) => handleSelectAuction(a)}
                    />
                  </div>
                ))}
              </div>

              {/* Right Column: Interactive Map */}
              <div
                className={`lg:col-span-7 sticky top-20 h-[520px] lg:h-[calc(100vh-210px)] min-h-[480px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 ${
                  mobileTab === 'list' ? 'hidden lg:block' : 'block'
                }`}
              >
                <MapWrapper
                  auctions={filteredAuctions}
                  selectedAuctionId={selectedAuctionId}
                  onSelectAuction={handleSelectAuction}
                  center={
                    selectedAuction?.latitude && selectedAuction?.longitude
                      ? [selectedAuction.latitude, selectedAuction.longitude]
                      : [9.7489, -83.7534]
                  }
                  zoom={selectedAuction ? 12 : 8}
                  height="100%"
                />
              </div>
            </div>
          )}

          {/* 2. GRID VIEW (Full-width 3-column card grid) */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isSelected={selectedAuctionId === auction.id}
                  onSelect={(a) => handleSelectAuction(a)}
                />
              ))}
            </div>
          )}

          {/* 3. FULL MAP VIEW (Expanded map with floating property preview cards) */}
          {viewMode === 'map' && (
            <div className="relative h-[calc(100vh-210px)] min-h-[580px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
              <MapWrapper
                auctions={filteredAuctions}
                selectedAuctionId={selectedAuctionId}
                onSelectAuction={handleSelectAuction}
                center={
                  selectedAuction?.latitude && selectedAuction?.longitude
                    ? [selectedAuction.latitude, selectedAuction.longitude]
                    : [9.7489, -83.7534]
                }
                zoom={selectedAuction ? 13 : 8}
                height="100%"
              />

              {/* Bottom Quick-Carousel Overlay of Cards */}
              <div className="absolute bottom-4 left-4 right-4 z-[400] flex gap-3 overflow-x-auto pb-2 pointer-events-auto snap-x">
                {filteredAuctions.map((auction) => {
                  const isSelected = selectedAuctionId === auction.id;
                  return (
                    <div
                      key={auction.id}
                      onClick={() => handleSelectAuction(auction)}
                      className={`snap-center shrink-0 w-72 sm:w-80 p-3 rounded-xl border backdrop-blur-md cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-950/95 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                          : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="truncate">{auction.district}, {auction.canton}</span>
                        {auction.estimated_margin_pct && (
                          <span className="text-emerald-400 font-mono">
                            +{auction.estimated_margin_pct}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between mt-1 text-xs">
                        <span className="font-extrabold text-white">
                          {formatCurrency(auction.base_price_call_1, auction.currency)}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {auction.folio_real}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4 max-w-lg mx-auto my-12 shadow-xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mx-auto">
            <Scale className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">Esperando Próxima Publicación Judicial</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              La base de datos está lista. El extractor automatizado monitorea y procesa nuevos edictos de remate de los Juzgados de Cobro y Civiles de Costa Rica de lunes a viernes a las 7:00 AM.
            </p>
          </div>
          {filters.search || filters.province !== 'all' || filters.currency !== 'all' ? (
            <Button variant="secondary" size="sm" onClick={handleResetFilters} className="font-semibold text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restablecer Filtros
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Extractor conectado a La Imprenta Nacional</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
