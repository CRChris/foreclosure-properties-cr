'use client';

import React from 'react';
import { LocationType } from '@/lib/types/auction';
import { Target, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CadastralLocationBadgeProps {
  locationType?: LocationType;
  hasPolygon?: boolean;
  language?: 'es' | 'en';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function CadastralLocationBadge({
  locationType = 'approximate_town',
  hasPolygon = false,
  language = 'es',
  size = 'sm',
  className = '',
}: CadastralLocationBadgeProps) {
  const isExact = locationType === 'exact_cadastral' || hasPolygon;

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1.2',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  if (isExact) {
    return (
      <span
        title={
          language === 'es'
            ? 'Geolocalización exacta mediante polígono del Catastro Nacional (SNIT)'
            : 'Exact GPS geolocation via National Cadastre parcel polygon (SNIT)'
        }
        className={`inline-flex items-center font-bold rounded-lg border transition-all shadow-sm ${
          sizeClasses[size]
        } bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:border-emerald-500/50 dark:text-emerald-300 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Target className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400 shrink-0`} />
        <span>
          {language === 'es' ? 'Ubicación Exacta (SNIT)' : 'Exact Location (SNIT)'}
        </span>
      </span>
    );
  }

  return (
    <span
      title={
        language === 'es'
          ? 'Ubicación aproximada basada en el centroide del distrito o cantón'
          : 'Approximate location based on district or canton centroid'
      }
      className={`inline-flex items-center font-medium rounded-lg border transition-all ${
        sizeClasses[size]
      } bg-amber-50 text-amber-800 border-amber-300/80 dark:bg-amber-950/60 dark:border-amber-500/30 dark:text-amber-300 ${className}`}
    >
      <MapPin className={`${iconSizes[size]} text-amber-600 dark:text-amber-400 shrink-0`} />
      <span>
        {language === 'es' ? 'Centroide Aproximado' : 'Approx. Town Center'}
      </span>
    </span>
  );
}
