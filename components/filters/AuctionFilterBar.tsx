'use client';

import React, { useState } from 'react';
import { CostaRicaProvince, Currency, PropertyCategory } from '@/lib/types/auction';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid,
  Columns2,
  Map as MapIcon,
  DollarSign,
  TrendingUp,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building,
} from 'lucide-react';

export type ViewMode = 'split' | 'grid' | 'map';

export interface FilterState {
  search: string;
  province: CostaRicaProvince | 'all';
  currency: Currency | 'all';
  minPrice: string;
  maxPrice: string;
  minMargin: number;
  callStage: 'all' | 'call_1' | 'call_2' | 'call_3';
  category: string;
  timeframe: 'all' | '7_days' | '15_days' | '30_days' | '60_days';
  sortBy: string;
}

export interface AuctionFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalResults: number;
}

const PROVINCES: (CostaRicaProvince | 'all')[] = [
  'all',
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
];

export function AuctionFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
  totalResults,
}: AuctionFilterBarProps) {
  const { t } = useLanguage();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const CATEGORIES = [
    { label: t.filters.allCategories, value: 'all' },
    { label: t.filters.condo, value: 'Condo' },
    { label: t.filters.residential, value: 'Residential' },
    { label: t.filters.luxuryEstate, value: 'Luxury Estate' },
    { label: t.filters.land, value: 'Land/Development' },
    { label: t.filters.agricultural, value: 'Agricultural' },
    { label: t.filters.industrial, value: 'Industrial' },
    { label: t.filters.commercial, value: 'Commercial' },
  ];

  // Count active filters (excluding defaults)
  const activeFilterCount = [
    filters.search.trim() !== '',
    filters.province !== 'all',
    filters.currency !== 'all',
    filters.minPrice !== '',
    filters.maxPrice !== '',
    filters.minMargin > 0,
    filters.callStage !== 'all',
    filters.category !== 'all',
    filters.timeframe !== 'all',
  ].filter(Boolean).length;

  const handleUpdate = (field: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md">
      {/* 1. Top Primary Controls Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Input
            value={filters.search}
            onChange={(e) => handleUpdate('search', e.target.value)}
            placeholder={t.filters.searchPlaceholder}
            icon={<Search className="w-4 h-4 text-slate-400" />}
            className="w-full text-xs sm:text-sm h-11"
          />
          {filters.search && (
            <button
              onClick={() => handleUpdate('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Dropdowns & Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Province Dropdown */}
          <Select
            value={filters.province}
            onChange={(e) => handleUpdate('province', e.target.value as any)}
            className="text-xs h-11 min-w-[140px] bg-slate-950"
          >
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? t.filters.allProvinces : p}
              </option>
            ))}
          </Select>

          {/* Currency Switcher */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 h-11 items-center">
            <button
              type="button"
              onClick={() => handleUpdate('currency', 'all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filters.currency === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.filters.currencyAll.split(':')[1]?.trim() || 'All'}
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('currency', 'USD')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filters.currency === 'USD'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              USD $
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('currency', 'CRC')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filters.currency === 'CRC'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CRC ₡
            </button>
          </div>

          {/* Advanced Filters Toggle Button */}
          <Button
            variant={isAdvancedOpen || activeFilterCount > 0 ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="h-11 text-xs font-bold relative"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
            {isAdvancedOpen ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>

          {/* View Mode Switcher (Desktop) */}
          <div className="hidden sm:flex rounded-xl bg-slate-950 p-1 border border-slate-800 h-11 items-center">
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              className={`p-2 rounded-lg text-xs transition-all ${
                viewMode === 'split'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.splitView}
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg text-xs transition-all ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.gridView}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('map')}
              className={`p-2 rounded-lg text-xs transition-all ${
                viewMode === 'map'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.mapView}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Collapsible Advanced Filters Tray */}
      {isAdvancedOpen && (
        <div className="pt-4 mt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Discount Margin Slider */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                {t.filters.minMargin}:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {filters.minMargin > 0 ? `≥ ${filters.minMargin}%` : t.filters.minMarginAny}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={filters.minMargin}
              onChange={(e) => handleUpdate('minMargin', Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0%</span>
              <span>25%</span>
              <span>50%+</span>
            </div>
          </div>

          {/* Call Stage Filter */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 block">
              {t.filters.callStage}
            </label>
            <Select
              value={filters.callStage}
              onChange={(e) => handleUpdate('callStage', e.target.value as any)}
              className="w-full text-xs h-9"
            >
              <option value="all">{t.filters.allStages}</option>
              <option value="call_1">{t.filters.call1}</option>
              <option value="call_2">{t.filters.call2}</option>
              <option value="call_3">{t.filters.call3}</option>
            </Select>
          </div>

          {/* Property Category */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 block">
              {t.filters.category}
            </label>
            <Select
              value={filters.category}
              onChange={(e) => handleUpdate('category', e.target.value)}
              className="w-full text-xs h-9"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Sort By Select */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 block">
              {t.filters.sortBy}
            </label>
            <Select
              value={filters.sortBy}
              onChange={(e) => handleUpdate('sortBy', e.target.value)}
              className="w-full text-xs h-9"
            >
              <option value="date_asc">{t.filters.sortDateAsc}</option>
              <option value="margin_desc">{t.filters.sortMarginDesc}</option>
              <option value="price_asc">{t.filters.sortPriceAsc}</option>
              <option value="price_desc">{t.filters.sortPriceDesc}</option>
            </Select>
          </div>
        </div>
      )}

      {/* 3. Bottom Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white font-mono">{totalResults}</span>
          <span>{t.filters.showingResults}</span>
          {activeFilterCount > 0 && (
            <Badge variant="default" size="sm">
              {activeFilterCount} {t.filters.activeFilters}
            </Badge>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.filters.resetFilters}</span>
          </button>
        )}
      </div>
    </div>
  );
}
