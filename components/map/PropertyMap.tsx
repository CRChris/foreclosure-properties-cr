'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Auction } from '@/lib/types/auction';
import { 
  getLiveAuctionProgressionState,
} from '@/lib/utils';
import Link from 'next/link';
import { 
  AlertTriangle, 
  Layers,
  Globe,
  Satellite,
  Target,
  Loader2,
  Compass
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { COSTA_RICA_BOUNDS, COSTA_RICA_CENTER, COSTA_RICA_DEFAULT_ZOOM } from './mapConstants';

export { COSTA_RICA_BOUNDS, COSTA_RICA_CENTER, COSTA_RICA_DEFAULT_ZOOM };

export interface PropertyMapProps {
  auctions: Auction[];
  selectedAuctionId?: string | null;
  onSelectAuction?: (auction: Auction | null) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
  autoFocusPolygon?: boolean;
}

// Controller to smoothly pan & zoom map to parcel polygon bounds or point coordinates
function MapController({
  center = COSTA_RICA_CENTER,
  zoom = COSTA_RICA_DEFAULT_ZOOM,
  selectedAuction,
  resetTrigger,
}: {
  center?: [number, number];
  zoom?: number;
  selectedAuction?: Auction | null;
  resetTrigger?: number;
}) {
  const map = useMap();
  const prevSelectedId = React.useRef<string | null>(null);
  const prevResetTrigger = React.useRef<number>(0);

  useEffect(() => {
    // 1. Reset button triggered ("Full CR")
    if (resetTrigger && resetTrigger !== prevResetTrigger.current) {
      prevResetTrigger.current = resetTrigger;
      prevSelectedId.current = null;
      map.flyToBounds(COSTA_RICA_BOUNDS, {
        padding: [24, 24],
        duration: 0.9,
      });
      return;
    }

    // 2. Selected auction with valid lat/lng coordinates
    if (selectedAuction && selectedAuction.latitude && selectedAuction.longitude) {
      if (prevSelectedId.current !== selectedAuction.id) {
        prevSelectedId.current = selectedAuction.id;

        // If parcel polygon exists, fit map directly to the polygon bounding box
        if (selectedAuction.parcel_polygon) {
          try {
            const geoJsonLayer = L.geoJSON(selectedAuction.parcel_polygon as any);
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 18,
                animate: true,
                duration: 1.0,
              });
              return;
            }
          } catch (e) {
            console.warn('Could not compute polygon bounds:', e);
          }
        }

        // Fallback point zoom
        const targetZoom = selectedAuction.location_type === 'exact_cadastral' ? 16 : 14;
        map.flyTo([selectedAuction.latitude, selectedAuction.longitude], targetZoom, {
          duration: 0.9,
          easeLinearity: 0.25,
        });
      }
    } else if (!selectedAuction && prevSelectedId.current !== null) {
      // 3. Deselected auction
      prevSelectedId.current = null;
      map.flyToBounds(COSTA_RICA_BOUNDS, {
        padding: [24, 24],
        duration: 0.9,
      });
    }
  }, [center, zoom, selectedAuction, resetTrigger, map]);

  return null;
}

export function PropertyMap({
  auctions,
  selectedAuctionId,
  onSelectAuction,
  center = COSTA_RICA_CENTER, // Whole country Costa Rica center
  zoom = COSTA_RICA_DEFAULT_ZOOM, // Zoomed out to view entire country
  height = '100%',
  className = '',
}: PropertyMapProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');
  const [resetTrigger, setResetTrigger] = useState(0);

  // Color-coded marker generator based on Call Stage & Cadastral Exactness:
  const createColorCodedIcon = (auction: Auction, isSelected: boolean) => {
    const liveState = getLiveAuctionProgressionState(auction);
    const isExact = auction.location_type === 'exact_cadastral';
    
    let colorClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/70';
    let ringClass = isSelected 
      ? isDark
        ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
        : 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-white scale-125 z-50'
      : 'hover:scale-115';
    let badgeText = language === 'es' ? '1°' : '1st';

    if (liveState.saleStatus === 'in_progress' || liveState.isHearing) {
      colorClass = 'bg-rose-600 border-rose-300 text-white shadow-rose-950/70 animate-pulse';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-rose-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-rose-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = '🔴';
    } else if (liveState.callStage === 'call_3' || liveState.currentCallNumber === 3) {
      colorClass = 'bg-orange-500 border-orange-200 text-white shadow-orange-950/70';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-orange-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-orange-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = language === 'es' ? '3°' : '3rd';
    } else if (liveState.callStage === 'call_2' || liveState.currentCallNumber === 2) {
      colorClass = 'bg-yellow-500 border-yellow-200 text-slate-950 shadow-yellow-950/70';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-yellow-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = language === 'es' ? '2°' : '2nd';
    } else {
      colorClass = 'bg-emerald-600 border-emerald-300 text-white shadow-emerald-950/70';
      ringClass = isSelected 
        ? isDark
          ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-125 z-50' 
          : 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-white scale-125 z-50'
        : 'hover:scale-115';
      badgeText = language === 'es' ? '1°' : '1st';
    }

    const exactBadgeDot = isExact 
      ? `<span class="absolute -top-1 -right-1 flex h-3.5 w-3.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 text-[8px] items-center justify-center font-black text-white">✓</span></span>`
      : '';

    const iconHtml = `
      <div class="relative flex items-center justify-center cursor-pointer transition-all duration-300 ${ringClass}">
        <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-xl ${colorClass} text-[11px] font-black tracking-tight">
          ${badgeText}
        </div>
        ${exactBadgeDot}
        <div class="absolute -bottom-1 w-2 h-2 rotate-45 ${colorClass.split(' ')[0]}"></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-marker-pin',
      html: iconHtml,
      iconSize: [40, 44],
      iconAnchor: [20, 42],
      popupAnchor: [0, -42],
    });
  };

  const validAuctions = auctions.filter(
    (a) => a.latitude !== null && a.longitude !== null && !isNaN(a.latitude) && !isNaN(a.longitude)
  );

  const selectedAuction = validAuctions.find((a) => a.id === selectedAuctionId) || null;

  // Base map layer URLs
  const streetUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const activeTileUrl = mapLayer === 'satellite' ? satelliteUrl : streetUrl;

  const tileAttribution = mapLayer === 'satellite'
    ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div style={{ height }} className={`w-full h-full relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner ${className}`}>
      {/* Map Layer Switcher (Streets vs Satellite) & Full CR Reset */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-xl flex items-center gap-1 pointer-events-auto">
        <button
          type="button"
          onClick={() => setMapLayer('streets')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            mapLayer === 'streets'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Mapa' : 'Map'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('satellite')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            mapLayer === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Satellite className="w-3.5 h-3.5" />
          <span>{language === 'es' ? 'Satélite' : 'Satellite'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={() => {
            if (onSelectAuction) onSelectAuction(null);
            setResetTrigger((prev) => prev + 1);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-all active:scale-95 shadow-sm"
          title={language === 'es' ? 'Ver todo Costa Rica' : 'Reset view to all Costa Rica'}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'es' ? '🇨🇷 Todo CR' : '🇨🇷 Full CR'}</span>
        </button>
      </div>

      {/* Town Center / Approximate / In-Process Status Banner (Only shown when exact location is unknown) */}
      {selectedAuction && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] max-w-xs sm:max-w-md pointer-events-auto hidden sm:block">
          {selectedAuction.location_type === 'pending_mapping' ? (
            <div className="bg-sky-950/95 text-sky-100 backdrop-blur-md border border-sky-500/50 rounded-xl px-3.5 py-2 text-[11px] shadow-xl flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />
              <p className="leading-tight font-medium">
                {language === 'en'
                  ? '⏳ Map location in process...'
                  : '⏳ Georreferenciación en proceso...'}
              </p>
            </div>
          ) : (!selectedAuction.parcel_polygon && selectedAuction.location_type !== 'exact_cadastral') ? (
            <div className="bg-amber-950/95 dark:bg-amber-950/95 backdrop-blur-md border border-amber-500/60 rounded-xl px-3.5 py-2 text-[11px] text-amber-100 shadow-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="leading-tight font-medium">
                {language === 'en'
                  ? '📍 General vicinity — exact location is unknown (Town center fallback).'
                  : '📍 Zona general — ubicación exacta desconocida (Centroide de la localidad).'}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Interactive Legend Overlay (Top-Right) */}
      <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-3 text-[11px] text-slate-700 dark:text-slate-300 shadow-2xl space-y-2.5 pointer-events-auto hidden md:block max-w-[215px]">
        {/* Stage Header */}
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'es' ? 'Etapa de Remate' : 'Auction Call Stage'}</span>
          </p>
          <div className="space-y-1 pl-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-500/20" />
              <span>{language === 'es' ? '1° Remate (Base 100%)' : '1st Call (Base 100%)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block ring-2 ring-yellow-500/20" />
              <span>{language === 'es' ? '2° Remate (-25% Base)' : '2nd Call (-25% Base)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block ring-2 ring-orange-500/20" />
              <span>{language === 'es' ? '3° Remate (-75% Base)' : '3rd Call (-75% Base)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <span>{language === 'es' ? 'En Progreso / Hoy' : 'Live / In Progress'}</span>
            </div>
          </div>
        </div>

        {/* Location Accuracy Header */}
        <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'es' ? 'Precisión de Ubicación' : 'Location Accuracy'}</span>
          </p>
          <div className="space-y-1.5 pl-0.5">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white dark:border-slate-900 text-[8px] items-center justify-center font-black text-white shrink-0">
                ✓
              </span>
              <span className="leading-tight text-slate-900 dark:text-slate-200 font-medium">
                {language === 'es' ? 'Ubicación / Polígono Exacto' : 'Exact Location / Parcel'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-200 dark:bg-amber-800 border border-amber-400 dark:border-amber-600 shrink-0 inline-block" />
              <span className="leading-tight text-amber-700 dark:text-amber-400 font-medium">
                {language === 'es' ? 'Zona General (Desconocida)' : 'General Vicinity (Unknown)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomSnap={0.25}
        zoomDelta={0.5}
        minZoom={5.5}
      >
        <MapController center={center} zoom={zoom} selectedAuction={selectedAuction} resetTrigger={resetTrigger} />
        
        <TileLayer
          key={`${theme}-${mapLayer}`}
          attribution={tileAttribution}
          url={activeTileUrl}
          maxZoom={19}
        />

        {/* Render exact cadastral parcel polygon boundary for selected auction if available */}
        {selectedAuction?.parcel_polygon && (
          <GeoJSON
            key={`polygon-${selectedAuction.id}-${mapLayer}`}
            data={selectedAuction.parcel_polygon as any}
            style={{
              color: '#10b981',
              weight: 3.5,
              opacity: 0.95,
              fillColor: '#10b981',
              fillOpacity: mapLayer === 'satellite' ? 0.35 : 0.25,
              dashArray: '2, 4',
            }}
          />
        )}

        {validAuctions.map((auction) => {
          const isSelected = selectedAuctionId === auction.id;
          const lat = auction.latitude!;
          const lng = auction.longitude!;

          return (
            <Marker
              key={auction.id}
              position={[lat, lng]}
              icon={createColorCodedIcon(auction, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectAuction) onSelectAuction(auction);
                },
              }}
            />
          );
        })}
      </MapContainer>

      {/* Map Micro-Notice Attribution Overlay */}
      <div className="absolute bottom-1 left-2 right-2 sm:left-auto sm:right-2 z-[400] max-w-md bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-lg px-2.5 py-1 text-[10px] text-slate-500 dark:text-slate-400 shadow-sm pointer-events-auto leading-tight flex items-center justify-between gap-2">
        <span className="truncate">{t.disclaimer.micro.text}</span>
        <Link href="/terms" target="_blank" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0">
          {language === 'es' ? 'Aviso Legal' : 'Terms'}
        </Link>
      </div>
    </div>
  );
}
