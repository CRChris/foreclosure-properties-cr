'use client';

import React from 'react';
import { SubPropertyParcel, Currency } from '@/lib/types/auction';
import { formatArea, formatCurrency } from '@/lib/utils';
import { PropertyTypeBadge } from '@/components/ui/PropertyTypeIcon';
import { CadastralLocationBadge } from '@/components/ui/CadastralLocationBadge';
import {
  Layers,
  MapPin,
  Maximize2,
  Building,
  TreePine,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Package,
  Globe,
} from 'lucide-react';

interface PortfolioPropertySelectorProps {
  subProperties: SubPropertyParcel[];
  selectedParcelIndex: number | null; // null = overview of all 4 properties
  onSelectParcel: (index: number | null) => void;
  language: 'es' | 'en';
  totalAreaM2: number;
  currency: Currency;
  basePrice: number;
}

export function PortfolioPropertySelector({
  subProperties,
  selectedParcelIndex,
  onSelectParcel,
  language,
  totalAreaM2,
  currency,
  basePrice,
}: PortfolioPropertySelectorProps) {
  if (!subProperties || subProperties.length === 0) return null;

  const totalParcels = subProperties.length;
  const provincesSpanned = Array.from(new Set(subProperties.map((p) => p.province)));

  const getParcelIcon = (prop: SubPropertyParcel) => {
    if (prop.is_condominio || prop.property_category === 'Condo') return '🏖️';
    if (prop.property_category === 'Agricultural' || prop.property_type === 'agricultural_land') return '🌿';
    if (prop.title?.toLowerCase().includes('naciente') || prop.naturaleza_raw?.toLowerCase().includes('naciente')) return '💧';
    return '🚜';
  };

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
      {/* Portfolio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Package className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{language === 'es' ? 'Portafolio Multipropiedad en Remate Único' : 'Multi-Property Portfolio Foreclosure'}</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black">
                {totalParcels} {language === 'es' ? 'Fincas' : 'Properties'}
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {language === 'es'
              ? `Este expediente subasta ${totalParcels} inmuebles juntos en 3 provincias (${provincesSpanned.join(', ')}) bajo una base única compartida de ${formatCurrency(basePrice, currency)}.`
              : `This court docket auctions ${totalParcels} properties together across 3 provinces (${provincesSpanned.join(', ')}) under a single combined base price of ${formatCurrency(basePrice, currency)}.`}
          </p>
        </div>

        {/* Global Overview / All Properties Toggle */}
        <button
          type="button"
          onClick={() => onSelectParcel(null)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedParcelIndex === null
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Ver Paquete Completo (4 Fincas)' : 'View Full Portfolio (4 Parcels)'}</span>
        </button>
      </div>

      {/* Sub-Property Interactive Tab Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {subProperties.map((prop) => {
          const isSelected = selectedParcelIndex === prop.parcel_index;
          const icon = getParcelIcon(prop);

          return (
            <div
              key={prop.id || prop.parcel_index}
              onClick={() => onSelectParcel(prop.parcel_index)}
              className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/20 ring-2 ring-emerald-400/40 -translate-y-0.5'
                  : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="space-y-2">
                {/* Top Badge Strip */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                    <span>{icon}</span>
                    <span>#{prop.parcel_index} de {totalParcels}</span>
                  </span>
                  <span className="font-mono text-[10.5px] font-bold text-slate-600 dark:text-slate-400 truncate">
                    {prop.folio_real}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {prop.title || `Inmueble #${prop.parcel_index}`}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{prop.district ? `${prop.district}, ` : ''}{prop.canton}, {prop.province}</span>
                  </p>
                </div>
              </div>

              {/* Area & Active Indicator */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-[9.5px] text-slate-400 uppercase font-bold block">{language === 'es' ? 'Área' : 'Area'}</span>
                  <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">
                    {formatArea(prop.area_m2)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{language === 'es' ? 'Activo' : 'Selected'}</span>
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-bold text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-0.5">
                      <span>{language === 'es' ? 'Inspeccionar' : 'Inspect'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
