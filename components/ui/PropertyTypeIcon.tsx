'use client';

import React from 'react';
import { Home, Building2, Maximize2, Trees, Warehouse, MapPin, LucideIcon } from 'lucide-react';
import { PropertyType } from '@/lib/types/auction';

export interface PropertyTypeConfig {
  icon: LucideIcon;
  labelEs: string;
  labelEn: string;
  shortLabelEs: string;
  shortLabelEn: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
  gradientBg: string;
  iconGlow: string;
}

export const PROPERTY_TYPE_CONFIGS: Record<PropertyType, PropertyTypeConfig> = {
  single_family_home: {
    icon: Home,
    labelEs: 'Casa de Habitación',
    labelEn: 'Single-Family Home',
    shortLabelEs: 'Casa',
    shortLabelEn: 'House',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-500/40',
    badgeBg: 'bg-amber-950/60',
    gradientBg: 'from-amber-950/40 via-slate-900 to-slate-950',
    iconGlow: 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]',
  },
  condo_apartment: {
    icon: Building2,
    labelEs: 'Condominio / Filial',
    labelEn: 'Condo / Apartment',
    shortLabelEs: 'Condo',
    shortLabelEn: 'Condo',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-500/40',
    badgeBg: 'bg-indigo-950/60',
    gradientBg: 'from-indigo-950/40 via-slate-900 to-slate-950',
    iconGlow: 'text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]',
  },
  building_lot: {
    icon: Maximize2,
    labelEs: 'Lote para Construir',
    labelEn: 'Building Lot / Land',
    shortLabelEs: 'Lote',
    shortLabelEn: 'Lot',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-950/60',
    gradientBg: 'from-emerald-950/40 via-slate-900 to-slate-950',
    iconGlow: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]',
  },
  agricultural_land: {
    icon: Trees,
    labelEs: 'Finca Agrícola / Repastos',
    labelEn: 'Agricultural Land / Farm',
    shortLabelEs: 'Finca',
    shortLabelEn: 'Farm',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-600/40',
    badgeBg: 'bg-emerald-950/70',
    gradientBg: 'from-emerald-950/50 via-slate-900 to-slate-950',
    iconGlow: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(5,150,105,0.4)]',
  },
  commercial_industrial: {
    icon: Warehouse,
    labelEs: 'Comercial / Bodega',
    labelEn: 'Commercial / Industrial',
    shortLabelEs: 'Comercial',
    shortLabelEn: 'Commercial',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/40',
    badgeBg: 'bg-purple-950/60',
    gradientBg: 'from-purple-950/40 via-slate-900 to-slate-950',
    iconGlow: 'text-purple-400 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]',
  },
  other: {
    icon: MapPin,
    labelEs: 'Inmueble General',
    labelEn: 'General Real Estate',
    shortLabelEs: 'Inmueble',
    shortLabelEn: 'Property',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-700/60',
    badgeBg: 'bg-slate-900/80',
    gradientBg: 'from-slate-900/60 via-slate-950 to-slate-950',
    iconGlow: 'text-slate-400 drop-shadow-[0_0_12px_rgba(148,163,184,0.3)]',
  },
};

/**
 * Determine property type from text if undefined
 */
export function inferPropertyType(text: string): PropertyType {
  const s = text.toLowerCase();
  if (s.includes('condominio') || s.includes('filial') || s.includes('apartamento') || s.includes('penthouse')) {
    return 'condo_apartment';
  }
  if (s.includes('casa') || s.includes('habitación') || s.includes('habitacion') || s.includes('unifamiliar') || s.includes('residencial') || s.includes('quinta') || s.includes('villa')) {
    return 'single_family_home';
  }
  if (s.includes('comercial') || s.includes('oficina') || s.includes('bodega') || s.includes('industrial') || s.includes('local')) {
    return 'commercial_industrial';
  }
  if (s.includes('finca') || s.includes('agrícola') || s.includes('agricola') || s.includes('repasto') || s.includes('ganadera') || s.includes('cultivo')) {
    return 'agricultural_land';
  }
  if (s.includes('lote') || s.includes('terreno') || s.includes('solar') || s.includes('para construir') || s.includes('desarrollo')) {
    return 'building_lot';
  }
  return 'other';
}

/**
 * Property Type Badge Pill
 */
export function PropertyTypeBadge({
  type = 'other',
  language = 'es',
  size = 'md',
  className = '',
}: {
  type?: PropertyType;
  language?: 'es' | 'en';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const config = PROPERTY_TYPE_CONFIGS[type] || PROPERTY_TYPE_CONFIGS.other;
  const Icon = config.icon;
  const label = language === 'en' ? config.labelEn : config.labelEs;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-lg border backdrop-blur-md shadow-sm ${config.badgeBg} ${config.borderColor} ${config.textColor} ${sizeClasses[size]} ${className}`}
    >
      <Icon className={`${iconSizes[size]} shrink-0`} />
      <span>{label}</span>
    </span>
  );
}

/**
 * Structured Category Hero Banner replacing photo thumbnail
 */
export function PropertyTypeBanner({
  type = 'other',
  language = 'es',
  canton,
  district,
  province,
  areaM2,
  isCondominio,
  hasConstruction,
  className = '',
}: {
  type?: PropertyType;
  language?: 'es' | 'en';
  canton?: string;
  district?: string;
  province?: string;
  areaM2?: number;
  isCondominio?: boolean;
  hasConstruction?: boolean;
  className?: string;
}) {
  const config = PROPERTY_TYPE_CONFIGS[type] || PROPERTY_TYPE_CONFIGS.other;
  const Icon = config.icon;
  const label = language === 'en' ? config.labelEn : config.labelEs;

  return (
    <div
      className={`relative w-full h-full min-h-[160px] rounded-2xl overflow-hidden bg-gradient-to-br ${config.gradientBg} border border-slate-800/80 p-5 flex flex-col justify-between select-none shadow-inner ${className}`}
    >
      {/* Subtle Background Architectural Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Large Decorative Icon Background Silhouette */}
      <div className="absolute -right-4 -bottom-6 opacity-10 pointer-events-none text-white transition-transform group-hover:scale-110 duration-500">
        <Icon className="w-36 h-36" strokeWidth={1} />
      </div>

      {/* Top Row: Category Pill & Construction Status */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className={`p-2 rounded-xl border ${config.badgeBg} ${config.borderColor} shadow-md`}>
            <Icon className={`w-5 h-5 ${config.iconGlow}`} />
          </div>
          <div>
            <span className={`text-xs font-black tracking-wide uppercase ${config.textColor}`}>
              {label}
            </span>
            <p className="text-[10px] text-slate-400 font-medium">
              {isCondominio
                ? language === 'en'
                  ? 'Gated Regime / Filial'
                  : 'Régimen en Condominio'
                : hasConstruction
                ? language === 'en'
                  ? 'With Existing Structure'
                  : 'Con Construcción Existente'
                : language === 'en'
                ? 'Registered Real Estate'
                : 'Finca Registrada'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Area: Cadastral Reference & Province Centroid */}
      <div className="relative z-10 flex items-end justify-between pt-4 border-t border-slate-800/50">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {language === 'en' ? 'Jurisdiction Centroid' : 'Centroide Registral'}
          </span>
          <p className="text-xs font-extrabold text-white flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px]">
              {district ? `${district}, ` : ''}{canton || 'Costa Rica'}
            </span>
          </p>
        </div>

        {province && (
          <span className="text-[11px] font-bold text-emerald-400 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 shadow">
            {province}
          </span>
        )}
      </div>
    </div>
  );
}
