'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_AUCTIONS } from '@/lib/mock-data';
import { Auction } from '@/lib/types/auction';
import { AuctionRowCard } from '@/components/cards/AuctionRowCard';
import { AuctionCard } from '@/components/cards/AuctionCard';
import { AuctionFilterBar, FilterState, ViewMode } from '@/components/filters/AuctionFilterBar';
import { 
  detectPropertyCharacteristics, 
  getLiveAuctionProgressionState,
  calculateOpportunityAlpha,
} from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { fetchAuctions } from '@/lib/supabase/db';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Link from 'next/link';
import {
  TrendingUp,
  Scale,
  Sparkles,
  RotateCcw,
  ExternalLink,
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
  const [viewMode, setViewMode] = useState<ViewMode>('rows');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);

  // Load live auctions from Supabase data layer on mount
  useEffect(() => {
    let isMounted = true;
    fetchAuctions().then((data) => {
      if (isMounted && data && data.length > 0) {
        setAuctionsData(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
      const currentPrice = liveState.currentBasePrice;
      if (filters.minPrice !== '') {
        const min = parseFloat(filters.minPrice);
        if (!isNaN(min) && currentPrice < min) return false;
      }
      if (filters.maxPrice !== '') {
        const max = parseFloat(filters.maxPrice);
        if (!isNaN(max) && currentPrice > max) return false;
      }

      // 6. Call Stage Filter
      if (filters.callStage !== 'all' && liveState.callStage !== filters.callStage) {
        return false;
      }

      // 7. Construction Status Filter
      if (filters.constructionStatus === 'built' && !chars.hasConstruction) {
        return false;
      }
      if (filters.constructionStatus === 'land' && chars.hasConstruction) {
        return false;
      }

      // 8. Public Road Access Filter
      if (filters.roadFrontage === 'public_road' && !chars.hasPublicRoad) {
        return false;
      }
      if (filters.roadFrontage === 'private' && chars.hasPublicRoad) {
        return false;
      }

      // 9. Mortgage Claim Seniority
      if (filters.mortgagePriority !== 'all' && chars.mortgagePriority !== filters.mortgagePriority) {
        return false;
      }

      // 10. Deal Alpha Grade Filter
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

  // Check if user has active filters
  const hasActiveFilters = [
    filters.search.trim() !== '',
    filters.propertyType !== 'all',
    filters.province !== 'all',
    filters.callStage !== 'all',
    filters.dealGrade !== 'all',
    filters.currency !== 'all',
    filters.priceBracket !== 'all' || filters.minPrice !== '' || filters.maxPrice !== '',
    filters.constructionStatus !== 'all',
    filters.roadFrontage !== 'all',
    filters.mortgagePriority !== 'all',
    filters.minMargin > 0,
    filters.timeframe !== 'all',
  ].some(Boolean);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Live Investor KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'es' ? 'Catálogo de Remates Judiciales' : 'Judicial Foreclosure Catalog'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.nav.brandSubtitle}
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-sm text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t.kpi.activeForeclosures}: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm ml-1">{kpiStats.total}</strong>
          </div>
          {kpiStats.avgMargin > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/40 rounded-xl px-3.5 py-2 shadow-sm text-xs flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-900 dark:text-slate-300 font-medium">{t.kpi.avgDiscount}: </span>
              <strong className="text-emerald-700 dark:text-emerald-300 font-mono font-bold text-sm ml-1">+{kpiStats.avgMargin}%</strong>
            </div>
          )}
          {kpiStats.highestDiscount > 0 && (
            <div className="hidden sm:flex bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3.5 py-2 shadow-sm text-xs items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-900 dark:text-slate-300 font-medium">{language === 'es' ? 'Máx. Descuento:' : 'Max Discount:'} </span>
              <strong className="text-amber-700 dark:text-amber-300 font-mono font-bold text-sm ml-1">+{kpiStats.highestDiscount}%</strong>
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

      {/* Main Content: Row-based Foreclosure List (or optional Grid View) */}
      {filteredAuctions.length > 0 ? (
        <div className="w-full">
          {viewMode === 'rows' ? (
            /* 1. ROW LIST VIEW (Default & Primary) */
            <div className="space-y-3.5 sm:space-y-4">
              {filteredAuctions.map((auction) => (
                <AuctionRowCard
                  key={auction.id}
                  auction={auction}
                  isSelected={selectedAuctionId === auction.id}
                  onSelect={(a) => setSelectedAuctionId(a.id)}
                />
              ))}
            </div>
          ) : (
            /* 2. GRID VIEW (Optional Full-width 3-column card grid) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isSelected={selectedAuctionId === auction.id}
                  onSelect={(a) => setSelectedAuctionId(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 sm:p-12 text-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 max-w-lg mx-auto my-12 shadow-xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <Scale className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {hasActiveFilters || auctionsData.length > 0 ? t.empty.noResultsTitle : t.empty.waitingTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              {hasActiveFilters || auctionsData.length > 0 ? t.empty.noResultsDesc : t.empty.waitingDesc}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="secondary" size="sm" onClick={handleResetFilters} className="font-semibold text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t.empty.resetFilters}
            </Button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>{t.empty.connectedStatus}</span>
            </div>
          )}
        </div>
      )}

      {/* Catalog Micro-Notice Banner */}
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11.5px] text-slate-600 dark:text-slate-400 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>{t.disclaimer.micro.text}</span>
        <Link href="/terms" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
          {t.nav.terms}
        </Link>
      </div>
    </div>
  );
}
