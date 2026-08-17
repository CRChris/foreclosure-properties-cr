'use client';

import React, { useState } from 'react';
import { CostaRicaProvince, Currency, PropertyCategory } from '@/lib/types/auction';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Todas las Categorías', value: 'all' },
  { label: 'Condominio / Apartamento', value: 'Condo' },
  { label: 'Residencial / Casa', value: 'Residential' },
  { label: 'Propiedad de Lujo / Estate', value: 'Luxury Estate' },
  { label: 'Lote / Terreno', value: 'Land/Development' },
  { label: 'Finca Agrícola / Ganadera', value: 'Agricultural' },
  { label: 'Bodega / Industrial', value: 'Industrial' },
  { label: 'Comercial', value: 'Commercial' },
];

export function AuctionFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  viewMode,
  onViewModeChange,
  totalResults,
}: AuctionFilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleUpdate = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  // Count active non-default filters
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

  return (
    <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Primary Bar: Search, Province, Sort & View Modes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="lg:col-span-4">
          <Input
            value={filters.search}
            onChange={(e) => handleUpdate('search', e.target.value)}
            placeholder="Buscar por Cantón, Expediente, Folio, Banco..."
            icon={<Search className="w-4 h-4 text-emerald-400" />}
          />
        </div>

        {/* Province Select */}
        <div className="lg:col-span-3">
          <Select
            value={filters.province}
            onChange={(e) => handleUpdate('province', e.target.value as any)}
            icon={<MapPin className="w-4 h-4 text-emerald-400" />}
          >
            <option value="all">Todas las 7 Provincias</option>
            <option value="San José">San José</option>
            <option value="Alajuela">Alajuela</option>
            <option value="Cartago">Cartago</option>
            <option value="Heredia">Heredia</option>
            <option value="Guanacaste">Guanacaste</option>
            <option value="Puntarenas">Puntarenas</option>
            <option value="Limón">Limón</option>
          </Select>
        </div>

        {/* Sort Select */}
        <div className="lg:col-span-3">
          <Select
            value={filters.sortBy}
            onChange={(e) => handleUpdate('sortBy', e.target.value)}
          >
            <option value="date_asc">Fecha: Próximos Primero</option>
            <option value="date_desc">Fecha: Más Lejanos</option>
            <option value="margin_desc">Mayor Margen / Descuento</option>
            <option value="price_asc">Precio: Menor a Mayor</option>
            <option value="price_desc">Precio: Mayor a Menor</option>
            <option value="area_desc">Área: Mayor a Menor</option>
          </Select>
        </div>

        {/* View Switcher (Desktop & Tablet) */}
        <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              title="Vista Dividida (Mapa + Lista)"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="Vista Cuadrícula de Tarjetas"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('map')}
              title="Vista Mapa Completo"
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Controls Bar: Currency Pills, Margin Slider, Advanced Toggle & Results */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Moneda:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => handleUpdate('currency', 'all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  filters.currency === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('currency', 'USD')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  filters.currency === 'USD'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('currency', 'CRC')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  filters.currency === 'CRC'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CRC (₡)
              </button>
            </div>
          </div>

          {/* Quick Call Stage Toggle */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Señalamiento:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => handleUpdate('callStage', 'all')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  filters.callStage === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('callStage', 'call_1')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  filters.callStage === 'call_1'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1er Remate (100%)
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('callStage', 'call_2')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  filters.callStage === 'call_2'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2do (-25%)
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('callStage', 'call_3')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  filters.callStage === 'call_3'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3er (25%)
              </button>
            </div>
          </div>

          {/* Advanced Filters Button */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
              isAdvancedOpen || activeFilterCount > 0
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros Avanzados</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {isAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            <strong className="text-emerald-400">{totalResults}</strong> {totalResults === 1 ? 'remate' : 'remates'}
          </span>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-xs text-slate-400 hover:text-rose-400 py-1 h-7"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Advanced Filters Panel */}
      {isAdvancedOpen && (
        <div className="pt-3 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Minimum Discount Margin Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Margen Mínimo:
                </span>
                <span className="font-bold text-emerald-400 font-mono">
                  {filters.minMargin > 0 ? `≥ ${filters.minMargin}%` : 'Todos (0%)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={filters.minMargin}
                onChange={(e) => handleUpdate('minMargin', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0%</span>
                <span>25%</span>
                <span>50%+</span>
              </div>
            </div>

            {/* Property Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Tipo de Inmueble
              </label>
              <Select
                value={filters.category}
                onChange={(e) => handleUpdate('category', e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Timeframe */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fecha de Subasta
              </label>
              <Select
                value={filters.timeframe}
                onChange={(e) => handleUpdate('timeframe', e.target.value as any)}
              >
                <option value="all">Cualquier Fecha</option>
                <option value="7_days">Próximos 7 días</option>
                <option value="15_days">Próximos 15 días</option>
                <option value="30_days">Próximos 30 días</option>
                <option value="60_days">Próximos 60 días</option>
              </Select>
            </div>

            {/* Price Range Inputs */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Rango de Precio Base
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleUpdate('minPrice', e.target.value)}
                  className="py-1 text-xs"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleUpdate('maxPrice', e.target.value)}
                  className="py-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
