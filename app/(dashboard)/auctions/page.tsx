'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { Auction } from '@/lib/types/auction';
import { AuctionCard } from '@/components/cards/AuctionCard';
import { AuctionFilterBar, FilterState, ViewMode } from '@/components/filters/AuctionFilterBar';
import { MapWrapper } from '@/components/map/MapWrapper';
import { 
  formatCurrency, 
  detectPropertyCharacteristics, 
  getLiveAuctionProgressionState,
  calculateOpportunityAlpha,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { fetchAuctions } from '@/lib/supabase/db';
import { useLanguage } from '@/lib/i18n/LanguageContext';
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
  propertyType: 'all',
  province: 'all',
  currency: 'all',
  minPrice: '',
  maxPrice: '',
  priceBracket: 'all',
  minMargin: 0,
  callStage: 'all',
  dealGrade: 'all',
  constructionStatus: 'all',
  roadFrontage: 'all',
  mortgagePriority: 'all',
  timeframe: 'all',
  sortBy: 'date_asc',
};

export default function AuctionsPage() {
  const { t, language } = useLanguage();
  const [auctionsData, setAuctionsData] = useState<Auction[]>(MOCK_AUCTIONS);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  // Load live auctions from Supabase data layer on mount
  useEffect(() => {
    let isMounted = true;
    fetchAuctions().then((data) => {
      if (isMounted && data && data.length > 0) {
        setAuctionsData(data);
        // Do not auto-select first auction so map starts showing all of Costa Rica
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Ref to card containers for automatic smooth scrolling
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter & sort auctions based on active filters
  const filteredAuctions = useMemo(() => {
    return auctionsData.filter((auction) => {
      const chars = detectPropertyCharacteristics(auction);
      const liveState = getLiveAuctionProgressionState(auction);

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
          (auction.defendant && auction.defendant.toLowerCase().includes(q)) ||
          (auction.legal_summary && auction.legal_summary.toLowerCase().includes(q)) ||
          (auction.address_description && auction.address_description.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // 2. Type of Property Filter
      if (filters.propertyType !== 'all' && chars.propertyType !== filters.propertyType) {
        return false;
      }

      // 3. Province Filter
      if (filters.province !== 'all' && auction.province !== filters.province) {
        return false;
      }

      // 4. Currency Filter
      if (filters.currency !== 'all' && auction.currency !== filters.currency) {
        return false;
      }

      // 5. Price Range Filter (Comparing live active call base price)
      const activePrice = liveState.currentBasePrice || auction.base_price_call_1;

      if (filters.minPrice && activePrice < Number(filters.minPrice)) {
        return false;
      }
      if (filters.maxPrice && activePrice > Number(filters.maxPrice)) {
        return false;
      }

      // 6. Call Stage Filter (Comparing live progression stage)
      if (filters.callStage !== 'all') {
        if (liveState.callStage !== filters.callStage) {
          return false;
        }
      } else {
        // By default (when callStage is 'all'), strictly exclude properties that have elapsed all 3 calls
        if (liveState.callStage === 'passed_call_3' || liveState.saleStatus === 'deserted') {
          return false;
        }
      }

      // 7. Construction Status Filter
      if (filters.constructionStatus === 'built' && !chars.hasConstruction) {
        return false;
      }
      if (filters.constructionStatus === 'land' && chars.hasConstruction) {
        return false;
      }

      // 8. Road Frontage Filter
      if (filters.roadFrontage === 'public_road' && !chars.hasPublicRoad) {
        return false;
      }
      if (filters.roadFrontage === 'private' && chars.hasPublicRoad) {
        return false;
      }

      // 9. Mortgage Claim Seniority Filter
      if (filters.mortgagePriority !== 'all' && chars.mortgagePriority !== filters.mortgagePriority) {
        return false;
      }

      // 10. Opportunity Alpha Rating Filter
      if (filters.dealGrade !== 'all') {
        const alpha = calculateOpportunityAlpha(auction);
        if (filters.dealGrade === 'AAA' && alpha.grade !== 'AAA') {
          return false;
        }
        if (filters.dealGrade === 'AAA_AA' && !['AAA', 'AA'].includes(alpha.grade)) {
          return false;
        }
        if (filters.dealGrade === 'A_PLUS' && !['AAA', 'AA', 'A'].includes(alpha.grade)) {
          return false;
        }
        if (filters.dealGrade === 'B_PLUS' && alpha.grade === 'C') {
          return false;
        }
      }

      // 11. Discount Margin Filter (Slider)
      if (filters.minMargin > 0) {
        const margin = auction.estimated_margin_pct || 0;
        if (margin < filters.minMargin) {
          return false;
        }
      }

      // 12. Timeframe Filter
      if (filters.timeframe !== 'all') {
        const auctionDate = new Date(auction.auction_date_call_1).getTime();
        const now = Date.now();
        const daysDiff = (auctionDate - now) / (1000 * 60 * 60 * 24);

        if (filters.timeframe === '7_days' && (daysDiff < 0 || daysDiff > 7)) return false;
        if (filters.timeframe === '15_days' && (daysDiff < 0 || daysDiff > 15)) return false;
        if (filters.timeframe === '30_days' && (daysDiff < 0 || daysDiff > 30)) return false;
        if (filters.timeframe === '60_days' && (daysDiff < 0 || daysDiff > 60)) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      if (filters.sortBy === 'score_desc') {
        const scoreA = calculateOpportunityAlpha(a).score;
        const scoreB = calculateOpportunityAlpha(b).score;
        return scoreB - scoreA;
      }
      if (filters.sortBy === 'price_asc') {
        return a.base_price_call_1 - b.base_price_call_1;
      }
      if (filters.sortBy === 'price_desc') {
        return b.base_price_call_1 - a.base_price_call_1;
      }
      if (filters.sortBy === 'date_asc') {
        return new Date(a.auction_date_call_1).getTime() - new Date(b.auction_date_call_1).getTime();
      }
      if (filters.sortBy === 'date_desc') {
        return new Date(b.auction_date_call_1).getTime() - new Date(a.auction_date_call_1).getTime();
      }
      if (filters.sortBy === 'province_asc') {
        return a.province.localeCompare(b.province) || a.canton.localeCompare(b.canton);
      }
      if (filters.sortBy === 'margin_desc') {
        return (b.estimated_margin_pct || 0) - (a.estimated_margin_pct || 0);
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
            <span>{language === 'es' ? 'Remates Judiciales Costa Rica' : 'Costa Rica Judicial Foreclosures'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.nav.brandSubtitle}
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm text-xs">
            <span className="text-slate-400">{t.kpi.activeForeclosures}: </span>
            <strong className="text-emerald-400 font-mono">{kpiStats.total}</strong>
          </div>
          {kpiStats.avgMargin > 0 && (
            <div className="bg-emerald-950/70 border border-emerald-800/40 rounded-xl px-3 py-1.5 shadow-sm text-xs flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">{t.kpi.avgDiscount}: </span>
              <strong className="text-emerald-300 font-mono">+{kpiStats.avgMargin}%</strong>
            </div>
          )}
          {kpiStats.highestDiscount > 0 && (
            <div className="hidden sm:flex bg-amber-950/70 border border-amber-800/40 rounded-xl px-3 py-1.5 shadow-sm text-xs items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">{language === 'es' ? 'Máx. Descuento:' : 'Max Discount:'} </span>
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
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'list'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t.filters.listTab} ({filteredAuctions.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileTab === 'map'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t.filters.mapTab}
        </button>
      </div>

      {/* Main Content Layout based on ViewMode */}
      {filteredAuctions.length > 0 ? (
        <>
          {/* 1. SPLIT VIEW (Default: Scrollable Left Card Feed + Sticky Interactive Right Map) */}
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
                      : [9.7489, -84.05]
                  }
                  zoom={selectedAuction ? 13 : 7.5}
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
            <div className="relative h-[calc(100vh-230px)] min-h-[580px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
              <MapWrapper
                auctions={filteredAuctions}
                selectedAuctionId={selectedAuctionId}
                onSelectAuction={handleSelectAuction}
                center={
                  selectedAuction?.latitude && selectedAuction?.longitude
                    ? [selectedAuction.latitude, selectedAuction.longitude]
                    : [9.7489, -84.05]
                }
                zoom={selectedAuction ? 13 : 7.5}
                height="100%"
              />

              {/* Floating Bottom Preview Strip */}
              <div className="absolute bottom-4 left-4 right-4 z-[1000] flex gap-3 overflow-x-auto pb-2 snap-x">
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
            <h3 className="text-lg font-bold text-white">{t.empty.waitingTitle}</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {t.empty.waitingDesc}
            </p>
          </div>
          {filters.search || filters.province !== 'all' || filters.currency !== 'all' ? (
            <Button variant="secondary" size="sm" onClick={handleResetFilters} className="font-semibold text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t.empty.resetFilters}
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.empty.connectedStatus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
