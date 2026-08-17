'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PropertyMapProps } from './PropertyMap';

const DynamicPropertyMap = dynamic(
  () => import('./PropertyMap').then((mod) => mod.PropertyMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] flex flex-col items-center justify-center bg-slate-900/90 border border-slate-800 rounded-xl text-slate-400 gap-3 backdrop-blur-sm">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <div className="absolute w-4 h-4 rounded-full bg-emerald-500/20 animate-ping" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-xs font-semibold text-slate-200">Cargando mapa geoespacial de Costa Rica...</p>
          <p className="text-[11px] text-slate-500">Mapeo satelital y división cantonal ($0 OpenStreetMap)</p>
        </div>
      </div>
    ),
  }
);

export function MapWrapper(props: PropertyMapProps) {
  return <DynamicPropertyMap {...props} />;
}

export default MapWrapper;
