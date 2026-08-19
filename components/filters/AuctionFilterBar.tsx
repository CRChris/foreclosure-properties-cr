'use client';

import React, { useState } from 'react';
import { CostaRicaProvince, Currency, PropertyType, MortgagePriority } from '@/lib/types/auction';
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
  Rows3,
  LayoutGrid,
  Map as MapIcon,
  DollarSign,
  TrendingUp,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  Home,
  Maximize2,
  Trees,
  Warehouse,
  Scale,
  Compass,
  ArrowUpDown,
  Building,
  TreePine,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Award,
} from 'lucide-react';

export type ViewMode = 'rows' | 'grid';

export interface FilterState {
  search: string;
  propertyType: PropertyType | 'all';
  province: CostaRicaProvince | 'all';
  currency: Currency | 'all';
  minPrice: string;
  maxPrice: string;
  priceBracket: 'all' | 'under_100k' | '100k_250k' | '250k_500k' | 'over_500k';
  minMargin: number;
  callStage: 'all' | 'call_1' | 'call_2' | 'call_3' | 'passed_call_3';
  dealGrade: 'all' | 'AAA' | 'AAA_AA' | 'A_PLUS' | 'B_PLUS';
  constructionStatus: 'all' | 'built' | 'land';
  roadFrontage: 'all' | 'public_road' | 'private';
  mortgagePriority: 'all' | '1st_mortgage' | '2nd_mortgage' | 'embargo_judicial';
  timeframe: 'all' | '7_days' | '15_days' | '30_days' | '60_days';
  sortBy: 'score_desc' | 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc' | 'province_asc' | 'margin_desc' | 'area_desc';
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
  const { t, language } = useLanguage();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Property types list
  const PROPERTY_TYPES: { label: string; value: PropertyType | 'all'; icon: any }[] = [
    { label: t.filters.allPropertyTypes, value: 'all', icon: Filter },
    { label: t.filters.typeSingleFamily, value: 'single_family_home', icon: Home },
    { label: t.filters.typeCondo, value: 'condo_apartment', icon: Building2 },
    { label: t.filters.typeLot, value: 'building_lot', icon: Maximize2 },
    { label: t.filters.typeAgricultural, value: 'agricultural_land', icon: Trees },
    { label: t.filters.typeCommercial, value: 'commercial_industrial', icon: Warehouse },
  ];

  // Call stages
  const CALL_STAGES = [
    { label: t.filters.allStages, value: 'all' },
    { label: language === 'es' ? '1° Remate (100% Base)' : '1st Call (100% Base)', value: 'call_1' },
    { label: language === 'es' ? '2° Remate (-25% Descuento)' : '2nd Call (-25% Discount)', value: 'call_2' },
    { label: language === 'es' ? '3° Remate (-75% Descuento)' : '3rd Call (-75% Discount)', value: 'call_3' },
    { label: language === 'es' ? 'Vencidos / En Adjudicación' : 'Expired / In Adjudication', value: 'passed_call_3' },
  ];

  // Sort options
  const SORT_OPTIONS: { label: string; value: FilterState['sortBy'] }[] = [
    { label: t.filters.sortScoreDesc, value: 'score_desc' },
    { label: t.filters.sortDateAsc, value: 'date_asc' },
    { label: t.filters.sortDateDesc, value: 'date_desc' },
    { label: t.filters.sortMarginDesc, value: 'margin_desc' },
    { label: t.filters.sortPriceAsc, value: 'price_asc' },
    { label: t.filters.sortPriceDesc, value: 'price_desc' },
    { label: t.filters.sortProvinceAsc, value: 'province_asc' },
    { label: t.filters.sortAreaDesc, value: 'area_desc' },
  ];

  // Deal grades list
  const DEAL_GRADES: { label: string; value: FilterState['dealGrade'] }[] = [
    { label: t.filters.allDealGrades, value: 'all' },
    { label: t.filters.gradeAAAOnly, value: 'AAA' },
    { label: t.filters.gradeTopTier, value: 'AAA_AA' },
    { label: t.filters.gradeAPlus, value: 'A_PLUS' },
    { label: t.filters.gradeBPlus, value: 'B_PLUS' },
  ];

  // Price brackets quick picker
  const PRICE_BRACKETS = [
    { label: t.filters.priceAny, value: 'all' },
    { label: t.filters.priceUnder100k, value: 'under_100k' },
    { label: t.filters.price100k250k, value: '100k_250k' },
    { label: t.filters.price250k500k, value: '250k_500k' },
    { label: t.filters.priceOver500k, value: 'over_500k' },
  ];

  // Count active filters (excluding defaults)
  const activeFilterCount = [
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
  ].filter(Boolean).length;

  const handleUpdate = (field: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const handlePriceBracket = (bracket: FilterState['priceBracket']) => {
    let min = '';
    let max = '';
    if (bracket === 'under_100k') {
      min = '0';
      max = '100000';
    } else if (bracket === '100k_250k') {
      min = '100000';
      max = '250000';
    } else if (bracket === '250k_500k') {
      min = '250000';
      max = '500000';
    } else if (bracket === 'over_500k') {
      min = '500000';
      max = '';
    }
    onFilterChange({
      ...filters,
      priceBracket: bracket,
      minPrice: min,
      maxPrice: max,
    });
  };

  return (
    <div className="space-y-3 bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      {/* 1. Primary Filter Bar Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input (Expediente, Canton, District, Bank, Folio) */}
        <div className="lg:col-span-4 relative">
          <Input
            value={filters.search}
            onChange={(e) => handleUpdate('search', e.target.value)}
            placeholder={t.filters.searchPlaceholder}
            icon={<Search className="w-4 h-4 text-slate-400" />}
            className="w-full text-xs sm:text-sm h-11 bg-slate-950"
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

        {/* 1. Type of Property Filter */}
        <div className="lg:col-span-2">
          <Select
            value={filters.propertyType}
            onChange={(e) => handleUpdate('propertyType', e.target.value as any)}
            className="w-full text-xs h-11 bg-slate-950 font-medium"
          >
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </Select>
        </div>

        {/* 2. Location (Province) Filter */}
        <div className="lg:col-span-2">
          <Select
            value={filters.province}
            onChange={(e) => handleUpdate('province', e.target.value as any)}
            className="w-full text-xs h-11 bg-slate-950 font-medium"
          >
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? t.filters.allProvinces : p}
              </option>
            ))}
          </Select>
        </div>

        {/* 3. Call Stage Filter (1st, 2nd, 3rd Call) */}
        <div className="lg:col-span-2">
          <Select
            value={filters.callStage}
            onChange={(e) => handleUpdate('callStage', e.target.value as any)}
            className="w-full text-xs h-11 bg-slate-950 font-medium"
          >
            {CALL_STAGES.map((cs) => (
              <option key={cs.value} value={cs.value}>
                {cs.label}
              </option>
            ))}
          </Select>
        </div>

        {/* 4. Sort By Dropdown */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <Select
            value={filters.sortBy}
            onChange={(e) => handleUpdate('sortBy', e.target.value as any)}
            className="w-full text-xs h-11 bg-slate-950 font-medium text-emerald-400 border-emerald-500/30"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* 2. Secondary Quick-Filter & Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        {/* Quick Price Range Brackets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.filters.priceRange}:</span>
          </span>
          {PRICE_BRACKETS.map((pb) => {
            const isSelected = filters.priceBracket === pb.value;
            return (
              <button
                key={pb.value}
                type="button"
                onClick={() => handlePriceBracket(pb.value as any)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {pb.label}
              </button>
            );
          })}
        </div>

        {/* Currency Switcher, Advanced Toggle & View Switcher */}
        <div className="flex items-center gap-2">
          {/* Currency Switcher */}
          <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 h-9 items-center">
            <button
              type="button"
              onClick={() => handleUpdate('currency', 'all')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filters.currency === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {language === 'es' ? 'Todas' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => handleUpdate('currency', 'USD')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
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
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filters.currency === 'CRC'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CRC ₡
            </button>
          </div>

          {/* Advanced Legal & Financial Filters Toggle */}
          <Button
            variant={isAdvancedOpen || activeFilterCount > 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="h-9 text-xs font-bold relative px-3"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            <span>{language === 'es' ? 'Filtros Legales' : 'Legal Filters'}</span>
            {activeFilterCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
            {isAdvancedOpen ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </Button>

          {/* View Mode Switcher (Desktop) */}
          <div className="hidden md:flex rounded-xl bg-slate-950 p-0.5 border border-slate-800 h-9 items-center">
            <button
              type="button"
              onClick={() => onViewModeChange('rows')}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === 'rows'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.rowsView || 'Row List View'}
            >
              <Rows3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={t.filters.gridView}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Advanced Legal & Financial Filters Drawer */}
      {isAdvancedOpen && (
        <div className="pt-4 mt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Opportunity Alpha Rating Filter */}
          <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.filters.dealGrade}</span>
            </label>
            <Select
              value={filters.dealGrade}
              onChange={(e) => handleUpdate('dealGrade', e.target.value as any)}
              className="w-full text-xs h-9 bg-slate-900"
            >
              {DEAL_GRADES.map((dg) => (
                <option key={dg.value} value={dg.value}>
                  {dg.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Construction Status Filter */}
          <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.filters.constructionStatus}</span>
            </label>
            <Select
              value={filters.constructionStatus}
              onChange={(e) => handleUpdate('constructionStatus', e.target.value as any)}
              className="w-full text-xs h-9 bg-slate-900"
            >
              <option value="all">{t.filters.allConstruction}</option>
              <option value="built">{t.filters.builtOnly}</option>
              <option value="land">{t.filters.landOnly}</option>
            </Select>
          </div>

          {/* Road Access / Frontage Filter */}
          <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.filters.roadFrontage}</span>
            </label>
            <Select
              value={filters.roadFrontage}
              onChange={(e) => handleUpdate('roadFrontage', e.target.value as any)}
              className="w-full text-xs h-9 bg-slate-900"
            >
              <option value="all">{t.filters.allAccess}</option>
              <option value="public_road">{t.filters.publicRoadOnly}</option>
              <option value="private">{t.filters.privateAccessOnly}</option>
            </Select>
          </div>

          {/* Mortgage Claim Seniority */}
          <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.filters.mortgagePriority}</span>
            </label>
            <Select
              value={filters.mortgagePriority}
              onChange={(e) => handleUpdate('mortgagePriority', e.target.value as any)}
              className="w-full text-xs h-9 bg-slate-900"
            >
              <option value="all">{t.filters.allPriorities}</option>
              <option value="1st_mortgage">{t.filters.firstMortgageOnly}</option>
              <option value="2nd_mortgage">{t.filters.secondMortgageOnly}</option>
              <option value="embargo_judicial">{t.filters.embargoOnly}</option>
            </Select>
          </div>

          {/* Discount Margin Slider */}
          <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.filters.minMargin}:</span>
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
        </div>
      )}

      {/* 4. Active Filters Chips & Results Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold text-white font-mono text-sm">{totalResults}</span>
          <span className="text-slate-300 font-medium">{t.filters.showingResults}</span>

          {/* Active Filter Chips */}
          {filters.propertyType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              <span>{PROPERTY_TYPES.find((p) => p.value === filters.propertyType)?.label}</span>
              <button onClick={() => handleUpdate('propertyType', 'all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.province !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              <span>{filters.province}</span>
              <button onClick={() => handleUpdate('province', 'all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.callStage !== 'all' && (() => {
            let chipStyle = 'bg-slate-800 text-slate-200 border-slate-700';
            if (filters.callStage === 'call_1') chipStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
            if (filters.callStage === 'call_2') chipStyle = 'bg-yellow-950/80 text-yellow-300 border-yellow-500/40';
            if (filters.callStage === 'call_3') chipStyle = 'bg-orange-950/80 text-orange-300 border-orange-500/40';
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${chipStyle}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  filters.callStage === 'call_1' ? 'bg-emerald-400' : filters.callStage === 'call_2' ? 'bg-yellow-400' : filters.callStage === 'call_3' ? 'bg-orange-400' : 'bg-slate-400'
                }`} />
                <span>{CALL_STAGES.find((c) => c.value === filters.callStage)?.label}</span>
                <button onClick={() => handleUpdate('callStage', 'all')} className="hover:text-white ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })()}

          {filters.dealGrade !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[11px]">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{DEAL_GRADES.find((dg) => dg.value === filters.dealGrade)?.label}</span>
              <button onClick={() => handleUpdate('dealGrade', 'all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.priceBracket !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              <span>{PRICE_BRACKETS.find((pb) => pb.value === filters.priceBracket)?.label}</span>
              <button onClick={() => handlePriceBracket('all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.constructionStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              <span>{filters.constructionStatus === 'built' ? t.filters.builtOnly : t.filters.landOnly}</span>
              <button onClick={() => handleUpdate('constructionStatus', 'all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.roadFrontage !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              <span>{filters.roadFrontage === 'public_road' ? t.filters.publicRoadOnly : t.filters.privateAccessOnly}</span>
              <button onClick={() => handleUpdate('roadFrontage', 'all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.mortgagePriority !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              <span>{filters.mortgagePriority === '1st_mortgage' ? '1° Hipoteca' : filters.mortgagePriority === '2nd_mortgage' ? '2° Hipoteca' : 'Embargo'}</span>
              <button onClick={() => handleUpdate('mortgagePriority', 'all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.minMargin > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[11px]">
              <span>≥ {filters.minMargin}% {t.card.estimatedMargin}</span>
              <button onClick={() => handleUpdate('minMargin', 0)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.filters.resetFilters}</span>
          </button>
        )}
      </div>
    </div>
  );
}
