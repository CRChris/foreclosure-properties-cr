'use client';

import React from 'react';
import { LocationType } from '@/lib/types/auction';
import { Target, MapPin, Loader2 } from 'lucide-react';

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
  const isPending = locationType === 'pending_mapping';
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

  // 1. Pending Mapping State (Newly scanned or in-flight geocoding)
  if (isPending) {
    return (
      <span
        title={
          language === 'es'
            ? 'Georreferenciación catastral en proceso...'
            : 'Cadastral mapping in process...'
        }
        className={`inline-flex items-center font-bold rounded-lg border transition-all shadow-sm ${
          sizeClasses[size]
        } bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:border-sky-500/50 dark:text-sky-300 ${className}`}
      >
        <Loader2 className={`${iconSizes[size]} text-sky-600 dark:text-sky-400 animate-spin shrink-0`} />
        <span>
          {language === 'es' ? 'Ubicación en proceso' : 'Location in process'}
        </span>
      </span>
    );
  }

  // 2. Exact Cadastral Lot Boundary or Exact Pin Location -> No accuracy tag necessary
  if (isExact) {
    return null;
  }

  // 3. Approximate Town / District Centroid -> Tag that it is in the general vicinity and exact location is unknown
  return (
    <span
      title={
        language === 'es'
          ? 'Zona general: La ubicación exacta del inmueble es desconocida (centroide distrital/cantonal)'
          : 'General vicinity: The exact location is unknown (district/canton centroid)'
      }
      className={`inline-flex items-center font-medium rounded-lg border transition-all ${
        sizeClasses[size]
      } bg-amber-50 text-amber-800 border-amber-300/80 dark:bg-amber-950/60 dark:border-amber-500/30 dark:text-amber-300 ${className}`}
    >
      <MapPin className={`${iconSizes[size]} text-amber-600 dark:text-amber-400 shrink-0`} />
      <span>
        {language === 'es' ? 'Zona General (Ubicación exacta desconocida)' : 'General Vicinity (Exact location unknown)'}
      </span>
    </span>
  );
}
